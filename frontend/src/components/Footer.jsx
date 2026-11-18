import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="mx-auto mt-20 max-w-7xl px-4 pb-10">
      <div className="glass flex flex-col items-center justify-between gap-4 p-6 md:flex-row">
        <Logo size={34} />
        <p className="max-w-xl text-center text-sm text-muted">
          ClipFlow respects platform rules: it never bypasses DRM, privacy or download restrictions. Only use videos you own or have permission to use.
        </p>
        <div className="flex gap-4 text-sm font-semibold">
          <Link to="/downloader" className="hover:text-fuchsia-500">Downloader</Link>
          <Link to="/tools" className="hover:text-fuchsia-500">Tools</Link>
          <Link to="/social" className="hover:text-fuchsia-500">Social</Link>
        </div>
      </div>
    </footer>
  );
}
