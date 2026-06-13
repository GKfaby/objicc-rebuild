import{useState,useEffect} from 'react';
import{doc,getDoc,setDoc} from 'firebase/firestore';
import{db} from '../../firebase';
import{CreditCard,Save} from 'lucide-react';
import{useToast} from '../../contexts/ToastContext';
export default function PaymentsPage(){
  const[s,setS]=useState({stripePublishableKey:'',stripeSecretKey:'',paypalClientId:''});
  const[saving,setSaving]=useState(false);const{showToast}=useToast();
  useEffect(()=>{getDoc(doc(db,'secure_settings','payment')).then(snap=>{if(snap.exists())setS(p=>({...p,...snap.data()}));});},[]);
  const save=async()=>{setSaving(true);try{await setDoc(doc(db,'secure_settings','payment'),s,{merge:true});showToast('Saved!','success');}catch{showToast('Failed.','error');}finally{setSaving(false);}};
  return(<div className="space-y-6 max-w-xl">
    <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Payment Gateways</h1><p className="text-slate-500 text-sm mt-1">Configure Stripe and PayPal credentials.</p></div>
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-navy dark:text-gold"/><h2 className="font-black text-navy dark:text-white text-sm uppercase tracking-widest">Stripe</h2></div>
      {[['stripePublishableKey','Publishable Key'],['stripeSecretKey','Secret Key']].map(([k,l])=><div key={k}><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{l}</label><input type={k.includes('Secret')?'password':'text'} value={(s as any)[k]} onChange={e=>setS(p=>({...p,[k]:e.target.value}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-mono text-sm outline-none"/></div>)}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-4"><h2 className="font-black text-navy dark:text-white text-sm uppercase tracking-widest mb-3">PayPal</h2><input value={s.paypalClientId} onChange={e=>setS(p=>({...p,paypalClientId:e.target.value}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-mono text-sm outline-none"/></div>
      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean disabled:opacity-60">
        {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Save className="w-4 h-4"/>}Save
      </button>
    </div>
  </div>);
}