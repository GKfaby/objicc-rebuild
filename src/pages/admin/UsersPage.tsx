import{useState,useEffect,useMemo} from 'react';
import{collection,onSnapshot,doc,updateDoc,deleteDoc,serverTimestamp,addDoc,query,orderBy,getDocs,writeBatch} from 'firebase/firestore';
import{db} from '../../firebase';
import{Search,Check,X,Trash2,User,Shield,Mail,Phone,School,Calendar,Eye,Ban,ShieldOff,Users as UsersIcon,Clock,XCircle} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import{useUser} from '../../contexts/UserContext';
import{ROLE_LABELS} from '../../types';
import type{UserProfile,Role} from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';

const RC:Record<string,string>={
  super_admin:'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  admin:'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  staff:'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
  recruitment_officer:'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  editor:'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  cadet:'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  parent:'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  pending_cadet:'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  pending_parent:'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};
const CUSTOM_RC='bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200';

type Tab='current'|'pending'|'rejected';

export default function UsersPage(){
  const[users,setUsers]=useState<UserProfile[]>([]);const[loading,setLoading]=useState(true);
  const[roleDocs,setRoleDocs]=useState<Record<string,any>>({});
  const[search,setSearch]=useState('');const[roleFilter,setRoleFilter]=useState<string>('all');
  const[tab,setTab]=useState<Tab>('current');
  const[selected,setSelected]=useState<UserProfile|null>(null);
  const[confirmDelete,setConfirmDelete]=useState<UserProfile|null>(null);
  const[confirmBan,setConfirmBan]=useState<UserProfile|null>(null);
  const[confirmReject,setConfirmReject]=useState<UserProfile|null>(null);
  const[confirmClearRejected,setConfirmClearRejected]=useState(false);
  const[clearing,setClearing]=useState(false);
  const{showToast}=useToast();const{profile:me,permissions,hierarchy}=useUser();

  useEffect(()=>{return onSnapshot(collection(db,'roles'),snap=>{const d:Record<string,any>={};snap.docs.forEach(dc=>d[dc.id]={id:dc.id,...dc.data()});setRoleDocs(d);});},[]);

  // All known roles (built-in + custom), sorted by hierarchy rank (most
  // senior first). Falls back gracefully if a role somehow isn't in the
  // hierarchy map yet (treated as least senior, rank 9999).
  const allRoleIds=useMemo(()=>{
    const ids=new Set<string>([...Object.keys(RC),...Object.keys(roleDocs)]);
    return Array.from(ids).sort((a,b)=>rankOf(a)-rankOf(b));
    function rankOf(id:string){return hierarchy[id]??9999;}
  },[roleDocs,hierarchy]);

  const roleLabel=(id:string)=>(id in ROLE_LABELS?ROLE_LABELS[id as Role]:roleDocs[id]?.name)||id.replace(/_/g,' ');
  const roleColor=(id:string)=>RC[id]||CUSTOM_RC;

  const rankOf=(id:string)=>hierarchy[id]??9999;
  const myRank=rankOf(me?.role||'');

  // Hierarchy-based management: you can only act on (edit role, ban,
  // delete) someone whose role ranks strictly BELOW your own -- never a
  // peer, never someone above you. Super Admin sits at rank 0, so nobody
  // -- not even another Super Admin -- can manage a Super Admin target.
  const canManageTarget=(u:UserProfile)=>!!permissions.manageUsers&&rankOf(u.role)>myRank;

  // Roles selectable in the dropdown for a given user -- only roles
  // ranked below your own, so there's no way to promote someone to your
  // level or above from here.
  const selectableRoles=(u:UserProfile)=>allRoleIds.filter(r=>rankOf(r)>myRank||r===u.role);

  useEffect(()=>{const q=query(collection(db,'users'),orderBy('createdAt','desc'));return onSnapshot(q,snap=>{setUsers(snap.docs.map(d=>({uid:d.id,...d.data()} as UserProfile)));setLoading(false);});},[]);

  const notify=async(uid:string,title:string,message:string,type='info')=>{await addDoc(collection(db,'users',uid,'notifications'),{title,message,type,read:false,createdAt:serverTimestamp()});};

  const approveRole=async(u:UserProfile)=>{const r:Role=u.requestedRole==='cadet'?'cadet':'parent';await updateDoc(doc(db,'users',u.uid),{role:r,status:'approved',updatedAt:serverTimestamp()});await notify(u.uid,'Role Approved!',`Your role has been updated to ${roleLabel(r)}. Welcome!`,'success');showToast(`${u.displayName} approved as ${roleLabel(r)}`,'success');setSelected(null);};

  const rejectRole=async(u:UserProfile)=>{await updateDoc(doc(db,'users',u.uid),{status:'rejected',updatedAt:serverTimestamp()});await notify(u.uid,'Role Request Declined','Your role request was not approved.','warning');showToast(`${u.displayName} moved to Rejected`,'warning');setSelected(null);setConfirmReject(null);};

  const changeRole=async(u:UserProfile,r:string)=>{
    if(!canManageTarget(u)||rankOf(r)<=myRank){showToast('You can only assign roles ranked below you in the hierarchy.','error');return;}
    if(u.uid===me?.uid&&!window.confirm('Change your own role?'))return;
    await updateDoc(doc(db,'users',u.uid),{role:r,updatedAt:serverTimestamp()});await notify(u.uid,'Role Updated',`Your role has been changed to ${roleLabel(r)}.`,'info');showToast(`${u.displayName} -> ${roleLabel(r)}`,'success');};

  // Removes a user's profile + notifications from Firestore entirely.
  // Used for: the general Delete button, and clearing people out of the
  // Rejected tab (individually or via Clear List). Rejecting someone by
  // itself never deletes their data -- only these paths do.
  const purgeUser=async(uid:string)=>{
    const notifSnap=await getDocs(collection(db,'users',uid,'notifications'));
    if(!notifSnap.empty){const batch=writeBatch(db);notifSnap.docs.forEach(d=>batch.delete(d.ref));await batch.commit();}
    await deleteDoc(doc(db,'users',uid));
  };

  const performDelete=async(u:UserProfile)=>{
    if(u.uid===me?.uid){showToast("Cannot delete yourself.",'error');setConfirmDelete(null);return;}
    if(!canManageTarget(u)){showToast('You can only manage users ranked below you in the hierarchy.','error');setConfirmDelete(null);return;}
    await purgeUser(u.uid);
    showToast(`${u.displayName} deleted`,'info');
    setSelected(null);setConfirmDelete(null);
  };

  const performBanToggle=async(u:UserProfile)=>{
    if(u.uid===me?.uid){showToast("Cannot restrict yourself.",'error');setConfirmBan(null);return;}
    if(!canManageTarget(u)){showToast('You can only manage users ranked below you in the hierarchy.','error');setConfirmBan(null);return;}
    const next=!u.banned;
    await updateDoc(doc(db,'users',u.uid),{banned:next,bannedAt:next?serverTimestamp():null});
    if(next)await notify(u.uid,'Account Restricted','Your account has been restricted. Contact an administrator for details.','warning');
    else await notify(u.uid,'Account Restored','Your account access has been restored.','success');
    showToast(next?`${u.displayName} restricted`:`${u.displayName} restored`,next?'warning':'success');
    setSelected(p=>p&&p.uid===u.uid?{...p,banned:next}:p);setConfirmBan(null);
  };

  const filtered=users.filter(u=>{const q=search.toLowerCase();return(!q||[u.displayName,u.email,u.firstName,u.lastName].some(v=>v?.toLowerCase().includes(q)))&&(roleFilter==='all'||u.role===roleFilter);});
  const pending=filtered.filter(u=>['pending_cadet','pending_parent'].includes(u.role)&&u.status!=='rejected');
  const rejected=filtered.filter(u=>u.status==='rejected');
  const others=filtered.filter(u=>!['pending_cadet','pending_parent'].includes(u.role));

  const clearRejectedList=async()=>{
    setClearing(true);
    try{for(const u of rejected)await purgeUser(u.uid);showToast(`Cleared ${rejected.length} rejected user${rejected.length===1?'':'s'}`,'info');}
    finally{setClearing(false);setConfirmClearRejected(false);}
  };

  const TABS:{id:Tab;label:string;icon:any;count:number}[]=[
    {id:'current',label:'Current Users',icon:UsersIcon,count:others.length},
    {id:'pending',label:'Awaiting Approval',icon:Clock,count:pending.length},
    {id:'rejected',label:'Rejected',icon:XCircle,count:rejected.length},
  ];

  return(<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Users</h1><p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{users.length} total members</p></div></div>

    <div className="flex gap-2 flex-wrap border-b border-slate-200 dark:border-slate-700">
      {TABS.map(t=>{const Icon=t.icon;const active=tab===t.id;return(
        <button key={t.id} onClick={()=>setTab(t.id)}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${active?'border-navy dark:border-gold text-navy dark:text-white':'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
          <Icon className="w-3.5 h-3.5"/>{t.label}
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active?'bg-navy text-white dark:bg-gold dark:text-navy':'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{t.count}</span>
        </button>
      );})}
    </div>

    <div className="flex gap-3 flex-wrap">
      <div className="relative flex-1 min-w-52"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-navy dark:text-white outline-none"/></div>
      {tab==='current'&&<select value={roleFilter} onChange={e=>setRoleFilter(e.target.value as any)} className="px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-navy dark:text-white outline-none">
        <option value="all">All roles ({users.length})</option>{allRoleIds.map(r=><option key={r} value={r}>{roleLabel(r)} ({users.filter(u=>u.role===r).length})</option>)}
      </select>}
      {tab==='rejected'&&rejected.length>0&&<button onClick={()=>setConfirmClearRejected(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"><Trash2 className="w-4 h-4"/>Clear List</button>}
    </div>

    {tab==='pending'&&(pending.length===0?<p className="text-slate-400 text-sm py-8 text-center">No one is currently awaiting approval.</p>:
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">{pending.map(u=><div key={u.uid} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0"><p className="font-black text-navy dark:text-white">{u.displayName}</p><p className="text-xs text-slate-600 dark:text-slate-400">{u.email}</p><p className="text-xs text-amber-800 dark:text-amber-300 mt-1">Requesting: <strong>{u.requestedRole}</strong>{u.school&&` · ${u.school}`}</p></div>
        <div className="flex gap-2 shrink-0">
          <button onClick={()=>setSelected(u)} className="p-2 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded-xl"><Eye className="w-4 h-4 text-amber-800 dark:text-amber-300"/></button>
          <button onClick={()=>approveRole(u)} className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"><Check className="w-3 h-3"/>Approve</button>
          <button onClick={()=>setConfirmReject(u)} className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-black uppercase tracking-widest"><X className="w-3 h-3"/>Reject</button>
        </div>
      </div>)}</div>)}

    {tab==='rejected'&&(rejected.length===0?<p className="text-slate-400 text-sm py-8 text-center">No rejected applications.</p>:
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">{rejected.map(u=><div key={u.uid} className="bg-slate-100 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0"><p className="font-black text-navy dark:text-white">{u.displayName}</p><p className="text-xs text-slate-600 dark:text-slate-400">{u.email}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Requested: <strong>{u.requestedRole}</strong>{u.school&&` · ${u.school}`}</p></div>
        <div className="flex gap-2 shrink-0">
          <button onClick={()=>setSelected(u)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl"><Eye className="w-4 h-4 text-slate-600 dark:text-slate-300"/></button>
          <button onClick={()=>approveRole(u)} className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"><Check className="w-3 h-3"/>Approve</button>
          <button onClick={()=>setConfirmDelete(u)} disabled={!canManageTarget(u)} title={canManageTarget(u)?'':'Only for users ranked below you in the hierarchy'} className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 className="w-3 h-3"/>Delete</button>
        </div>
      </div>)}</div>)}

    {tab==='current'&&<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
          {['User','Role','Info','Joined',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 first:pl-5">{h}</th>)}
        </tr></thead>
      </table>
      <div className="max-h-[560px] overflow-y-auto">
      <table className="w-full text-sm">
        <tbody>{loading?[...Array(5)].map((_,i)=><tr key={i}><td colSpan={5} className="px-5 py-3"><div className="h-8 bg-slate-50 dark:bg-slate-700 rounded-lg animate-pulse"/></td></tr>)
        :others.length===0?<tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">No users found.</td></tr>
        :others.map(u=><tr key={u.uid} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
          <td className="px-5 py-3"><div className="flex items-center gap-3">{u.avatarUrl?<img src={u.avatarUrl} className="w-9 h-9 rounded-xl object-cover shrink-0" alt=""/>:<div className="w-9 h-9 rounded-xl bg-navy/10 dark:bg-navy/40 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-navy/60 dark:text-white/40"/></div>}<div className="min-w-0"><p className="font-bold text-navy dark:text-white truncate flex items-center gap-1.5">{u.displayName}{u.banned&&<span className="px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-[10px] font-black uppercase tracking-widest shrink-0">Restricted</span>}</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p></div></div></td>
          <td className="px-4 py-3"><select value={u.role} onChange={e=>changeRole(u,e.target.value)} disabled={!canManageTarget(u)} title={canManageTarget(u)?'':'Only for users ranked below you in the hierarchy'} className={`px-2 py-1.5 rounded-lg text-xs font-black outline-none border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${roleColor(u.role)}`}>{selectableRoles(u).map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}</select></td>
          <td className="px-4 py-3 hidden lg:table-cell"><div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">{u.phone&&<div className="flex items-center gap-1"><Phone className="w-3 h-3"/>{u.phone}</div>}{u.school&&<div className="flex items-center gap-1"><School className="w-3 h-3"/>{u.school}</div>}</div></td>
          <td className="px-4 py-3 hidden lg:table-cell"><div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Calendar className="w-3 h-3"/>{u.createdAt?.toDate?.().toLocaleDateString()}</div></td>
          <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
            <button onClick={()=>setSelected(u)} className="p-1.5 hover:bg-navy/10 dark:hover:bg-white/10 rounded-lg" title="View"><Eye className="w-4 h-4 text-navy/60 dark:text-white/60"/></button>
            <button onClick={()=>setConfirmBan(u)} disabled={!canManageTarget(u)} className={`p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${u.banned?'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20':'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`} title={!canManageTarget(u)?'Only for users ranked below you in the hierarchy':u.banned?'Restore access':'Restrict user'}>{u.banned?<ShieldOff className="w-4 h-4"/>:<Ban className="w-4 h-4"/>}</button>
            <button onClick={()=>setConfirmDelete(u)} disabled={!canManageTarget(u)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" title={!canManageTarget(u)?'Only for users ranked below you in the hierarchy':'Delete'}><Trash2 className="w-4 h-4"/></button>
          </div></td>
        </tr>)}</tbody>
      </table>
      </div>
    </div>}

    {selected&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          {selected.avatarUrl?<img src={selected.avatarUrl} className="w-10 h-10 rounded-xl object-cover" alt=""/>:<div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center"><User className="w-5 h-5 text-navy/60"/></div>}
          <div className="flex-1 min-w-0"><p className="font-black text-navy dark:text-white truncate">{selected.displayName}</p><span className={`px-2 py-0.5 rounded-full text-xs font-black ${roleColor(selected.role)}`}>{roleLabel(selected.role)}</span></div>
          <button onClick={()=>setSelected(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[{icon:Mail,label:'Email',value:selected.email},{icon:Phone,label:'Phone',value:selected.phone},{icon:School,label:'School',value:selected.school},{icon:Calendar,label:'Joined',value:selected.createdAt?.toDate?.().toLocaleDateString()},{icon:Shield,label:'Status',value:selected.status}].filter(r=>r.value).map(({icon:Icon,label,value})=>(
            <div key={label} className="flex items-center gap-3"><div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg shrink-0"><Icon className="w-3 h-3 text-slate-500 dark:text-slate-400"/></div><div><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{label}</p><p className="text-sm text-navy dark:text-white font-bold">{value}</p></div></div>
          ))}
        </div>
        {['pending_cadet','pending_parent'].includes(selected.role)&&selected.status!=='rejected'&&<div className="px-6 pb-4 flex gap-2">
          <button onClick={()=>approveRole(selected)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest"><Check className="w-4 h-4"/>Approve</button>
          <button onClick={()=>setConfirmReject(selected)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-700 dark:text-red-300 font-black rounded-xl text-xs uppercase tracking-widest"><X className="w-4 h-4"/>Reject</button>
        </div>}
        {selected.status==='rejected'&&<div className="px-6 pb-4 flex gap-2">
          <button onClick={()=>approveRole(selected)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest"><Check className="w-4 h-4"/>Approve</button>
          <button onClick={()=>setConfirmDelete(selected)} disabled={!canManageTarget(selected)} title={canManageTarget(selected)?'':'Only for users ranked below you in the hierarchy'} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-700 dark:text-red-300 font-black rounded-xl text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 className="w-4 h-4"/>Delete</button>
        </div>}
        <div className="px-6 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4 space-y-2">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Change Role</p>
          <select value={selected.role} onChange={e=>{changeRole(selected,e.target.value);setSelected({...selected,role:e.target.value});}} disabled={!canManageTarget(selected)} title={canManageTarget(selected)?'':'Only for users ranked below you in the hierarchy'} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">
            {selectableRoles(selected).map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
          <button onClick={()=>setConfirmBan(selected)} disabled={!canManageTarget(selected)} title={canManageTarget(selected)?'':'Only for users ranked below you in the hierarchy'} className={`w-full py-2.5 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${selected.banned?'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20':'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>{selected.banned?<><ShieldOff className="w-4 h-4"/>Restore Access</>:<><Ban className="w-4 h-4"/>Restrict User</>}</button>
          <button onClick={()=>setConfirmDelete(selected)} disabled={!canManageTarget(selected)} title={canManageTarget(selected)?'':'Only for users ranked below you in the hierarchy'} className="w-full py-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Delete User</button>
        </div>
      </div>
    </div>)}

    <ConfirmDialog
      open={!!confirmReject}
      title="Reject this application?"
      message={`${confirmReject?.displayName}'s application will be moved to the Rejected tab. They'll be notified. Their data isn't deleted unless you remove them from that tab later.`}
      confirmLabel="Reject"
      danger
      onCancel={()=>setConfirmReject(null)}
      onConfirm={()=>confirmReject&&rejectRole(confirmReject)}
    />
    <ConfirmDialog
      open={!!confirmDelete}
      title="Delete this user?"
      message={`This permanently removes ${confirmDelete?.displayName}'s profile and notifications from the database. This cannot be undone.`}
      confirmLabel="Delete"
      danger
      onCancel={()=>setConfirmDelete(null)}
      onConfirm={()=>confirmDelete&&performDelete(confirmDelete)}
    />
    <ConfirmDialog
      open={!!confirmBan}
      title={confirmBan?.banned?'Restore this user\'s access?':'Restrict this user?'}
      message={confirmBan?.banned
        ?`${confirmBan?.displayName} will regain full access to their account.`
        :`${confirmBan?.displayName} will be signed out and blocked from logging back in until restored. Their data is kept, nothing is deleted.`}
      confirmLabel={confirmBan?.banned?'Restore':'Restrict'}
      danger={!confirmBan?.banned}
      onCancel={()=>setConfirmBan(null)}
      onConfirm={()=>confirmBan&&performBanToggle(confirmBan)}
    />
    <ConfirmDialog
      open={confirmClearRejected}
      title="Clear the entire Rejected list?"
      message={`This permanently deletes all ${rejected.length} rejected user${rejected.length===1?'':'s'} -- profile and notifications -- from the database. This cannot be undone.`}
      confirmLabel={clearing?'Clearing...':'Clear List'}
      danger
      onCancel={()=>setConfirmClearRejected(false)}
      onConfirm={clearRejectedList}
    />
  </div>);
}
