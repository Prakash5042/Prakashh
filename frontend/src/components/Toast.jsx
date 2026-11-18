import { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, message, type }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500);
  }, []);
  const style = { success: ['#10b981', '#06b6d4', CheckCircle2], error: ['#f43f5e', '#f59e0b', AlertTriangle], info: ['#7c3aed', '#3b82f6', Info] };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-3" role="status" aria-live="polite">
        {items.map((t) => {
          const [a, b, Icon] = style[t.type] || style.info;
          return (
            <div key={t.id} className="pop flex items-start gap-3 rounded-2xl p-4 text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg,${a},${b})`, boxShadow: '0 5px 0 rgba(0,0,0,.25), 0 18px 30px -10px rgba(0,0,0,.45)' }}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" /> <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
