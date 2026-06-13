import{useState,useEffect,useRef} from 'react';
import{collection,query,where,onSnapshot,addDoc,updateDoc,doc,serverTimestamp,orderBy,getDocs} from 'firebase/firestore';
import{db} from '../firebase';
import{Send,MessageSquare,Plus,X,ChevronLeft,Megaphone,Check,CheckCheck} from 'lucide-react';
import{useUser} from '../contexts/UserContext';
import{useToast} from '../contexts/ToastContext';
interface Msg{id:string;content:string;senderId:string;senderName:string;createdAt:any;readBy:string[];}
interface Conv{id:string;subject:string;participants:string[];participantNames:Record<string,string>;lastMessage:string;lastMessageAt:any;unread:Record<string,number>;}
interface Bcast{id:string;title:string;content:string;sentByName:string;targetRoles:string[];createdAt:any;readBy:string[];}
export default function MessagesPage(){
  const{firebaseUser,profile,isStaff}=useUser();const{showToast}=useToast();
  const[convs,setConvs]=useState<Conv[]>([]);const[bcasts,setBcasts]=useState<Bcast[]>([]);
  const[active,setActive]=useState<Conv|null>(null);const[msgs,setMsgs]=useState<Msg[]>([]);
  const[text,setText]=useState('');const[sending,setSending]=useState(false);
  const[showNew,setShowNew]=useState(false);const[newSub,setNewSub]=useState('');const[newBody,setNewBody]=useState('');
  const[tab,setTab]=useState<'messages'|'broadcasts'>('messages');const[loading,setLoading]=useState(true);
  const bottomRef=useRef<HTMLDivElement>(null);
  if(!firebaseUser||!profile)return null;
  useEffect(()=>{const q=query(collection(db,'conversations'),where('participants','array-contains',firebaseUser.uid),orderBy('lastMessageAt','desc'));return onSnapshot(q,snap=>{setConvs(snap.docs.map(d=>({id:d.id,...d.data()} as Conv)));setLoading(false);});},[firebaseUser.uid]);
  useEffect(()=>{const q=query(collection(db,'broadcasts'),orderBy('createdAt','desc'));return onSnapshot(q,snap=>{const all=snap.docs.map(d=>({id:d.id,...d.data()} as Bcast));setBcasts(all.filter(b=>!b.targetRoles?.length||b.targetRoles.includes(profile.role)));});},[profile.role]);
  useEffect(()=>{if(!active){setMsgs([]);return;}const q=query(collection(db,'conversations',active.id,'messages'),orderBy('createdAt','asc'));return onSnapshot(q,async snap=>{const m=snap.docs.map(d=>({id:d.id,...d.data()} as Msg));setMsgs(m);for(const msg of m.filter(m=>!m.readBy?.includes(firebaseUser.uid)&&m.senderId!==firebaseUser.uid))await updateDoc(doc(db,'conversations',active.id,'messages',msg.id),{readBy:[...(msg.readBy||[]),firebaseUser.uid]});if((active.unread?.[firebaseUser.uid]||0)>0)await updateDoc(doc(db,'conversations',active.id),{[`unread.${firebaseUser.uid}`]:0});});},[active?.id,firebaseUser.uid]);
  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),[msgs]);
  const sendMsg=async()=>{if(!text.trim()||!active)return;setSending(true);const c=text.trim();setText('');
    try{await addDoc(collection(db,'conversations',active.id,'messages'),{content:c,senderId:firebaseUser.uid,senderName:profile.displayName,createdAt:serverTimestamp(),readBy:[firebaseUser.uid]});
      const others=active.participants.filter(p=>p!==firebaseUser.uid);const u:any={lastMessage:c,lastMessageAt:serverTimestamp()};others.forEach(uid=>{u[`unread.${uid}`]=(active.unread?.[uid]||0)+1;});await updateDoc(doc(db,'conversations',active.id),u);
    }catch{showToast('Failed to send.','error');}finally{setSending(false);}};
  const startConv=async()=>{if(!newSub.trim()||!newBody.trim()){showToast('Enter subject and message.','error');return;}setSending(true);
    try{const snap=await getDocs(query(collection(db,'users'),where('role','in',['admin','super_admin','staff'])));if(snap.empty){showToast('No admin found.','error');return;}
      const admin=snap.docs[0];const ref=await addDoc(collection(db,'conversations'),{subject:newSub.trim(),participants:[firebaseUser.uid,admin.id],participantNames:{[firebaseUser.uid]:profile.displayName,[admin.id]:admin.data().displayName||'Admin'},lastMessage:newBody.trim(),lastMessageAt:serverTimestamp(),unread:{[admin.id]:1,[firebaseUser.uid]:0},type:'direct',createdAt:serverTimestamp()});
      await addDoc(collection(db,'conversations',ref.id,'messages'),{content:newBody.trim(),senderId:firebaseUser.uid,senderName:profile.displayName,createdAt:serverTimestamp(),readBy:[firebaseUser.uid]});
      await addDoc(collection(db,'users',admin.id,'notifications'),{title:'New Message',message:`${profile.displayName}: ${newSub}`,type:'info',read:false,createdAt:serverTimestamp(),link:'/admin/messages'});
      setShowNew(false);setNewSub('');setNewBody('');showToast('Message sent!','success');
    }catch{showToast('Failed.','error');}finally{setSending(false);}};
  const markBread=async(b:Bcast)=>{if(b.readBy?.includes(firebaseUser.uid))return;await updateDoc(doc(db,'broadcasts',b.id),{readBy:[...(b.readBy||[]),firebaseUser.uid]});};
  const fmt=(ts:any)=>{if(!ts?.toDate)return'';const d=ts.toDate(),n=new Date();return d.toDateString()===n.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'});};
  const myUnread=convs.reduce((s,c)=>s+(c.unread?.[firebaseUser.uid]||0),0);
  const ubcasts=bcasts.filter(b=>!b.readBy?.includes(firebaseUser.uid)).length;
  return(<div className="min-h-screen pt-20 pb-8 bg-slate-50 dark:bg-darkbg">
    <div className="container mx-auto px-4 max-w-5xl">
      <h1 className="text-3xl font-black text-navy dark:text-white uppercase tracking-tight mb-6">Messages</h1>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden" style={{height:'calc(100vh - 180px)',minHeight:480}}>
        <div className="flex h-full">
          <div className={`w-full md:w-80 border-r border-slate-100 dark:border-slate-700 flex flex-col shrink-0 ${active?'hidden md:flex':'flex'}`}>
            <div className="flex border-b border-slate-100 dark:border-slate-700 shrink-0">
              {[{id:'messages',label:'Direct',count:myUnread},{id:'broadcasts',label:'Broadcasts',count:ubcasts}].map(({id,label,count})=>(
                <button key={id} onClick={()=>setTab(id as any)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${tab===id?'text-navy dark:text-white border-b-2 border-navy dark:border-gold':'text-slate-400 hover:text-navy dark:hover:text-white'}`}>
                  {label}{count>0&&<span className="ml-1 px-1.5 py-0.5 bg-gold text-navy rounded-full text-xs font-black">{count}</span>}
                </button>
              ))}
            </div>
            {tab==='messages'&&<div className="p-3 shrink-0"><button onClick={()=>setShowNew(true)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean"><Plus className="w-3 h-3"/>New Message</button></div>}
            <div className="flex-1 overflow-y-auto">
              {tab==='messages'?(loading?<div className="p-4 space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-16 bg-slate-50 dark:bg-slate-700 rounded-xl animate-pulse"/>)}</div>
              :convs.length===0?<div className="p-8 text-center text-slate-400"><MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">No conversations yet</p></div>
              :convs.map(c=>{const u=c.unread?.[firebaseUser.uid]||0;const other=Object.entries(c.participantNames||{}).find(([uid])=>uid!==firebaseUser.uid)?.[1]||'Admin';
                return(<button key={c.id} onClick={()=>setActive(c)} className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${active?.id===c.id?'bg-navy/5 dark:bg-navy/20 border-l-4 border-l-navy dark:border-l-gold':''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1"><p className={`text-sm truncate ${u>0?'font-black text-navy dark:text-white':'font-bold text-slate-700 dark:text-slate-200'}`}>{c.subject}</p><p className="text-xs text-slate-400 truncate">{other}</p><p className="text-xs text-slate-400 truncate">{c.lastMessage}</p></div>
                    <div className="flex flex-col items-end gap-1 shrink-0"><span className="text-xs text-slate-400">{fmt(c.lastMessageAt)}</span>{u>0&&<span className="w-5 h-5 bg-navy dark:bg-gold text-white dark:text-navy rounded-full text-xs font-black flex items-center justify-center">{u}</span>}</div>
                  </div>
                </button>);
              })):(bcasts.length===0?<div className="p-8 text-center text-slate-400"><Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">No broadcasts yet</p></div>
              :bcasts.map(b=>{const read=b.readBy?.includes(firebaseUser.uid);return(<button key={b.id} onClick={()=>markBread(b)} className="w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <div className="flex items-start gap-2">{!read&&<div className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0"/>}<div className="min-w-0"><p className={`text-sm truncate ${!read?'font-black text-navy dark:text-white':'font-bold text-slate-500'}`}>{b.title}</p><p className="text-xs text-slate-400 truncate">{b.content}</p><p className="text-xs text-slate-300 dark:text-slate-600 mt-1">{fmt(b.createdAt)}</p></div></div>
              </button>);}))}
            </div>
          </div>
          <div className={`flex-1 flex flex-col ${!active&&tab==='messages'?'hidden md:flex':'flex'}`}>
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
                <div className="flex gap-2">
                  <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}} placeholder="Type a message..." className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"/>
                  <button onClick={sendMsg} disabled={sending||!text.trim()} className="p-2.5 bg-navy text-white rounded-xl hover:bg-ocean disabled:opacity-40"><Send className="w-4 h-4"/></button>
                </div>
              </div>
            </>):(<div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-600 flex-col gap-3"><MessageSquare className="w-12 h-12"/><p className="text-sm font-bold">Select a conversation</p></div>)}
          </div>
        </div>
      </div>
    </div>
    {showNew&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700"><h2 className="font-black text-navy dark:text-white">New Message to Admin</h2><button onClick={()=>setShowNew(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button></div>
        <div className="p-6 space-y-4">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label><input value={newSub} onChange={e=>setNewSub(e.target.value)} placeholder="What is this about?" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none"/></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label><textarea rows={4} value={newBody} onChange={e=>setNewBody(e.target.value)} placeholder="Write your message..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none resize-none"/></div>
          <button onClick={startConv} disabled={sending} className="w-full py-3 bg-navy text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-ocean disabled:opacity-60 flex items-center justify-center gap-2">
            {sending?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Send className="w-4 h-4"/>}Send Message
          </button>
        </div>
      </div>
    </div>)}
  </div>);
}