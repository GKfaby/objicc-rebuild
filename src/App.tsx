import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Suspense, lazy, useState } from 'react';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { RouteGuard, StaffOnly, MemberOnly, AuthenticatedOnly } from './guards/RouteGuard';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AdminLayout from './components/layout/AdminLayout';
import { useUser } from './contexts/UserContext';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { Lock, X, Eye, EyeOff } from 'lucide-react';

// Pages
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import ContactPage from './pages/ContactPage';
import PendingPage from './pages/PendingPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import ShopPage from './pages/ShopPage';
import SuggestionsPage from './pages/SuggestionsPage';
import { NotFoundPage, UnauthorizedPage } from './pages/ErrorPages';
import AuthForm from './components/auth/AuthForm';

// Admin pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import ApplicationsPage from './pages/admin/ApplicationsPage';
import PostsPage from './pages/admin/PostsPage';
import MerchandisePage from './pages/admin/MerchandisePage';
import RolesPage from './pages/admin/RolesPage';
import AdminSuggestionsPage from './pages/admin/SuggestionsPage';
import ActivityPage from './pages/admin/ActivityPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import SettingsPage from './pages/admin/SettingsPage';

// Layout wrapper — adds Navbar + Footer for public/member routes
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

// Subtle admin login panel — shown on maintenance screen
function AdminLoginPanel({ onClose }: { onClose: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setError('Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-80 pointer-events-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Staff Access</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-5 py-4 space-y-3">
          {error && (
            <p className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-9 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-navy/20"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy dark:hover:text-white transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Lock className="w-3 h-3" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 font-bold uppercase tracking-widest">or</span>
            </div>
          </div>

          {/* Google */}
          <button type="button" onClick={handleGoogle} disabled={loading}
            className="w-full py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-bold rounded-xl text-xs hover:border-slate-400 dark:hover:border-slate-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285f4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34a853"/>
              <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.173.282-1.712V4.956H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.044l3.007-2.332z" fill="#fbbc05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.956l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#ea4335"/>
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}

// Maintenance mode gate
function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { systemSettings, profile } = useUser();
  const [showLogin, setShowLogin]   = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Secret: click the maintenance icon 3 times to reveal the login panel
  const handleIconClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 3) { setShowLogin(true); setClickCount(0); }
  };

  if (systemSettings.maintenanceMode && !['super_admin', 'admin'].includes(profile?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy text-white px-4 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }} />

        <div className="relative text-center max-w-md">
          {/* Clickable icon — 3 clicks reveals admin login */}
          <div
            onClick={handleIconClick}
            className="text-6xl mb-6 cursor-default select-none inline-block"
            title=""
          >
            🔧
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-4">Under Maintenance</h1>
          <p className="text-white/60 leading-relaxed">
            {systemSettings.maintenanceMessage || "We're down for scheduled maintenance. Back shortly!"}
          </p>
        </div>

        {/* Subtle corner trigger — very small, blends into background */}
        <button
          onClick={() => setShowLogin(!showLogin)}
          className="fixed bottom-4 right-4 w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          aria-label=""
          tabIndex={-1}
        />

        {showLogin && <AdminLoginPanel onClose={() => setShowLogin(false)} />}
      </div>
    );
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <MaintenanceGate>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/events" element={<PublicLayout><EventsPage /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
        <Route path="/unauthorized" element={<PublicLayout><UnauthorizedPage /></PublicLayout>} />

        {/* ── Auth routes (guest only) ── */}
        <Route path="/login" element={
          <RouteGuard guestOnly>
            <AuthForm initialMode="login" />
          </RouteGuard>
        } />
        <Route path="/signup" element={
          <RouteGuard guestOnly>
            <AuthForm initialMode="signup" />
          </RouteGuard>
        } />
        <Route path="/complete-profile" element={
          <AuthForm initialMode="complete-profile" />
        } />

        {/* ── Pending users ── */}
        <Route path="/pending" element={
          <AuthenticatedOnly>
            <PendingPage />
          </AuthenticatedOnly>
        } />

        {/* ── Authenticated (pending+) ── */}
        <Route path="/profile" element={
          <AuthenticatedOnly>
            <PublicLayout><ProfilePage /></PublicLayout>
          </AuthenticatedOnly>
        } />
        <Route path="/notifications" element={
          <AuthenticatedOnly>
            <PublicLayout><NotificationsPage /></PublicLayout>
          </AuthenticatedOnly>
        } />

        {/* ── Members only (cadet/parent/staff) ── */}
        <Route path="/shop" element={
          <MemberOnly>
            <PublicLayout><ShopPage /></PublicLayout>
          </MemberOnly>
        } />
        <Route path="/suggestions" element={
          <MemberOnly>
            <PublicLayout><SuggestionsPage /></PublicLayout>
          </MemberOnly>
        } />

        {/* ── Admin routes ── */}
        <Route path="/admin" element={
          <StaffOnly>
            <AdminLayout />
          </StaffOnly>
        }>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={
            <RouteGuard allowedRoles={['super_admin','admin','staff']}>
              <UsersPage />
            </RouteGuard>
          } />
          <Route path="applications" element={
            <RouteGuard allowedRoles={['super_admin','admin','staff','recruitment_officer']}>
              <ApplicationsPage />
            </RouteGuard>
          } />
          <Route path="posts" element={
            <RouteGuard allowedRoles={['super_admin','admin','staff','editor']}>
              <PostsPage />
            </RouteGuard>
          } />
          <Route path="merchandise" element={
            <RouteGuard allowedRoles={['super_admin','admin','staff']}>
              <MerchandisePage />
            </RouteGuard>
          } />
          <Route path="roles" element={
            <RouteGuard allowedRoles={['super_admin','admin']}>
              <RolesPage />
            </RouteGuard>
          } />
          <Route path="suggestions" element={<AdminSuggestionsPage />} />
          <Route path="activity" element={
            <RouteGuard allowedRoles={['super_admin','admin','staff']}>
              <ActivityPage />
            </RouteGuard>
          } />
          <Route path="payments" element={
            <RouteGuard allowedRoles={['super_admin']}>
              <PaymentsPage />
            </RouteGuard>
          } />
          <Route path="settings" element={
            <RouteGuard allowedRoles={['super_admin','admin']}>
              <SettingsPage />
            </RouteGuard>
          } />
        </Route>

        {/* ── Catch all ── */}
        <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
      </Routes>
    </MaintenanceGate>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
