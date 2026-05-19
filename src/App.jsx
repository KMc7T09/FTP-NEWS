import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import GuestRoute from './routes/GuestRoute.jsx';
import LoadingScreen from './components/ui/LoadingScreen.jsx';
import SupabaseSetupNotice from './components/common/SupabaseSetupNotice.jsx';
import { supabaseReady } from './supabase/config.js';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const ArticlePage = lazy(() => import('./pages/ArticlePage.jsx'));
const CategoryPage = lazy(() => import('./pages/CategoryPage.jsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));
const FounderPage = lazy(() => import('./pages/FounderPage.jsx'));
const TeamPage = lazy(() => import('./pages/TeamPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const SignupPage = lazy(() => import('./pages/SignupPage.jsx'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const SupabaseStatusPage = lazy(() => import('./pages/SupabaseStatusPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard.jsx'));
const ArticleManager = lazy(() => import('./admin/pages/ArticleManager.jsx'));
const ArticleEditor = lazy(() => import('./admin/pages/ArticleEditor.jsx'));
const CategoryManager = lazy(() => import('./admin/pages/CategoryManager.jsx'));
const UserManager = lazy(() => import('./admin/pages/UserManager.jsx'));
const CommentManager = lazy(() => import('./admin/pages/CommentManager.jsx'));
const AdManager = lazy(() => import('./admin/pages/AdManager.jsx'));
const SettingsPage = lazy(() => import('./admin/pages/SettingsPage.jsx'));

export default function App() {
  if (!supabaseReady) return <SupabaseSetupNotice />;

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/founder" element={<FounderPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <GuestRoute>
                  <SignupPage />
                </GuestRoute>
              }
            />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/supabase-status" element={<SupabaseStatusPage />} />
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['editor', 'admin', 'superadmin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="articles" element={<ArticleManager />} />
            <Route path="articles/new" element={<ArticleEditor />} />
            <Route path="articles/:id/edit" element={<ArticleEditor />} />
            <Route path="categories" element={<ProtectedRoute roles={['admin', 'superadmin']}><CategoryManager /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute roles={['admin', 'superadmin']}><UserManager /></ProtectedRoute>} />
            <Route path="comments" element={<ProtectedRoute roles={['admin', 'superadmin']}><CommentManager /></ProtectedRoute>} />
            <Route path="ads" element={<ProtectedRoute roles={['admin', 'superadmin']}><AdManager /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute roles={['admin', 'superadmin']}><SettingsPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
