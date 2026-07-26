import{useState} from 'react';
import{Link} from 'react-router-dom';
import{Mail,ArrowLeft,Send,CheckCircle2} from 'lucide-react';
import{sendPasswordResetEmail} from 'firebase/auth';
import{auth} from '../firebase';

export default function ForgotPasswordPage(){
  const[email,setEmail]=useState('');
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const[sent,setSent]=useState(false);

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    setLoading(true);setError('');
    try{
      await sendPasswordResetEmail(auth,email.trim());
      setSent(true);
    }catch(err:any){
      // Don't reveal whether an account exists for this email — just
      // surface real problems (bad email format, rate limiting, etc.)
      if(err.code==='auth/invalid-email')setError('Please enter a valid email address.');
      else if(err.code==='auth/too-many-requests')setError('Too many attempts. Please try again later.');
      else setSent(true);
    }finally{setLoading(false);}
  };

  return(<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-ocean to-navy/80 px-4 py-20">
    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
      <div className="bg-navy px-8 py-6">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Reset Password</h1>
        <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-1">We'll email you a reset link</p>
      </div>
      <div className="p-8">
        {sent?(
          <div className="text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-500"/>
            </div>
            <h2 className="font-black text-navy dark:text-white text-lg">Check your inbox</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              If an account exists for <span className="font-bold text-navy dark:text-white">{email}</span>, a password reset link is on its way. It may take a few minutes — check spam too.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 text-ocean font-black text-xs uppercase tracking-widest hover:underline mt-2">
              <ArrowLeft className="w-3 h-3"/>Back to Sign In
            </Link>
          </div>
        ):(<>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Enter the email address associated with your account and we'll send you a link to reset your password.
          </p>
          {error&&<div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-bold rounded-r-lg">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input required type="email" autoFocus value={email} onChange={e=>setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"/>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-navy text-white font-black rounded-xl hover:bg-ocean transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-lg disabled:opacity-60">
              {loading?<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Send className="w-4 h-4"/>Send Reset Link</>}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-navy dark:hover:text-white font-bold">
              <ArrowLeft className="w-3 h-3"/>Back to Sign In
            </Link>
          </div>
        </>)}
      </div>
    </div>
  </div>);
}
