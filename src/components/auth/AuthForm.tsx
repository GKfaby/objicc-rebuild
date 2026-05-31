import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, UserPlus, Lock, Mail, School, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, updateProfile,
  linkWithCredential, EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, writeBatch } from 'firebase/firestore';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { auth, db, googleProvider } from '../../firebase';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { DEFAULT_PERMISSIONS, ROLE_LABELS } from '../../types';

type AuthMode = 'login' | 'signup' | 'complete-profile';

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285f4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34a853"/>
    <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.173.282-1.712V4.956H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.044l3.007-2.332z" fill="#fbbc05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.956l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#ea4335"/>
  </svg>
);

const EMPTY_FORM = {
  email: '', password: '', confirmPassword: '',
  firstName: '', lastName: '', middleInitial: '',
  school: '', phone: '',
  cadetFirstName: '', cadetLastName: '', cadetMiddleInitial: '', cadetSchool: '',
};

export default function AuthForm({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const [mode, setMode]               = useState<AuthMode>(initialMode);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [selectedRole, setSelectedRole] = useState<'cadet' | 'parent'>('cadet');
  const [form, setForm]               = useState(EMPTY_FORM);

  const { schools, refreshProfile } = useUser();
  const { showToast }               = useToast();
  const navigate                    = useNavigate();
  const location                    = useLocation();
  const from                        = (location.state as any)?.from?.pathname || '/';

  // ── Auto-fill name from Google account when entering complete-profile ──
  useEffect(() => {
    if (mode === 'complete-profile' && auth.currentUser) {
      const user = auth.currentUser;
      const parts = (user.displayName || '').trim().split(/\s+/);
      const first = parts[0] || '';
      const last  = parts.slice(1).join(' ') || '';
      setForm((p) => ({
        ...p,
        email:     user.email || p.email,
        firstName: p.firstName || first,
        lastName:  p.lastName  || last,
      }));
    }
  }, [mode]);

  useEffect(() => { setMode(initialMode); setError(''); }, [initialMode]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // ── Validation ─────────────────────────────────────────────────────────
  const validatePassword = (pw: string, confirm: string) => {
    if (pw.length < 8)                            throw new Error('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(pw))                        throw new Error('Password must contain at least one uppercase letter.');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw))      throw new Error('Password must contain at least one symbol.');
    if (pw !== confirm)                           throw new Error('Passwords do not match.');
  };

  const validate = () => {
    if (mode === 'login') return;

    if (!form.firstName.trim() || !/^[a-zA-Z\s]+$/.test(form.firstName))
      throw new Error('First name must contain only letters.');
    if (!form.lastName.trim()  || !/^[a-zA-Z\s]+$/.test(form.lastName))
      throw new Error('Last name must contain only letters.');

    // Password required for both signup and complete-profile (Google linking)
    validatePassword(form.password, form.confirmPassword);

    if (!form.phone || !isValidPhoneNumber(form.phone))
      throw new Error('Please enter a valid phone number.');

    if (selectedRole === 'cadet') {
      if (!form.school) throw new Error('Please select your school.');
    } else {
      if (!form.cadetFirstName.trim() || !/^[a-zA-Z\s]+$/.test(form.cadetFirstName))
        throw new Error("Cadet's first name must contain only letters.");
      if (!form.cadetLastName.trim()  || !/^[a-zA-Z\s]+$/.test(form.cadetLastName))
        throw new Error("Cadet's last name must contain only letters.");
      if (!form.cadetSchool) throw new Error("Please select the cadet's school.");
    }
  };

  // ── Build Firestore user document ──────────────────────────────────────
  const buildUserData = async (
    uid: string, email: string, displayName: string, isFirstUser: boolean
  ) => {
    const role = isFirstUser
      ? 'super_admin'
      : selectedRole === 'cadet' ? 'pending_cadet' : 'pending_parent';

    const base: Record<string, any> = {
      uid, email, displayName,
      firstName: form.firstName.trim(),
      lastName:  form.lastName.trim(),
      phone: form.phone,
      role,
      requestedRole: selectedRole,
      status: isFirstUser ? 'approved' : 'pending',
      createdAt: serverTimestamp(),
    };

    if (selectedRole === 'cadet') {
      base.middleInitial = form.middleInitial;
      base.school        = form.school;
      base.cadetName     = `Cadet ${displayName}`;
    } else {
      base.cadetFirstName     = form.cadetFirstName.trim();
      base.cadetLastName      = form.cadetLastName.trim();
      base.cadetMiddleInitial = form.cadetMiddleInitial;
      base.cadetSchool        = form.cadetSchool;
    }

    // Seed system roles on very first registration
    if (isFirstUser) {
      for (const [roleId, perms] of Object.entries(DEFAULT_PERMISSIONS)) {
        const ref = doc(db, 'roles', roleId);
        if (!(await getDoc(ref)).exists()) {
          await setDoc(ref, {
            name: roleId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            permissions: perms,
            isSystem: true,
            createdAt: serverTimestamp(),
          });
        }
      }
    }
    return base;
  };

  // ── Main submit handler ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      validate();

      // ── Login ──
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, form.email, form.password);
        navigate(from, { replace: true });
        return;
      }

      // ── Signup (email/password) ──
      let uid   = auth.currentUser?.uid;
      let email = auth.currentUser?.email || form.email;

      const mi          = form.middleInitial ? ` ${form.middleInitial}.` : '';
      const displayName = `${form.firstName.trim()}${mi} ${form.lastName.trim()}`.trim();

      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        uid   = cred.user.uid;
        email = cred.user.email!;
        await updateProfile(cred.user, { displayName });
      }

      // ── Complete-profile (Google user) ──
      if (mode === 'complete-profile') {
        if (!auth.currentUser) throw new Error('Session expired. Please sign in again.');
        uid   = auth.currentUser.uid;
        email = auth.currentUser.email!;

        // Update display name on Firebase Auth profile
        await updateProfile(auth.currentUser, { displayName });

        // Link email+password to the Google account so user can sign in either way
        try {
          const emailCred = EmailAuthProvider.credential(email, form.password);
          await linkWithCredential(auth.currentUser, emailCred);
        } catch (linkErr: any) {
          // Already linked — just update the password
          if (linkErr.code === 'auth/provider-already-linked' ||
              linkErr.code === 'auth/email-already-in-use') {
            // Password already set — that's fine, continue
          } else {
            throw linkErr;
          }
        }
      }

      if (!uid) throw new Error('Authentication failed. Please try again.');

      // ── Write Firestore profile ──
      const configRef  = doc(db, 'system', 'config');
      const isFirstUser = !(await getDoc(configRef)).exists();
      const userData    = await buildUserData(uid, email, displayName, isFirstUser);

      const batch = writeBatch(db);
      if (isFirstUser) batch.set(configRef, { initialized: true, createdAt: serverTimestamp() });
      batch.set(doc(db, 'users', uid), userData);
      batch.set(doc(collection(db, 'user_updates')), {
        userId: uid,
        message: `${form.firstName} ${form.lastName} ${mode === 'signup' ? 'registered' : 'completed Google registration'}.`,
        timestamp: serverTimestamp(),
      });
      await batch.commit();

      // Welcome notification
      await setDoc(doc(collection(db, 'users', uid, 'notifications')), {
        title:   isFirstUser ? 'Welcome, Super Admin!' : 'Registration Complete',
        message: isFirstUser
          ? 'You have full Super Admin access to the portal.'
          : `Your account is pending approval as a ${ROLE_LABELS[userData.role as any]}. You will be notified once approved.`,
        type: 'info', read: false, createdAt: serverTimestamp(),
      });

      await refreshProfile();
      showToast(isFirstUser ? 'Welcome, Super Admin!' : 'Account created! Awaiting approval.', 'success');
      navigate('/');
    } catch (err: any) {
      const code = err.code || '';
      setError(
        code === 'auth/email-already-in-use'  ? 'An account with this email already exists.'
        : code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Invalid email or password.'
        : code === 'auth/weak-password'        ? 'Password is too weak.'
        : err.message                          || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Google sign-in ────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const snap   = await getDoc(doc(db, 'users', result.user.uid));
      if (snap.exists()) {
        // Returning user with complete profile — go straight in
        navigate(from, { replace: true });
      } else {
        // New Google user — must complete registration
        // Navigate to the /complete-profile route; RouteGuard + needsProfileCompletion
        // will also enforce this on refresh/disconnect scenarios
        navigate('/complete-profile', { replace: true });
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isSignupLike = mode === 'signup' || mode === 'complete-profile';

  // ── Password strength indicator ───────────────────────────────────────
  const pwStrength = (() => {
    if (!form.password) return 0;
    let s = 0;
    if (form.password.length >= 8)                       s++;
    if (/[A-Z]/.test(form.password))                     s++;
    if (/[0-9]/.test(form.password))                     s++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(form.password))   s++;
    return s;
  })();
  const pwColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-ocean to-navy/80 px-4 py-20">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-navy px-8 py-6">
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            {mode === 'login'            ? 'Welcome Back'
             : mode === 'signup'         ? 'Create Account'
             : 'Complete Registration'}
          </h1>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-1">
            {mode === 'login'            ? 'Sign in to continue'
             : mode === 'signup'         ? 'Join the OBJICC community'
             : 'Set up your OBJICC account'}
          </p>
        </div>

        <div className="p-8 overflow-y-auto max-h-[78vh] custom-scrollbar">
          {error && (
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-bold rounded-r-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Role selection ── */}
            {isSignupLike && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  I am registering as a…
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['cadet', 'parent'] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setSelectedRole(r)}
                      className={`py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                        selectedRole === r ? 'bg-navy text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100'}`}>
                      {r === 'cadet' ? '🪖 Cadet' : '👪 Parent'}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">Your account will be pending until an admin approves it.</p>
              </div>
            )}

            {/* ── Name fields ── */}
            {isSignupLike && (
              <div className="grid grid-cols-[1fr,auto,1fr] gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                  <input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm" />
                </div>
                {selectedRole === 'cadet' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">M.I.</label>
                    <input maxLength={1} value={form.middleInitial}
                      onChange={(e) => set('middleInitial', e.target.value.toUpperCase())}
                      className="w-12 px-2 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none text-center text-sm" />
                  </div>
                )}
                <div className={selectedRole !== 'cadet' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                  <input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm" />
                </div>
              </div>
            )}

            {/* ── Password (signup + complete-profile) ── */}
            {isSignupLike && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {mode === 'complete-profile' ? 'Create a Password' : 'Password'}
                  </label>
                  {mode === 'complete-profile' && (
                    <p className="text-xs text-slate-400 mb-2">
                      This lets you also sign in with your email and password in future.
                    </p>
                  )}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy dark:hover:text-white">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {form.password && (
                    <div className="flex gap-1 mt-2">
                      {[0,1,2,3].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < pwStrength ? pwColors[pwStrength - 1] : 'bg-slate-100 dark:bg-slate-700'}`} />
                      ))}
                      <span className="text-xs text-slate-400 ml-1">
                        {['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength]}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input required type={showPass ? 'text' : 'password'} value={form.confirmPassword}
                      onChange={(e) => set('confirmPassword', e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm" />
                    {form.confirmPassword && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${form.password === form.confirmPassword ? 'text-green-500' : 'text-red-400'}`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Phone ── */}
            {isSignupLike && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <PhoneInput international defaultCountry="JM" value={form.phone}
                  onChange={(v) => set('phone', v || '')} className="w-full" />
              </div>
            )}

            {/* ── School (cadet) ── */}
            {isSignupLike && selectedRole === 'cadet' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">School</label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select required value={form.school} onChange={(e) => set('school', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none appearance-none text-sm">
                    <option value="" disabled>Select your school</option>
                    {schools.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Cadet info (parent) ── */}
            {isSignupLike && selectedRole === 'parent' && (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-black text-navy dark:text-white uppercase tracking-widest">Cadet's Information</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label>
                    <input required value={form.cadetFirstName} onChange={(e) => set('cadetFirstName', e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">M.I.</label>
                    <input maxLength={1} value={form.cadetMiddleInitial}
                      onChange={(e) => set('cadetMiddleInitial', e.target.value.toUpperCase())}
                      className="w-full px-2 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none text-center text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label>
                    <input required value={form.cadetLastName} onChange={(e) => set('cadetLastName', e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cadet's School</label>
                  <select required value={form.cadetSchool} onChange={(e) => set('cadetSchool', e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none appearance-none text-sm">
                    <option value="" disabled>Select school</option>
                    {schools.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Email (login + signup only — not complete-profile, email comes from Google) ── */}
            {mode !== 'complete-profile' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm" />
                </div>
              </div>
            )}

            {/* ── Password for login only (signup/complete-profile shows it above) ── */}
            {mode === 'login' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy dark:hover:text-white">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* ── Google email display (complete-profile) ── */}
            {mode === 'complete-profile' && form.email && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 font-bold">
                {GOOGLE_SVG}
                Signed in as <span className="text-navy dark:text-white">{form.email}</span>
              </div>
            )}

            {/* ── Submit ── */}
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-navy text-white font-black rounded-xl hover:bg-ocean transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-lg disabled:opacity-60">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : mode === 'login'
                  ? <><LogIn className="w-5 h-5" /> Sign In</>
                  : mode === 'signup'
                  ? <><UserPlus className="w-5 h-5" /> Create Account</>
                  : <><CheckCircle2 className="w-5 h-5" /> Complete Registration</>
              }
            </button>
          </form>

          {/* ── Google + mode toggle (login and signup only) ── */}
          {mode !== 'complete-profile' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-slate-900 px-4 text-xs text-slate-400 font-bold uppercase">Or</span>
                </div>
              </div>

              <button onClick={handleGoogle} disabled={loading}
                className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-navy dark:text-white font-bold rounded-xl hover:border-navy/20 dark:hover:border-slate-500 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                {GOOGLE_SVG} Continue with Google
              </button>

              <div className="mt-6 text-center">
                {mode === 'login' ? (
                  <p className="text-xs text-slate-500">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-ocean font-black hover:underline">Sign Up</Link>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-ocean font-black hover:underline">Sign In</Link>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
