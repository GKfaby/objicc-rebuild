import{useState,useEffect} from 'react';
import{collection,query,where,getCountFromServer,onSnapshot,orderBy,limit} from 'firebase/firestore';
import{db} from '../../firebase';
import{Users,FileText,MessageSquare,Clock,TrendingUp} from 'lucide-react';
import{useUser} from '../../contexts/UserContext';
export default function DashboardPage(){
  const{profile,permissions}=useUser();
  const[stats,setStats]=useState({users:0,pending:0,apps:0,suggestions:0});
  const[activity,setActivity]=useState<any[]>([]);
  useEffect(()=>{
    const f=async()=>{try{const[u,p,a,s]=await Promise.all([getCountFromServer(collection(db,'users')),getCountFromServer(query(collection(db,'users'),where('status','==','pending'))),getCountFromServer(query(collection(db,'applications'),where('status','==','pending'))),getCountFromServer(query(collection(db,'suggestions'),where('status','==','pending')))]);setStats({users:u.data().count,pending:p.data().count,apps:a.data().count,suggestions:s.data().count});}catch(e){}};
    const unsub=onSnapshot(query(collection(db,'user_updates'),orderBy('timestamp','desc'),limit(10)),snap=>{setActivity(snap.docs.map(d=>({id:d.id,...d.data()})));});
    f();return unsub;
  },[]);
  const cards=[{label:'Total Members',value:stats.users,icon:Users,color:'bg-navy/10 text-navy'},{label:'Pending Approvals',value:stats.pending,icon:Clock,color:'bg-amber-50 text-amber-600'},{label:'Pending Applications',value:stats.apps,icon:FileText,color:'bg-blue-50 text-blue-600'},{label:'Unread Suggestions',value:stats.suggestions,icon:MessageSquare,color:'bg-purple-50 text-purple-600'}];
  return(<div className="space-y-8">
    <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Welcome back, {profile?.firstName}</h1><p className="text-slate-500 text-sm mt-1">Here is what is happening with OBJICC today.</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(({label,value,icon:Icon,color})=><div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm"><div className={`inline-flex p-3 rounded-xl mb-3 ${color}`}><Icon className="w-5 h-5"/></div><div className="text-3xl font-black text-navy dark:text-white">{value}</div><div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</div></div>)}</div>
    {permissions.canViewUserUpdates&&<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5"><TrendingUp className="w-4 h-4 text-navy dark:text-gold"/><h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm">Recent Activity</h2></div>
      {activity.length===0?<p className="text-slate-400 text-sm">No activity yet.</p>:<div className="space-y-2">{activity.map(a=><div key={a.id} className="flex items-center gap-3 py-2 border-b border-slate-50 dark:border-slate-700 last:border-0"><div className="w-2 h-2 rounded-full bg-ocean shrink-0"/><p className="text-sm text-slate-600 dark:text-slate-300 flex-1">{a.message}</p><p className="text-xs text-slate-300 dark:text-slate-600 shrink-0">{a.timestamp?.toDate?.().toLocaleDateString()}</p></div>)}</div>}
    </div>}
  </div>);
}