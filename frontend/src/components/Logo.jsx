export default function Logo({ size = 40 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid place-items-center rounded-2xl text-white" style={{ width: size, height: size, background: 'linear-gradient(135deg,#7c3aed,#d946ef 55%,#06b6d4)', boxShadow: '0 4px 0 #5b21b6, 0 12px 20px -6px #a855f7, inset 0 1px 0 rgba(255,255,255,.5)' }}>
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
      </span>
      <span className="font-display text-2xl font-bold tracking-tight">Clip<span className="text-grad">Flow</span></span>
    </span>
  );
}
