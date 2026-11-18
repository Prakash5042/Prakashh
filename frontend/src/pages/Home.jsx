import { Link } from 'react-router-dom';
import { ArrowRight, Share2, ShieldCheck, Wand2 } from 'lucide-react';
import Downloader from '../components/Downloader.jsx';
import Tilt from '../components/Tilt.jsx';
import { TOOLS } from '../utils/tools.js';

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-4xl pb-10 pt-6 text-center">
        <span className="chip mx-auto mb-5" style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}><Wand2 className="h-4 w-4" /> Advanced results through simple operations</span>
        <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">Paste a link. <span className="text-grad">Preview. Create.</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">Inspect TikTok, Facebook and YouTube videos, then compress, resize, trim and prepare your own footage for every social platform. One clean place.</p>
      </section>

      <section id="downloader" className="mx-auto max-w-4xl"><Downloader /></section>

      <section className="mt-20">
        <h2 className="text-center font-display text-3xl font-bold">Video tools, <span className="text-grad">zero learning curve</span></h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted">Upload a video you own, pick a preset, get the result. No timelines, no jargon.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <Tilt key={t.id} className="glass group p-5"><Link to={`/tools?tool=${t.id}`} className="block">
              <span className="grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: t.grad, boxShadow: `0 5px 0 ${t.edge}, 0 14px 22px -8px ${t.edge}` }}><t.icon className="h-7 w-7" /></span>
              <h3 className="mt-4 font-display text-xl font-bold">{t.title}</h3>
              <p className="mt-1 text-sm text-muted">{t.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-fuchsia-500 transition group-hover:gap-2">Open tool <ArrowRight className="h-4 w-4" /></span>
            </Link></Tilt>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-5 md:grid-cols-2">
        <Tilt className="glass p-7">
          <span className="chip" style={{ background: 'linear-gradient(135deg,#f59e0b,#f43f5e)' }}><Share2 className="h-4 w-4" /> Social Media Tools</span>
          <h3 className="mt-4 font-display text-2xl font-bold">Export for TikTok, Reels, Shorts and more</h3>
          <p className="mt-2 text-muted">One upload, the right size and framing for each platform, with optional burned-in captions.</p>
          <Link to="/social" className="btn-3d btn-amber mt-5">Prepare a video <ArrowRight className="h-5 w-5" /></Link>
        </Tilt>
        <Tilt className="glass p-7">
          <span className="chip" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}><ShieldCheck className="h-4 w-4" /> Built to follow the rules</span>
          <h3 className="mt-4 font-display text-2xl font-bold">Honest by design</h3>
          <p className="mt-2 text-muted">ClipFlow only offers actions each platform permits. When downloading isn't allowed, it says so and shows a legitimate alternative, never a fake button.</p>
          <Link to="/activity" className="btn-ghost mt-5">See recent activity</Link>
        </Tilt>
      </section>
    </>
  );
}
