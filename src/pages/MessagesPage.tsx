import{useState,useEffect,useRef} from 'react';
import{collection,query,where,onSnapshot,addDoc,updateDoc,deleteDoc,doc,serverTimestamp,orderBy,getDocs,writeBatch} from 'firebase/firestore';
import{db} from '../firebase';
import{Send,MessageSquare,Plus,X,Megaphone,Check,CheckCheck,Type,Trash2,ArrowDown,Archive,RotateCcw} from 'lucide-react';
import{useUser} from '../contexts/UserContext';
import{useToast} from '../contexts/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
interface Msg{id:string;content:string;senderId:string;senderName:string;createdAt:any;readBy:string[];deleted?:boolean;deletedAt?:any;}
interface Conv{id:string;subject:string;participants:string[];participantNames:Record<string,string>;lastMessage:string;lastMessageAt:any;unread:Record<string,number>;}
interface Bcast{id:string;title:string;content:string;sentByName:string;targetRoles:string[];createdAt:any;readBy:string[];}
export default function MessagesPage(){
  const{firebaseUser,profile}=useUser();const{showToast}=useToast();
  const[convs,setConvs]=useState<Conv[]>([]);const[bcasts,setBcasts]=useState<Bcast[]>([]);
  const[active,setActive]=useState<Conv|null>(null);const[activeBcast,setActiveBcast]=useState<Bcast|null>(null);
  const[allMsgs,setAllMsgs]=useState<Msg[]>([]);const[text,setText]=useState('');const[sending,setSending]=useState(false);
  const[showNew,setShowNew]=useState(false);const[newSub,setNewSub]=useState('');const[newBody,setNewBody]=useState('');
  const[tab,setTab]=useState<'messages'|'broadcasts'>('messages');const[loading,setLoading]=useState(true);
  const[fontSize,setFontSize]=useState(14);const[showFontSlider,setShowFontSlider]=useState(false);
  const[showBin,setShowBin]=useState(false);
  const[confirmDeleteMsg,setConfirmDeleteMsg]=useState<Msg|null>(null);
  const[confirmPermDelete,setConfirmPermDelete]=useState<Msg|null>(null);
  const[confirmEmptyBin,setConfirmEmptyBin]=useState(false);
  const[showJump,setShowJump]=useState(false);const[newIncoming,setNewIncoming]=useState(0);
  const bottomRef=useRef<HTMLDivElement>(null);
  const scrollRef=useRef<HTMLDivElement>(null);
  const isNearBottomRef=useRef(true);
  const prevMsgCountRef=useRef(0);

  // NOTE: all hooks below run unconditionally on every render, even before
  // firebaseUser/profile exist -- each one guards internally instead. See
  // git history for why: an early `return null` above hooks used to cause
  // a blank-screen crash on navigation.

  useEffect(()=>{
    if(!firebaseUser)return;
    const q=query(collection(db,'conversations'),where('participants','array-contains',firebaseUser.uid));
    return onSnapshot(q,snap=>{
      const data=snap.docs.map(d=>({id:d.id,...d.data()} as Conv));
      setConvs(data.sort((a,b)=>(b.lastMessageAt?.toMillis?.()??0)-(a.lastMessageAt?.toMillis?.()??0)));
      setLoading(false);
    });
  },[firebaseUser?.uid]);

  useEffect(()=>{
    if(!profile)return;
    const q=query(collection(db,'broadcasts'),orderBy('createdAt','desc'));
    return onSnapshot(q,snap=>{
      const all=snap.docs.map(d=>({id:d.id,...d.data()} as Bcast));
      setBcasts(all.filter(b=>!b.targetRoles?.length||b.targetRoles.includes(profile.role)));
    });
  },[profile?.role]);

  useEffect(()=>{
    if(!active||!firebaseUser){setAllMsgs([]);return;}
    const q=query(collection(db,'conversations',active.id,'messages'),orderBy('createdAt','asc'));
    return onSnapshot(q,async snap=>{
      const m=snap.docs.map(d=>({id:d.id,...d.data()} as Msg));
      setAllMsgs(m);
      for(const msg of m.filter(m=>!m.deleted&&!m.readBy?.includes(firebaseUser.uid)&&m.senderId!==firebaseUser.uid))
        await updateDoc(doc(db,'conversations',active.id,'messages',msg.id),{readBy:[...(msg.readBy||[]),firebaseUser.uid]});
      if((active.unread?.[firebaseUser.uid]||0)>0)
        await updateDoc(doc(db,'conversations',active.id),{[`unread.${firebaseUser.uid}`]:0});
    });
  },[active?.id,firebaseUser?.uid]);

  const msgs=allMsgs.filter(m=>!m.deleted);
  const binMsgs=allMsgs.filter(m=>m.deleted);

  // Reset scroll tracking + close bin view whenever a different conversation is opened
  useEffect(()=>{
    prevMsgCountRef.current=0;
    isNearBottomRef.current=true;
    setShowJump(false);setNewIncoming(0);setShowBin(false);
  },[active?.id]);

  // Smart scroll: only auto-jump to the newest message if the user was
  // already near the bottom (or this is the first load of the chat).
  // Otherwise keep their place and surface a "new messages" pill instead
  // of yanking their scroll position -- same pattern as WhatsApp.
  useEffect(()=>{
    const added=msgs.length-prevMsgCountRef.current;
    if(added>0){
      if(isNearBottomRef.current||prevMsgCountRef.current===0){
        bottomRef.current?.scrollIntoView({behavior:prevMsgCountRef.current===0?'auto':'smooth'});
        setShowJump(false);setNewIncoming(0);
      }else{
        setShowJump(true);setNewIncoming(n=>n+added);
      }
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

  const closeChat=()=>{setActive(null);setActiveBcast(null);};

  const sendMsg=async()=>{
    if(!text.trim()||!active||!firebaseUser||!profile)return;setSending(true);const c=text.trim();setText('');
    try{
      await addDoc(collection(db,'conversations',active.id,'messages'),{content:c,senderId:firebaseUser.uid,senderName:profile.displayName,createdAt:serverTimestamp(),readBy:[firebaseUser.uid]});
      const others=active.participants.filter(p=>p!==firebaseUser.uid);
      const u:any={lastMessage:c,lastMessageAt:serverTimestamp()};
      others.forEach(uid=>{u[`unread.${uid}`]=(active.unread?.[uid]||0)+1;});
      await updateDoc(doc(db,'conversations',active.id),u);
    }catch{showToast('Failed to send.','error');}finally{setSending(false);}
  };

  // Deleting a message moves it to the conversation's recycle bin instead
  // of removing it outright -- it can be restored until the bin is
  // emptied (or the message is individually deleted forever from there).
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

  const startConv=async()=>{
    if(!firebaseUser||!profile)return;
    if(!newSub.trim()||!newBody.trim()){showToast('Enter subject and message.','error');return;}
    setSending(true);
    try{
      const snap=await getDocs(query(collection(db,'users'),where('role','in',['admin','super_admin','staff'])));
      if(snap.empty){showToast('No admin found.','error');return;}
      const admin=snap.docs[0];
      const ref=await addDoc(collection(db,'conversations'),{
        subject:newSub.trim(),participants:[firebaseUser.uid,admin.id],
        participantNames:{[firebaseUser.uid]:profile.displayName,[admin.id]:admin.data().displayName||'Admin'},
        lastMessage:newBody.trim(),lastMessageAt:serverTimestamp(),
        unread:{[admin.id]:1,[firebaseUser.uid]:0},type:'direct',createdAt:serverTimestamp(),
      });
      await addDoc(collection(db,'conversations',ref.id,'messages'),{content:newBody.trim(),senderId:firebaseUser.uid,senderName:profile.displayName,createdAt:serverTimestamp(),readBy:[firebaseUser.uid]});
      await addDoc(collection(db,'users',admin.id,'notifications'),{title:'New Message',message:`${profile.displayName}: ${newSub}`,type:'info',read:false,createdAt:serverTimestamp(),link:'/admin/messages'});
      setShowNew(false);setNewSub('');setNewBody('');showToast('Message sent!','success');
    }catch(e){console.error(e);showToast('Failed to send.','error');}finally{setSending(false);}
  };

  const markBread=async(b:Bcast)=>{if(!firebaseUser||b.readBy?.includes(firebaseUser.uid))return;await updateDoc(doc(db,'broadcasts',b.id),{readBy:[...(b.readBy||[]),firebaseUser.uid]});};
  const fmt=(ts:any)=>{if(!ts?.toDate)return'Sending...';const d=ts.toDate(),n=new Date();return d.toDateString()===n.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'});};

  if(!firebaseUser||!profile)return null;

  const myUnread=convs.reduce((s,c)=>s+(c.unread?.[firebaseUser.uid]||0),0);
  const ubcasts=bcasts.filter(b=>!b.readBy?.includes(firebaseUser.uid)).length;
  const isChatOpen=!!(active||activeBcast);

  return(
    <div className="min-h-screen pt-20 pb-8 bg-slate-50 dark:bg-darkbg">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-black text-navy dark:text-white uppercase tracking-tight mb-6">Messages</h1>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden" style={{height:'calc(100vh - 180px)',minHeight:520}}>
          <div className="flex h-full">

            {/* -- Sidebar -- */}
            <div className={`w-full md:w-80 border-r border-slate-100 dark:border-slate-700 flex flex-col shrink-0 ${isChatOpen?'hidden md:flex':'flex'}`}>
              <div className="flex border-b border-slate-100 dark:border-slate-700 shrink-0">
                {[{id:'messages',label:'Direct',count:myUnread},{id:'broadcasts',label:'Broadcasts',count:ubcasts}].map(({id,label,count})=>(
                  <button key={id} onClick={()=>{setTab(id as any);closeChat();}}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${tab===id?'text-navy dark:text-white border-navy dark:border-gold':'text-slate-400 border-transparent hover:text-navy dark:hover:text-white'}`}>
                    {label}{count>0&&<span className="ml-1.5 px-1.5 py-0.5 bg-gold text-navy rounded-full text-xs font-black">{count}</span>}
                  </button>
                ))}
              </div>
              {tab==='messages'&&(
                <div className="p-3 shrink-0 border-b border-slate-50 dark:border-slate-700">
                  <button onClick={()=>setShowNew(true)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean transition-colors">
                    <Plus className="w-3 h-3"/>New Message
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto">
                {tab==='messages'?(
                  loading?<div className="p-4 space-y-2">{[...Array(3)].map((_,i)=><div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse"/>)}</div>
                  :convs.length===0?<div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-16"><MessageSquare className="w-10 h-10 opacity-30"/><p className="text-xs font-bold text-center">No conversations yet<br/><span className="font-normal">Tap New Message to start one</span></p></div>
                  :convs.map(c=>{
                    const u=c.unread?.[firebaseUser.uid]||0;
                    const other=Object.entries(c.participantNames||{}).find(([uid])=>uid!==firebaseUser.uid)?.[1]||'Admin';
                    const isActive=active?.id===c.id;
                    return(
                      <button key={c.id} onClick={()=>{setActive(c);setActiveBcast(null);}}
                        className={`w-full text-left px-4 py-3.5 transition-all border-b border-slate-50 dark:border-slate-700/50 last:border-0 ${isActive?'bg-navy/5 dark:bg-navy/30 border-l-4 border-l-navy dark:border-l-gold':'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${u>0?'font-black text-navy dark:text-white':'font-semibold text-slate-700 dark:text-slate-200'}`}>{c.subject}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{other}</p>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{c.lastMessage}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-xs text-slate-400">{fmt(c.lastMessageAt)}</span>
                            {u>0&&<span className="w-5 h-5 bg-navy dark:bg-gold text-white dark:text-navy rounded-full text-xs font-black flex items-center justify-center">{u}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ):(
                  bcasts.length===0?<div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-16"><Megaphone className="w-10 h-10 opacity-30"/><p className="text-xs font-bold">No broadcasts yet</p></div>
                  :bcasts.map(b=>{
                    const read=b.readBy?.includes(firebaseUser.uid);
                    return(
                      <button key={b.id} onClick={()=>{setActiveBcast(b);setActive(null);markBread(b);}}
                        className={`w-full text-left px-4 py-3.5 transition-all border-b border-slate-50 dark:border-slate-700/50 last:border-0 ${activeBcast?.id===b.id?'bg-navy/5 dark:bg-navy/30 border-l-4 border-l-navy dark:border-l-gold':'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                        <div className="flex items-start gap-2">
                          {!read&&<div className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0"/>}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${!read?'font-black text-navy dark:text-white':'font-semibold text-slate-600 dark:text-slate-300'}`}>{b.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{b.sentByName}</p>
                            <p className="text-xs text-slate-400 truncate">{b.content}</p>
                          </div>
                          <span className="text-xs text-slate-400 shrink-0">{fmt(b.createdAt)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* -- Right panel -- */}
            <div className={`flex-1 flex flex-col min-w-0 ${!isChatOpen?'hidden md:flex':'flex'}`}>

              {/* Broadcast detail */}
              {activeBcast?(
                <>
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-gold/20 flex items-center justify-center shrink-0"><Megaphone className="w-4 h-4 text-gold"/></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-navy dark:text-white text-sm truncate">{activeBcast.title}</p>
                      <p className="text-xs text-slate-400">From {activeBcast.sentByName} · {fmt(activeBcast.createdAt)}</p>
                    </div>
                    <button onClick={closeChat} title="Close" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 group">
                      <X className="w-4 h-4 text-slate-400 group-hover:text-navy dark:group-hover:text-white"/>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{activeBcast.content}</p>
                  </div>
                </>

              /* Conversation */
              ):active?(
                <>
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-navy/10 dark:bg-white/10 flex items-center justify-center shrink-0"><MessageSquare className="w-4 h-4 text-navy dark:text-white"/></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-navy dark:text-white text-sm truncate">{active.subject}</p>
                      <p className="text-xs text-slate-400 truncate">{Object.entries(active.participantNames||{}).filter(([uid])=>uid!==firebaseUser.uid).map(([,n])=>n).join(', ')}</p>
                    </div>
                    <button onClick={()=>setShowBin(p=>!p)} title="Recycle Bin" className={`relative p-2 rounded-xl transition-colors shrink-0 ${showBin?'bg-navy/10 dark:bg-white/10 text-navy dark:text-white':'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'}`}>
                      <Archive className="w-4 h-4"/>
                      {binMsgs.length>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{binMsgs.length}</span>}
                    </button>
                    <div className="relative shrink-0">
                      <button onClick={()=>setShowFontSlider(p=>!p)} title="Adjust text size"
                        className={`p-2 rounded-xl transition-colors ${showFontSlider?'bg-navy/10 dark:bg-white/10 text-navy dark:text-white':'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'}`}>
                        <Type className="w-4 h-4"/>
                      </button>
                      {showFontSlider&&(
                        <div className="absolute right-0 top-10 z-10 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 p-4 w-56 animate-slide-up">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-navy dark:text-white uppercase tracking-widest">Text Size</span>
                            <span className="text-xs font-bold text-slate-400">{fontSize}px</span>
                          </div>
                          <input type="range" min={11} max={22} value={fontSize} onChange={e=>setFontSize(Number(e.target.value))}
                            className="w-full accent-navy dark:accent-gold h-2 rounded-full cursor-pointer"/>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-xs text-slate-400" style={{fontSize:11}}>A</span>
                            <span className="text-xs text-slate-400" style={{fontSize:14}}>A</span>
                            <span className="text-xs text-slate-400" style={{fontSize:18}}>A</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={closeChat} title="Close conversation"
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 group">
                      <X className="w-4 h-4 text-slate-400 group-hover:text-navy dark:group-hover:text-white"/>
                    </button>
                  </div>

                  {showBin?(
                    /* Recycle Bin */
                    <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50/50 dark:bg-slate-900/20">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recycle Bin · {binMsgs.length}</p>
                        {binMsgs.length>0&&<button onClick={()=>setConfirmEmptyBin(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest"><Trash2 className="w-3 h-3"/>Empty Bin</button>}
                      </div>
                      {binMsgs.length===0?<div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-16"><Archive className="w-10 h-10 opacity-30"/><p className="text-xs font-bold">Recycle Bin is empty</p></div>
                      :<div className="space-y-2">{binMsgs.map(msg=>(
                        <div key={msg.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-700 overflow-hidden">
                          <div className="w-0 flex-1 overflow-hidden">
                            <p className="text-xs text-slate-400 font-semibold mb-0.5 truncate">{msg.senderId===firebaseUser.uid?'You':msg.senderName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate line-through decoration-slate-300">{msg.content}</p>
                          </div>
                          <button onClick={()=>restoreMessage(msg)} title="Restore" className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg shrink-0"><RotateCcw className="w-4 h-4"/></button>
                          <button onClick={()=>setConfirmPermDelete(msg)} title="Delete forever" className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}</div>}
                    </div>
                  ):(<>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/20 relative" ref={scrollRef} onScroll={handleScroll}>
                    {msgs.length===0&&<div className="flex items-center justify-center h-full text-slate-400 text-xs py-8">No messages yet -- send one below</div>}
                    {msgs.map(msg=>{
                      const mine=msg.senderId===firebaseUser.uid;
                      return(
                        <div key={msg.id} className={`flex flex-col gap-1 group ${mine?'items-end':'items-start'}`}>
                          <span className="text-xs text-slate-400 font-semibold px-1">{mine?'You':msg.senderName}</span>
                          <div className={`relative max-w-xs lg:max-w-md flex items-center gap-1.5 ${mine?'flex-row-reverse':''}`}>
                            <div className={`inline-block px-4 py-2.5 rounded-2xl ${mine?'bg-navy text-white rounded-br-sm':'bg-white dark:bg-slate-700 text-navy dark:text-white rounded-bl-sm shadow-sm'}`}
                              style={{fontSize,lineHeight:1.45}}>
                              <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                            </div>
                            {mine&&<button onClick={()=>setConfirmDeleteMsg(msg)} title="Delete message"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-300 hover:text-red-500 shrink-0">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>}
                          </div>
                          <div className={`flex items-center gap-1 px-1 ${mine?'justify-end':''}`}>
                            <span className="text-xs text-slate-400">{fmt(msg.createdAt)}</span>
                            {mine&&(msg.readBy?.length>1?<CheckCheck className="w-3 h-3 text-gold"/>:<Check className="w-3 h-3 text-slate-300"/>)}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef}/>
                  </div>

                  {/* Jump to latest pill -- appears only when new messages
                      arrived while the user had scrolled up to read older
                      ones, so we never yank their scroll position. */}
                  {showJump&&(
                    <div className="relative">
                      <button onClick={jumpToBottom}
                        className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-navy dark:bg-gold text-white dark:text-navy rounded-full shadow-lg text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity z-10">
                        <ArrowDown className="w-3.5 h-3.5"/>
                        {newIncoming>0?`${newIncoming} New Message${newIncoming===1?'':'s'}`:'Jump to Latest'}
                      </button>
                    </div>
                  )}

                  {/* Input */}
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                    <div className="flex gap-2">
                      <input value={text} onChange={e=>setText(e.target.value)}
                        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                        placeholder="Type a message and press Enter…"
                        style={{fontSize}}
                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white outline-none focus:ring-2 focus:ring-navy/20 border border-slate-200 dark:border-slate-600"/>
                      <button onClick={sendMsg} disabled={sending||!text.trim()}
                        className="p-2.5 bg-navy text-white rounded-xl hover:bg-ocean transition-colors disabled:opacity-40 shrink-0">
                        <Send className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                  </>)}
                </>

              /* Empty state */
              ):(
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-3">
                  {tab==='broadcasts'?<Megaphone className="w-12 h-12"/>:<MessageSquare className="w-12 h-12"/>}
                  <p className="text-sm font-bold">{tab==='broadcasts'?'Select a broadcast to read':'Select a conversation or start a new one'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New message modal */}
      {showNew&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-black text-navy dark:text-white">New Message to Admin</h2>
              <button onClick={()=>setShowNew(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Subject</label>
                <input value={newSub} onChange={e=>setNewSub(e.target.value)} placeholder="What is this about?"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
              </div>
              <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Message</label>
                <textarea rows={4} value={newBody} onChange={e=>setNewBody(e.target.value)} placeholder="Write your message…"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600 resize-none"/>
              </div>
              <button onClick={startConv} disabled={sending}
                className="w-full py-3 bg-navy text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-ocean disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                {sending?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Send className="w-4 h-4"/>}
                {sending?'Sending…':'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
