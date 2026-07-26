import{useState} from 'react';
import{Lock,Eye,EyeOff,KeyRound,CheckCircle2} from 'lucide-react';
import{
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  linkWithCredential,
} from 'firebase/auth';
import{auth} from '../../firebase';
import{useToast} from '../../contexts/ToastContext';

const validatePw=(pw:string,confirm:string)=>{
  if(pw.length<8)throw new Error('Password must be at least 8 characters.');
  if(!/[A-Z]/.test(pw))throw new Error('Password must contain at least one uppercase letter.');
  if(!/[!@#$%^&*(),.?":{}|<>]/.test(pw))throw new Error('Password must contain at least one symbol.');
  if(pw!==confirm)throw new Error('Passwords do not match.');
};

export default function ChangePasswordCard(){
  const{showToast}=useToast();
  const user=auth.currentUser;
  const hasPasswordProvider=!!user?.providerData.some(p=>p.providerId==='password');

  const[currentPassword,setCurrentPassword]=useState('');
  const[newPassword,setNewPassword]=useState('');
  const[confirmPassword,setConfirmPassword]=useState('');
  const[showCurrent,setShowCurrent]=useState(false);
  const[showNew,setShowNew]=useState(false);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');

  const reset=()=>{setCurrentPassword('');setNewPassword('');setConfirmPassword('');};

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    setError('');
    if(!user||!user.email){setError('Session expired. Please sign in again.');return;}
    setLoading(true);
    try{
      validatePw(newPassword,confirmPassword);
      if(hasPasswordProvider){
        // Firebase requires a recent sign-in for sensitive actions like
        // changing a password, so we re-verify their current password first.
        const credential=EmailAuthProvider.credential(user.email,currentPassword);
        await reauthenticateWithCredential(user,credential);
        await updatePassword(user,newPassword);
        showToast('Password updated!','success');
      }else{
        // Google-only account — this links email/password sign-in for the
        // first time rather than changing an existing password.
        const credential=EmailAuthProvider.credential(user.email,newPassword);
        await linkWithCredential(user,credential);
        showToast('Password set! You can now sign in with your email too.','success');
      }
      reset();
    }catch(err:any){
      if(err.code==='auth/wrong-password'||err.code==='auth/invalid-credential')setError('Your current password is incorrect.');
      else if(err.code==='auth/too-many-requests')setError('Too many attempts. Please try again later.');
      else if(err.code==='auth/requires-recent-login')setError('For your security, please sign out and back in, then try again.');
      else setError(err.message||'Something went wrong.');
    }finally{setLoading(false);}
  };

  const pwStr=newPassword?[newPassword.length>=8,/[A-Z]/.test(newPassword),/[0-9]/.test(newPassword),/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)].filter(Boolean).length:0;
  const pwCols=['bg-red-400','bg-orange-400','bg-yellow-400','bg-green-400'];

  return(<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 space-y-5 mb-4">
    <div className="flex items-center gap-2">
      <KeyRound className="w-4 h-4 text-slate-400"/>
      <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm">
        {hasPasswordProvider?'Change Password':'Set a Password'}
      </h2>
    </div>
    {!hasPasswordProvider&&<p className="text-xs text-slate-400 -mt-3">You currently sign in with Google only. Set a password to also sign in with your email.</p>}
    {error&&<div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-bold rounded-r-lg">{error}</div>}
    <form onSubmit={handleSubmit} className="space-y-4">
      {hasPasswordProvider&&<div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Current Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input required type={showCurrent?'text':'password'} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm border border-slate-200 dark:border-slate-600"/>
          <button type="button" onClick={()=>setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showCurrent?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
        </div>
      </div>}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input required type={showNew?'text':'password'} value={newPassword} onChange={e=>setNewPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm border border-slate-200 dark:border-slate-600"/>
          <button type="button" onClick={()=>setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showNew?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
        </div>
        {newPassword&&<div className="flex gap-1 mt-2 items-center">{[0,1,2,3].map(i=><div key={i} className={`h-1 flex-1 rounded-full ${i<pwStr?pwCols[pwStr-1]:'bg-slate-100 dark:bg-slate-700'}`}/>)}<span className="text-xs text-slate-400 ml-1">{['','Weak','Fair','Good','Strong'][pwStr]}</span></div>}
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confirm New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input required type={showNew?'text':'password'} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm border border-slate-200 dark:border-slate-600"/>
          {confirmPassword&&<span className={`absolute right-3 top-1/2 -translate-y-1/2 ${newPassword===confirmPassword?'text-green-500':'text-red-400'}`}><CheckCircle2 className="w-4 h-4"/></span>}
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-navy text-white font-black rounded-xl hover:bg-ocean transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs shadow-sm disabled:opacity-60">
        {loading?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<KeyRound className="w-4 h-4"/>}
        {loading?'Saving...':hasPasswordProvider?'Update Password':'Set Password'}
      </button>
    </form>
  </div>);
}
