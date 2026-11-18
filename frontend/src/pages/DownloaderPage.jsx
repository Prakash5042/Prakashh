import Downloader from '../components/Downloader.jsx';

export default function DownloaderPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl font-bold">Video <span className="text-grad">Downloader</span></h1>
      <p className="mb-6 mt-2 text-muted">Paste a TikTok, Facebook or YouTube link. ClipFlow reads public metadata through official channels and shows only the actions that are genuinely available. You can also paste a direct link to an MP4/WebM/MOV you own.</p>
      <Downloader />
    </div>
  );
}
