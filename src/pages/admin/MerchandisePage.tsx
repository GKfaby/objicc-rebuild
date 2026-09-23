import{uploadToCloudinary}from '../../lib/cloudinary';
import ImageCropDialog from '../../components/ImageCropDialog';
import{useState,useEffect,useRef} from 'react';
import{collection,onSnapshot,addDoc,updateDoc,deleteDoc,doc,serverTimestamp,orderBy,query} from 'firebase/firestore';
import{db} from '../../firebase';
import{Plus,Edit2,Trash2,X,Image,Save,Eye,EyeOff,ShoppingBag,DollarSign,Package,Check,ChevronDown,ChevronUp} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import type{Merchandise,PricingOption,MerchandiseCurrency} from '../../types';
const EMPTY:Partial<Merchandise>={name:"",description:"",price:"",currency:'JMD',image:"",category:"",isPublished:false,pricingOptions:[],totalStock:0};
const EO:PricingOption={label:"",price:"",isActive:true,stock:0};
export default function MerchandisePage(){
  const[storeMode,setStoreMode]=useState<'cadet'|'public'>('cadet');
  const activeCollection=storeMode==='cadet'?'merchandise':'public_merchandise';

  const[items,setItems]=useState<Merchandise[]>([]);const[loading,setLoading]=useState(true);
  const[open,setOpen]=useState(false);const[editing,setEditing]=useState<Merchandise|null>(null);const[form,setForm]=useState<Partial<Merchandise>>(EMPTY);
  const[saving,setSaving]=useState(false);const[filterCat,setFilterCat]=useState('all');const[expanded,setExpanded]=useState<string|null>(null);
  const[showAllFilterCats,setShowAllFilterCats]=useState(false);
  const[showAllFormCats,setShowAllFormCats]=useState(false);
  const[cropFile,setCropFile]=useState<File|null>(null);
  const imgRef=useRef<HTMLInputElement>(null);const{showToast}=useToast();

  const categoryCounts = items.reduce((acc, item) => {
    if (item.category) acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const popularCats = sortedCats.slice(0, 4);
  const otherCats = sortedCats.slice(4);
  const displayedFilterCats = showAllFilterCats ? sortedCats : popularCats;
  const displayedFormCats = showAllFormCats ? sortedCats : popularCats;
  
  useEffect(()=>{
    setLoading(true);
    const q=query(collection(db,activeCollection),orderBy('createdAt','desc'));
    return onSnapshot(q,snap=>{setItems(snap.docs.map(d=>({id:d.id,...d.data()} as Merchandise)));setLoading(false);});
  },[activeCollection]);
  const set=(k:keyof Merchandise,v:any)=>setForm(p=>({...p,[k]:v}));
  const addOpt=()=>setForm(p=>({...p,pricingOptions:[...(p.pricingOptions||[]),{...EO}]}));
  const setOpt=(i:number,k:keyof PricingOption,v:any)=>setForm(p=>({...p,pricingOptions:(p.pricingOptions||[]).map((o,idx)=>idx===i?{...o,[k]:v}:o)}));
  const rmOpt=(i:number)=>setForm(p=>({...p,pricingOptions:(p.pricingOptions||[]).filter((_,idx)=>idx!==i)}));
  const openCreate=()=>{setEditing(null);setForm({...EMPTY,pricingOptions:[]});setOpen(true);};
  const openEdit=(item:Merchandise)=>{setEditing(item);setForm({...EMPTY,...item});setOpen(true);};
  const close=()=>{setOpen(false);setEditing(null);setForm(EMPTY);};
  const handleImageSelected=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(file)setCropFile(file);e.target.value='';};
  const handleCroppedImage=async(file:File)=>{setCropFile(null);setSaving(true);try{set('image',await uploadToCloudinary(file,'objicc/merchandise'));showToast('Image uploaded!','success');}catch(err){showToast(err instanceof Error?err.message:'Image upload failed.','error');}finally{setSaving(false);}};
  const handleSave=async()=>{if(!form.name?.trim()){showToast('Item name required.','error');return;}if(!form.price?.trim()){showToast('Price required.','error');return;}setSaving(true);
    try{const d={...form,updatedAt:serverTimestamp()};if(editing)await updateDoc(doc(db,activeCollection,editing.id),d);else await addDoc(collection(db,activeCollection),{...d,createdAt:serverTimestamp()});showToast(editing?'Item updated!':'Item added!','success');close();}catch{showToast('Failed.','error');}finally{setSaving(false);}};
  const del=async(item:Merchandise)=>{if(!window.confirm(`Delete "${item.name}"?`))return;await deleteDoc(doc(db,activeCollection,item.id));showToast('Deleted','info');};
  const toggle=async(item:Merchandise)=>{await updateDoc(doc(db,activeCollection,item.id),{isPublished:!item.isPublished});showToast(item.isPublished?'Unpublished':'Published!','success');};
  const filtered=filterCat==='all'?items:items.filter(i=>i.category===filterCat);
  return(<div className="space-y-6">
    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
      <button onClick={()=>{setStoreMode('cadet');setFilterCat('all');}} className={`px-4 py-2 rounded-lg text-sm font-black transition-colors ${storeMode==='cadet'?'bg-white dark:bg-slate-600 text-navy dark:text-white shadow-sm':'text-slate-500 hover:text-navy dark:hover:text-white'}`}>Cadet Store</button>
      <button onClick={()=>{setStoreMode('public');setFilterCat('all');}} className={`px-4 py-2 rounded-lg text-sm font-black transition-colors ${storeMode==='public'?'bg-white dark:bg-slate-600 text-ocean dark:text-gold shadow-sm':'text-slate-500 hover:text-navy dark:hover:text-white'}`}>Ocean Blue JA Stores</button>
    </div>
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">{storeMode==='cadet'?'Cadet Merchandise':'Public Merchandise'}</h1><p className="text-slate-500 text-sm mt-1">{items.filter(i=>i.isPublished).length} published · {items.filter(i=>!i.isPublished).length} drafts</p></div>
      <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean"><Plus className="w-4 h-4"/>Add Item</button>
    </div>
    <div className="flex gap-2 flex-wrap">
      <button onClick={()=>setFilterCat('all')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterCat==='all'?'bg-navy text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'}`}>All ({items.length})</button>
      {displayedFilterCats.map(c=><button key={c} onClick={()=>setFilterCat(c)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterCat===c?'bg-navy text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'}`}>{c}</button>)}
      {otherCats.length > 0 && (
        <button onClick={()=>setShowAllFilterCats(!showAllFilterCats)} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-white dark:bg-slate-800 text-slate-400 hover:text-navy dark:hover:text-white">
          {showAllFilterCats ? 'Show Less' : `+ ${otherCats.length} More`}
        </button>
      )}
    </div>
    {loading?<div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-20 animate-pulse"/>)}</div>
    :filtered.length===0?<div className="bg-white dark:bg-slate-800 rounded-2xl py-16 text-center text-slate-400"><ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="font-bold text-sm">No items yet.</p></div>
    :<div className="space-y-3">{filtered.map(item=>(
      <div key={item.id} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border-2 ${item.isPublished?'border-transparent':'border-dashed border-slate-200 dark:border-slate-700'}`}>
        <div className="flex items-center gap-3 px-5 py-4">
          {item.image?<img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover shrink-0"/>:<div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0"><ShoppingBag className="w-6 h-6 text-slate-300"/></div>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">{item.category&&<span className="px-2 py-0.5 bg-navy/10 text-navy dark:text-gold rounded-full text-xs font-black">{item.category}</span>}<span className={`px-2 py-0.5 rounded-full text-xs font-black ${item.isPublished?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'}`}>{item.isPublished?'Published':'Draft'}</span></div>
            <p className="font-black text-navy dark:text-white text-sm truncate">{item.name}</p><p className="text-ocean font-black text-sm">{item.currency||'JMD'} {item.price}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={()=>setExpanded(expanded===item.id?null:item.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">{expanded===item.id?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}</button>
            <button onClick={()=>toggle(item)} className={`p-1.5 rounded-lg ${item.isPublished?'text-green-500 hover:bg-green-50':'text-slate-400 hover:bg-slate-100'}`}>{item.isPublished?<Eye className="w-4 h-4"/>:<EyeOff className="w-4 h-4"/>}</button>
            <button onClick={()=>openEdit(item)} className="p-1.5 hover:bg-navy/10 rounded-lg"><Edit2 className="w-4 h-4 text-navy dark:text-white"/></button>
            <button onClick={()=>del(item)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4 text-red-400"/></button>
          </div>
        </div>
        {expanded===item.id&&<div className="px-5 pb-4 border-t border-slate-50 dark:border-slate-700 pt-3 space-y-2">
          {item.description&&<p className="text-sm text-slate-500">{item.description}</p>}
          {item.pricingOptions&&item.pricingOptions.length>0&&<div className="flex gap-2 flex-wrap">{item.pricingOptions.map((o,i)=><span key={i} className={`px-2 py-1 rounded-lg text-xs font-bold ${o.isActive?'bg-navy/10 text-navy dark:text-white':'bg-slate-100 text-slate-400 line-through'}`}>{o.label} — {o.price}{o.stock!==undefined?` (${o.stock} left)`:''}</span>)}</div>}
        </div>}
      </div>
    ))}</div>}
    {cropFile&&<ImageCropDialog file={cropFile} onCancel={()=>setCropFile(null)} onConfirm={handleCroppedImage}/>} 
    {open&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0"><h2 className="font-black text-navy dark:text-white text-lg">{editing?'Edit Item':'New Item'}</h2><button onClick={close} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400"/></button></div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Category *</label>
            {sortedCats.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {displayedFormCats.map(c=><button key={c} type="button" onClick={()=>set('category',c)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${form.category===c?'bg-navy text-white':'bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-navy dark:hover:text-white'}`}>{c}</button>)}
                {otherCats.length > 0 && (
                  <button type="button" onClick={()=>setShowAllFormCats(!showAllFormCats)} className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-navy dark:hover:text-white">
                    {showAllFormCats ? 'Show Less' : 'More...'}
                  </button>
                )}
              </div>
            )}
            <input 
              list="category-options"
              value={form.category||''}
              onChange={e=>set('category',e.target.value)}
              placeholder="e.g. Pants"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"
            />
            <datalist id="category-options">
              {sortedCats.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Item Name *</label><input value={form.name||''} onChange={e=>set('name',e.target.value)} placeholder="e.g. OBJICC Beret" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"/></div>
            <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Currency *</label><div className="flex gap-2"><select value={form.currency||'JMD'} onChange={e=>set('currency',e.target.value as MerchandiseCurrency)} className="w-24 px-2 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-black outline-none text-sm"><option value="JMD">JMD</option><option value="USD">USD</option></select><div className="relative flex-1"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={form.price||''} onChange={e=>set('price',e.target.value)} placeholder="1,500" className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none text-sm"/></div></div></div>
            <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Total Stock</label><div className="relative"><Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input type="number" min={0} value={form.totalStock??''} onChange={e=>set('totalStock',parseInt(e.target.value)||0)} placeholder="0=unlimited" className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none text-sm"/></div></div>
          </div>
          <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Description</label><textarea rows={3} value={form.description||''} onChange={e=>set('description',e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none text-sm resize-none"/></div>
          <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Product Image</label>
            <div className="flex gap-2"><input value={form.image||''} onChange={e=>set('image',e.target.value)} placeholder="Paste URL or upload..." className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none text-sm"/>
              <input ref={imgRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden"/>
              <button type="button" disabled={saving} onClick={()=>imgRef.current?.click()} className="flex items-center gap-1 px-4 py-2.5 border-2 border-dashed border-slate-300 hover:border-navy dark:hover:border-gold rounded-xl text-xs font-black text-slate-500 disabled:opacity-50"><Image className="w-4 h-4"/>{saving?'Uploading...':'Upload'}</button>
            </div>
            {form.image&&<div className="mt-2 relative inline-block"><img src={form.image} alt="Preview" className="h-24 w-24 object-cover rounded-xl"/><button onClick={()=>set('image','')} className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-lg"><X className="w-3 h-3"/></button></div>}
          </div>
          <div><div className="flex items-center justify-between mb-2"><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Variants / Sizes</label><button type="button" onClick={addOpt} className="flex items-center gap-1 px-3 py-1 bg-navy/10 hover:bg-navy/20 text-navy dark:text-white rounded-lg text-xs font-black"><Plus className="w-3 h-3"/>Add Variant</button></div>
            {(form.pricingOptions||[]).length===0?<div className="py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-xs">No variants — one base price only</div>
            :<div className="space-y-2">{(form.pricingOptions||[]).map((opt,i)=><div key={i} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <input value={opt.label} onChange={e=>setOpt(i,'label',e.target.value)} placeholder="Label" className="px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-navy dark:text-white outline-none"/>
                <input value={opt.price} onChange={e=>setOpt(i,'price',e.target.value)} placeholder="Price" className="px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-navy dark:text-white outline-none"/>
                <input type="number" min={0} value={opt.stock??''} onChange={e=>setOpt(i,'stock',parseInt(e.target.value)||0)} placeholder="Stock" className="px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-navy dark:text-white outline-none"/>
              </div>
              <div className={`w-8 h-4 rounded-full cursor-pointer transition-colors relative shrink-0 ${opt.isActive?'bg-green-500':'bg-slate-300'}`} onClick={()=>setOpt(i,'isActive',!opt.isActive)}><span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${opt.isActive?'left-4':'left-0.5'}`}/></div>
              <button onClick={()=>rmOpt(i)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg"><X className="w-4 h-4"/></button>
            </div>)}</div>}
          </div>
          <div onClick={()=>set('isPublished',!form.isPublished)} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.isPublished?'border-green-400 bg-green-50 dark:bg-green-900/20':'border-slate-200 dark:border-slate-700'}`}>
            {form.isPublished?<Eye className="w-5 h-5 text-green-600 shrink-0"/>:<EyeOff className="w-5 h-5 text-slate-400 shrink-0"/>}
            <div className="flex-1"><p className={`text-sm font-black ${form.isPublished?'text-green-700 dark:text-green-400':'text-slate-500'}`}>{form.isPublished?'Published':'Draft'}</p><p className="text-xs text-slate-400">Toggle to show or hide in the member shop</p></div>
            <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.isPublished?'bg-green-500':'bg-slate-200 dark:bg-slate-600'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublished?'left-5':'left-0.5'}`}/></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-ocean disabled:opacity-60">
            {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Save className="w-4 h-4"/>}
            {saving?'Saving...':editing?'Update Item':'Add to Shop'}
          </button>
        </div>
      </div>
    </div>}
  </div>);
}