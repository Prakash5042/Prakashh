import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import Logo from './Logo.jsx';
import { useTheme } from '../hooks/useTheme.js';

const LINKS = [['/', 'Home'], ['/downloader', 'Video Downloader'], ['/tools', 'Video Tools'], ['/social', 'Social Media Tools'], ['/ai', 'AI Assistant'], ['/activity', 'Recent Activity']];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dark, toggle] = useTheme();
  const cls = ({ isActive }) => `rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-white shadow-lg' : 'hover:bg-violet-500/15'}`;
  const active = { background: 'linear-gradient(135deg,#7c3aed,#d946ef)' };
  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      <nav className="glass mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5" aria-label="Main">
        <Link to="/" aria-label="ClipFlow home"><Logo /></Link>
        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={cls} style={({ isActive }) => (isActive ? active : undefined)}>{label}</NavLink>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !p-2.5" onClick={toggle} aria-label="Toggle dark and light theme">{dark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-violet-600" />}</button>
          <button className="btn-ghost !p-2.5 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </nav>
      {open && (
        <div className="glass pop mx-auto mt-2 flex max-w-7xl flex-col gap-1 p-3 lg:hidden">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={cls} style={({ isActive }) => (isActive ? active : undefined)}>{label}</NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
