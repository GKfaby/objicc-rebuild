import{useState,useEffect} from 'react';
import{collection,onSnapshot,orderBy,query,limit} from 'firebase/firestore';
import{db} from '../../firebase';
import{History} from 'lucide-react';
export default function ActivityPage(){
  const[updates,setUpdates]=useState<any[]>([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{const q=query(collection(db,'user_updates'),orderBy('timestamp','desc'),limit(100));return onSnapshot(q,snap=>{setUpdates(snap.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);});},[]);
  return(<div className="space-y-6"><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Activity Log</h1>
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm divide-y divide-slate-50 dark:divide-slate-700">
      {loading?[...Array(10)].map((_,i)=><div key={i} className="h-12 mx-5 my-2 bg-slate-50 dark:bg-slate-700 rounded-xl animate-pulse"/>)
      :updates.length===0?<div className="py-16 text-center text-slate-400"><History className="w-10 h-10 mx-auto mb-3 opacity-30"/><p>No activity yet.</p></div>
      :updates.map(u=><div key={u.id} className="flex items-center gap-3 px-5 py-3"><div className="w-1.5 h-1.5 rounded-full bg-ocean shrink-0"/><p className="text-sm text-slate-600 dark:text-slate-300 flex-1">{u.message}</p><p className="text-xs text-slate-300 dark:text-slate-600 shrink-0">{u.timestamp?.toDate?.().toLocaleString()}</p></div>)}
    </div>
  </div>);
}