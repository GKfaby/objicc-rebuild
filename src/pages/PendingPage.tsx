import{Clock,Bell,LogOut,User} from 'lucide-react';
import{Link} from 'react-router-dom';
import{signOut} from 'firebase/auth';
import{auth} from '../firebase';
import{useUser} from '../contexts/UserContext';
import{useNavigate} from 'react-router-dom';
export default function PendingPage(){
  const{profile}=useUser();const navigate=useNavigate();
  const handleSignOut=async()=>{await signOut(auth);navigate('/');};
  return(<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-ocean to-navy/80 px-4">
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6"><Clock className="w-10 h-10 text-amber-500"/></div>
      <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight mb-3">Awaiting Approval</h1>
      <p className="text-slate-500 text-sm leading-relaxed mb-2">Hi <strong className="text-navy dark:text-white">{profile?.firstName}</strong>! Your account is pending review.</p>
      <p className="text-slate-400 text-xs mb-8">You registered as a <span className="font-bold">{profile?.requestedRole}</span>. An admin will approve your request soon.</p>
      <div className="flex flex-col gap-3">
        <Link to="/notifications" className="flex items-center justify-center gap-2 px-6 py-3 bg-navy text-white font-black rounded-xl hover:bg-ocean transition-all uppercase tracking-widest text-xs"><Bell className="w-4 h-4"/>Check Notifications</Link>
        <Link to="/profile" className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-800 text-navy dark:text-white font-black rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest text-xs"><User className="w-4 h-4"/>View My Profile</Link>
        <button onClick={handleSignOut} className="flex items-center justify-center gap-2 px-6 py-3 text-red-400 font-bold rounded-xl hover:bg-red-50 transition-all text-xs"><LogOut className="w-4 h-4"/>Sign Out</button>
      </div>
    </div>
  </div>);
}