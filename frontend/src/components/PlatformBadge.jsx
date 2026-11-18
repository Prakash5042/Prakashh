import { PLATFORMS } from '../utils/platform.js';

export default function PlatformBadge({ id }) {
  const p = PLATFORMS[id] || PLATFORMS.direct;
  const Icon = p.icon;
  return <span className="chip" style={{ background: p.grad }}><Icon className="h-4 w-4" />{p.name}</span>;
}
