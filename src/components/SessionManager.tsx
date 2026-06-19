import{useEffect,useRef,useState} from 'react';
import{useNavigate} from 'react-router-dom';
import{signOut} from 'firebase/auth';
import{auth} from '../firebase';
import{useUser} from '../contexts/UserContext';

// Minutes before auto-logout warning appears
const IDLE_WARNING_MINS = 25;
// Minutes after warning before forced logout
const IDLE_LOGOUT_MINS  = 5;
// Events that reset the idle timer
const ACTIVITY_EVENTS   = ['mousedown','mousemove','keydown','touchstart','scroll','click'];

export default function SessionManager(){
  const{firebaseUser}=useUser();
  const navigate=useNavigate();
  const[showWarning,setShowWarning]=useState(false);
  const[countdown,setCountdown]=useState(IDLE_LOGOUT_MINS*60);
  const idleTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const warnTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const countdownInterval=useRef<ReturnType<typeof setInterval>|null>(null);

  const clearTimers=()=>{
    if(idleTimer.current)clearTimeout(idleTimer.current);
    if(warnTimer.current)clearTimeout(warnTimer.current);
    if(countdownInterval.current)clearInterval(countdownInterval.current);
  };

  const doLogout=async()=>{
    clearTimers();
    setShowWarning(false);
    await signOut(auth);
    navigate('/login',{state:{message:'You were signed out due to inactivity.'}});
  };

  const resetIdle=()=>{
    if(!firebaseUser)return;
    clearTimers();
    setShowWarning(false);
    // After IDLE_WARNING_MINS, show warning
    idleTimer.current=setTimeout(()=>{
      setShowWarning(true);
      setCountdown(IDLE_LOGOUT_MINS*60);
      // Countdown display
      countdownInterval.current=setInterval(()=>{
        setCountdown(prev=>{if(prev<=1){clearInterval(countdownInterval.current!);return 0;}return prev-1;});
      },1000);
      // After IDLE_LOGOUT_MINS more, force logout
      warnTimer.current=setTimeout(doLogout, IDLE_LOGOUT_MINS*60*1000);
    }, IDLE_WARNING_MINS*60*1000);
  };

  // Sign out when tab/browser closes (sessionStorage trick)
  useEffect(()=>{
    if(!firebaseUser)return;
    // On load: if no sessionActive flag, sign out (new tab/browser open)
    // We use sessionStorage which clears when the tab closes
    const isActive=sessionStorage.getItem('sessionActive');
    if(!isActive){
      // First load in this tab — mark it active
      sessionStorage.setItem('sessionActive','1');
    }
    // When tab closes: sessionStorage clears automatically
    // But we also set a beforeunload handler to sign out
    const handleUnload=()=>{signOut(auth);};
    window.addEventListener('beforeunload',handleUnload);
    return()=>window.removeEventListener('beforeunload',handleUnload);
  },[firebaseUser]);

  // Idle timer — reset on any user activity
  useEffect(()=>{
    if(!firebaseUser){clearTimers();return;}
    resetIdle();
    ACTIVITY_EVENTS.forEach(e=>window.addEventListener(e,resetIdle,{passive:true}));
    return()=>{
      clearTimers();
      ACTIVITY_EVENTS.forEach(e=>window.removeEventListener(e,resetIdle));
    };
  },[firebaseUser]);

  if(!showWarning||!firebaseUser)return null;

  const mins=Math.floor(countdown/60);
  const secs=countdown%60;

  return(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-slide-up">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">⏱️</span>
        </div>
        <h2 className="text-xl font-black text-navy dark:text-white uppercase tracking-tight mb-2">Still there?</h2>
        <p className="text-slate-500 text-sm mb-4 leading-relaxed">
          You have been inactive for a while. For your security, you will be signed out in:
        </p>
        <div className="text-4xl font-black text-navy dark:text-white mb-6 font-mono">
          {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </div>
        <div className="flex gap-3">
          <button onClick={doLogout}
            className="flex-1 py-3 text-slate-500 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700">
            Sign Out
          </button>
          <button onClick={resetIdle}
            className="flex-1 py-3 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean transition-colors">
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
}