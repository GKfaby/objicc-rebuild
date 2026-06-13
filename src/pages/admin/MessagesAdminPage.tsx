import{useState,useEffect,useRef} from 'react';
import{collection,query,onSnapshot,addDoc,updateDoc,doc,serverTimestamp,orderBy,where,getDocs} from 'firebase/firestore';
import{db} from '../../firebase';
import{Send,MessageSquare,Megaphone,X,Search,ChevronLeft,Check,CheckCheck} from 'lucide-react';
import{useUser} from '../../contexts/UserContext';
import{useToast} from '../../contexts/ToastContext';
import{ROLE_LABELS} from '../../types';
import type{Role} from '../../types';
const BR:Role[]=['cadet','parent','pending_cadet','pending_parent','staff','editor','recruitment_officer','admin'];
interface Msg{id:string;content:string;senderId:string;senderName:string;createdAt:any;readBy:string[];}
interface Conv{id:string;subject:string;participants:string[];participantNames:Record<string,string>;lastMessage:string;lastMessageAt:any;unread:Record<string,number>;}
export default function MessagesAdminPage(){
  const{firebaseUser,profile}=useUser();const{showToast}=useToast();
  const[convs,setConvs]=useState<Conv[]>([]);const[active,setActive]=useState<Conv|null>(null);
  const[msgs,setMsgs]=useState<Msg[]>([]);const[text,setText]=useState('');const[sending,setSending]=useState(false);
  const[search,setSearch]=useState('');const[tab,setTab]=useState<'messages'|'broadcasts'>('messages');
  const[showBcast,setShowBcast]=useState(false);const[btitle,setBtitle]=useState('');const[bcontent,setBcontent]=useState('');const[broles,setBroles]=useState<Role[]>([]);
  const[bcasts,setBcasts]=useState<any[]>([]);const bottomRef=useRef<HTMLDivElement>(null);
  if(!firebaseUser||!profile)return null;
  useEffect(()=>{const q=query(collection(db,'conversations'),orderBy('lastMessageAt','desc'));return onSnapshot(q,snap=>{setConvs(snap.docs.map(d=>({id:d.id,...d.data()} as Conv)));});},[]);
  useEffect(()=>{const q=query(collection(db,'broadcasts'),orderBy('createdAt','desc'));return onSnapshot(q,snap=>{setBcasts(snap.docs.map(d=>({id:d.id,...d.data()})));});},[]);
  useEffect(()=>{if(!active){setMsgs([]);return;}const q=query(collection(db,'conversations',active.id,'messages'),orderBy('createdAt','asc'));return onSnapshot(q,async snap=>{const m=snap.docs.map(d=>({id:d.id,...d.data()} as Msg));setMsgs(m);for(const msg of m.filter(m=>!m.readBy?.includes(firebaseUser.uid)&&m.senderId!==firebaseUser.uid))await updateDoc(doc(db,'conversations',active.id,'messages',msg.id),{readBy:[...(msg.readBy||[]),firebaseUser.uid]});if((active.unread?.[firebaseUser.uid]||0)>0)await updateDoc(doc(db,'conversations',active.id),{[`unread.${firebaseUser.uid}`]:0});});},[active?.id,firebaseUser.uid]);
  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),[msgs]);
  const reply=async()=>{if(!text.trim()||!active)return;setSending(true);const c=text.trim();setText('');
    try{await addDoc(collection(db,'conversations',active.id,'messages'),{content:c,senderId:firebaseUser.uid,senderName:profile.displayName,createdAt:serverTimestamp(),readBy:[firebaseUser.uid]});
      const others=active.participants.filter(p=>p!==firebaseUser.uid);const u:any={lastMessage:c,lastMessageAt:serverTimestamp()};others.forEach(uid=>{u[`unread.${uid}`]=(active.unread?.[uid]||0)+1;});await updateDoc(doc(db,'conversations',active.id),u);
      for(const uid of others)await addDoc(collection(db,'users',uid,'notifications'),{title:'New Reply',message:`${profile.displayName}: ${c.slice(0,60)}`,type:'info',read:false,createdAt:serverTimestamp(),link:'/messages'});
    }catch{showToast('Failed.','error');}finally{setSending(false);}};
  const sendBcast=async()=>{if(!btitle.trim()||!bcontent.trim()){showToast('Fill in title and message.','error');return;}setSending(true);
    try{await addDoc(collection(db,'broadcasts'),{title:btitle.trim(),content:bcontent.trim(),sentBy:firebaseUser.uid,sentByName:profile.displayName,targetRoles:broles,createdAt:serverTimestamp(),readBy:[firebaseUser.uid]});
      const{getDocs:gd}=await import('firebase/firestore');const uq=broles.length?query(collection(db,'users'),where('role','in',broles)):query(collection(db,'users'));const usnap=await gd(uq);
      for(const u of usnap.docs){if(u.id===firebaseUser.uid)continue;await addDoc(collection(db,'users',u.id,'notifications'),{title:`📢 ${btitle}`,message:bcontent.slice(0,100),type:'info',read:false,createdAt:serverTimestamp(),link:'/messages'});}
      setShowBcast(false);setBtitle('');setBcontent('');setBroles([]);showToast('Broadcast sent!','success');
    }catch{showToast('Failed.','error');}finally{setSending(false);}};
  const toggleRole=(r:Role)=>setBroles(p=>p.includes(r)?p.filter(x=>x!==r):[...p,r]);
  const fmt=(ts:any)=>{if(!ts?.toDate)return'';const d=ts.toDate(),n=new Date();return d.toDateString()===n.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'});};
  const total=convs.reduce((s,c)=>s+(c.unread?.[firebaseUser.uid]||0),0);
  const filtered=convs.filter(c=>!search||c.subject?.toLowerCase().includes(search.toLowerCase())||Object.values(c.participantNames||{}).some(n=>n.toLowerCase().includes(search.toLowerCase())));
  return(<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Messages</h1><p className="text-slate-500 text-sm mt-1">{convs.length} conversations{total>0?` · ${total} unread`:''}</p></div>
      <button onClick={()=>setShowBcast(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gold text-navy rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400"><Megaphone className="w-4 h-4"/>Broadcast</button>
    </div>
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden" style={{height:'calc(100vh - 220px)',minHeight:480}}>
      <div className="flex h-full">
        <div className={`w-full md:w-80 border-r border-slate-100 dark:border-slate-700 flex flex-col shrink-0 ${active?'hidden md:flex':'flex'}`}>
          <div className="flex border-b border-slate-100 dark:border-slate-700 shrink-0">{[{id:'messages',label:'Conversations',count:total},{id:'broadcasts',label:'Broadcasts',count:0}].map(({id,label,count})=><button key={id} onClick={()=>setTab(id as any)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest ${tab===id?'text-navy dark:text-white border-b-2 border-navy dark:border-gold':'text-slate-400'}`}>{label}{count>0&&<span className="ml-1 px-1.5 py-0.5 bg-gold text-navy rounded-full text-xs font-black">{count}</span>}</button>)}</div>
          {tab==='messages'&&<div className="p-3 shrink-0 border-b border-slate-50 dark:border-slate-700"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs font-bold text-navy dark:text-white outline-none"/></div></div>}
          <div className="flex-1 overflow-y-auto">
            {tab==='messages'?(filtered.length===0?<div className="p-8 text-center text-slate-400"><MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">No conversations</p></div>
            :filtered.map(c=>{const u=c.unread?.[firebaseUser.uid]||0;const name=Object.entries(c.participantNames||{}).find(([uid])=>uid!==firebaseUser.uid)?.[1]||'Member';
              return(<button key={c.id} onClick={()=>setActive(c)} className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${active?.id===c.id?'bg-navy/5 dark:bg-navy/20 border-l-4 border-l-navy dark:border-l-gold':''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1"><p className={`text-sm truncate ${u>0?'font-black text-navy dark:text-white':'font-bold text-slate-600 dark:text-slate-300'}`}>{c.subject}</p><p className="text-xs text-slate-400 truncate">{name}</p><p className="text-xs text-slate-400 truncate">{c.lastMessage}</p></div>
                  <div className="flex flex-col items-end gap-1 shrink-0"><span className="text-xs text-slate-400">{fmt(c.lastMessageAt)}</span>{u>0&&<span className="w-5 h-5 bg-gold text-navy rounded-full text-xs font-black flex items-center justify-center">{u}</span>}</div>
                </div>
              </button>);}))
            :(bcasts.length===0?<div className="p-8 text-center text-slate-400"><Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">No broadcasts yet</p></div>
            :bcasts.map(b=><div key={b.id} className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/50"><p className="text-sm font-black text-navy dark:text-white truncate">{b.title}</p><p className="text-xs text-slate-400 mt-0.5">{b.targetRoles?.length?b.targetRoles.map((r:Role)=>ROLE_LABELS[r]).join(', '):'All users'}</p><p className="text-xs text-slate-400 truncate">{b.content}</p></div>))}
          </div>
        </div>
        <div className={`flex-1 flex flex-col ${!active?'hidden md:flex':'flex'}`}>
          {active?(<>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <button onClick={()=>setActive(null)} className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
              <div><p className="font-black text-navy dark:text-white text-sm">{active.subject}</p><p className="text-xs text-slate-400">{Object.entries(active.participantNames||{}).filter(([uid])=>uid!==firebaseUser.uid).map(([,n])=>n).join(', ')}</p></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map(msg=>{const mine=msg.senderId===firebaseUser.uid;return(<div key={msg.id} className={`flex ${mine?'justify-end':'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${mine?'items-end':'items-start'}`}>
                  {!mine&&<span className="text-xs text-slate-400 font-bold px-1">{msg.senderName}</span>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${mine?'bg-navy text-white rounded-br-sm':'bg-slate-100 dark:bg-slate-700 text-navy dark:text-white rounded-bl-sm'}`}>{msg.content}</div>
                  <div className={`flex items-center gap-1 px-1 ${mine?'justify-end':''}`}><span className="text-xs text-slate-300 dark:text-slate-600">{fmt(msg.createdAt)}</span>{mine&&(msg.readBy?.length>1?<CheckCheck className="w-3 h-3 text-gold"/>:<Check className="w-3 h-3 text-slate-300"/>)}</div>
                </div>
              </div>);})}
              <div ref={bottomRef}/>
            </div>
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <div className="flex gap-2"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();reply();}}} placeholder="Reply..." className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm font-medium outline-none"/>
                <button onClick={reply} disabled={sending||!text.trim()} className="p-2.5 bg-navy text-white rounded-xl hover:bg-ocean disabled:opacity-40"><Send className="w-4 h-4"/></button>
              </div>
            </div>
          </>):(<div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-600 flex-col gap-3"><MessageSquare className="w-12 h-12"/><p className="text-sm font-bold">Select a conversation</p></div>)}
        </div>
      </div>
    </div>
    {showBcast&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700"><div className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-gold"/><h2 className="font-black text-navy dark:text-white">Send Broadcast</h2></div><button onClick={()=>setShowBcast(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button></div>
        <div className="p-6 space-y-4">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label><input value={btitle} onChange={e=>setBtitle(e.target.value)} placeholder="e.g. Training Schedule Update" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none"/></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label><textarea rows={4} value={bcontent} onChange={e=>setBcontent(e.target.value)} placeholder="Write your announcement..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none resize-none"/></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Send To <span className="text-slate-400 normal-case font-medium">(leave all unchecked = everyone)</span></label>
            <div className="grid grid-cols-2 gap-2">{BR.map(r=><div key={r} onClick={()=>toggleRole(r)} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer ${broles.includes(r)?'border-navy bg-navy/5 dark:border-gold':'border-slate-100 dark:border-slate-700'}`}><div className={`w-4 h-4 rounded-lg border-2 flex items-center justify-center ${broles.includes(r)?'bg-navy border-navy dark:bg-gold dark:border-gold':'border-slate-300 dark:border-slate-500'}`}>{broles.includes(r)&&<Check className="w-2.5 h-2.5 text-white"/>}</div><span className={`text-xs font-bold ${broles.includes(r)?'text-navy dark:text-white':'text-slate-400'}`}>{ROLE_LABELS[r]}</span></div>)}</div>
          </div>
          <button onClick={sendBcast} disabled={sending} className="w-full py-3 bg-gold text-navy font-black rounded-xl text-sm uppercase tracking-widest hover:bg-amber-400 disabled:opacity-60 flex items-center justify-center gap-2">
            {sending?<div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin"/>:<Megaphone className="w-4 h-4"/>}
            {sending?'Sending...':broles.length?`Send to ${broles.length} role(s)`:'Send to Everyone'}
          </button>
        </div>
      </div>
    </div>}
  </div>);
}