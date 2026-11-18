export default function Background() {
  const orbs = [
    { s: 150, t: '9%', l: '3%', a: '#a855f7', b: '#4c1d95', d: '0s' },
    { s: 96, t: '18%', r: '5%', a: '#22d3ee', b: '#1d4ed8', d: '1.5s' },
    { s: 70, t: '58%', l: '6%', a: '#fbbf24', b: '#e11d48', d: '3s' },
    { s: 120, t: '70%', r: '3%', a: '#f472b6', b: '#7c3aed', d: '2s' },
  ];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {orbs.map((o, i) => (
        <span key={i} className="orb hidden md:block opacity-90" style={{ width: o.s, height: o.s, top: o.t, left: o.l, right: o.r, '--a': o.a, '--b': o.b, animationDelay: o.d }} />
      ))}
    </div>
  );
}
