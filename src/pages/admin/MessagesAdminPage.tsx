import{useState,useEffect,useRef} from 'react';
import{collection,query,onSnapshot,addDoc,updateDoc,deleteDoc,doc,serverTimestamp,orderBy,where,getDocs,writeBatch} from 'firebase/firestore';
import{db} from '../../firebase';
import{Send,MessageSquare,Megaphone,X,Search,ChevronLeft,Check,CheckCheck,Trash2,ArrowDown,Archive,RotateCcw} from 'lucide-react';
import{useUser} from '../../contexts/UserContext';
import{useToast} from '../../contexts/ToastContext';
import{ROLE_LABELS} from '../../types';
import type{Role} from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';
const BR:Role[]=['cadet','parent','pending_cadet','pending_parent','staff','editor','recruitment_officer','admin'];
interface Msg{id:string;content:string;senderId:string;senderName:string;createdAt:any;readBy:string[];deleted?:boolean;deletedAt?:any;}
interface Conv{id:string;subject:string;participants:string[];participantNames:Record<string,string>;lastMessage:string;lastMessageAt:any;unread:Record<string,number>;}
interface Bcast{id:string;title:string;content:string;sentByName:string;targetRoles:string[];createdAt:any;readBy:string[];}
export default function MessagesAdminPage(){
  const{firebaseUser,profile}=useUser();const{showToast}=useToast();
  const[convs,setConvs]=useState<Conv[]>([]);const[active,setActive]=useState<Conv|null>(null);const[activeBcast,setActiveBcast]=useState<Bcast|null>(null);
  const[allMsgs,setAllMsgs]=useState<Msg[]>([]);const[text,setText]=useState('');const[sending,setSending]=useState(false);
  const[search,setSearch]=useState('');const[tab,setTab]=useState<'messages'|'broadcasts'>('messages');
  const[showBcast,setShowBcast]=useState(false);const[btitle,setBtitle]=useState('');const[bcontent,setBcontent]=useState('');const[broles,setBroles]=useState<Role[]>([]);
  const[bcasts,setBcasts]=useState<Bcast[]>([]);
  const[showBin,setShowBin]=useState(false);
  const[confirmDeleteMsg,setConfirmDeleteMsg]=useState<Msg|null>(null);
  const[confirmPermDelete,setConfirmPermDelete]=useState<Msg|null>(null);
  const[confirmEmptyBin,setConfirmEmptyBin]=useState(false);
  const[showJump,setShowJump]=useState(false);const[newIncoming,setNewIncoming]=useState(0);
  const bottomRef=useRef<HTMLDivElement>(null);
  const scrollRef=useRef<HTMLDivElement>(null);
  const isNearBottomRef=useRef(true);
  const prevMsgCountRef=useRef(0);

  // NOTE: all hooks run unconditionally, before any early return -- see
  // MessagesPage.tsx for why this matters (rules-of-hooks violation was
  // causing a blank screen on navigation that only a refresh fixed).

  useEffect(()=>{const q=query(collection(db,'conversations'),orderBy('lastMessageAt','desc'));return onSnapshot(q,snap=>{setConvs(snap.docs.map(d=>({id:d.id,...d.data()} as Conv)));});},[]);
  useEffect(()=>{const q=query(collection(db,'broadcasts'),orderBy('createdAt','desc'));return onSnapshot(q,snap=>{setBcasts(snap.docs.map(d=>({id:d.id,...d.data()} as Bcast)));});},[]);
  useEffect(()=>{
    if(!active||!firebaseUser){setAllMsgs([]);return;}
    const q=query(collection(db,'conversations',active.id,'messages'),orderBy('createdAt','asc'));
    return onSnapshot(q,async snap=>{
      const m=snap.docs.map(d=>({id:d.id,...d.data()} as Msg));setAllMsgs(m);
      for(const msg of m.filter(m=>!m.deleted&&!m.readBy?.includes(firebaseUser.uid)&&m.senderId!==firebaseUser.uid))
        await updateDoc(doc(db,'conversations',active.id,'messages',msg.id),{readBy:[...(msg.readBy||[]),firebaseUser.uid]});
      if((active.unread?.[firebaseUser.uid]||0)>0)await updateDoc(doc(db,'conversations',active.id),{[`unread.${firebaseUser.uid}`]:0});
    });
  },[active?.id,firebaseUser?.uid]);

  const msgs=allMsgs.filter(m=>!m.deleted);
  const binMsgs=allMsgs.filter(m=>m.deleted);

  useEffect(()=>{prevMsgCountRef.current=0;isNearBottomRef.current=true;setShowJump(false);setNewIncoming(0);setShowBin(false);},[active?.id]);

  // Smart scroll: only auto-jump to newest if already near the bottom (or
  // first load) -- otherwise keep scroll position and show a pill, same
  // pattern as WhatsApp, so replying admins don't get yanked mid-read.
  useEffect(()=>{
    const added=msgs.length-prevMsgCountRef.current;
    if(added>0){
      if(isNearBottomRef.current||prevMsgCountRef.current===0){
        bottomRef.current?.scrollIntoView({behavior:prevMsgCountRef.current===0?'auto':'smooth'});
        setShowJump(false);setNewIncoming(0);
      }else{setShowJump(true);setNewIncoming(n=>n+added);}
    }
    prevMsgCountRef.current=msgs.length;
  },[msgs.length]);

  const handleScroll=()=>{
    const el=scrollRef.current;if(!el)return;
    const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<80;
    isNearBottomRef.current=nearBottom;
    if(nearBottom){setShowJump(false);setNewIncoming(0);}
  };
  const jumpToBottom=()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});setShowJump(false);setNewIncoming(0);};

  const reply=async()=>{
    if(!text.trim()||!active||!firebaseUser||!profile)return;setSending(true);const c=text.trim();setText('');
    try{
      await addDoc(collection(db,'conversations',active.id,'messages'),{content:c,senderId:firebaseUser.uid,senderName:profile.displayName,createdAt:serverTimestamp(),readBy:[firebaseUser.uid]});
      const others=active.participants.filter(p=>p!==firebaseUser.uid);const u:any={lastMessage:c,lastMessageAt:serverTimestamp()};others.forEach(uid=>{u[`unread.${uid}`]=(active.unread?.[uid]||0)+1;});await updateDoc(doc(db,'conversations',active.id),u);
      for(const uid of others)await addDoc(collection(db,'users',uid,'notifications'),{title:'New Reply',message:`${profile.displayName}: ${c.slice(0,60)}`,type:'info',read:false,createdAt:serverTimestamp(),link:'/messages'});
    }catch{showToast('Failed.','error');}finally{setSending(false);}
  };

  // Deleting a message moves it to this conversation's recycle bin --
  // restorable until it's individually deleted forever or the bin is
  // emptied entirely.
  const softDeleteMessage=async(m:Msg)=>{
    if(!active)return;
    try{await updateDoc(doc(db,'conversations',active.id,'messages',m.id),{deleted:true,deletedAt:serverTimestamp()});showToast('Message moved to Recycle Bin.','info');}
    catch{showToast('Could not delete message.','error');}
    finally{setConfirmDeleteMsg(null);}
  };
  const restoreMessage=async(m:Msg)=>{
    if(!active)return;
    try{await updateDoc(doc(db,'conversations',active.id,'messages',m.id),{deleted:false,deletedAt:null});showToast('Message restored.','success');}
    catch{showToast('Could not restore message.','error');}
  };
  const permanentlyDelete=async(m:Msg)=>{
    if(!active)return;
    try{await deleteDoc(doc(db,'conversations',active.id,'messages',m.id));showToast('Message permanently deleted.','info');}
    catch{showToast('Could not delete message.','error');}
    finally{setConfirmPermDelete(null);}
  };
  const emptyBin=async()=>{
    if(!active||binMsgs.length===0)return;
    try{const batch=writeBatch(db);binMsgs.forEach(m=>batch.delete(doc(db,'conversations',active.id,'messages',m.id)));await batch.commit();showToast('Recycle Bin emptied.','info');}
    catch{showToast('Could not empty bin.','error');}
    finally{setConfirmEmptyBin(false);}
  };

  const markBread=async(b:Bcast)=>{if(!firebaseUser||b.readBy?.includes(firebaseUser.uid))return;await updateDoc(doc(db,'broadcasts',b.id),{readBy:[...(b.readBy||[]),firebaseUser.uid]});};
  const sendBcast=async()=>{
    if(!firebaseUser||!profile)return;
    if(!btitle.trim()||!bcontent.trim()){showToast('Fill in title and message.','error');return;}setSending(true);
    try{
      await addDoc(collection(db,'broadcasts'),{title:btitle.trim(),content:bcontent.trim(),sentBy:firebaseUser.uid,sentByName:profile.displayName,targetRoles:broles,createdAt:serverTimestamp(),readBy:[firebaseUser.uid]});
      const uq=broles.length?query(collection(db,'users'),where('role','in',broles)):query(collection(db,'users'));const usnap=await getDocs(uq);
      for(const u of usnap.docs){if(u.id===firebaseUser.uid)continue;await addDoc(collection(db,'users',u.id,'notifications'),{title:`📢 ${btitle}`,message:bcontent.slice(0,100),type:'info',read:false,createdAt:serverTimestamp(),link:'/messages'});}
      setShowBcast(false);setBtitle('');setBcontent('');setBroles([]);showToast('Broadcast sent!','success');
    }catch{showToast('Failed.','error');}finally{setSending(false);}
  };
  const toggleRole=(r:Role)=>setBroles(p=>p.includes(r)?p.filter(x=>x!==r):[...p,r]);
  const fmt=(ts:any)=>{if(!ts?.toDate)return'Sending...';const d=ts.toDate(),n=new Date();return d.toDateString()===n.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'});};

  if(!firebaseUser||!profile)return null;

  const total=convs.reduce((s,c)=>s+(c.unread?.[firebaseUser.uid]||0),0);
  const filtered=convs.filter(c=>!search||c.subject?.toLowerCase().includes(search.toLowerCase())||Object.values(c.participantNames||{}).some(n=>n.toLowerCase().includes(search.toLowerCase())));

  return(<div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Messages</h1><p className="text-slate-500 text-sm mt-1">{convs.length} conversations{total>0?` · ${total} unread`:''}</p></div>
      <button onClick={()=>setShowBcast(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gold text-navy rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400"><Megaphone className="w-4 h-4"/>Broadcast</button>
    </div>
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden" style={{height:'calc(100vh - 220px)',minHeight:480}}>
      <div className="flex h-full">
        <div className={`w-full md:w-80 border-r border-slate-100 dark:border-slate-700 flex flex-col shrink-0 ${active||activeBcast?'hidden md:flex':'flex'}`}>
          <div className="flex border-b border-slate-100 dark:border-slate-700 shrink-0">{[{id:'messages',label:'Conversations',count:total},{id:'broadcasts',label:'Broadcasts',count:0}].map(({id,label,count})=><button key={id} onClick={()=>setTab(id as any)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest ${tab===id?'text-navy dark:text-white border-b-2 border-navy dark:border-gold':'text-slate-400'}`}>{label}{count>0&&<span className="ml-1 px-1.5 py-0.5 bg-gold text-navy rounded-full text-xs font-black">{count}</span>}</button>)}</div>
          {tab==='messages'&&<div className="p-3 shrink-0 border-b border-slate-50 dark:border-slate-700"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs font-bold text-navy dark:text-white outline-none"/></div></div>}
          <div className="flex-1 overflow-y-auto">
            {tab==='messages'?(filtered.length===0?<div className="p-8 text-center text-slate-400"><MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">No conversations</p></div>
            :filtered.map(c=>{const u=c.unread?.[firebaseUser.uid]||0;const name=Object.entries(c.participantNames||{}).find(([uid])=>uid!==firebaseUser.uid)?.[1]||'Member';
              return(<button key={c.id} onClick={()=>{setActive(c);setActiveBcast(null);}} className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${active?.id===c.id?'bg-navy/5 dark:bg-navy/20 border-l-4 border-l-navy dark:border-l-gold':''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1"><p className={`text-sm truncate ${u>0?'font-black text-navy dark:text-white':'font-bold text-slate-600 dark:text-slate-300'}`}>{c.subject}</p><p className="text-xs text-slate-400 truncate">{name}</p><p className="text-xs text-slate-400 truncate">{c.lastMessage}</p></div>
                  <div className="flex flex-col items-end gap-1 shrink-0"><span className="text-xs text-slate-400">{fmt(c.lastMessageAt)}</span>{u>0&&<span className="w-5 h-5 bg-gold text-navy rounded-full text-xs font-black flex items-center justify-center">{u}</span>}</div>
                </div>
              </button>);}))
            :(bcasts.length===0?<div className="p-8 text-center text-slate-400"><Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">No broadcasts yet</p></div>
            :bcasts.map(b=>{const read=b.readBy?.includes(firebaseUser.uid);return(<button key={b.id} onClick={()=>{setActiveBcast(b);setActive(null);markBread(b);}} className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${activeBcast?.id===b.id?'bg-navy/5 dark:bg-navy/20 border-l-4 border-l-navy dark:border-l-gold':''}`}>
              <div className="flex items-start gap-2">{!read&&<div className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0"/>}<div className="min-w-0"><p className={`text-sm truncate ${!read?'font-black text-navy dark:text-white':'font-bold text-slate-600 dark:text-slate-300'}`}>{b.title}</p><p className="text-xs text-slate-400 mt-0.5">{b.targetRoles?.length?b.targetRoles.map((r:Role)=>ROLE_LABELS[r]).join(', '):'All users'}</p><p className="text-xs text-slate-400 truncate">{b.content}</p></div></div>
            </button>);}))}
          </div>
        </div>
        <div className={`flex-1 flex flex-col ${!active&&!activeBcast?'hidden md:flex':'flex'}`}>
          {activeBcast?(<>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <button onClick={()=>setActiveBcast(null)} className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
              <div className="flex items-center gap-2"><Megaphone className="w-4 h-4 text-gold shrink-0"/><div><p className="font-black text-navy dark:text-white text-sm">{activeBcast.title}</p><p className="text-xs text-slate-400">From {activeBcast.sentByName} · {fmt(activeBcast.createdAt)} · {activeBcast.targetRoles?.length?activeBcast.targetRoles.map((r:Role)=>ROLE_LABELS[r]).join(', '):'All users'}</p></div></div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{activeBcast.content}</p>
            </div>
          </>):active?(<>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <button onClick={()=>setActive(null)} className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
              <div className="flex-1 min-w-0"><p className="font-black text-navy dark:text-white text-sm">{active.subject}</p><p className="text-xs text-slate-400">{Object.entries(active.participantNames||{}).filter(([uid])=>uid!==firebaseUser.uid).map(([,n])=>n).join(', ')}</p></div>
              <button onClick={()=>setShowBin(p=>!p)} title="Recycle Bin" className={`relative p-2 rounded-xl transition-colors shrink-0 ${showBin?'bg-navy/10 dark:bg-white/10 text-navy dark:text-white':'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'}`}>
                <Archive className="w-4 h-4"/>
                {binMsgs.length>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{binMsgs.length}</span>}
              </button>
            </div>
            {showBin?(
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recycle Bin · {binMsgs.length}</p>
                  {binMsgs.length>0&&<button onClick={()=>setConfirmEmptyBin(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest"><Trash2 className="w-3 h-3"/>Empty Bin</button>}
                </div>
                {binMsgs.length===0?<div className="flex flex-col items-center justify-center text-slate-400 gap-3 py-16"><Archive className="w-10 h-10 opacity-30"/><p className="text-xs font-bold">Recycle Bin is empty</p></div>
                :<div className="space-y-2">{binMsgs.map(msg=>(
                  <div key={msg.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl px-4 py-3 overflow-hidden">
                    <div className="w-0 flex-1 overflow-hidden"><p className="text-xs text-slate-400 font-semibold mb-0.5 truncate">{msg.senderId===firebaseUser.uid?'You':msg.senderName}</p><p className="text-sm text-slate-500 dark:text-slate-400 truncate line-through decoration-slate-300">{msg.content}</p></div>
                    <button onClick={()=>restoreMessage(msg)} title="Restore" className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg shrink-0"><RotateCcw className="w-4 h-4"/></button>
                    <button onClick={()=>setConfirmPermDelete(msg)} title="Delete forever" className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}</div>}
              </div>
            ):(<>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative" ref={scrollRef} onScroll={handleScroll}>
              {msgs.map(msg=>{
                const mine=msg.senderId===firebaseUser.uid;
                return(<div key={msg.id} className={`flex group ${mine?'justify-end':'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${mine?'items-end':'items-start'}`}>
                    <span className="text-xs text-slate-400 font-bold px-1">{mine?"You":msg.senderName}</span>
                    <div className={`flex items-center gap-1.5 ${mine?'flex-row-reverse':''}`}>
                      <div className={`inline-block px-4 py-2.5 rounded-2xl ${mine?'bg-navy text-white rounded-br-sm':'bg-slate-100 dark:bg-slate-700 text-navy dark:text-white rounded-bl-sm'}`} style={{fontSize:14,lineHeight:1.45}}>
                        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                      </div>
                      <button onClick={()=>setConfirmDeleteMsg(msg)} title="Delete message"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-300 hover:text-red-500 shrink-0">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                    <div className={`flex items-center gap-1 px-1 ${mine?'justify-end':''}`}><span className="text-xs text-slate-300 dark:text-slate-600">{fmt(msg.createdAt)}</span>{mine&&(msg.readBy?.length>1?<CheckCheck className="w-3 h-3 text-gold"/>:<Check className="w-3 h-3 text-slate-300"/>)}</div>
                  </div>
                </div>);
              })}
              <div ref={bottomRef}/>
            </div>
            {showJump&&<div className="relative">
              <button onClick={jumpToBottom} className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-navy dark:bg-gold text-white dark:text-navy rounded-full shadow-lg text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity z-10">
                <ArrowDown className="w-3.5 h-3.5"/>{newIncoming>0?`${newIncoming} New Message${newIncoming===1?'':'s'}`:'Jump to Latest'}
              </button>
            </div>}
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <div className="flex gap-2"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();reply();}}} placeholder="Reply..." className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm font-medium outline-none"/>
                <button onClick={reply} disabled={sending||!text.trim()} className="p-2.5 bg-navy text-white rounded-xl hover:bg-ocean disabled:opacity-40"><Send className="w-4 h-4"/></button>
              </div>
            </div>
            </>)}
          </>):(<div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-600 flex-col gap-3"><MessageSquare className="w-12 h-12"/><p className="text-sm font-bold">{tab==="broadcasts"?"Select a broadcast":"Select a conversation"}</p></div>)}
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
    <ConfirmDialog
      open={!!confirmDeleteMsg}
      title="Delete this message?"
      message="This moves the message to the Recycle Bin. You can restore it from there until it's permanently deleted."
      confirmLabel="Delete"
      danger
      onCancel={()=>setConfirmDeleteMsg(null)}
      onConfirm={()=>confirmDeleteMsg&&softDeleteMessage(confirmDeleteMsg)}
    />
    <ConfirmDialog
      open={!!confirmPermDelete}
      title="Delete this message forever?"
      message="This permanently removes the message. It cannot be restored after this."
      confirmLabel="Delete Forever"
      danger
      onCancel={()=>setConfirmPermDelete(null)}
      onConfirm={()=>confirmPermDelete&&permanentlyDelete(confirmPermDelete)}
    />
    <ConfirmDialog
      open={confirmEmptyBin}
      title="Empty the Recycle Bin?"
      message={`This permanently deletes all ${binMsgs.length} message${binMsgs.length===1?'':'s'} in the bin for this conversation. This cannot be undone.`}
      confirmLabel="Empty Bin"
      danger
      onCancel={()=>setConfirmEmptyBin(false)}
      onConfirm={emptyBin}
    />
  </div>);
}
