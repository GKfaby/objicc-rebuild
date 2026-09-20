import{useState,useEffect,useMemo} from 'react';
import{collection,onSnapshot,doc,setDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
import{db} from '../../firebase';
import{Shield,Edit2,Save,X,Check,ChevronDown,ChevronUp,Lock,Plus,GripVertical,Trash2,ListOrdered,SlidersHorizontal} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import{useUser} from '../../contexts/UserContext';
import{DEFAULT_PERMISSIONS,ROLE_LABELS} from '../../types';
import type{Role,RolePermissions} from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';

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
const CUSTOM_COLOR='bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200';

const PL:{key:keyof RolePermissions;label:string;desc:string}[]=[
  {key:'viewAdminDashboard',  label:'Admin Dashboard',      desc:'Access the admin panel'},
  {key:'manageUsers',         label:'Manage Users',         desc:'View, edit and delete users -- only ones below you in hierarchy'},
  {key:'manageRoles',         label:'Manage Roles',         desc:'Edit role permissions'},
  {key:'manageHierarchy',     label:'Manage Hierarchy',     desc:'Reorder the role hierarchy and create new roles'},
  {key:'managePosts',         label:'Manage Posts',         desc:'Create, edit and delete posts'},
  {key:'manageMerchandise',   label:'Manage Merchandise',   desc:'Add and edit shop items'},
  {key:'manageRequests',      label:'Manage Requests',      desc:'Handle merch requests'},
  {key:'manageOrders',        label:'Manage Orders',        desc:'Undo orders, restore from recycle bin, empty bin'},
  {key:'exportOrders',        label:'Export Orders',        desc:'Download a PDF/spreadsheet report of orders for a date range'},
  {key:'manageApplications',  label:'Manage Applications',  desc:'Review enrollment applications'},
  {key:'canViewUserUpdates',  label:'Activity Log',         desc:'See site-wide activity'},
  {key:'printPermissionSlips',label:'Permission Slips',     desc:'Generate printable slips'},
  {key:'manageSettings',      label:'Manage Settings',      desc:'Edit site settings'},
  {key:'managePaymentGateways',label:'Payment Gateways',    desc:'Configure Stripe/PayPal'},
];

const slugify=(s:string)=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');

export default function RolesPage(){
  const[data,setData]=useState<Record<string,any>>({});
  const[loading,setLoading]=useState(true);
  const[editId,setEditId]=useState<string|null>(null);
  const[editPerms,setEditPerms]=useState<RolePermissions>({...DEFAULT_PERMISSIONS.cadet});
  const[expandedId,setExpandedId]=useState<string|null>(null);
  const[saving,setSaving]=useState(false);
  const[tab,setTab]=useState<'permissions'|'hierarchy'>('permissions');
  const{showToast}=useToast();
  const{profile,permissions,hierarchy}=useUser();
  const isSA=profile?.role==='super_admin';
  const canEditPerms=isSA||permissions.manageRoles;
  const canEditHierarchy=isSA||permissions.manageHierarchy;

  const[showCreate,setShowCreate]=useState(false);
  const[newName,setNewName]=useState('');
  const[creating,setCreating]=useState(false);
  const[confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);

  const[localOrder,setLocalOrder]=useState<string[]|null>(null);
  const[dragIdx,setDragIdx]=useState<number|null>(null);
  const[savingHierarchy,setSavingHierarchy]=useState(false);

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

  // All roles (built-in + custom), sorted by current hierarchy rank.
  const allRoleIds=useMemo(()=>{
    const ids=new Set<string>([...SR.map(r=>r.id),...Object.keys(data)]);
    return Array.from(ids).sort((a,b)=>(hierarchy[a]??999)-(hierarchy[b]??999));
  },[data,hierarchy]);

  const roleMeta=(id:string)=>{
    const sr=SR.find(r=>r.id===id);
    if(sr)return{label:ROLE_LABELS[id as Role],color:sr.color,desc:sr.desc,custom:false};
    return{label:data[id]?.name||id,color:CUSTOM_COLOR,desc:data[id]?.description||'Custom role',custom:true};
  };

  const startEdit=(id:string)=>{
    setEditId(id);
    setEditPerms({...DEFAULT_PERMISSIONS.visitor,...(data[id]?.permissions||{})});
    setExpandedId(id);
  };
  const savePerms=async(id:string)=>{
    setSaving(true);
    try{
      await setDoc(doc(db,'roles',id),{...(data[id]||{}),permissions:editPerms,updatedAt:serverTimestamp()},{merge:true});
      showToast(`${roleMeta(id).label} updated!`,'success');setEditId(null);
    }catch{showToast('Failed.','error');}
    finally{setSaving(false);}
  };

  // -- Create a new role --
  const openCreate=()=>{setNewName('');setShowCreate(true);};
  const createRole=async()=>{
    const name=newName.trim();
    if(!name){showToast('Enter a name for the role.','error');return;}
    let id=slugify(name);
    if(!id){showToast('That name needs at least one letter or number.','error');return;}
    if(allRoleIds.includes(id)){showToast('A role with that name already exists.','error');return;}
    setCreating(true);
    try{
      await setDoc(doc(db,'roles',id),{
        name,permissions:{...DEFAULT_PERMISSIONS.visitor},custom:true,isSystem:false,createdAt:serverTimestamp(),
      });
      // New roles default to the bottom of the hierarchy (least senior) --
      // safest default; can be dragged up on the Hierarchy tab.
      const nextRank=Math.max(...allRoleIds.map(r=>hierarchy[r]??0),0)+1;
      await setDoc(doc(db,'settings','roleHierarchy'),{ranks:{...hierarchy,[id]:nextRank}},{merge:true});
      showToast(`"${name}" role created.`,'success');
      setShowCreate(false);setNewName('');
    }catch{showToast('Could not create role.','error');}
    finally{setCreating(false);}
  };

  const deleteRole=async(id:string)=>{
    try{
      await deleteDoc(doc(db,'roles',id));
      const{[id]:_,...rest}=hierarchy;
      await setDoc(doc(db,'settings','roleHierarchy'),{ranks:rest});
      showToast('Role deleted.','info');
    }catch{showToast('Could not delete role.','error');}
    finally{setConfirmDeleteId(null);}
  };

  // -- Hierarchy reordering (drag & drop, Super Admin locked at the top) --
  const order=localOrder||allRoleIds;
  const startDragRow=(idx:number)=>{if(idx===0)return;setDragIdx(idx);};
  const dropOnRow=(idx:number)=>{
    if(dragIdx===null||idx===0||dragIdx===idx)return;
    const next=[...order];
    const[moved]=next.splice(dragIdx,1);
    next.splice(idx,0,moved);
    setLocalOrder(next);setDragIdx(null);
  };
  const saveHierarchy=async()=>{
    if(!localOrder)return;
    setSavingHierarchy(true);
    try{
      const ranks:Record<string,number>={};
      localOrder.forEach((id,i)=>{ranks[id]=i;});
      await setDoc(doc(db,'settings','roleHierarchy'),{ranks});
      showToast('Hierarchy updated.','success');setLocalOrder(null);
    }catch{showToast('Could not save hierarchy.','error');}
    finally{setSavingHierarchy(false);}
  };
  const hasHierarchyChanges=!!localOrder&&JSON.stringify(localOrder)!==JSON.stringify(allRoleIds);

  return(<div className="space-y-6 max-w-4xl">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Roles & Permissions</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {tab==='permissions'?(canEditPerms?'Click Edit on any role to change permissions.':'View what each role can access.'):'Drag roles to set who outranks who.'}
        </p>
      </div>
      {canEditHierarchy&&<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean transition-colors"><Plus className="w-4 h-4"/>Create Role</button>}
    </div>

    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
      {[{id:'permissions' as const,label:'Permissions',icon:SlidersHorizontal},{id:'hierarchy' as const,label:'Hierarchy',icon:ListOrdered}].map(t=>{
        const Icon=t.icon;const active=tab===t.id;
        return(<button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${active?'border-navy dark:border-gold text-navy dark:text-white':'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
          <Icon className="w-3.5 h-3.5"/>{t.label}
        </button>);
      })}
    </div>

    {tab==='permissions'&&(loading
      ?<div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-20 animate-pulse"/>)}</div>
      :<div className="space-y-3">{allRoleIds.map(id=>{
        const{label,color,desc,custom}=roleMeta(id);
        const role=data[id]||{id,permissions:DEFAULT_PERMISSIONS[id]||{}};
        const isEdit=editId===id;
        const isExp=expandedId===id||isEdit;
        const perms:RolePermissions=isEdit?editPerms:{...DEFAULT_PERMISSIONS.visitor,...role.permissions};
        const locked=id==='super_admin';
        const enabled=PL.filter(p=>perms[p.key]).length;

        return(<div key={id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="p-2 bg-navy/5 dark:bg-white/5 rounded-xl shrink-0">
              <Shield className="w-4 h-4 text-navy dark:text-gold"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-navy dark:text-white text-sm">{label}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${color}`}>{id.replace(/_/g,' ')}</span>
                {locked&&<Lock className="w-3 h-3 text-slate-400"/>}
                {custom&&<span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-black uppercase">Custom</span>}
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
                {custom&&canEditHierarchy&&<button onClick={()=>setConfirmDeleteId(id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>}
                {canEditPerms&&!locked&&(
                  <button onClick={()=>startEdit(id)}
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

          {isExp&&(
            <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PL.map(({key,label:pl,desc:pd})=>{
                  const on=perms[key];
                  const isNewPerm=key==='manageOrders'||key==='manageHierarchy'||key==='exportOrders';
                  return(
                    <div key={key}
                      onClick={()=>isEdit&&!locked&&setEditPerms(p=>({...p,[key]:!p[key]}))}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isEdit&&!locked?'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700':''} ${on?'bg-green-50 dark:bg-green-900/20':''} ${isNewPerm?'ring-1 ring-amber-200 dark:ring-amber-800':''}`}>
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${on?'bg-green-500':'bg-slate-200 dark:bg-slate-600'}`}>
                        {on?<Check className="w-3 h-3 text-white"/>:<X className="w-3 h-3 text-slate-400 dark:text-slate-300"/>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-bold ${on?'text-navy dark:text-white':'text-slate-500 dark:text-slate-400'}`}>{pl}</p>
                          {isNewPerm&&<span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded text-xs font-black">NEW</span>}
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
    )}

    {tab==='hierarchy'&&(
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-slate-400">Rank 1 outranks everyone below it. Super Admin is always locked at the top. {canEditHierarchy?'Drag any other row to reorder.':''}</p>
          {hasHierarchyChanges&&canEditHierarchy&&<div className="flex gap-2 shrink-0">
            <button onClick={()=>setLocalOrder(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-navy dark:hover:text-white">Discard</button>
            <button onClick={saveHierarchy} disabled={savingHierarchy} className="flex items-center gap-1.5 px-4 py-1.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean disabled:opacity-60">
              {savingHierarchy?<div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Save className="w-3 h-3"/>}Save Order
            </button>
          </div>}
        </div>
        <div className="space-y-1.5">
          {order.map((id,idx)=>{
            const{label,color,custom}=roleMeta(id);
            const locked=id==='super_admin';
            return(
              <div key={id}
                draggable={canEditHierarchy&&!locked}
                onDragStart={()=>startDragRow(idx)}
                onDragOver={e=>e.preventDefault()}
                onDrop={()=>dropOnRow(idx)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${locked?'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30':'bg-slate-50 dark:bg-slate-700/40 border-transparent'} ${canEditHierarchy&&!locked?'cursor-grab active:cursor-grabbing':''}`}>
                <span className="w-6 text-center text-xs font-black text-slate-400">{idx+1}</span>
                {locked?<Lock className="w-4 h-4 text-purple-400 shrink-0"/>:<GripVertical className={`w-4 h-4 shrink-0 ${canEditHierarchy?'text-slate-400':'text-slate-200 dark:text-slate-600'}`}/>}
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${color}`}>{label}</span>
                {custom&&<span className="text-xs text-slate-400 font-bold uppercase">Custom</span>}
                {locked&&<span className="ml-auto text-xs text-purple-500 dark:text-purple-400 font-bold">Locked at top</span>}
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Create role modal */}
    {showCreate&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm" onClick={()=>setShowCreate(false)}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-black text-navy dark:text-white">Create Role</h2>
          <button onClick={()=>setShowCreate(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role Name</label>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Events Coordinator" autoFocus
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">Starts with no permissions and slots in at the bottom of the hierarchy — head to the Hierarchy tab afterward to drag it into place, and Edit here to grant permissions.</p>
          <button onClick={createRole} disabled={creating} className="w-full py-3 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean disabled:opacity-60 flex items-center justify-center gap-2">
            {creating?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Plus className="w-4 h-4"/>}Create Role
          </button>
        </div>
      </div>
    </div>}

    <ConfirmDialog
      open={!!confirmDeleteId}
      title="Delete this role?"
      message={`Anyone currently assigned "${confirmDeleteId?roleMeta(confirmDeleteId).label:''}" will keep that role on their profile, but it won't match any real permissions anymore until reassigned. This cannot be undone.`}
      confirmLabel="Delete Role"
      danger
      onCancel={()=>setConfirmDeleteId(null)}
      onConfirm={()=>confirmDeleteId&&deleteRole(confirmDeleteId)}
    />
  </div>);
}
