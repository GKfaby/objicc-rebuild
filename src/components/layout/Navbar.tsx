import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, User, LogIn, LayoutDashboard, Bell } from 'lucide-react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError]  = useState(false);
  const { firebaseUser, profile, isStaff, isMember, systemSettings } = useUser();
  const { isDark, setColorMode, colorMode } = useTheme();
  const location  = useLocation();
  const navigate  = useNavigate();
  const isHome    = location.pathname === '/';

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  // Reset logo error when URL changes (e.g. after upload)
  useEffect(() => { setLogoError(false); }, [systemSettings.logoUrl]);

  const handleSignOut = async () => { await signOut(auth); navigate('/'); };
  const toggleDark    = () => setColorMode(isDark ? 'light' : 'dark');

  const navLinks = [
    { label: 'Home',        href: '/' },
    { label: 'Events',      href: '/events',      show: systemSettings.eventsEnabled },
    { label: 'Contact',     href: '/contact' },
    ...(isMember ? [
      { label: 'Shop',        href: '/shop',        show: systemSettings.shopEnabled },
      { label: 'Suggestions', href: '/suggestions', show: systemSettings.suggestionsEnabled },
    ] : []),
  ].filter((l) => l.show !== false);

  // Navbar bg: transparent on home when at top, solid everywhere else
  const navBg = scrolled || !isHome
    ? 'bg-navy/95 backdrop-blur-md shadow-xl py-3'
    : 'bg-transparent py-5';

  const LogoBlock = () => (
    <Link to="/" className="flex items-center gap-3 group shrink-0">
      {/* Logo image with text fallback */}
      {systemSettings.logoUrl && !logoError ? (
        <div className="logo-nav-wrap">
          <img
            src={systemSettings.logoUrl}
            alt={systemSettings.orgName}
            onError={() => setLogoError(true)}
          />
        </div>
      ) : (
        /* Monogram fallback if logo fails or isn't set */
        <div className="h-10 w-10 rounded-xl bg-gold flex items-center justify-center shrink-0">
          <span className="text-navy font-black text-sm">
            {systemSettings.orgName?.slice(0, 2).toUpperCase() || 'OB'}
          </span>
        </div>
      )}
      <span className="text-white font-black text-lg uppercase tracking-tighter leading-none">
        {systemSettings.orgName}
      </span>
    </Link>
  );

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${navBg}`}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <LogoBlock />

        {/* ── Desktop links ── */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className={`text-xs font-black uppercase tracking-widest transition-colors relative group ${
                location.pathname === l.href ? 'text-gold' : 'text-white/75 hover:text-white'
              }`}
            >
              {l.label}
              {/* Active underline */}
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gold rounded-full transition-transform origin-left ${
                location.pathname === l.href ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`} />
            </Link>
          ))}

          {/* Right controls */}
          <div className="flex items-center gap-2 pl-4 border-l border-white/10">
            {/* Dark mode */}
            <button
              onClick={toggleDark}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {firebaseUser && profile ? (
              <>
                {/* Notifications */}
                <Link
                  to="/notifications"
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                </Link>

                {/* Admin link */}
                {isStaff && (
                  <Link
                    to="/admin"
                    className="p-2 text-white/60 hover:text-gold hover:bg-white/10 rounded-lg transition-all"
                    aria-label="Admin panel"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                  </Link>
                )}

                {/* Profile pill */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 pl-3 pr-4 py-2 bg-white/10 hover:bg-gold hover:text-navy text-white rounded-full text-xs font-black uppercase tracking-widest transition-all border border-white/10"
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gold/30 flex items-center justify-center">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                  {profile.firstName}
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-5 py-2 bg-gold text-navy font-black rounded-full uppercase tracking-widest text-xs hover:bg-white transition-all shadow-lg shadow-gold/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </Link>
            )}
          </div>
        </div>

        {/* ── Mobile controls ── */}
        <div className="flex items-center gap-2 lg:hidden">
          <button onClick={toggleDark} className="p-2 text-white/70 hover:text-white transition-colors">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="lg:hidden bg-navy/98 backdrop-blur-md border-t border-white/10 px-4 py-6 flex flex-col gap-1 animate-slide-up">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className={`px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${
                location.pathname === l.href
                  ? 'bg-white/10 text-gold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}

          <div className="border-t border-white/10 mt-2 pt-4 flex flex-col gap-1">
            {firebaseUser && profile ? (
              <>
                <Link to="/profile"
                  className="px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm text-gold hover:bg-white/5">
                  My Profile
                </Link>
                <Link to="/notifications"
                  className="px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm text-white/60 hover:bg-white/5 hover:text-white">
                  Notifications
                </Link>
                {isStaff && (
                  <Link to="/admin"
                    className="px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm text-white/60 hover:bg-white/5 hover:text-white">
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="mt-2 px-4 py-3 rounded-xl text-left text-red-400 font-black uppercase tracking-widest text-sm hover:bg-red-400/10 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login"
                className="px-4 py-3 bg-gold text-navy rounded-xl font-black uppercase tracking-widest text-sm text-center">
                Login / Sign Up
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
