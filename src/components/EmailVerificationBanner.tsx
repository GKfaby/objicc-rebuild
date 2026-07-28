import{useState,useRef,useEffect} from 'react';
import{MailWarning,X,RefreshCw,Send} from 'lucide-react';
import{sendEmailVerification} from 'firebase/auth';
import{auth} from '../firebase';
import{useUser} from '../contexts/UserContext';
import{useToast} from '../contexts/ToastContext';
import{useNavOffset} from '../contexts/NavOffsetContext';

export default function EmailVerificationBanner(){
  const{firebaseUser,emailVerified,refreshEmailVerified}=useUser();
  const{showToast}=useToast();
  const{setBannerHeight}=useNavOffset();
  const[dismissed,setDismissed]=useState(()=>sessionStorage.getItem('objicc_verify_dismissed')==='1');
  const[sending,setSending]=useState(false);
  const[checking,setChecking]=useState(false);
  const[cooldown,setCooldown]=useState(false);
  const ref=useRef<HTMLDivElement>(null);

  const hasPasswordProvider=!!firebaseUser?.providerData?.some((p:any)=>p.providerId==='password');
  const show=!!firebaseUser&&!emailVerified&&hasPasswordProvider&&!dismissed;

  // Report our actual rendered height (which can grow if the text wraps
  // to two lines on a narrow screen) so page layouts can add exactly
  // that much extra clearance under the navbar -- never more, never less.
  useEffect(()=>{
    if(!show){setBannerHeight(0);return;}
    const el=ref.current;
    if(!el)return;
    const ro=new ResizeObserver(entries=>{for(const entry of entries)setBannerHeight(entry.contentRect.height);});
    ro.observe(el);
    setBannerHeight(el.getBoundingClientRect().height);
    return()=>{ro.disconnect();setBannerHeight(0);};
  },[show,setBannerHeight]);

  if(!show)return null;

  const dismiss=()=>{sessionStorage.setItem('objicc_verify_dismissed','1');setDismissed(true);};

  const resend=async()=>{
    if(cooldown||!auth.currentUser)return;
    setSending(true);
    try{
      await sendEmailVerification(auth.currentUser);
      showToast('Verification email sent -- check your inbox.','success');
      setCooldown(true);setTimeout(()=>setCooldown(false),60000);
    }catch(err:any){
      showToast(err.code==='auth/too-many-requests'?'Please wait a bit before requesting another email.':'Could not send email -- try again shortly.','error');
    }finally{setSending(false);}
  };

  const checkNow=async()=>{
    setChecking(true);
    const verified=await refreshEmailVerified();
    setChecking(false);
    showToast(verified?'Email verified -- thanks!':'Not verified yet -- check your inbox (and spam folder).',verified?'success':'info');
  };

  return(<div ref={ref} className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50 px-4 py-2.5">
    <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
      <MailWarning className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"/>
      <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-bold flex-1 min-w-0">
        Please verify your email address ({firebaseUser.email}) to help keep your account secure.
        {' '}If it hasn't arrived within a few minutes, please check your spam or junk folder.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={resend} disabled={sending||cooldown} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-black uppercase tracking-widest">
          {sending?<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Send className="w-3 h-3"/>}
          {cooldown?'Sent':'Resend Email'}
        </button>
        <button onClick={checkNow} disabled={checking} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-black uppercase tracking-widest">
          {checking?<div className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin"/>:<RefreshCw className="w-3 h-3"/>}
          I've Verified
        </button>
        <button onClick={dismiss} className="p-1.5 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300" title="Dismiss for this session"><X className="w-4 h-4"/></button>
      </div>
    </div>
  </div>);
}
