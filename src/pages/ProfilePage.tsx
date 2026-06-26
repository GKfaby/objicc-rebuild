import{useState} from 'react';
import{User,Edit2,Save,X,School,Phone,Shield,Clock,LogOut} from 'lucide-react';
import{doc,updateDoc,serverTimestamp} from 'firebase/firestore';
import{signOut} from 'firebase/auth';
import{auth,db} from '../firebase';
import{useUser} from '../contexts/UserContext';
import{useToast} from '../contexts/ToastContext';
import{ROLE_LABELS} from '../types';
import{useNavigate} from 'react-router-dom';
export default function ProfilePage(){
  const{profile,refreshProfile,schools}=useUser();
  const{showToast}=useToast();
  const navigate=useNavigate();
  const[editing,setEditing]=useState(false);
  const[saving,setSaving]=useState(false);
  const[signingOut,setSigningOut]=useState(false);
  const[form,setForm]=useState({phone:profile?.phone||'',school:profile?.school||'',cadetSchool:profile?.cadetSchool||''});
  if(!profile)return null;
  const handleSave=async()=>{setSaving(true);
    try{const u:any={phone:form.phone,updatedAt:serverTimestamp()};
      if(profile.role==='cadet'||profile.requestedRole==='cadet')u.school=form.school;
      if(profile.role==='parent'||profile.requestedRole==='parent')u.cadetSchool=form.cadetSchool;
      await updateDoc(doc(db,'users',profile.uid),u);await refreshProfile();showToast('Profile updated!','success');setEditing(false);
    }catch{showToast('Failed to save.','error');}finally{setSaving(false);}};
  const handleSignOut=async()=>{if(!window.confirm('Sign out of OBJICC?'))return;setSigningOut(true);
    try{await signOut(auth);navigate('/');}catch{showToast('Failed to sign out.','error');setSigningOut(false);}};
  const roleLabel=ROLE_LABELS[profile.role]||profile.role;
  const isPending=['pending_cadet','pending_parent'].includes(profile.role);
  return(<div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
    <div className="container mx-auto px-4 max-w-3xl">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden mb-6">
        <div className="h-28 bg-gradient-to-r from-navy via-ocean to-navy/70"/>
        <div className="px-8 pb-8 -mt-14">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-800 overflow-hidden bg-navy flex items-center justify-center">
              {profile.avatarUrl?<img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover"/>:<User className="w-10 h-10 text-white/50"/>}
            </div>
          </div>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-navy dark:text-white">{profile.displayName}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {/* Role badge — proper contrast in both modes */}
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                  isPending
                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40'
                    : 'bg-navy/10 text-navy border-navy/20 dark:bg-gold/20 dark:text-gold dark:border-gold/30'
                }`}>
                  <Shield className="w-3 h-3"/>{roleLabel}
                </span>
                {isPending&&(
                  <span className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40">
                    Awaiting Approval
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!editing?(
                <button onClick={()=>setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-navy dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <Edit2 className="w-3 h-3"/>Edit
                </button>
              ):(
                <div className="flex gap-2">
                  <button onClick={()=>setEditing(false)} className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-navy dark:hover:text-white rounded-xl text-xs font-bold transition-colors"><X className="w-3 h-3"/>Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean disabled:opacity-60 transition-colors">
                    {saving?<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Save className="w-3 h-3"/>}Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 space-y-5 mb-4">
        <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm">Profile Details</h2>
        {[{label:'First Name',value:profile.firstName},{label:'Last Name',value:profile.lastName},{label:'Email',value:profile.email},...(profile.cadetName?[{label:'Cadet Name',value:profile.cadetName}]:[])].map(({label,value})=>(
          <div key={label}><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{label}</label>
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-600">{value||'—'}</div>
          </div>
        ))}
        <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Phone</label>
          {editing?(
            <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm border border-slate-200 dark:border-slate-600"/>
            </div>
          ):<div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-600">{profile.phone||'—'}</div>}
        </div>
        {(profile.role==='cadet'||profile.requestedRole==='cadet')&&<div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">School</label>
          {editing?(
            <select value={form.school} onChange={e=>setForm(p=>({...p,school:e.target.value}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none appearance-none text-sm border border-slate-200 dark:border-slate-600">
              {schools.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          ):<div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-600">{profile.school||'—'}</div>}
        </div>}
        <div className="pt-2 flex items-center gap-2 text-xs text-slate-400"><Clock className="w-3 h-3"/>Member since {profile.createdAt?.toDate?.().toLocaleDateString()||'recently'}</div>
      </div>

      <button onClick={handleSignOut} disabled={signingOut}
        className="w-full flex items-center justify-center gap-3 py-4 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 font-black rounded-2xl shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm uppercase tracking-widest border border-slate-100 dark:border-slate-700 disabled:opacity-60">
        {signingOut?<div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin"/>:<LogOut className="w-4 h-4"/>}
        {signingOut?'Signing out…':'Sign Out'}
      </button>
    </div>
  </div>);
}