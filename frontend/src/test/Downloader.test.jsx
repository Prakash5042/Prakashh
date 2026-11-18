import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Downloader from '../components/Downloader.jsx';
import { ToastProvider } from '../components/Toast.jsx';
import { api } from '../services/api.js';

vi.mock('../services/api.js', () => ({
  api: {
    inspect: vi.fn(),
    download: vi.fn(),
  },
  fileUrl: (path) => path,
  triggerDownload: vi.fn(),
}));

function renderDownloader() {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <Downloader />
      </ToastProvider>
    </BrowserRouter>
  );
}

describe('Downloader Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input, paste/fetch buttons and platform badges', () => {
    renderDownloader();
    expect(screen.getByLabelText(/paste your video link/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fetch video/i })).toBeInTheDocument();
    expect(screen.getByText('TikTok')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('shows error note when trying to submit empty input', async () => {
    renderDownloader();
    const fetchBtn = screen.getByRole('button', { name: /fetch video/i });
    fireEvent.click(fetchBtn);
    expect(await screen.findByText(/paste a tiktok, facebook or youtube link first/i)).toBeInTheDocument();
  });

  it('detects platform as user types URL', async () => {
    renderDownloader();
    const input = screen.getByLabelText(/paste your video link/i);
    await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(screen.getByText(/detected/i)).toBeInTheDocument();
  });

  it('inspects a platform link and displays metadata, embed preview, and legal notice without download', async () => {
    api.inspect.mockResolvedValueOnce({
      platform: 'youtube',
      platformName: 'YouTube',
      canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up',
      author: { name: 'Rick Astley', url: 'https://www.youtube.com/@RickAstleyYT' },
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      duration: 213,
      preview: { type: 'iframe', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', aspect: '16/9' },
      downloadable: false,
      options: [],
      downloadNote: "YouTube's Terms of Service do not allow downloading videos through third-party tools.",
      alternatives: [
        { id: 'open_original', label: 'Open the original on the platform' },
        { id: 'use_file', label: 'Import an original file you own into Video Tools' },
      ],
    });

    renderDownloader();
    const input = screen.getByLabelText(/paste your video link/i);
    await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fireEvent.click(screen.getByRole('button', { name: /fetch video/i }));

    expect(await screen.findByText('Rick Astley - Never Gonna Give You Up')).toBeInTheDocument();
    expect(screen.getByText('Rick Astley')).toBeInTheDocument();
    expect(screen.getByText(/direct download isn't available for youtube/i)).toBeInTheDocument();
    expect(screen.getByText(/open original/i)).toBeInTheDocument();
    expect(screen.getByText(/i have the original file/i)).toBeInTheDocument();
  });

  it('handles direct downloadable file with quality selection', async () => {
    api.inspect.mockResolvedValueOnce({
      platform: 'direct',
      platformName: 'Direct file',
      jobId: '11111111-2222-3333-4444-555555555555',
      canonicalUrl: 'https://example.com/sample.mp4',
      title: 'sample.mp4',
      author: null,
      thumbnail: null,
      duration: 10,
      preview: { type: 'video', src: '/api/files/11111111-2222-3333-4444-555555555555?inline=1' },
      downloadable: true,
      options: [{ id: 'original', label: 'Original 1920x1080', format: 'MP4', size: 5000000, codec: 'h264' }],
      info: { video: { fps: 30 } },
    });

    renderDownloader();
    const input = screen.getByLabelText(/paste your video link/i);
    await userEvent.type(input, 'https://example.com/sample.mp4');
    fireEvent.click(screen.getByRole('button', { name: /fetch video/i }));

    expect(await screen.findByText('sample.mp4')).toBeInTheDocument();
    expect(screen.getByText(/choose quality/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('clears state when clear button is clicked', async () => {
    renderDownloader();
    const input = screen.getByLabelText(/paste your video link/i);
    await userEvent.type(input, 'https://youtu.be/test');
    expect(input.value).toBe('https://youtu.be/test');

    const clearBtn = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearBtn);
    expect(input.value).toBe('');
  });
});
