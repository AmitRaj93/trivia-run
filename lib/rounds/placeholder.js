// Temporary module for round types whose full engine isn't wired in yet. It still
// lets the host navigate questions and shows the prompt/answer on the surfaces, so
// the flow is walkable before the round-specific interaction lands.
export function makePlaceholder(type) {
  return {
    type,
    init() {
      return { qIndex: 0, revealed: false };
    },
    count(def) {
      return (def.questions || []).length;
    },
    onSeek(rt) {
      rt.revealed = false;
    },
    hostAction() {
      return false;
    },
    answer() {
      return false;
    },
    publicState(rt, def, role) {
      const q = (def.questions || [])[rt.qIndex] || {};
      return {
        kind: type,
        placeholder: true,
        qIndex: rt.qIndex,
        count: (def.questions || []).length,
        revealed: rt.revealed,
        prompt: q.prompt ?? q.q ?? '',
        media: q.image ?? q.audio ?? null,
        answer: role === 'host' || rt.revealed ? q.a ?? q.answer ?? null : null,
      };
    },
  };
}
