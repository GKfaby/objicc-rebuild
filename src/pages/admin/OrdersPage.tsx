import{useState,useEffect} from 'react';
import{collection,onSnapshot,doc,updateDoc,query,orderBy,serverTimestamp} from 'firebase/firestore';
import{db} from '../../firebase';
import{ShoppingBag,Eye,X,Check,Package,Clock,XCircle,Search} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import type{MerchRequest,CartItem} from '../../types';
const SS:Record<string,string>={pending:'bg-amber-50 text-amber-700',completed:'bg-green-50 text-green-700',canceled:'bg-red-50 text-red-700'};
const PS:Record<string,string>={pending:'bg-slate-100 text-slate-600',paid:'bg-green-50 text-green-700',canceled:'bg-red-50 text-red-700'};
export default function OrdersPage(){
  const[orders,setOrders]=useState<MerchRequest[]>([]);const[loading,setLoading]=useState(true);
  const[sel,setSel]=useState<MerchRequest|null>(null);const[search,setSearch]=useState('');const[filter,setFilter]=useState<'all'|'pending'|'completed'|'canceled'>('all');
  const{showToast}=useToast();
  useEffect(()=>{const q=query(collection(db,'merch_requests'),orderBy('createdAt','desc'));return onSnapshot(q,snap=>{setOrders(snap.docs.map(d=>({id:d.id,...d.data()} as MerchRequest)));setLoading(false);});},[]);
  const upd=async(id:string,u:Partial<MerchRequest>)=>{await updateDoc(doc(db,'merch_requests',id),{...u,updatedAt:serverTimestamp()});if(sel?.id===id)setSel(p=>p?{...p,...u}:null);};
  const markPaid=async(o:MerchRequest)=>{await upd(o.id,{paymentStatus:'paid'});showToast('Marked as paid','success');};
  const complete=async(o:MerchRequest)=>{await upd(o.id,{status:'completed',paymentStatus:'paid'});showToast('Order completed','success');};
  const cancel=async(o:MerchRequest)=>{if(!window.confirm('Cancel this order?'))return;await upd(o.id,{status:'canceled',paymentStatus:'canceled'});showToast('Order canceled','info');};
  const filtered=orders.filter(o=>(filter==='all'||o.status===filter)&&(!search||[o.requesterName,o.cadetName,o.requestId,o.phone].some(v=>v?.toLowerCase().includes(search.toLowerCase()))));
  const counts={all:orders.length,pending:orders.filter(o=>o.status==='pending').length,completed:orders.filter(o=>o.status==='completed').length,canceled:orders.filter(o=>o.status==='canceled').length};
  const pendingVal=orders.filter(o=>o.status==='pending').reduce((s,o)=>s+(parseFloat(o.totalPrice?.replace(/[^0-9.]/g,''))||0),0);
  return(<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Orders</h1><p className="text-slate-500 text-sm mt-1">{counts.pending} pending · JMD ${pendingVal.toFixed(2)} outstanding</p></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[{label:'Total',value:counts.all,icon:ShoppingBag,color:'text-navy'},{label:'Pending',value:counts.pending,icon:Clock,color:'text-amber-500'},{label:'Completed',value:counts.completed,icon:Check,color:'text-green-500'},{label:'Canceled',value:counts.canceled,icon:XCircle,color:'text-red-400'}].map(({label,value,icon:Icon,color})=>(
        <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3"><Icon className={`w-5 h-5 ${color} shrink-0`}/><div><p className="text-2xl font-black text-navy dark:text-white">{value}</p><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p></div></div>
      ))}
    </div>
    <div className="flex gap-3 flex-wrap items-center">
      <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, order ID..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-navy dark:text-white outline-none"/></div>
      <div className="flex gap-2">{(['all','pending','completed','canceled'] as const).map(s=><button key={s} onClick={()=>setFilter(s)} className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter===s?'bg-navy text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'}`}>{s} ({counts[s]})</button>)}</div>
    </div>
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {loading?<div className="p-6 space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-12 bg-slate-50 dark:bg-slate-700 rounded-xl animate-pulse"/>)}</div>
      :filtered.length===0?<div className="py-16 text-center text-slate-400"><ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="font-bold text-sm">No orders found.</p></div>
      :<table className="w-full text-sm"><thead><tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">{['Order ID','Customer','Items','Total','Payment','Status',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 first:pl-5">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(o=><tr key={o.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20">
          <td className="px-5 py-3"><p className="font-black text-navy dark:text-white text-xs">{o.requestId||o.id.slice(0,8).toUpperCase()}</p><p className="text-xs text-slate-400">{o.createdAt?.toDate?.().toLocaleDateString()}</p></td>
          <td className="px-4 py-3"><p className="font-bold text-navy dark:text-white text-sm">{o.requesterName}</p><p className="text-xs text-slate-400">{o.phone}</p></td>
          <td className="px-4 py-3 text-xs text-slate-500">{o.items?.length} item(s)</td>
          <td className="px-4 py-3 font-black text-navy dark:text-white text-sm">{o.totalPrice}</td>
          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${PS[o.paymentStatus]||PS.pending}`}>{o.paymentStatus}</span><p className="text-xs text-slate-400 mt-0.5 capitalize">{o.paymentMethod}</p></td>
          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${SS[o.status]||SS.pending}`}>{o.status}</span></td>
          <td className="px-4 py-3 text-right"><button onClick={()=>setSel(o)} className="p-1.5 hover:bg-navy/10 rounded-lg"><Eye className="w-4 h-4 text-navy/40 dark:text-white/40"/></button></td>
        </tr>)}</tbody>
      </table>}
    </div>
    {sel&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0"><div><h2 className="font-black text-navy dark:text-white">{sel.requestId||sel.id.slice(0,8).toUpperCase()}</h2><p className="text-xs text-slate-400">{sel.createdAt?.toDate?.().toLocaleString()}</p></div><button onClick={()=>setSel(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button></div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-1.5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Customer</h3>
            {[['Name',sel.requesterName],['Cadet',sel.cadetName],['Phone',sel.phone],['Payment',sel.paymentMethod]].map(([l,v])=><div key={l} className="flex justify-between text-sm"><span className="text-slate-400 font-bold">{l}</span><span className="text-navy dark:text-white font-bold capitalize">{v}</span></div>)}
          </div>
          <div><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Items</h3>
            <div className="space-y-2">{sel.items?.map((item:CartItem,i:number)=><div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">{item.image&&<img src={item.image} className="w-10 h-10 rounded-lg object-cover shrink-0" alt=""/>}<div className="flex-1 min-w-0"><p className="font-bold text-navy dark:text-white text-sm truncate">{item.name}</p><p className="text-xs text-slate-400">Qty: {item.quantity}</p></div><span className="font-black text-navy dark:text-white text-sm">{item.price}</span></div>)}
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-black text-navy dark:text-white"><span>Total</span><span>{sel.totalPrice}</span></div>
            </div>
          </div>
        </div>
        {sel.status==='pending'&&<div className="px-6 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4 flex flex-col gap-2 shrink-0">
          {sel.paymentStatus!=='paid'&&<button onClick={()=>markPaid(sel)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest"><Check className="w-4 h-4"/>Mark as Paid</button>}
          <button onClick={()=>complete(sel)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy hover:bg-ocean text-white font-black rounded-xl text-xs uppercase tracking-widest"><Package className="w-4 h-4"/>Mark as Completed</button>
          <button onClick={()=>cancel(sel)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-black rounded-xl text-xs uppercase tracking-widest"><XCircle className="w-4 h-4"/>Cancel Order</button>
        </div>}
      </div>
    </div>}
  </div>);
}