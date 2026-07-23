import{useState,useEffect} from 'react';
import{collection,onSnapshot,doc,setDoc,serverTimestamp} from 'firebase/firestore';
import{db} from '../../firebase';
import{Shield,Edit2,Save,X,Check,ChevronDown,ChevronUp,Lock} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import{useUser} from '../../contexts/UserContext';
import{DEFAULT_PERMISSIONS,ROLE_LABELS} from '../../types';
import type{Role,RolePermissions} from '../../types';

const SR:{id:Role;color:string;desc:string}[]=[
  {id:'super_admin',color:'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',desc:'Full unrestricted access'},
  {id:'admin',color:'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',desc:'Full administrative access'},
  {id:'staff',color:'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',desc:'Manage users, content and merchandise'},
  {id:'recruitment_officer',color:'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',desc:'Handle applications and enrollment'},
  {id:'editor',color:'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',desc:'Create and manage posts'},
  {id:'cadet',color:'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',desc:'Approved cadet member'},
  {id:'parent',color:'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',desc:'Approved parent or guardian'},
  {id:'pending_cadet',color:'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',desc:'Awaiting cadet approval'},
  {id:'pending_parent',color:'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',desc:'Awaiting parent approval'},
];

const PL:{key:keyof RolePermissions;label:string;desc:string}[]=[
  {key:'viewAdminDashboard',  label:'Admin Dashboard',      desc:'Access the admin panel'},
  {key:'manageUsers',         label:'Manage Users',         desc:'View, edit and delete users'},
  {key:'manageRoles',         label:'Manage Roles',         desc:'Edit role permissions'},
  {key:'managePosts',         label:'Manage Posts',         desc:'Create, edit and delete posts'},
  {key:'manageMerchandise',   label:'Manage Merchandise',   desc:'Add and edit shop items'},
  {key:'manageRequests',      label:'Manage Requests',      desc:'Handle merch requests'},
  {key:'manageOrders',        label:'Manage Orders',        desc:'Undo orders, restore from recycle bin, empty bin'},
  {key:'manageApplications',  label:'Manage Applications',  desc:'Review enrollment applications'},
  {key:'canViewUserUpdates',  label:'Activity Log',         desc:'See site-wide activity'},
  {key:'printPermissionSlips',label:'Permission Slips',     desc:'Generate printable slips'},
  {key:'manageSettings',      label:'Manage Settings',      desc:'Edit site settings'},
  {key:'managePaymentGateways',label:'Payment Gateways',    desc:'Configure Stripe/PayPal'},
];

export default function RolesPage(){
  const[data,setData]=useState<Record<string,any>>({});
  const[loading,setLoading]=useState(true);
  const[editId,setEditId]=useState<string|null>(null);
  const[editPerms,setEditPerms]=useState<RolePermissions>({...DEFAULT_PERMISSIONS.cadet});
  const[expandedId,setExpandedId]=useState<string|null>(null);
  const[saving,setSaving]=useState(false);
  const{showToast}=useToast();
  const{profile}=useUser();
  const isSA=profile?.role==='super_admin';

  useEffect(()=>{
    return onSnapshot(collection(db,'roles'),async snap=>{
      const d:Record<string,any>={};
      snap.docs.forEach(dc=>d[dc.id]={id:dc.id,...dc.data()});
      for(const{id}of SR){
        if(!d[id]){
          await setDoc(doc(db,'roles',id),{
            name:ROLE_LABELS[id],
            description:SR.find(r=>r.id===id)?.desc||'',
            permissions:DEFAULT_PERMISSIONS[id]||{},
            isSystem:true,createdAt:serverTimestamp(),
          });
        }else if(id==='super_admin'){
          await setDoc(doc(db,'roles',id),{permissions:DEFAULT_PERMISSIONS[id]},{merge:true});
        }
      }
      setData(d);setLoading(false);
    });
  },[]);

  const startEdit=(r:any)=>{
    setEditId(r.id);
    setEditPerms({...DEFAULT_PERMISSIONS.visitor,...r.permissions});
    setExpandedId(r.id);
  };
  const savePerms=async(id:string)=>{
    setSaving(true);
    try{
      await setDoc(doc(db,'roles',id),{...data[id],permissions:editPerms,updatedAt:serverTimestamp()},{merge:true});
      showToast(`${ROLE_LABELS[id as Role]} updated!`,'success');setEditId(null);
    }catch{showToast('Failed.','error');}
    finally{setSaving(false);}
  };

  return(<div className="space-y-6 max-w-4xl">
    <div>
      <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Roles & Permissions</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
        {isSA?'Click Edit on any role to change permissions.':'View what each role can access.'}
      </p>
    </div>

    {loading
      ?<div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-20 animate-pulse"/>)}</div>
      :<div className="space-y-3">{SR.map(({id,color,desc})=>{
        const role=data[id]||{id,permissions:DEFAULT_PERMISSIONS[id]||{}};
        const isEdit=editId===id;
        const isExp=expandedId===id||isEdit;
        const perms:RolePermissions=isEdit?editPerms:{...DEFAULT_PERMISSIONS.visitor,...role.permissions};
        const locked=id==='super_admin';
        const enabled=PL.filter(p=>perms[p.key]).length;

        return(<div key={id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="p-2 bg-navy/5 dark:bg-white/5 rounded-xl shrink-0">
              <Shield className="w-4 h-4 text-navy dark:text-gold"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-navy dark:text-white text-sm">{ROLE_LABELS[id]}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${color}`}>{id.replace(/_/g,' ')}</span>
                {locked&&<Lock className="w-3 h-3 text-slate-400"/>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc} · {enabled}/{PL.length} permissions</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isEdit?<>
                <button onClick={()=>setEditId(null)}
                  className="flex items-center gap-1 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:text-navy dark:hover:text-white rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600 transition-colors">
                  <X className="w-3 h-3"/>Cancel
                </button>
                <button onClick={()=>savePerms(id)} disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded-xl text-xs font-black hover:bg-ocean disabled:opacity-60 transition-colors">
                  {saving?<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Save className="w-3 h-3"/>}Save
                </button>
              </>:<>
                {isSA&&!locked&&(
                  <button onClick={()=>startEdit(role)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-navy dark:text-white rounded-xl text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    <Edit2 className="w-3 h-3"/>Edit
                  </button>
                )}
                <button onClick={()=>setExpandedId(isExp?null:id)}
                  className="p-1.5 text-slate-400 hover:text-navy dark:hover:text-white transition-colors">
                  {isExp?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
                </button>
              </>}
            </div>
          </div>

          {/* Permissions grid */}
          {isExp&&(
            <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PL.map(({key,label,desc:pd})=>{
                  const on=perms[key];
                  const isOrderPerm=key==='manageOrders';
                  return(
                    <div key={key}
                      onClick={()=>isEdit&&!locked&&setEditPerms(p=>({...p,[key]:!p[key]}))}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isEdit&&!locked?'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700':''} ${on?'bg-green-50 dark:bg-green-900/20':''} ${isOrderPerm?'ring-1 ring-amber-200 dark:ring-amber-800':''}`}>
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${on?'bg-green-500':'bg-slate-200 dark:bg-slate-600'}`}>
                        {on?<Check className="w-3 h-3 text-white"/>:<X className="w-3 h-3 text-slate-400 dark:text-slate-300"/>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-bold ${on?'text-navy dark:text-white':'text-slate-500 dark:text-slate-400'}`}>{label}</p>
                          {isOrderPerm&&<span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded text-xs font-black">NEW</span>}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{pd}</p>
                      </div>
                      {isEdit&&!locked&&(
                        <div className={`ml-auto w-8 h-4 rounded-full transition-colors relative shrink-0 ${on?'bg-green-500':'bg-slate-200 dark:bg-slate-600'}`}>
                          <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${on?'left-4':'left-0.5'}`}/>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {isEdit&&<p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-center">Click any permission to toggle it</p>}
            </div>
          )}
        </div>);
      })}</div>
    }
  </div>);
}