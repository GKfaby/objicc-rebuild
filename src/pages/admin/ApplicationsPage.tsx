import{useState,useEffect} from 'react';
import{collection,onSnapshot,doc,updateDoc,orderBy,query,serverTimestamp} from 'firebase/firestore';
import{db} from '../../firebase';
import{FileText,Check,Eye,X,Clock} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
import type{Application} from '../../types';
const SS:Record<string,string>={pending:'bg-amber-50 text-amber-700',reviewed:'bg-blue-50 text-blue-700',accepted:'bg-green-50 text-green-700',rejected:'bg-red-50 text-red-700'};
export default function ApplicationsPage(){
  const[apps,setApps]=useState<Application[]>([]);const[loading,setLoading]=useState(true);
  const[filter,setFilter]=useState<'all'|'pending'|'reviewed'|'accepted'|'rejected'>('pending');
  const[sel,setSel]=useState<Application|null>(null);
  const{showToast}=useToast();
  useEffect(()=>{const q=query(collection(db,'applications'),orderBy('createdAt','desc'));return onSnapshot(q,snap=>{setApps(snap.docs.map(d=>({id:d.id,...d.data()} as Application)));setLoading(false);});},[]);
  const update=async(app:Application,status:Application['status'])=>{await updateDoc(doc(db,'applications',app.id),{status,reviewedBy:'admin',updatedAt:serverTimestamp()});showToast(`Application ${status}`,status==='accepted'?'success':'info');setSel(null);};
  const filtered=filter==='all'?apps:apps.filter(a=>a.status===filter);
  const counts={all:apps.length,pending:0,reviewed:0,accepted:0,rejected:0};apps.forEach(a=>{counts[a.status]=(counts[a.status]||0)+1;});
  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Applications</h1><p className="text-slate-500 text-sm mt-1">Enrollment applications.</p></div>
    <div className="flex gap-2 flex-wrap">{(['all','pending','reviewed','accepted','rejected'] as const).map(s=><button key={s} onClick={()=>setFilter(s)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${filter===s?'bg-navy text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'}`}>{s} <span className="opacity-60">({counts[s]??0})</span></button>)}</div>
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {loading?<div className="p-6 space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-12 bg-slate-50 dark:bg-slate-700 rounded-xl animate-pulse"/>)}</div>
      :filtered.length===0?<div className="py-16 text-center text-slate-400"><FileText className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="font-bold text-sm">No {filter} applications.</p></div>
      :<table className="w-full text-sm"><thead><tr className="border-b border-slate-100 dark:border-slate-700">{['Cadet','School','Parent','Date','Status',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 first:pl-6">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(a=><tr key={a.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
          <td className="px-6 py-3 font-bold text-navy dark:text-white">{a.cadetName}</td>
          <td className="px-4 py-3 text-slate-500">{a.school}</td>
          <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{a.parentName}</td>
          <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">{a.createdAt?.toDate?.().toLocaleDateString()}</td>
          <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${SS[a.status]}`}>{a.status}</span></td>
          <td className="px-4 py-3 text-right"><button onClick={()=>setSel(a)} className="p-1.5 hover:bg-navy/10 rounded-lg"><Eye className="w-4 h-4 text-navy dark:text-white"/></button></td>
        </tr>)}</tbody>
      </table>}
    </div>
    {sel&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-5"><h2 className="font-black text-navy dark:text-white text-lg">{sel.cadetName}</h2><button onClick={()=>setSel(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5"/></button></div>
        <div className="space-y-3 text-sm mb-6">{[['School',sel.school],['Grade',sel.grade],['Parent',sel.parentName],['Parent Phone',sel.parentPhone],...(sel.cadetPhone?[['Cadet Phone',sel.cadetPhone]]:[]),['Submitted',sel.createdAt?.toDate?.().toLocaleString()]].map(([l,v])=><div key={l} className="flex justify-between"><span className="text-slate-400 font-bold">{l}</span><span className="text-navy dark:text-white font-bold">{v}</span></div>)}</div>
        <div className="flex gap-3">
          <button onClick={()=>update(sel,'accepted')} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest"><Check className="w-4 h-4"/>Accept</button>
          <button onClick={()=>update(sel,'reviewed')} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-black rounded-xl text-xs uppercase tracking-widest"><Clock className="w-4 h-4"/>Review</button>
          <button onClick={()=>update(sel,'rejected')} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-black rounded-xl text-xs uppercase tracking-widest"><X className="w-4 h-4"/>Reject</button>
        </div>
      </div>
    </div>}
  </div>);
}