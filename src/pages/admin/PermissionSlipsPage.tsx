import{useState,useEffect,useRef} from 'react';
import{collection,query,onSnapshot,orderBy,where} from 'firebase/firestore';
import{db} from '../../firebase';
import{Printer,Search,FileText,Calendar,Users} from 'lucide-react';
import{useUser} from '../../contexts/UserContext';
import type{Post,UserProfile} from '../../types';
export default function PermissionSlipsPage(){
  const[events,setEvents]=useState<Post[]>([]);const[users,setUsers]=useState<UserProfile[]>([]);
  const[sel,setSel]=useState<Post|null>(null);const[search,setSearch]=useState('');const[loading,setLoading]=useState(true);
  const printRef=useRef<HTMLDivElement>(null);const{systemSettings}=useUser();
  useEffect(()=>{const q=query(collection(db,'posts'),where('hasPermissionSlip','==',true),orderBy('createdAt','desc'));return onSnapshot(q,snap=>{setEvents(snap.docs.map(d=>({id:d.id,...d.data()} as Post)));setLoading(false);});},[]);
  useEffect(()=>{const q=query(collection(db,'users'),where('role','in',['cadet','pending_cadet']));return onSnapshot(q,snap=>{setUsers(snap.docs.map(d=>({uid:d.id,...d.data()} as UserProfile)));});},[]);
  const handlePrint=()=>{if(!printRef.current||!sel)return;const win=window.open('','_blank','width=800,height=600');if(!win)return;
    win.document.write(`<!DOCTYPE html><html><head><title>Permission Slip</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12pt;color:#000;background:#fff}.slip{max-width:720px;margin:20px auto;padding:30px;border:2px solid #000}.header{border-bottom:2px solid #000;padding-bottom:16px;margin-bottom:16px}.org{font-size:18pt;font-weight:900;text-transform:uppercase}.date{font-size:10pt;color:#555}h1{font-size:16pt;font-weight:900;text-transform:uppercase;margin-bottom:6px}.desc{font-size:10pt;line-height:1.6;margin:16px 0;padding:12px;background:#f5f5f5;border-left:4px solid #000}h2{font-size:11pt;font-weight:900;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:4px;margin:16px 0 12px}.field{display:flex;gap:8px;margin-bottom:10px;align-items:flex-end}.field label{font-size:9pt;font-weight:bold;text-transform:uppercase;white-space:nowrap;color:#555}.line{flex:1;border-bottom:1px solid #000;min-width:80px;height:18px}.consent{font-size:9pt;line-height:1.7;margin-bottom:16px}.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px}.sig-block .sig-line{border-bottom:1px solid #000;height:36px;margin-bottom:4px}.sig-block label{font-size:9pt;font-weight:bold;text-transform:uppercase;color:#555}.sig-block .sub{font-size:8pt;color:#777}.footer{text-align:center;font-size:8pt;color:#777;margin-top:20px;padding-top:12px;border-top:1px solid #ccc}@media print{body{print-color-adjust:exact}}</style></head><body>
    <div class="slip"><div class="header"><div class="org">${systemSettings.orgName}</div><div class="date">Official Permission Slip</div></div>
    <h1>${sel.title}</h1><div class="desc">${sel.description}</div><p class="date"><strong>Date:</strong> ${sel.date} &nbsp;|&nbsp; <strong>Category:</strong> ${sel.category}</p>
    <h2>Cadet Information</h2>${['Full Name (Cadet)','Rank / Division','School','Contact Number'].map(f=>`<div class="field"><label>${f}:</label><div class="line"></div></div>`).join('')}
    <h2>Parent / Guardian Consent</h2><p class="consent">I, the undersigned parent or guardian, hereby give permission for my child/ward to participate in the above-mentioned ${systemSettings.orgName} activity. I understand that reasonable safety measures will be taken, and I consent to emergency medical treatment if required.</p>
    <div class="sig-row"><div class="sig-block"><div class="sig-line"></div><label>Parent / Guardian Signature</label><div class="sub">Date: _______________</div></div><div class="sig-block"><div class="sig-line"></div><label>Parent / Guardian Name (Print)</label><div class="sub">Relationship: _______________</div></div></div>
    <h2>Emergency Contact</h2>${['Name','Phone','Relationship'].map(f=>`<div class="field"><label>${f}:</label><div class="line"></div></div>`).join('')}
    <div class="footer">${systemSettings.orgName} · ${systemSettings.address}<br>Please return this signed slip to your unit commander before the event.</div></div></body></html>`);
    win.document.close();win.focus();setTimeout(()=>win.print(),300);};
  const filtered=events.filter(e=>!search||e.title.toLowerCase().includes(search.toLowerCase()));
  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Permission Slips</h1><p className="text-slate-500 text-sm mt-1">Generate and print permission slips for events.</p></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-black text-navy dark:text-white text-sm uppercase tracking-widest">Select Event</h2><span className="text-xs text-slate-400">{events.length} events with slips</span></div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-sm text-navy dark:text-white outline-none"/></div>
        {loading?<div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="h-14 bg-slate-50 dark:bg-slate-700 rounded-xl animate-pulse"/>)}</div>
        :filtered.length===0?<div className="py-10 text-center text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">No events with permission slips</p><p className="text-xs mt-1">Enable Permission Slip when creating an event</p></div>
        :<div className="space-y-2 max-h-80 overflow-y-auto">{filtered.map(e=><button key={e.id} onClick={()=>setSel(e)} className={`w-full text-left p-3 rounded-xl border-2 transition-all ${sel?.id===e.id?'border-navy bg-navy/5 dark:border-gold':'border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}><p className={`font-black text-sm ${sel?.id===e.id?'text-navy dark:text-white':'text-slate-700 dark:text-slate-200'}`}>{e.title}</p><div className="flex items-center gap-2 mt-1"><Calendar className="w-3 h-3 text-slate-400"/><span className="text-xs text-slate-400">{e.date}</span></div></button>)}</div>}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-black text-navy dark:text-white text-sm uppercase tracking-widest">Preview & Print</h2>
          {sel&&<button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean"><Printer className="w-3 h-3"/>Print Slip</button>}
        </div>
        {!sel?<div className="py-16 text-center text-slate-300 dark:text-slate-600"><FileText className="w-10 h-10 mx-auto mb-3"/><p className="text-sm font-bold">Select an event to preview</p></div>
        :<div className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
          <div className="border-b border-slate-200 dark:border-slate-600 pb-3"><p className="font-black text-navy dark:text-white">{systemSettings.orgName} — Permission Slip</p></div>
          <div><p className="font-black text-navy dark:text-white text-sm">{sel.title}</p><p className="text-xs text-slate-400 mt-0.5">{sel.date}</p>{sel.description&&<p className="text-xs text-slate-500 mt-2 line-clamp-3">{sel.description}</p>}</div>
          {['Cadet Full Name','Rank / Division','School','Contact Number'].map(f=><div key={f} className="flex items-center gap-2"><span className="text-xs text-slate-400 font-bold w-28 shrink-0">{f}</span><div className="flex-1 border-b border-slate-200 dark:border-slate-600 h-5"/></div>)}
          <div className="border border-dashed border-slate-200 dark:border-slate-600 rounded-lg p-3 text-xs text-slate-400">Parent/Guardian consent + signature blocks...</div>
        </div>}
      </div>
    </div>
    {sel&&users.length>0&&<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-navy dark:text-gold"/><h2 className="font-black text-navy dark:text-white text-sm uppercase tracking-widest">Cadets ({users.length})</h2></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">{users.map(u=><div key={u.uid} className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl"><div className="w-7 h-7 rounded-lg bg-navy/10 dark:bg-white/10 flex items-center justify-center shrink-0"><span className="text-xs font-black text-navy dark:text-white">{u.firstName?.[0]}{u.lastName?.[0]}</span></div><div className="min-w-0"><p className="text-xs font-bold text-navy dark:text-white truncate">{u.displayName}</p><p className="text-xs text-slate-400 truncate">{u.school}</p></div></div>)}</div>
    </div>}
  </div>);
}