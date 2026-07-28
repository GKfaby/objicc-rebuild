import React,{createContext,useContext,useState,useCallback} from 'react';

interface NavOffsetType{bannerHeight:number;setBannerHeight:(n:number)=>void;}
const Ctx=createContext<NavOffsetType>({bannerHeight:0,setBannerHeight:()=>{}});

export function NavOffsetProvider({children}:{children:React.ReactNode}){
  const[bannerHeight,setBannerHeightState]=useState(0);
  // Avoid redundant re-renders from ResizeObserver firing with the same value
  const setBannerHeight=useCallback((n:number)=>setBannerHeightState(prev=>prev===n?prev:n),[]);
  return<Ctx.Provider value={{bannerHeight,setBannerHeight}}>{children}</Ctx.Provider>;
}

export const useNavOffset=()=>useContext(Ctx);
