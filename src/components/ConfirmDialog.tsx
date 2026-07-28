import{useEffect,useRef} from 'react';
import{AlertTriangle} from 'lucide-react';

export default function ConfirmDialog({
  open,title,message,confirmLabel='Delete',danger=true,onConfirm,onCancel,
}:{
  open:boolean;title:string;message:string;confirmLabel?:string;danger?:boolean;
  onConfirm:()=>void;onCancel:()=>void;
}){
  const cancelRef=useRef<HTMLButtonElement>(null);

  // Focus Cancel every time the dialog opens, so an accidental Enter
  // keypress (or a fast double-click that lands after the dialog
  // appears) cancels rather than confirms a destructive action.
  useEffect(()=>{
    if(open){const t=setTimeout(()=>cancelRef.current?.focus(),0);return()=>clearTimeout(t);}
  },[open]);

  if(!open)return null;

  return(<div
    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm"
    onKeyDown={e=>{if(e.key==='Escape')onCancel();}}
    role="alertdialog" aria-modal="true"
  >
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${danger?'bg-red-100 dark:bg-red-900/30':'bg-amber-100 dark:bg-amber-900/30'}`}>
          <AlertTriangle className={`w-5 h-5 ${danger?'text-red-500':'text-amber-500'}`}/>
        </div>
        <h3 className="font-black text-navy dark:text-white text-lg leading-tight">{title}</h3>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
      <div className="flex gap-3 pt-2">
        <button
          ref={cancelRef} type="button" onClick={onCancel}
          className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-navy dark:text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >Cancel</button>
        <button
          type="button" onClick={onConfirm}
          className={`flex-1 py-3 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors ${danger?'bg-red-500 hover:bg-red-600':'bg-navy hover:bg-ocean'}`}
        >{confirmLabel}</button>
      </div>
    </div>
  </div>);
}
