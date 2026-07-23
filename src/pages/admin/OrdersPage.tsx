import{useState,useEffect} from 'react';
import{collection,onSnapshot,doc,updateDoc,query,orderBy,serverTimestamp,where,writeBatch,getDocs} from 'firebase/firestore';
import{db} from '../../firebase';
import{ShoppingBag,Eye,X,Check,Package,Clock,XCircle,Search,Trash2,RefreshCw,RotateCcw,AlertTriangle} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import{useUser} from '../../contexts/UserContext';
import type{MerchRequest,CartItem} from '../../types';

const SS:Record<string,string>={
  pending:'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  completed:'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  canceled:'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};
const PS:Record<string,string>={
  pending:'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  paid:'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  canceled:'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

export default function OrdersPage(){
  const[orders,setOrders]=useState<MerchRequest[]>([]);
  const[trash,setTrash]=useState<MerchRequest[]>([]);
  const[loading,setLoading]=useState(true);
  const[sel,setSel]=useState<MerchRequest|null>(null);
  const[search,setSearch]=useState('');
  const[filter,setFilter]=useState<'all'|'pending'|'completed'|'canceled'>('all');
  const[tab,setTab]=useState<'orders'|'trash'>('orders');
  const[showEmptyConfirm,setShowEmptyConfirm]=useState(false);
  const{showToast}=useToast();
  const{permissions}=useUser();
  const canManage=permissions.manageOrders;

  // Active orders
  useEffect(()=>{
    const q=query(collection(db,'merch_requests'),orderBy('createdAt','desc'));
    return onSnapshot(q,snap=>{
      const all=snap.docs.map(d=>({id:d.id,...d.data()} as MerchRequest));
      setOrders(all.filter(o=>!o.deleted));
      setLoading(false);
    }, err => {
      console.error("Error fetching orders:", err);
      setLoading(false);
    });
  },[]);

  // Trash (soft-deleted)
  useEffect(()=>{
    if(!canManage)return;
    const q=query(collection(db,'merch_requests'),orderBy('createdAt','desc'));
    return onSnapshot(q,snap=>{
      const all=snap.docs.map(d=>({id:d.id,...d.data()} as MerchRequest));
      setTrash(all.filter(o=>o.deleted).sort((a,b)=>((b as any).deletedAt?.toMillis?.()||0)-((a as any).deletedAt?.toMillis?.()||0)));
    }, err => {
      console.error("Error fetching trash:", err);
    });
  },[canManage]);

  const upd=async(id:string,u:Partial<MerchRequest>)=>{
    await updateDoc(doc(db,'merch_requests',id),{...u,updatedAt:serverTimestamp()});
    if(sel?.id===id)setSel(p=>p?{...p,...u}:null);
  };

  // ── General actions (all staff) ──────────────────────────────────────────
  const markPaid=async(o:MerchRequest)=>{await upd(o.id,{paymentStatus:'paid'});showToast('Marked as paid','success');};
  const complete=async(o:MerchRequest)=>{await upd(o.id,{status:'completed',paymentStatus:'paid'});showToast('Order completed','success');};
  const softDelete=async(o:MerchRequest)=>{
    if(!window.confirm('Move this order to the recycle bin?'))return;
    await upd(o.id,{deleted:true,deletedAt:serverTimestamp()} as any);
    showToast('Order moved to recycle bin','info');setSel(null);
  };

  // ── manageOrders-only actions ────────────────────────────────────────────
  const undoComplete=async(o:MerchRequest)=>{
    if(!canManage)return;
    await upd(o.id,{status:'pending'});showToast('Order restored to pending','info');
  };
  const restoreFromTrash=async(o:MerchRequest)=>{
    if(!canManage)return;
    await upd(o.id,{deleted:false,deletedAt:null} as any);showToast('Order restored','success');
  };
  const emptyTrash=async()=>{
    if(!canManage)return;
    const batch=writeBatch(db);
    trash.forEach(o=>batch.delete(doc(db,'merch_requests',o.id)));
    await batch.commit();setShowEmptyConfirm(false);showToast(`${trash.length} order(s) permanently deleted`,'info');
  };

  const filtered=orders
    .filter(o=>filter==='all'||o.status===filter)
    .filter(o=>!search||[o.requesterName,o.cadetName,o.requestId,o.phone].some(v=>v?.toLowerCase().includes(search.toLowerCase())));

  const counts={all:orders.length,pending:orders.filter(o=>o.status==='pending').length,completed:orders.filter(o=>o.status==='completed').length,canceled:orders.filter(o=>o.status==='canceled').length};
  const pendingVal=orders.filter(o=>o.status==='pending').reduce((s,o)=>s+(parseFloat(o.totalPrice?.replace(/[^0-9.]/g,''))||0),0);

  const OrderDetailModal=({order,onClose}:{order:MerchRequest;onClose:()=>void})=>(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="font-black text-navy dark:text-white">{order.requestId||order.id.slice(0,8).toUpperCase()}</h2>
            <p className="text-xs text-slate-400">{order.createdAt?.toDate?.().toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Customer</h3>
            {[["Name",order.requesterName],["Cadet",order.cadetName],["Phone",order.phone],["Payment",order.paymentMethod]].map(([l,v])=>(
              <div key={l} className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400 font-bold">{l}</span><span className="text-navy dark:text-white font-bold capitalize">{v}</span></div>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Items</h3>
            <div className="space-y-2">
              {order.items?.map((item:CartItem,i:number)=>(
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  {item.image&&<img src={item.image} className="w-10 h-10 rounded-lg object-cover shrink-0" alt=""/>}
                  <div className="flex-1 min-w-0"><p className="font-bold text-navy dark:text-white text-sm truncate">{item.name}</p><p className="text-xs text-slate-400">Qty: {item.quantity}</p></div>
                  <span className="font-black text-navy dark:text-white text-sm">{item.price}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-black text-navy dark:text-white text-sm"><span>Total</span><span>{order.totalPrice}</span></div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${SS[order.status]||SS.pending}`}>{order.status}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${PS[order.paymentStatus]||PS.pending}`}>{order.paymentStatus}</span>
          </div>
        </div>
        <div className="px-6 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4 flex flex-col gap-2 shrink-0">
          {order.status==='pending'&&<>
            {order.paymentStatus!=='paid'&&(
              <button onClick={()=>markPaid(order)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest"><Check className="w-4 h-4"/>Mark as Paid</button>
            )}
            <button onClick={()=>complete(order)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy hover:bg-ocean text-white font-black rounded-xl text-xs uppercase tracking-widest"><Package className="w-4 h-4"/>Mark as Completed</button>
          </>}
          {/* manageOrders-only: undo complete */}
          {canManage&&order.status==='completed'&&(
            <button onClick={()=>{undoComplete(order);onClose();}} className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs uppercase tracking-widest"><RotateCcw className="w-4 h-4"/>Undo Complete → Pending</button>
          )}
          <button onClick={()=>{softDelete(order);onClose();}} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-black rounded-xl text-xs uppercase tracking-widest"><Trash2 className="w-4 h-4"/>Move to Recycle Bin</button>
        </div>
      </div>
    </div>
  );

  return(
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Orders</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{counts.pending} pending · JMD ${pendingVal.toFixed(2)} outstanding</p>
        </div>
        {canManage&&tab==='trash'&&trash.length>0&&(
          <button onClick={()=>setShowEmptyConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest">
            <Trash2 className="w-4 h-4"/>Empty Recycle Bin ({trash.length})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{label:'Total',value:counts.all,icon:ShoppingBag,color:'text-navy dark:text-white'},{label:'Pending',value:counts.pending,icon:Clock,color:'text-amber-600 dark:text-amber-400'},{label:'Completed',value:counts.completed,icon:Check,color:'text-green-600 dark:text-green-400'},{label:'Canceled',value:counts.canceled,icon:XCircle,color:'text-red-500 dark:text-red-400'}].map(({label,value,icon:Icon,color})=>(
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color} shrink-0`}/><div><p className="text-2xl font-black text-navy dark:text-white">{value}</p><p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</p></div>
          </div>
        ))}
      </div>

      {/* Tabs — Orders / Trash (trash only visible to manageOrders) */}
      <div className="flex gap-2">
        <button onClick={()=>setTab('orders')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab==='orders'?'bg-navy text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'}`}>
          Active Orders
        </button>
        {canManage&&(
          <button onClick={()=>setTab('trash')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab==='trash'?'bg-red-500 text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-red-500'}`}>
            <Trash2 className="w-3 h-3"/>Recycle Bin {trash.length>0&&<span className={`px-1.5 py-0.5 rounded-full text-xs font-black ${tab==='trash'?'bg-white/20 text-white':'bg-red-100 text-red-600'}`}>{trash.length}</span>}
          </button>
        )}
      </div>

      {/* ── TRASH TAB ── */}
      {tab==='trash'&&canManage&&(
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {trash.length===0?(
            <div className="py-16 text-center text-slate-400">
              <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="font-bold text-sm">Recycle bin is empty</p>
            </div>
          ):(
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                {['Order ID','Customer','Total','Deleted',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 first:pl-5">{h}</th>)}
              </tr></thead>
              <tbody>{trash.map(o=>(
                <tr key={o.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20 opacity-70">
                  <td className="px-5 py-3"><p className="font-black text-navy dark:text-white text-xs">{o.requestId||o.id.slice(0,8).toUpperCase()}</p></td>
                  <td className="px-4 py-3"><p className="font-bold text-navy dark:text-white text-sm">{o.requesterName}</p><p className="text-xs text-slate-400">{o.phone}</p></td>
                  <td className="px-4 py-3 font-black text-navy dark:text-white text-sm">{o.totalPrice}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{(o as any).deletedAt?.toDate?.().toLocaleDateString()||'—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={()=>restoreFromTrash(o)} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-xs font-black uppercase tracking-widest">
                        <RefreshCw className="w-3 h-3"/>Restore
                      </button>
                      <button onClick={async()=>{
                        if(!window.confirm('Permanently delete this order? This cannot be undone.'))return;
                        await import('firebase/firestore').then(({deleteDoc})=>deleteDoc(doc(db,'merch_requests',o.id)));
                        showToast('Order permanently deleted','info');
                      }} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-xs font-black uppercase tracking-widest">
                        <Trash2 className="w-3 h-3"/>Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {/* ── ACTIVE ORDERS TAB ── */}
      {tab==='orders'&&(<>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, order ID…" className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-navy dark:text-white outline-none"/></div>
          <div className="flex gap-2 flex-wrap">{(['all','pending','completed','canceled'] as const).map(s=><button key={s} onClick={()=>setFilter(s)} className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter===s?'bg-navy text-white':'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-navy dark:hover:text-white'}`}>{s} ({counts[s]})</button>)}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {loading?<div className="p-6 space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-12 bg-slate-50 dark:bg-slate-700 rounded-xl animate-pulse"/>)}</div>
          :filtered.length===0?<div className="py-16 text-center text-slate-400"><ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="font-bold text-sm">No orders found.</p></div>
          :<table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">{['Order ID','Customer','Items','Total','Payment','Status',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 first:pl-5">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(o=>(
              <tr key={o.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                <td className="px-5 py-3"><p className="font-black text-navy dark:text-white text-xs">{o.requestId||o.id.slice(0,8).toUpperCase()}</p><p className="text-xs text-slate-400">{o.createdAt?.toDate?.().toLocaleDateString()}</p></td>
                <td className="px-4 py-3"><p className="font-bold text-navy dark:text-white text-sm">{o.requesterName}</p><p className="text-xs text-slate-400">{o.phone}</p></td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{o.items?.length} item(s)</td>
                <td className="px-4 py-3 font-black text-navy dark:text-white text-sm">{o.totalPrice}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${PS[o.paymentStatus]||PS.pending}`}>{o.paymentStatus}</span><p className="text-xs text-slate-400 mt-0.5 capitalize">{o.paymentMethod}</p></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${SS[o.status]||SS.pending}`}>{o.status}</span></td>
                <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                  {/* Quick actions in row */}
                  {o.status==='pending'&&o.paymentStatus!=='paid'&&<button onClick={()=>markPaid(o)} title="Mark paid" className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"><Check className="w-3.5 h-3.5"/></button>}
                  {o.status==='pending'&&<button onClick={()=>complete(o)} title="Mark completed" className="p-1.5 text-navy dark:text-white hover:bg-navy/10 dark:hover:bg-white/10 rounded-lg"><Package className="w-3.5 h-3.5"/></button>}
                  {canManage&&o.status==='completed'&&<button onClick={()=>undoComplete(o)} title="Undo complete" className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"><RotateCcw className="w-3.5 h-3.5"/></button>}
                  <button onClick={()=>setSel(o)} className="p-1.5 hover:bg-navy/10 dark:hover:bg-white/10 rounded-lg"><Eye className="w-4 h-4 text-slate-400"/></button>
                  <button onClick={()=>softDelete(o)} title="Move to bin" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>}
        </div>
      </>)}

      {/* Order detail modal */}
      {sel&&<OrderDetailModal order={sel} onClose={()=>setSel(null)}/>}

      {/* Empty recycle bin confirmation */}
      {showEmptyConfirm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-5"><AlertTriangle className="w-7 h-7 text-red-500"/></div>
            <h2 className="text-xl font-black text-navy dark:text-white mb-2">Empty Recycle Bin?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">This will permanently delete <strong>{trash.length}</strong> order(s). This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={()=>setShowEmptyConfirm(false)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={emptyTrash} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-xs uppercase tracking-widest">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}