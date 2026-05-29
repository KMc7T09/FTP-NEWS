import { Outlet } from 'react-router-dom';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';
import usePageVisitTracker from '../../hooks/usePageVisitTracker.js';

export default function PublicLayout() {
  usePageVisitTracker();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
