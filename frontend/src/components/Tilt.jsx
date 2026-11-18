import { useRef } from 'react';

/** Subtle 3D tilt on hover (disabled for touch / reduced motion). */
export default function Tilt({ children, className = '', max = 7, as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current; if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateZ(8px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ''; };
  return <Tag ref={ref} onMouseMove={move} onMouseLeave={leave} className={`tilt ${className}`} {...rest}>{children}</Tag>;
}
