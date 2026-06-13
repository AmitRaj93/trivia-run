export default function ConnDot({ on }) {
  return <span className={`conn-dot${on ? ' on' : ''}`} aria-hidden />;
}
