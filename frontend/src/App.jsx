import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import Home from './pages/Home.jsx';
import DownloaderPage from './pages/DownloaderPage.jsx';
import VideoTools from './pages/VideoTools.jsx';
import SocialTools from './pages/SocialTools.jsx';
import AiAssistant from './pages/AiAssistant.jsx';
import Activity from './pages/Activity.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="downloader" element={<DownloaderPage />} />
        <Route path="tools" element={<VideoTools />} />
        <Route path="social" element={<SocialTools />} />
        <Route path="ai" element={<AiAssistant />} />
        <Route path="activity" element={<Activity />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
