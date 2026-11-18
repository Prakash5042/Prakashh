import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ToolPanel from '../components/ToolPanel.jsx';
import { ToastProvider } from '../components/Toast.jsx';
import { TOOLS } from '../utils/tools.js';
import { api } from '../services/api.js';

vi.mock('../services/api.js', () => ({
  api: {
    tool: vi.fn(),
  },
  fileUrl: (path) => path,
  triggerDownload: vi.fn(),
}));

function renderToolPanel(tool) {
  return render(
    <ToastProvider>
      <ToolPanel tool={tool} />
    </ToastProvider>
  );
}

describe('ToolPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tool title, description and file dropzone', () => {
    const compressTool = TOOLS.find((t) => t.id === 'compress');
    renderToolPanel(compressTool);

    expect(screen.getByText('Video Compressor')).toBeInTheDocument();
    expect(screen.getByText('Shrink file size with simple presets.')).toBeInTheDocument();
    expect(screen.getByText(/drop a video here/i)).toBeInTheDocument();
  });

  it('shows options when a file is selected for compress', async () => {
    const compressTool = TOOLS.find((t) => t.id === 'compress');
    const { container } = renderToolPanel(compressTool);

    const file = new File(['dummy content'], 'myvideo.mp4', { type: 'video/mp4' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('Low compression')).toBeInTheDocument();
    expect(screen.getByText('High compression')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run video compressor/i })).toBeInTheDocument();
  });

  it('submits compress and displays ResultCard upon completion', async () => {
    const compressTool = TOOLS.find((t) => t.id === 'compress');
    api.tool.mockResolvedValueOnce({
      jobId: '22222222-3333-4444-5555-666666666666',
      status: 'done',
      filename: 'compressed.mp4',
      downloadUrl: '/api/files/22222222-3333-4444-5555-666666666666',
      original: { size: 1000000, width: 1920, height: 1080, duration: 5 },
      result: { size: 500000, width: 1920, height: 1080, duration: 5, fps: 30 },
      warnings: [],
    });

    const { container } = renderToolPanel(compressTool);

    const file = new File(['dummy'], 'myvideo.mp4', { type: 'video/mp4' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtn = await screen.findByRole('button', { name: /run video compressor/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/ready: compressed.mp4/i)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // Smaller by 50%
  });

  it('renders aspect ratios and framing options for resize tool', async () => {
    const resizeTool = TOOLS.find((t) => t.id === 'resize');
    const { container } = renderToolPanel(resizeTool);

    const file = new File(['dummy'], 'sample.mp4', { type: 'video/mp4' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText(/9:16 · vertical/i)).toBeInTheDocument();
    expect(screen.getByText(/16:9 · landscape/i)).toBeInTheDocument();
    expect(screen.getByText(/1:1 · square/i)).toBeInTheDocument();
    expect(screen.getByText(/fit \(black bars\)/i)).toBeInTheDocument();
    expect(screen.getByText(/fit \(blurred bars\)/i)).toBeInTheDocument();
    expect(screen.getByText(/crop to fill/i)).toBeInTheDocument();
  });

  it('renders analysis grid for analyze tool upon completion', async () => {
    const analyzeTool = TOOLS.find((t) => t.id === 'analyze');
    api.tool.mockResolvedValueOnce({
      file: 'sample.mp4',
      info: {
        container: 'mp4',
        duration: 10,
        size: 2000000,
        bitrate: 1600000,
        video: { codec: 'h264', width: 1280, height: 720, fps: 30, bitrate: 1400000, pixelFormat: 'yuv420p' },
        audio: { codec: 'aac', channels: 2, sampleRate: 44100, bitrate: 128000 },
      },
    });

    const { container } = renderToolPanel(analyzeTool);

    const file = new File(['dummy'], 'sample.mp4', { type: 'video/mp4' });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitBtn = await screen.findByRole('button', { name: /analyze video/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('1280×720')).toBeInTheDocument();
    expect(screen.getByText('30 fps')).toBeInTheDocument();
    expect(screen.getByText('h264')).toBeInTheDocument();
  });
});
