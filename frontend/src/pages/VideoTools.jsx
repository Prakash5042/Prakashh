import { useSearchParams } from 'react-router-dom';
import ToolPanel from '../components/ToolPanel.jsx';
import { TOOLS } from '../utils/tools.js';

export default function VideoTools() {
  const [params, setParams] = useSearchParams();
  const tool = TOOLS.find((t) => t.id === params.get('tool')) || TOOLS[0];
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-4xl font-bold">Video <span className="text-grad">Tools</span></h1>
      <p className="mb-6 mt-2 text-muted">Pick a tool, drop in a video you own, press the big button.</p>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="tablist">
        {TOOLS.map((t) => {
          const on = t.id === tool.id;
          return (
            <button key={t.id} role="tab" aria-selected={on} onClick={() => setParams({ tool: t.id })} className="flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-xs font-bold transition"
              style={on ? { background: t.grad, color: '#fff', boxShadow: `0 5px 0 ${t.edge}, 0 14px 22px -8px ${t.edge}`, transform: 'translateY(-3px)' } : { background: 'var(--card)', border: '1px solid var(--line)' }}>
              <t.icon className="h-6 w-6" />{t.title.replace('Video ', '')}
            </button>
          );
        })}
      </div>
      <ToolPanel tool={tool} />
    </div>
  );
}
