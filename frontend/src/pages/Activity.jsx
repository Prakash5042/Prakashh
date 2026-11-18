import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2 } from 'lucide-react';
import { clearActivity, readActivity } from '../hooks/useActivity.js';
import PlatformBadge from '../components/PlatformBadge.jsx';

export default function Activity() {
  const [items, setItems] = useState(readActivity);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between"><h1 className="font-display text-4xl font-bold">Recent <span className="text-grad">Activity</span></h1>
        {items.length > 0 && <button className="btn-ghost" onClick={() => { clearActivity(); setItems([]); }}><Trash2 className="h-4 w-4" /> Clear</button>}</div>
      <p className="mb-6 mt-2 text-muted">Stored only in this browser. Nothing is sent to a server.</p>
      {items.length === 0 ? (
        <div className="glass p-10 text-center"><Clock className="mx-auto h-10 w-10 text-violet-400" /><p className="mt-3 font-bold">Nothing here yet</p><p className="text-sm text-muted">Fetch a video or run a tool and it will show up here.</p><Link to="/downloader" className="btn-3d mt-5">Fetch a video</Link></div>
      ) : (
        <ul className="space-y-3">{items.map((it, i) => (
          <li key={i} className="glass flex items-center gap-3 p-4"><PlatformBadge id={it.platform === 'file' ? 'direct' : it.platform} />
            <div className="min-w-0 flex-1"><p className="truncate font-bold">{it.title}</p><p className="text-xs text-muted">{it.type} · {new Date(it.at).toLocaleString()}</p></div></li>))}
        </ul>
      )}
    </div>
  );
}
