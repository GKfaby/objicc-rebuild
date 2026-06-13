import React,{createContext,useContext,useState,useCallback} from 'react';
import type{Toast,ToastType} from '../types';
interface ToastCtx{toasts:Toast[];showToast:(m:string,t?:ToastType)=>void;removeToast:(id:string)=>void}
const Ctx=createContext<ToastCtx|undefined>(undefined);
export const ToastProvider:React.FC<{children:React.ReactNode}>=({children})=>{
  const[toasts,setToasts]=useState<Toast[]>([]);
  const removeToast=useCallback((id:string)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
  const showToast=useCallback((message:string,type:ToastType='info')=>{
    const id=`t-${Date.now()}`;
    setToasts(p=>[...p,{id,message,type}]);
    setTimeout(()=>removeToast(id),4000);
  },[removeToast]);
  const colors:Record<ToastType,string>={success:'bg-green-600',error:'bg-red-600',warning:'bg-amber-500',info:'bg-navy'};
  return(
    <Ctx.Provider value={{toasts,showToast,removeToast}}>
      {children}
      {toasts.length>0&&<div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t=><div key={t.id} onClick={()=>removeToast(t.id)}
          className={`pointer-events-auto px-5 py-3 rounded-xl shadow-xl text-sm font-bold cursor-pointer ${colors[t.type]} text-white animate-slide-up`}>
          {t.message}</div>)}
      </div>}
    </Ctx.Provider>
  );
};
export const useToast=()=>{const c=useContext(Ctx);if(!c)throw new Error('useToast outside provider');return c;};