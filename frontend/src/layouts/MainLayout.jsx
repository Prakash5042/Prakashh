import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Background from '../components/Background.jsx';

export default function MainLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return (
    <>
      <Background />
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pt-8"><Outlet /></main>
      <Footer />
    </>
  );
}
