import { AlertCircle } from 'lucide-react';

export default function ErrorNote({ message }) {
  if (!message) return null;
  return <div role="alert" className="pop mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#f43f5e,#f59e0b)', boxShadow: '0 4px 0 #9f1239' }}><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{message}</div>;
}
