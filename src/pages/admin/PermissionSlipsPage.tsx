import{useState,useEffect,useRef} from 'react';
import{collection,query,where,onSnapshot,doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';
import{db} from '../../firebase';
import{FileText,Calendar,MapPin,Sparkles,PenLine,ArrowLeft,Settings,X,Check,Printer,ChevronRight,ChevronUp,ChevronDown,AlertCircle,FileStack,Pencil,UploadCloud,CheckCircle2} from 'lucide-react';
import{useUser} from '../../contexts/UserContext';
import{useToast} from '../../contexts/ToastContext';
import type{Post,PermissionSlipTemplate} from '../../types';
import{DEFAULT_SLIP_TEMPLATE} from '../../types';
import SignaturePad from '../../components/SignaturePad';
import{fmtDate,toISODate,fillTemplate,buildSlipHTML,type SlipForm,type SlipData,type PrintSection} from '../../lib/permissionSlip';

type Step='select'|'choice'|'form'|'signature';

export default function PermissionSlipsPage(){
  const{permissions,systemSettings}=useUser();
  const{showToast}=useToast();
  const canManage=permissions.printPermissionSlips;

  // Only events with the "Permission Slip" toggle on (set at event
  // creation) are eligible to have a slip created for them at all.
  const[events,setEvents]=useState<Post[]>([]);
  const[loading,setLoading]=useState(true);
  const[postedSlips,setPostedSlips]=useState<Record<string,SlipData>>({});
  const[template,setTemplate]=useState<PermissionSlipTemplate>(DEFAULT_SLIP_TEMPLATE);
  const[showTemplateEditor,setShowTemplateEditor]=useState(false);
  const[editTemplate,setEditTemplate]=useState<PermissionSlipTemplate>(DEFAULT_SLIP_TEMPLATE);
  const[savingTemplate,setSavingTemplate]=useState(false);

  const[step,setStep]=useState<Step>('select');
  const[selectedEvent,setSelectedEvent]=useState<Post|null>(null);
  const[mode,setMode]=useState<'generate'|'create'|'edit'|null>(null);
  const[form,setForm]=useState<SlipForm>({project:'',date:'',endDate:'',startTime:'',endTime:'',location:'',meetLocation:'',meetTime:'',body:''});

  const[signature,setSignature]=useState<string|null>(null);
  const[sigPos,setSigPos]=useState({x:50,y:50});
  const[sigScale,setSigScale]=useState(1);
  const[posting,setPosting]=useState(false);
  const[justPosted,setJustPosted]=useState(false);
  const dragRef=useRef<HTMLDivElement>(null);
  const dragging=useRef(false);

  useEffect(()=>{
    const q=query(collection(db,'posts'),where('type','==','event'),where('hasPermissionSlip','==',true));
    return onSnapshot(q,snap=>{setEvents(snap.docs.map(d=>({id:d.id,...d.data()} as Post)));setLoading(false);});
  },[]);

  useEffect(()=>{
    return onSnapshot(collection(db,'permissionSlips'),snap=>{
      const m:Record<string,SlipData>={};
      snap.docs.forEach(d=>{m[d.id]=d.data() as SlipData;});
      setPostedSlips(m);
    });
  },[]);

  useEffect(()=>{
    getDoc(doc(db,'settings','permissionSlipTemplate')).then(snap=>{
      if(snap.exists())setTemplate({...DEFAULT_SLIP_TEMPLATE,...snap.data()} as PermissionSlipTemplate);
    });
  },[]);

  const selectEvent=(ev:Post)=>{setSelectedEvent(ev);setJustPosted(false);setStep('choice');};

  const formFromEvent=(ev:Post):SlipForm=>{
    const f:SlipForm={
      project:ev.title,
      date:ev.startDate?toISODate(ev.startDate):toISODate(ev.date),
      endDate:ev.endDate?toISODate(ev.endDate):'',
      startTime:ev.startTime||'',
      endTime:ev.endTime||'',
      location:ev.location||'',
      meetLocation:ev.meetLocation||ev.location||'',
      meetTime:ev.meetTime||ev.startTime||'',
      body:'',
    };
    f.body=fillTemplate(template.bodyTemplate,f);
    return f;
  };

  const chooseGenerate=()=>{if(!selectedEvent)return;setForm(formFromEvent(selectedEvent));setSignature(null);setSigPos({x:50,y:50});setSigScale(1);setMode('generate');setStep('signature');};
  const chooseCreate=()=>{if(!selectedEvent)return;setForm(formFromEvent(selectedEvent));setSignature(null);setSigPos({x:50,y:50});setSigScale(1);setMode('create');setStep('form');};
  const chooseEdit=()=>{
    if(!selectedEvent)return;
    const existing=postedSlips[selectedEvent.id];if(!existing)return;
    setForm(existing.form);setSignature(existing.signature);setSigPos(existing.sigPos);setSigScale(existing.sigScale);
    setMode('edit');setStep('signature');
  };

  const startOver=()=>{setStep('select');setSelectedEvent(null);setMode(null);setSignature(null);setSigPos({x:50,y:50});setSigScale(1);setJustPosted(false);};

  // -- Signature drag (works with mouse and touch via Pointer Events) --
  const startDrag=(e:React.PointerEvent)=>{dragging.current=true;(e.target as HTMLElement).setPointerCapture(e.pointerId);};
  const onDrag=(e:React.PointerEvent)=>{
    if(!dragging.current||!dragRef.current)return;
    const rect=dragRef.current.getBoundingClientRect();
    const x=Math.min(100,Math.max(0,((e.clientX-rect.left)/rect.width)*100));
    const y=Math.min(100,Math.max(0,((e.clientY-rect.top)/rect.height)*100));
    setSigPos({x,y});
  };
  const endDrag=()=>{dragging.current=false;};
  const nudge=(dy:number)=>setSigPos(p=>({...p,y:Math.min(100,Math.max(0,p.y+dy))}));

  // -- Template editor --
  const openTemplateEditor=()=>{setEditTemplate(template);setShowTemplateEditor(true);};
  const saveTemplate=async()=>{
    setSavingTemplate(true);
    try{await setDoc(doc(db,'settings','permissionSlipTemplate'),editTemplate,{merge:true});setTemplate(editTemplate);setShowTemplateEditor(false);showToast('Template updated.','success');}
    catch{showToast('Could not save template.','error');}finally{setSavingTemplate(false);}
  };

  // Printing is purely local -- it does NOT publish anything. Members
  // only ever see a slip once it's explicitly posted below.
  const printOnly=(section:PrintSection)=>{
    const win=window.open('','_blank','width=900,height=1000');if(!win)return;
    win.document.write(buildSlipHTML({form,template,signature,sigPos,sigScale},section,systemSettings?.orgName||'OBJICC',systemSettings?.logoUrl));
    win.document.close();win.focus();setTimeout(()=>win.print(),300);
  };

  // Publishing is a separate, explicit step from printing -- this is what
  // makes the slip appear (and become downloadable) on the event's page.
  const postSlip=async()=>{
    if(!selectedEvent||!signature)return;
    setPosting(true);
    try{
      await setDoc(doc(db,'permissionSlips',selectedEvent.id),{form,template,signature,sigPos,sigScale,updatedAt:serverTimestamp()});
      setJustPosted(true);
      showToast('Permission slip posted — members can now see and download it.','success');
    }catch(err:any){
      console.error('postSlip failed:',err);
      showToast(err?.code==='permission-denied'
        ?"Permission denied — your account may need the Permission Slips permission re-checked, or the site's security rules need redeploying."
        :`Could not post the permission slip${err?.message?`: ${err.message}`:''}`,'error');
    }
    finally{setPosting(false);}
  };

  if(!canManage)return(
    <div className="text-center py-20 text-slate-400">
      <FileText className="w-12 h-12 mx-auto mb-4 opacity-30"/>
      <p className="font-bold">You don't have permission to manage permission slips.</p>
    </div>
  );

  const existingSlip=selectedEvent?postedSlips[selectedEvent.id]:undefined;

  return(<div className="space-y-6 max-w-4xl">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Permission Slips</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {step==='select'?'Only events with "Permission Slip" enabled show up here':selectedEvent?.title}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {step!=='select'&&<button onClick={startOver} className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-navy dark:hover:text-white"><ArrowLeft className="w-3.5 h-3.5"/>Start Over</button>}
        <button onClick={openTemplateEditor} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-navy dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600"><Settings className="w-3.5 h-3.5"/>Edit Template</button>
      </div>
    </div>

    {/* Step 1: select event */}
    {step==='select'&&(
      loading?<div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[...Array(4)].map((_,i)=><div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-2xl animate-pulse"/>)}</div>
      :events.length===0?<div className="text-center py-16 text-slate-400"><Calendar className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="font-bold text-sm">No eligible events yet.</p><p className="text-xs mt-1">Turn on the "Permission Slip" option when creating or editing an event on the Posts page.</p></div>
      :<div className="grid grid-cols-1 md:grid-cols-2 gap-3">{events.map(ev=>{
        const posted=!!postedSlips[ev.id];
        return(
        <button key={ev.id} onClick={()=>selectEvent(ev)} className="text-left bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-xl bg-navy/10 dark:bg-gold/10 flex items-center justify-center shrink-0"><Calendar className="w-5 h-5 text-navy dark:text-gold"/></div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-navy dark:text-white truncate">{ev.title}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">{ev.date&&fmtDate(ev.date)}{ev.location&&<><span>·</span><MapPin className="w-3 h-3"/>{ev.location}</>}
              {posted&&<><span>·</span><span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3"/>Posted</span></>}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-navy dark:group-hover:text-white shrink-0"/>
        </button>
      );})}</div>
    )}

    {/* Step 2: choose how to proceed */}
    {step==='choice'&&selectedEvent&&(
      <div className={`grid grid-cols-1 ${existingSlip?'sm:grid-cols-3':'sm:grid-cols-2'} gap-4`}>
        {existingSlip&&<button onClick={chooseEdit} className="text-left bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border-2 border-green-200 dark:border-green-800/60">
          <div className="w-11 h-11 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3"><Pencil className="w-5 h-5 text-green-600 dark:text-green-400"/></div>
          <p className="font-black text-navy dark:text-white mb-1">Edit &amp; Re-post</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">A slip is already posted for this event. Pick up where it left off and update it.</p>
        </button>}
        <button onClick={chooseGenerate} className="text-left bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border-2 border-transparent hover:border-navy dark:hover:border-gold">
          <div className="w-11 h-11 rounded-xl bg-navy/10 dark:bg-gold/10 flex items-center justify-center mb-3"><Sparkles className="w-5 h-5 text-navy dark:text-gold"/></div>
          <p className="font-black text-navy dark:text-white mb-1">Generate</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Auto-fills everything from this event's details. All that's left is to add your signature.</p>
        </button>
        <button onClick={chooseCreate} className="text-left bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border-2 border-transparent hover:border-navy dark:hover:border-gold">
          <div className="w-11 h-11 rounded-xl bg-navy/10 dark:bg-gold/10 flex items-center justify-center mb-3"><PenLine className="w-5 h-5 text-navy dark:text-gold"/></div>
          <p className="font-black text-navy dark:text-white mb-1">Create</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Fill in or adjust every detail yourself — the paragraph, date, time, and location.</p>
        </button>
      </div>
    )}

    {/* Step 3 (Create mode only): editable form */}
    {step==='form'&&(
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project / Event Name</label>
            <input value={form.project} onChange={e=>setForm({...form,project:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
            <input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
            <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date <span className="normal-case font-medium text-slate-400">(multi-day events only)</span></label>
            <input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time</label>
            <input type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time</label>
            <input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meeting Point &amp; Time</label>
            <div className="flex gap-2">
              <input placeholder="Meet at..." value={form.meetLocation} onChange={e=>setForm({...form,meetLocation:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
              <input type="time" value={form.meetTime} onChange={e=>setForm({...form,meetTime:e.target.value})} className="w-40 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-500 uppercase">Body Paragraph</label>
            <button onClick={()=>setForm({...form,body:fillTemplate(template.bodyTemplate,form)})} className="text-xs font-bold text-navy dark:text-gold hover:underline">Refill from details</button>
          </div>
          <textarea rows={5} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm outline-none border border-slate-200 dark:border-slate-600 resize-none"/>
        </div>
        <button onClick={()=>setStep('signature')} className="w-full py-3 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean transition-colors flex items-center justify-center gap-2">
          Continue to Signature<ChevronRight className="w-4 h-4"/>
        </button>
      </div>
    )}

    {/* Step 4: signature, print, and post */}
    {step==='signature'&&(
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Add Your Signature</p>
          <SignaturePad value={signature} onChange={setSignature}/>
          {signature&&<div className="mt-5">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Signature Size</label>
            <input type="range" min={0.5} max={2} step={0.05} value={sigScale} onChange={e=>setSigScale(Number(e.target.value))} className="w-full accent-navy dark:accent-gold"/>
          </div>}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Position Your Signature</p>
          <p className="text-xs text-slate-400 mb-3">Drag it so it lands right above the line — there's room now, it won't crowd the text.</p>
          <div ref={dragRef} onPointerMove={onDrag} onPointerUp={endDrag} onPointerLeave={endDrag}
            className="relative bg-[#fdfdfb] border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden select-none" style={{aspectRatio:'5/3'}}>
            <div className="absolute inset-0 p-5 font-serif text-[13px] text-slate-800 pointer-events-none flex flex-col">
              <p>Yours truly,</p>
              <div className="flex-1"/>
              <p className="font-bold">{template.closingName}</p>
              <p className="text-slate-500 text-xs">{template.closingTitle}</p>
            </div>
            {signature&&<img src={signature} onPointerDown={startDrag} draggable={false}
              style={{position:'absolute',left:`${sigPos.x}%`,top:`${sigPos.y}%`,width:`${sigScale*110}px`,transform:'translate(-50%,-50%)',cursor:'grab'}}
              className="drop-shadow-sm"/>}
            {!signature&&<div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs font-bold">Add a signature to position it</div>}
          </div>
          {signature&&<div className="flex items-center justify-center gap-2 mt-3">
            <button onClick={()=>nudge(-3)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"><ChevronUp className="w-3.5 h-3.5"/>Nudge Up</button>
            <button onClick={()=>nudge(3)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"><ChevronDown className="w-3.5 h-3.5"/>Nudge Down</button>
          </div>}
        </div>

        <div className="lg:col-span-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"/>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            The parent slip at the bottom can run onto a second page on standard Letter paper. Printing the <b>full letter</b> requests <b>Legal size</b> paper so both halves stay together — or print each half separately on regular Letter paper. <b>Printing is just for you</b> — it doesn't publish anything. Use <b>Post to Event</b> below to make it available for members to download.
          </p>
        </div>

        <div className="lg:col-span-2 flex flex-col sm:flex-row justify-between gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={()=>printOnly('top')} disabled={!signature}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-navy dark:text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors">
              <FileStack className="w-4 h-4"/>Print Top Half
            </button>
            <button onClick={()=>printOnly('bottom')}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-navy dark:text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors">
              <FileStack className="w-4 h-4"/>Print Parent Slip
            </button>
            <button onClick={()=>printOnly('full')} disabled={!signature}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-navy dark:text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors">
              <Printer className="w-4 h-4"/>Print Full (Legal)
            </button>
          </div>
          <button onClick={postSlip} disabled={!signature||posting}
            className={`flex items-center justify-center gap-2 px-6 py-3 font-black rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${justPosted?'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400':'bg-green-500 hover:bg-green-600 text-white'}`}>
            {posting?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:justPosted?<CheckCircle2 className="w-4 h-4"/>:<UploadCloud className="w-4 h-4"/>}
            {posting?'Posting…':justPosted?'Posted!':mode==='edit'?'Re-post to Event':'Post to Event'}
          </button>
        </div>
      </div>
    )}

    {/* Template editor */}
    {showTemplateEditor&&<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm" onClick={()=>setShowTemplateEditor(false)}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-black text-navy dark:text-white">Edit Permission Slip Template</h2>
          <button onClick={()=>setShowTemplateEditor(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-400 -mt-1">These are the fixed parts that appear on every permission slip, regardless of event.</p>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Salutation</label>
            <input value={editTemplate.salutation} onChange={e=>setEditTemplate({...editTemplate,salutation:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Default Body Paragraph <span className="normal-case font-medium text-slate-400">(use {'{project} {date} {startTime} {endTime} {location} {meetLocation} {meetTime}'})</span></label>
            <textarea rows={4} value={editTemplate.bodyTemplate} onChange={e=>setEditTemplate({...editTemplate,bodyTemplate:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm outline-none border border-slate-200 dark:border-slate-600 resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Closing Name</label>
              <input value={editTemplate.closingName} onChange={e=>setEditTemplate({...editTemplate,closingName:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm outline-none border border-slate-200 dark:border-slate-600"/>
            </div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Closing Title</label>
              <input value={editTemplate.closingTitle} onChange={e=>setEditTemplate({...editTemplate,closingTitle:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm outline-none border border-slate-200 dark:border-slate-600"/>
            </div>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Closing Organization Line</label>
            <input value={editTemplate.closingOrgLine} onChange={e=>setEditTemplate({...editTemplate,closingOrgLine:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vision Line</label>
            <input value={editTemplate.visionLine} onChange={e=>setEditTemplate({...editTemplate,visionLine:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm outline-none border border-slate-200 dark:border-slate-600"/>
          </div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Indemnity Clause</label>
            <textarea rows={3} value={editTemplate.indemnityText} onChange={e=>setEditTemplate({...editTemplate,indemnityText:e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm outline-none border border-slate-200 dark:border-slate-600 resize-none"/>
          </div>
          <button onClick={saveTemplate} disabled={savingTemplate} className="w-full py-3 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean disabled:opacity-60 flex items-center justify-center gap-2">
            {savingTemplate?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Check className="w-4 h-4"/>}Save Template
          </button>
        </div>
      </div>
    </div>}
  </div>);
}
