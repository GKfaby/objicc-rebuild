import{useState,useEffect} from 'react';
import{collection,onSnapshot,doc,updateDoc,deleteDoc,serverTimestamp,addDoc,query,orderBy} from 'firebase/firestore';
import{db} from '../../firebase';
import{Search,Check,X,Trash2,User,Shield,Mail,Phone,School,Calendar,Eye} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import{useUser} from '../../contexts/UserContext';
import{ROLE_LABELS,SYSTEM_ROLES} from '../../types';
import type{UserProfile,Role} from '../../types';
const RC:Record<string,string>={super_admin:'bg-purple-100 text-purple-700',admin:'bg-blue-100 text-blue-700',staff:'bg-cyan-100 text-cyan-700',recruitment_officer:'bg-teal-100 text-teal-700',editor:'bg-green-100 text-green-700',cadet:'bg-amber-100 text-amber-700',parent:'bg-orange-100 text-orange-700',pending_cadet:'bg-slate-100 text-slate-600',pending_parent:'bg-slate-100 text-slate-600'};
export default function UsersPage(){
  const[users,setUsers]=useState<UserProfile[]>([]);const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState('');const[roleFilter,setRoleFilter]=useState<Role|'all'>('all');
  const[selected,setSelected]=useState<UserProfile|null>(null);
  const{showToast}=useToast();const{profile:me}=useUser();
  useEffect(()=>{const q=query(collection(db,'users'),orderBy('createdAt','desc'));return onSnapshot(q,snap=>{setUsers(snap.docs.map(d=>({uid:d.id,...d.data()} as UserProfile)));setLoading(false);});},[]);
  const notify=async(uid:string,title:string,message:string,type='info')=>{await addDoc(collection(db,'users',uid,'notifications'),{title,message,type,read:false,createdAt:serverTimestamp()});};
  const approveRole=async(u:UserProfile)=>{const r:Role=u.requestedRole==='cadet'?'cadet':'parent';await updateDoc(doc(db,'users',u.uid),{role:r,status:'approved',updatedAt:serverTimestamp()});await notify(u.uid,'Role Approved!',`Your role has been updated to ${ROLE_LABELS[r]}. Welcome!`,'success');showToast(`${u.displayName} approved as ${ROLE_LABELS[r]}`,'success');setSelected(null);};
  const rejectRole=async(u:UserProfile)=>{await updateDoc(doc(db,'users',u.uid),{status:'rejected',updatedAt:serverTimestamp()});await notify(u.uid,'Role Request Declined','Your role request was not approved. Please contact us.','warning');showToast(`${u.displayName} rejected`,'warning');setSelected(null);};
  const changeRole=async(u:UserProfile,r:Role)=>{if(u.uid===me?.uid&&r!=='super_admin'&&!window.confirm('Change your own role? You may lose access.'))return;await updateDoc(doc(db,'users',u.uid),{role:r,updatedAt:serverTimestamp()});await notify(u.uid,'Role Updated',`Your role has been changed to ${ROLE_LABELS[r]}.`,'info');showToast(`${u.displayName} → ${ROLE_LABELS[r]}`,'success');};
  const delUser=async(u:UserProfile)=>{if(u.uid===me?.uid){showToast("Cannot delete yourself.",'error');return;}if(!window.confirm(`Delete ${u.displayName}?`))return;await deleteDoc(doc(db,'users',u.uid));showToast(`${u.displayName} deleted`,'info');setSelected(null);};
  const filtered=users.filter(u=>{const q=search.toLowerCase();return(!q||[u.displayName,u.email,u.firstName,u.lastName].some(v=>v?.toLowerCase().includes(q)))&&(roleFilter==='all'||u.role===roleFilter);});
  const pending=filtered.filter(u=>['pending_cadet','pending_parent'].includes(u.role));
  const others=filtered.filter(u=>!['pending_cadet','pending_parent'].includes(u.role));
  return(<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Users</h1><p className="text-slate-500 text-sm mt-1">{users.length} total members</p></div></div>
    <div className="flex gap-3 flex-wrap">
      <div className="relative flex-1 min-w-52"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-navy dark:text-white outline-none"/></div>
      <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value as any)} className="px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-navy dark:text-white outline-none">
        <option value="all">All roles ({users.length})</option>{SYSTEM_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]} ({users.filter(u=>u.role===r).length})</option>)}
      </select>
    </div>
    {pending.length>0&&<div>
      <h2 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block"/>Pending Approvals ({pending.length})</h2>
      <div className="space-y-2">{pending.map(u=><div key={u.uid} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0"><p className="font-black text-navy dark:text-white">{u.displayName}</p><p className="text-xs text-slate-500">{u.email}</p><p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Requesting: <strong>{u.requestedRole}</strong>{u.school&&` · ${u.school}`}{u.cadetSchool&&` · Cadet at ${u.cadetSchool}`}</p></div>
        <div className="flex gap-2 shrink-0">
          <button onClick={()=>setSelected(u)} className="p-2 hover:bg-amber-100 rounded-xl"><Eye className="w-4 h-4 text-amber-700"/></button>
          <button onClick={()=>approveRole(u)} className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"><Check className="w-3 h-3"/>Approve</button>
          <button onClick={()=>rejectRole(u)} className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-black uppercase tracking-widest"><X className="w-3 h-3"/>Reject</button>
        </div>
      </div>)}</div>
    </div>}
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
          {['User','Role','Info','Joined',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 first:pl-5 last:pr-4">{h}</th>)}
        </tr></thead>
        <tbody>{loading?[...Array(5)].map((_,i)=><tr key={i}><td colSpan={5} className="px-5 py-3"><div className="h-8 bg-slate-50 dark:bg-slate-700 rounded-lg animate-pulse"/></td></tr>)
        :others.length===0?<tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">No users found.</td></tr>
        :others.map(u=><tr key={u.uid} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
          <td className="px-5 py-3"><div className="flex items-center gap-3">{u.avatarUrl?<img src={u.avatarUrl} className="w-9 h-9 rounded-xl object-cover shrink-0" alt=""/>:<div className="w-9 h-9 rounded-xl bg-navy/10 dark:bg-navy/40 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-navy/40"/></div>}<div className="min-w-0"><p className="font-bold text-navy dark:text-white truncate">{u.displayName}</p><p className="text-xs text-slate-400 truncate">{u.email}</p></div></div></td>
          <td className="px-4 py-3"><select value={u.role} onChange={e=>changeRole(u,e.target.value as Role)} className={`px-2 py-1.5 rounded-lg text-xs font-black outline-none border-none cursor-pointer ${RC[u.role]||'bg-slate-100 text-slate-600'}`}>{SYSTEM_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></td>
          <td className="px-4 py-3 hidden lg:table-cell"><div className="text-xs text-slate-400 space-y-0.5">{u.phone&&<div className="flex items-center gap-1"><Phone className="w-3 h-3"/>{u.phone}</div>}{u.school&&<div className="flex items-center gap-1"><School className="w-3 h-3"/>{u.school}</div>}</div></td>
          <td className="px-4 py-3 hidden lg:table-cell"><div className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="w-3 h-3"/>{u.createdAt?.toDate?.().toLocaleDateString()}</div></td>
          <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
            <button onClick={()=>setSelected(u)} className="p-1.5 hover:bg-navy/10 rounded-lg"><Eye className="w-4 h-4 text-navy/40 dark:text-white/40"/></button>
            <button onClick={()=>delUser(u)} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4"/></button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    {selected&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          {selected.avatarUrl?<img src={selected.avatarUrl} className="w-10 h-10 rounded-xl object-cover" alt=""/>:<div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center"><User className="w-5 h-5 text-navy/40"/></div>}
          <div className="flex-1 min-w-0"><p className="font-black text-navy dark:text-white truncate">{selected.displayName}</p><span className={`px-2 py-0.5 rounded-full text-xs font-black ${RC[selected.role]||'bg-slate-100 text-slate-600'}`}>{ROLE_LABELS[selected.role]}</span></div>
          <button onClick={()=>setSelected(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[{icon:Mail,label:'Email',value:selected.email},{icon:Phone,label:'Phone',value:selected.phone},{icon:School,label:'School',value:selected.school},{icon:School,label:"Cadet School",value:selected.cadetSchool},{icon:Shield,label:'Status',value:selected.status},{icon:Calendar,label:'Joined',value:selected.createdAt?.toDate?.().toLocaleDateString()}].filter(r=>r.value).map(({icon:Icon,label,value})=>(
            <div key={label} className="flex items-center gap-3"><div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg shrink-0"><Icon className="w-3 h-3 text-slate-400"/></div><div><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{label}</p><p className="text-sm text-navy dark:text-white font-bold">{value}</p></div></div>
          ))}
        </div>
        {['pending_cadet','pending_parent'].includes(selected.role)&&<div className="px-6 pb-4 flex gap-2">
          <button onClick={()=>approveRole(selected)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest"><Check className="w-4 h-4"/>Approve</button>
          <button onClick={()=>rejectRole(selected)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-black rounded-xl text-xs uppercase tracking-widest"><X className="w-4 h-4"/>Reject</button>
        </div>}
        <div className="px-6 pb-4 border-t border-slate-100 dark:border-slate-700 pt-4 space-y-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Change Role</p>
          <select value={selected.role} onChange={e=>{changeRole(selected,e.target.value as Role);setSelected({...selected,role:e.target.value as Role});}} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none">
            {SYSTEM_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button onClick={()=>delUser(selected)} className="w-full py-2.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold rounded-xl text-xs uppercase tracking-widest">Delete User</button>
        </div>
      </div>
    </div>)}
  </div>);
}