'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { C2S, S2C, ROLES } from './protocol.js';

// One WebSocket per surface. Holds the latest authoritative snapshot and exposes
// typed senders. Auto-reconnects with backoff and re-establishes the same role
// (a rep rejoins its team slot with the stored token).
export function useGameSocket() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(null); // { roomCode, role, teamId?, pending? }
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [rejected, setRejected] = useState(false);
  const rejoinRef = useRef(null);
  const retryRef = useRef(0);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retryRef.current = 0;
      if (rejoinRef.current) ws.send(JSON.stringify(rejoinRef.current));
    };
    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(1000 * 2 ** retryRef.current++, 5000);
      setTimeout(connect, delay);
    };
    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === S2C.JOINED) {
        setJoined({ roomCode: msg.roomCode, role: msg.role, teamId: msg.teamId, pending: !!msg.pending });
        setError(null);
        setRejected(false);
        if (msg.role === ROLES.REP && msg.teamId && msg.repToken) {
          // Approved: remember the slot so a reconnect lands us back in it.
          rejoinRef.current = {
            type: C2S.JOIN,
            role: ROLES.REP,
            roomCode: msg.roomCode,
            teamId: msg.teamId,
            repToken: msg.repToken,
          };
          try {
            // sessionStorage (per-tab), not localStorage: this lets you run
            // several teams from one browser using separate tabs/windows, while a
            // rep's phone still rejoins its slot across refreshes and drops.
            sessionStorage.setItem(
              `triviaRep:${msg.roomCode}`,
              JSON.stringify({ teamId: msg.teamId, repToken: msg.repToken })
            );
          } catch {}
        }
      } else if (msg.type === S2C.STATE) {
        setState(msg.state);
      } else if (msg.type === S2C.REJECTED) {
        setRejected(true);
        setJoined(null);
        rejoinRef.current = null;
      } else if (msg.type === S2C.ERROR) {
        setError(msg.message);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const send = useCallback((obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  }, []);

  const create = useCallback(
    (passcode) => {
      const payload = { type: C2S.CREATE, passcode };
      rejoinRef.current = payload;
      send(payload);
    },
    [send]
  );

  const joinAs = useCallback(
    (role, roomCode) => {
      const payload = { type: C2S.JOIN, role, roomCode: String(roomCode || '').toUpperCase() };
      rejoinRef.current = payload;
      send(payload);
    },
    [send]
  );

  const requestTeam = useCallback(
    (roomCode, teamName, repName) => {
      const code = String(roomCode || '').toUpperCase();
      // If we were already approved for this room, rejoin instead of re-requesting.
      try {
        const stored = JSON.parse(sessionStorage.getItem(`triviaRep:${code}`) || 'null');
        if (stored?.teamId && stored?.repToken) {
          const payload = { type: C2S.JOIN, role: ROLES.REP, roomCode: code, ...stored };
          rejoinRef.current = payload;
          return send(payload);
        }
      } catch {}
      const payload = { type: C2S.REQUEST_TEAM, roomCode: code, teamName, repName };
      rejoinRef.current = payload;
      send(payload);
    },
    [send]
  );

  const action = useCallback(
    (actionName, payload) => send({ type: C2S.ACTION, action: actionName, payload }),
    [send]
  );
  const answer = useCallback((payload) => send({ type: C2S.ANSWER, payload }), [send]);

  return {
    connected,
    joined,
    state,
    error,
    rejected,
    create,
    joinTv: (code) => joinAs(ROLES.TV, code),
    joinViewer: (code) => joinAs(ROLES.VIEWER, code),
    requestTeam,
    action,
    answer,
  };
}
