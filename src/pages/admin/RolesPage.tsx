import{useState,useEffect} from 'react';
import{collection,onSnapshot,doc,setDoc,serverTimestamp} from 'firebase/firestore';
import{db} from '../../firebase';
import{Shield,Edit2,Save,X,Check,ChevronDown,ChevronUp,Lock} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import{useUser} from '../../contexts/UserContext';
import{DEFAULT_PERMISSIONS,ROLE_LABELS} from '../../types';
import type{Role,RolePermissions} from '../../types';
const SR:Array<{id:Role;color:string;desc:string}>=[
  {id:'super_admin',color:'bg-purple-100 text-purple-700',desc:'Full unrestricted access'},
  {id:'admin',color:'bg-blue-100 text-blue-700',desc:'Full administrative access'},
  {id:'staff',color:'bg-cyan-100 text-cyan-700',desc:'Manage users, content and merchandise'},
  {id:'recruitment_officer',color:'bg-teal-100 text-teal-700',desc:'Handle applications and enrollment'},
  {id:'editor',color:'bg-green-100 text-green-700',desc:'Create and manage posts'},
  {id:'cadet',color:'bg-amber-100 text-amber-700',desc:'Approved cadet member'},
  {id:'parent',color:'bg-orange-100 text-orange-700',desc:'Approved parent or guardian'},
  {id:'pending_cadet',color:'bg-slate-100 text-slate-600',desc:'Awaiting cadet approval'},
  {id:'pending_parent',color:'bg-slate-100 text-slate-600',desc:'Awaiting parent approval'},
];
const PL:{key:keyof RolePermissions;label:string;desc:string}[]=[
  {key:'viewAdminDashboard',label:'Admin Dashboard',desc:'Access the admin panel'},
  {key:'manageUsers',label:'Manage Users',desc:'View, edit and delete users'},
  {key:'manageRoles',label:'Manage Roles',desc:'Edit role permissions'},
  {key:'managePosts',label:'Manage Posts',desc:'Create, edit and delete posts'},
  {key:'manageMerchandise',label:'Manage Merchandise',desc:'Add and edit shop items'},
  {key:'manageApplications',label:'Manage Applications',desc:'Review enrollment applications'},
  {key:'manageRequests',label:'Manage Requests',desc:'Handle merch requests'},
  {key:'canViewUserUpdates',label:'Activity Log',desc:'See site-wide activity'},
  {key:'printPermissionSlips',label:'Permission Slips',desc:'Generate printable slips'},
  {key:'manageSettings',label:'Manage Settings',desc:'Edit site settings'},
  {key:'managePaymentGateways',label:'Payment Gateways',desc:'Configure Stripe/PayPal'},
];
export default function RolesPage(){
  const[data,setData]=useState<Record<string,any>>({});const[loading,setLoading]=useState(true);
  const[editId,setEditId]=useState<string|null>(null);const[editPerms,setEditPerms]=useState<RolePermissions>({...DEFAULT_PERMISSIONS.cadet});
  const[expandedId,setExpandedId]=useState<string|null>(null);const[saving,setSaving]=useState(false);
  const{showToast}=useToast();const{profile}=useUser();const isSA=profile?.role==='super_admin';
  useEffect(()=>{return onSnapshot(collection(db,'roles'),async snap=>{const d:Record<string,any>={};snap.docs.forEach(doc=>d[doc.id]={id:doc.id,...doc.data()});for(const{id}of SR){if(!d[id])await setDoc(doc(db,'roles',id),{name:ROLE_LABELS[id],description:SR.find(r=>r.id===id)?.desc||'',permissions:DEFAULT_PERMISSIONS[id]||{},isSystem:true,createdAt:serverTimestamp()});}setData(d);setLoading(false);});},[]);
  const startEdit=(r:any)=>{setEditId(r.id);setEditPerms({...DEFAULT_PERMISSIONS.visitor,...r.permissions});setExpandedId(r.id);};
  const savePerms=async(id:string)=>{setSaving(true);try{await setDoc(doc(db,'roles',id),{...data[id],permissions:editPerms,updatedAt:serverTimestamp()},{merge:true});showToast(`${ROLE_LABELS[id as Role]} updated!`,'success');setEditId(null);}catch{showToast('Failed.','error');}finally{setSaving(false);}};
  return(<div className="space-y-6 max-w-4xl">
    <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Roles & Permissions</h1><p className="text-slate-500 text-sm mt-1">{isSA?'Click Edit on any role to change permissions.':'View what each role can access.'}</p></div>
    {loading?<div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-20 animate-pulse"/>)}</div>
    :<div className="space-y-3">{SR.map(({id,color,desc})=>{
      const role=data[id]||{id,permissions:DEFAULT_PERMISSIONS[id]||{}};
      const isEdit=editId===id;const isExp=expandedId===id||isEdit;
      const perms=isEdit?editPerms:{...DEFAULT_PERMISSIONS.visitor,...role.permissions};
      const locked=id==='super_admin';const enabled=PL.filter(p=>perms[p.key]).length;
      return(<div key={id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="p-2 bg-navy/5 dark:bg-white/5 rounded-xl shrink-0"><Shield className="w-4 h-4 text-navy dark:text-gold"/></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><h3 className="font-black text-navy dark:text-white text-sm">{ROLE_LABELS[id]}</h3><span className={`px-2 py-0.5 rounded-full text-xs font-black ${color}`}>{id.replace(/_/g,' ')}</span>{locked&&<Lock className="w-3 h-3 text-slate-400"/>}</div>
            <p className="text-xs text-slate-400 mt-0.5">{desc} · {enabled}/{PL.length} permissions</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEdit?<>
              <button onClick={()=>setEditId(null)} className="flex items-center gap-1 px-3 py-1.5 text-slate-500 hover:text-navy rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600"><X className="w-3 h-3"/>Cancel</button>
              <button onClick={()=>savePerms(id)} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded-xl text-xs font-black hover:bg-ocean disabled:opacity-60">{saving?<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Save className="w-3 h-3"/>}Save</button>
            </>:<>
              {isSA&&!locked&&<button onClick={()=>startEdit(role)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-navy dark:text-white rounded-xl text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-600"><Edit2 className="w-3 h-3"/>Edit</button>}
              <button onClick={()=>setExpandedId(isExp?null:id)} className="p-1.5 text-slate-400 hover:text-navy dark:hover:text-white">{isExp?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button>
            </>}
          </div>
        </div>
        {isExp&&<div className="px-5 pb-5 border-t border-slate-50 dark:border-slate-700 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PL.map(({key,label,desc:pd})=>{const on=perms[key];return(<div key={key} onClick={()=>isEdit&&!locked&&setEditPerms(p=>({...p,[key]:!p[key]}))} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isEdit&&!locked?'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700':''} ${on?'bg-green-50/50 dark:bg-green-900/10':''}`}>
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${on?'bg-green-500':'bg-slate-200 dark:bg-slate-600'}`}>{on?<Check className="w-3 h-3 text-white"/>:<X className="w-3 h-3 text-slate-400"/>}</div>
              <div className="min-w-0"><p className={`text-xs font-bold ${on?'text-navy dark:text-white':'text-slate-400'}`}>{label}</p><p className="text-xs text-slate-400">{pd}</p></div>
              {isEdit&&!locked&&<div className={`ml-auto w-8 h-4 rounded-full transition-colors relative shrink-0 ${on?'bg-green-500':'bg-slate-200 dark:bg-slate-600'}`}><span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${on?'left-4':'left-0.5'}`}/></div>}
            </div>);})}
          </div>
          {isEdit&&<p className="text-xs text-slate-400 mt-3 text-center">Click any permission to toggle it</p>}
        </div>}
      </div>);
    })}</div>}
  </div>);
}