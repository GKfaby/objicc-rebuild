import{uploadToCloudinary}from '../../lib/cloudinary';
import ImageCropDialog from '../../components/ImageCropDialog';
import{useState,useEffect,useRef} from 'react';
import{collection,onSnapshot,addDoc,updateDoc,deleteDoc,doc,serverTimestamp,orderBy,query} from 'firebase/firestore';
import{db} from '../../firebase';
import{Plus,Edit2,Trash2,X,Image,Save,Calendar,Bell,FileText,ChevronDown,ChevronUp,Tag,Check} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import{ROLE_LABELS} from '../../types';
import type{Post} from '../../types';
const CATS=["Announcements","Training","Events"] as const;
const UNRESTRICTED_ROLES=new Set(['admin','super_admin','staff']);
const EMPTY:Partial<Post>={title:"",type:"notice",category:"Announcements",date:"",description:"",image:"",hasPermissionSlip:false,permissionSlipUrl:"",isPrintable:false,allowedRoles:[],location:"",startTime:"",endTime:"",meetLocation:"",meetTime:""};
export default function PostsPage(){
  const[posts,setPosts]=useState<Post[]>([]);const[roleDocs,setRoleDocs]=useState<Record<string,any>>({});const[loading,setLoading]=useState(true);
  const[open,setOpen]=useState(false);const[editing,setEditing]=useState<Post|null>(null);const[form,setForm]=useState<Partial<Post>>(EMPTY);
  const[saving,setSaving]=useState(false);const[uploading,setUploading]=useState(false);
  const[filterType,setFilterType]=useState<"all"|"notice"|"event">("all");
  const[expanded,setExpanded]=useState<string|null>(null);
  const[cropFile,setCropFile]=useState<File|null>(null);
  const imgRef=useRef<HTMLInputElement>(null);const{showToast}=useToast();
  useEffect(()=>{const q=query(collection(db,'posts'),orderBy('createdAt','desc'));return onSnapshot(q,snap=>{setPosts(snap.docs.map(d=>({id:d.id,...d.data()} as Post)));setLoading(false);});},[]);
  useEffect(()=>onSnapshot(collection(db,'roles'),snap=>setRoleDocs(Object.fromEntries(snap.docs.map(d=>[d.id,d.data()])))),[]);
  const audienceRoles=Object.keys(roleDocs).filter(r=>!UNRESTRICTED_ROLES.has(r)).sort((a,b)=>(roleDocs[a]?.name||a).localeCompare(roleDocs[b]?.name||b));
  const openCreate=()=>{setEditing(null);setForm({...EMPTY});setOpen(true);};
  const openEdit=(p:Post)=>{setEditing(p);setForm({...EMPTY,...p});setOpen(true);};
  const close=()=>{setOpen(false);setEditing(null);setForm(EMPTY);};
  const set=(k:keyof Post,v:any)=>setForm(p=>({...p,[k]:v}));
  const toggleRole=(r:string)=>set('allowedRoles',(form.allowedRoles||[]).includes(r)?(form.allowedRoles||[]).filter(x=>x!==r):[...(form.allowedRoles||[]),r]);
  const handleImageSelected=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(file)setCropFile(file);e.target.value='';};
  const handleCroppedImage=async(file:File)=>{setCropFile(null);setUploading(true);try{set('image',await uploadToCloudinary(file,'objicc/posts'));showToast('Image uploaded!','success');}catch(err){showToast(err instanceof Error?err.message:'Image upload failed.','error');}finally{setUploading(false);}};
  const handleSave=async()=>{if(!form.title?.trim()||!form.date?.trim()||!form.description?.trim()){showToast('Fill in all required fields.','error');return;}setSaving(true);
    try{const d={...form,allowedRoles:(form.allowedRoles||[]).filter(r=>!UNRESTRICTED_ROLES.has(r)),updatedAt:serverTimestamp()};
      if(editing)await updateDoc(doc(db,'posts',editing.id),d);else await addDoc(collection(db,'posts'),{...d,createdAt:serverTimestamp(),likes:0});
      showToast(editing?'Post updated!':'Post created!','success');close();
    }catch{showToast('Failed to save.','error');}finally{setSaving(false);}};
  const del=async(p:Post)=>{if(!window.confirm(`Delete "${p.title}"?`))return;await deleteDoc(doc(db,'posts',p.id));showToast('Post deleted','info');};
  const filtered=filterType==='all'?posts:posts.filter(p=>p.type===filterType);
  const counts={all:posts.length,notice:posts.filter(p=>p.type==='notice').length,event:posts.filter(p=>p.type==='event').length};
  return(<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Posts & Events</h1><p className="text-slate-500 text-sm mt-1">{posts.length} total posts</p></div>
      <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean"><Plus className="w-4 h-4"/>New Post</button>
    </div>
    <div className="flex gap-2">{(["all","event","notice"] as const).map(t=><button key={t} onClick={()=>setFilterType(t)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType===t?'bg-navy text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'}`}>{t==='all'?'All':t==='event'?'Events':'Notices'} ({counts[t]})</button>)}</div>
    {loading?<div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-20 animate-pulse"/>)}</div>
    :filtered.length===0?<div className="bg-white dark:bg-slate-800 rounded-2xl py-16 text-center text-slate-400"><Bell className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="font-bold text-sm">No posts yet. Create the first one!</p></div>
    :<div className="space-y-3">{filtered.map(p=>(
      <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          {p.image?<img src={p.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0"/>:<div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${p.type==='event'?'bg-gold/20':'bg-ocean/10'}`}>{p.type==='event'?<Calendar className="w-6 h-6 text-amber-600"/>:<Bell className="w-6 h-6 text-ocean"/>}</div>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5"><span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${p.type==='event'?'bg-gold/20 text-amber-700':'bg-ocean/10 text-ocean'}`}>{p.type}</span><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full text-xs font-bold">{p.category}</span></div>
            <p className="font-black text-navy dark:text-white text-sm truncate">{p.title}</p><p className="text-xs text-slate-400">{p.date}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={()=>setExpanded(expanded===p.id?null:p.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">{expanded===p.id?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}</button>
            <button onClick={()=>openEdit(p)} className="p-1.5 hover:bg-navy/10 rounded-lg"><Edit2 className="w-4 h-4 text-navy dark:text-white"/></button>
            <button onClick={()=>del(p)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4 text-red-400"/></button>
          </div>
        </div>
        {expanded===p.id&&<div className="px-5 pb-4 border-t border-slate-50 dark:border-slate-700 pt-3"><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{p.description}</p></div>}
      </div>
    ))}</div>}
    {cropFile&&<ImageCropDialog file={cropFile} onCancel={()=>setCropFile(null)} onConfirm={handleCroppedImage}/>} 
    {open&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0"><h2 className="font-black text-navy dark:text-white text-lg">{editing?'Edit Post':'New Post'}</h2><button onClick={close} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400"/></button></div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Post Type</label>
            <div className="grid grid-cols-2 gap-3">{(["notice","event"] as const).map(t=><button key={t} type="button" onClick={()=>set('type',t)} className={`py-3 px-4 rounded-xl text-left border-2 transition-all ${form.type===t?'border-navy bg-navy/5 dark:border-gold':'border-slate-100 dark:border-slate-700'}`}><p className={`font-black text-sm ${form.type===t?'text-navy dark:text-white':'text-slate-400'}`}>{t==='notice'?'Notice':'Event'}</p></button>)}</div>
          </div>
          <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
            <div className="flex gap-2 flex-wrap">{CATS.map(c=><button key={c} type="button" onClick={()=>set('category',c)} className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${form.category===c?'bg-navy text-white':'bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-navy dark:hover:text-white'}`}><Tag className="w-3 h-3"/>{c}</button>)}</div>
          </div>
          {[{k:'title',l:'Title *',ph:'e.g. Annual Drill Competition'},{k:'date',l:'Date *',ph:'e.g. Saturday, January 18, 2025'}].map(({k,l,ph})=>(
            <div key={k}><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{l}</label><input value={(form as any)[k]||''} onChange={e=>set(k as keyof Post,e.target.value)} placeholder={ph} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"/></div>
          ))}
          {form.type==='event'&&<div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-3">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Event Details <span className="normal-case font-medium text-slate-400">(optional — powers auto-fill on Permission Slips)</span></p>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
              <input value={form.location||''} onChange={e=>set('location',e.target.value)} placeholder="e.g. Freeport Boat House Area" className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none text-sm border border-slate-200 dark:border-slate-600"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['start','end'] as const).map(side=>{
                const mode=(form as any)[`${side}Mode`]||'time';
                return(<div key={side}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">{side==='start'?'Start':'End'}</label>
                    <div className="flex gap-0.5 bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-600">
                      {(['time','date','both'] as const).map(m=>(
                        <button key={m} type="button" onClick={()=>set(`${side}Mode` as keyof Post,m)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${mode===m?'bg-navy text-white dark:bg-gold dark:text-navy':'text-slate-400'}`}>{m}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {(mode==='date'||mode==='both')&&<input type="date" value={(form as any)[`${side}Date`]||''} onChange={e=>set(`${side}Date` as keyof Post,e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none text-sm border border-slate-200 dark:border-slate-600"/>}
                    {(mode==='time'||mode==='both')&&<input type="time" value={(form as any)[`${side}Time`]||''} onChange={e=>set(`${side}Time` as keyof Post,e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none text-sm border border-slate-200 dark:border-slate-600"/>}
                  </div>
                </div>);
              })}
            </div>
            <p className="text-xs text-slate-400">Multi-day event? Set Start and End to "Date" (or "Both") with different dates — e.g. a 7-day summer camp.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meeting Point</label>
                <input value={form.meetLocation||''} onChange={e=>set('meetLocation',e.target.value)} placeholder="e.g. OBJICC Office" className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none text-sm border border-slate-200 dark:border-slate-600"/>
              </div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meeting Time</label>
                <input type="time" value={form.meetTime||''} onChange={e=>set('meetTime',e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-navy dark:text-white font-bold outline-none text-sm border border-slate-200 dark:border-slate-600"/>
              </div>
            </div>
          </div>}
          <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Description *</label><textarea rows={4} value={form.description||''} onChange={e=>set('description',e.target.value)} placeholder="Full description..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm resize-none leading-relaxed"/></div>
          <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Cover Image</label>
            <div className="flex gap-2"><input value={form.image||''} onChange={e=>set('image',e.target.value)} placeholder="Paste image URL..." className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none text-sm"/>
              <input ref={imgRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden"/>
              <button type="button" disabled={uploading} onClick={()=>imgRef.current?.click()} className="flex items-center gap-1 px-4 py-2.5 border-2 border-dashed border-slate-300 hover:border-navy dark:hover:border-gold rounded-xl text-xs font-black text-slate-500 hover:text-navy dark:hover:text-white disabled:opacity-50"><Image className="w-4 h-4"/>{uploading?'Uploading...':'Upload'}</button>
            </div>
            {form.image&&<div className="mt-2 relative"><img src={form.image} alt="Preview" className="w-full h-36 object-cover rounded-xl"/><button onClick={()=>set('image','')} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg"><X className="w-3 h-3"/></button></div>}
          </div>
          <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Options</label>
            <div onClick={()=>set('hasPermissionSlip',!form.hasPermissionSlip)} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.hasPermissionSlip?'border-navy bg-navy/5 dark:border-gold':'border-slate-100 dark:border-slate-700'}`}>
              <div><p className={`text-sm font-black ${form.hasPermissionSlip?'text-navy dark:text-white':'text-slate-500'}`}>Permission Slip</p><p className="text-xs text-slate-400">Allow a permission slip to be created and posted for this event — required before one can be printed or downloaded</p></div>
              <div className={`ml-auto w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.hasPermissionSlip?'bg-navy dark:bg-gold':'bg-slate-200 dark:bg-slate-600'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.hasPermissionSlip?'left-5':'left-0.5'}`}/></div>
            </div>
          </div>
          <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Visibility</label><p className="text-xs text-slate-400 mb-3">Leave all unchecked for everyone. Check roles to restrict.</p>
            <div className="grid grid-cols-2 gap-2">{audienceRoles.map(r=>{const sel=(form.allowedRoles||[]).includes(r);return(<div key={r} onClick={()=>toggleRole(r)} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${sel?'border-navy bg-navy/5 dark:border-gold':'border-slate-100 dark:border-slate-700'}`}><div className={`w-4 h-4 rounded-lg border-2 flex items-center justify-center ${sel?'bg-navy border-navy dark:bg-gold dark:border-gold':'border-slate-300 dark:border-slate-500'}`}>{sel&&<Check className="w-2.5 h-2.5 text-white"/>}</div><span className={`text-xs font-bold ${sel?'text-navy dark:text-white':'text-slate-400'}`}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]||roleDocs[r]?.name||r}</span></div>);})}</div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-ocean disabled:opacity-60">
            {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Save className="w-4 h-4"/>}
            {saving?'Saving...':editing?'Update Post':'Publish Post'}
          </button>
        </div>
      </div>
    </div>}
  </div>);
}