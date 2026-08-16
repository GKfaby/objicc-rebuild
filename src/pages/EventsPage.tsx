import{useState,useEffect,useRef} from 'react';
import{useSearchParams} from 'react-router-dom';
import{collection,query,where,onSnapshot} from 'firebase/firestore';
import{db} from '../firebase';
import{Calendar,MapPin,Clock,ChevronDown,Download,FileStack,FileText} from 'lucide-react';
import{useUser} from '../contexts/UserContext';
import type{Post} from '../types';
import{computeSchedule,printSlip,type SlipData,type SlipForm} from '../lib/permissionSlip';

export default function EventsPage(){
  const{systemSettings}=useUser();
  const[searchParams]=useSearchParams();
  const highlightId=searchParams.get('id');
  const eventRefs=useRef<Record<string,HTMLDivElement|null>>({});
  const[events,setEvents]=useState<Post[]>([]);
  const[loading,setLoading]=useState(true);
  const[expandedId,setExpandedId]=useState<string|null>(null);
  const[postedSlips,setPostedSlips]=useState<Record<string,SlipData>>({});

  // Arriving from a "click an event" link elsewhere (e.g. the home page
  // notice board) auto-expands and scrolls to that specific event once
  // the list has loaded.
  useEffect(()=>{
    if(!highlightId||loading)return;
    setExpandedId(highlightId);
    const t=setTimeout(()=>eventRefs.current[highlightId]?.scrollIntoView({behavior:'smooth',block:'center'}),150);
    return()=>clearTimeout(t);
  },[highlightId,loading]);

  useEffect(()=>{
    const q=query(collection(db,'posts'),where('type','==','event'));
    return onSnapshot(q,snap=>{setEvents(snap.docs.map(d=>({id:d.id,...d.data()} as Post)));setLoading(false);});
  },[]);

  // A slip only ever shows here once staff have explicitly posted it --
  // the event's "Permission Slip" toggle alone just makes the event
  // eligible, it doesn't publish anything by itself.
  useEffect(()=>{
    return onSnapshot(collection(db,'permissionSlips'),snap=>{
      const m:Record<string,SlipData>={};
      snap.docs.forEach(d=>{m[d.id]=d.data() as SlipData;});
      setPostedSlips(m);
    });
  },[]);

  const download=(ev:Post,section:'full'|'bottom')=>{
    const slip=postedSlips[ev.id];
    if(!slip)return;
    printSlip(slip,section,systemSettings?.orgName||'OBJICC',systemSettings?.logoUrl);
  };

  const scheduleFor=(ev:Post)=>{
    const f:SlipForm={
      project:ev.title,date:ev.startDate||ev.date||'',endDate:ev.endDate||'',
      startTime:ev.startTime||'',endTime:ev.endTime||'',location:ev.location||'',
      meetLocation:ev.meetLocation||'',meetTime:ev.meetTime||'',body:'',
    };
    return computeSchedule(f);
  };

  return(<div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
    <div className="container mx-auto px-4"><div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-black text-navy dark:text-white uppercase tracking-tight mb-2">Events</h1>
      <p className="text-slate-500 mb-10">Upcoming activities and training for OBJICC.</p>

      {loading?<div className="space-y-4">{[...Array(4)].map((_,i)=><div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-2xl animate-pulse"/>)}</div>
      :events.length===0?<div className="text-center py-20 text-slate-400"><Calendar className="w-12 h-12 mx-auto mb-4 opacity-30"/><p className="font-bold">No events yet — check back soon!</p></div>
      :<div className="space-y-4">{events.map(ev=>{
        const open=expandedId===ev.id;
        const{dateLine,timeLine}=scheduleFor(ev);
        const slip=postedSlips[ev.id];
        return(
          <div key={ev.id} ref={el=>{eventRefs.current[ev.id]=el;}} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden transition-shadow ${highlightId===ev.id?'ring-2 ring-navy dark:ring-gold':''}`}>
            <button onClick={()=>setExpandedId(open?null:ev.id)} className="w-full text-left p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
              {ev.image?<img src={ev.image} alt={ev.title} className="w-16 h-16 rounded-xl object-cover shrink-0"/>:<div className="w-16 h-16 rounded-xl bg-navy/10 dark:bg-gold/10 flex items-center justify-center shrink-0"><Calendar className="w-6 h-6 text-navy dark:text-gold"/></div>}
              <div className="min-w-0 flex-1">
                <p className="font-black text-navy dark:text-white">{ev.title}</p>
                <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1 flex-wrap">
                  <Calendar className="w-3.5 h-3.5"/>{dateLine}
                  {ev.location&&<><span>·</span><MapPin className="w-3.5 h-3.5"/>{ev.location}</>}
                </p>
              </div>
              {slip&&<span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-navy/10 dark:bg-gold/10 text-navy dark:text-gold rounded-full text-xs font-black uppercase tracking-widest shrink-0"><FileText className="w-3 h-3"/>Slip</span>}
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open?'rotate-180':''}`}/>
            </button>

            {open&&<div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap mb-4">{ev.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-2">
                <div className="flex items-start gap-2"><Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"/><div><p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Date</p><p className="text-navy dark:text-white font-bold">{dateLine}</p></div></div>
                {timeLine&&<div className="flex items-start gap-2"><Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"/><div><p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Time</p><p className="text-navy dark:text-white font-bold">{timeLine}</p></div></div>}
                {ev.location&&<div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"/><div><p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Location</p><p className="text-navy dark:text-white font-bold">{ev.location}</p></div></div>}
                {ev.meetLocation&&<div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"/><div><p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Meet At</p><p className="text-navy dark:text-white font-bold">{ev.meetLocation}{ev.meetTime?` · ${ev.meetTime}`:''}</p></div></div>}
              </div>

              {slip&&<div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Permission Slip</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={()=>download(ev,'full')} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean transition-colors">
                    <Download className="w-3.5 h-3.5"/>Download Full Slip
                  </button>
                  <button onClick={()=>download(ev,'bottom')} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-navy dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    <FileStack className="w-3.5 h-3.5"/>Download Parent Slip Only
                  </button>
                </div>
              </div>}
            </div>}
          </div>
        );
      })}</div>}
    </div></div>
  </div>);
}
