import React,{createContext,useContext,useEffect,useState} from 'react';
import type{ColorMode,A11yMode,FontSize,AppTheme} from '../types';
interface ThemeCtx{colorMode:ColorMode;setColorMode:(m:ColorMode)=>void;isDark:boolean;a11yMode:A11yMode;setA11yMode:(m:A11yMode)=>void;fontSize:FontSize;setFontSize:(s:FontSize)=>void;narration:boolean;setNarration:(v:boolean)=>void;appTheme:AppTheme;setAppTheme:(t:AppTheme)=>void}
const Ctx=createContext<ThemeCtx|undefined>(undefined);
const K={c:'objicc-color-mode',a:'objicc-a11y',f:'objicc-font-size',n:'objicc-narration',t:'objicc-app-theme'};
const FM:Record<FontSize,string>={sm:'14px',md:'16px',lg:'18px',xl:'20px'};
export const ThemeProvider:React.FC<{children:React.ReactNode}>=({children})=>{
  const[colorMode,setCM]=useState<ColorMode>(()=>(localStorage.getItem(K.c)||'system') as ColorMode);
  const[a11yMode,setAM]=useState<A11yMode>(()=>(localStorage.getItem(K.a)||'normal') as A11yMode);
  const[fontSize,setFS]=useState<FontSize>(()=>(localStorage.getItem(K.f)||'md') as FontSize);
  const[narration,setNR]=useState(()=>localStorage.getItem(K.n)==='true');
  const[appTheme,setAT]=useState<AppTheme>(()=>(localStorage.getItem(K.t)||'default') as AppTheme);
  const[isDark,setIsDark]=useState(false);
  useEffect(()=>{
    const apply=(dark:boolean)=>{setIsDark(dark);document.documentElement.classList.toggle('dark',dark);};
    if(colorMode==='system'){const mq=window.matchMedia('(prefers-color-scheme: dark)');apply(mq.matches);const h=(e:MediaQueryListEvent)=>apply(e.matches);mq.addEventListener('change',h);return()=>mq.removeEventListener('change',h);}
    else apply(colorMode==='dark');
  },[colorMode]);
  useEffect(()=>{document.documentElement.style.fontSize=FM[fontSize];},[fontSize]);
  useEffect(()=>{document.documentElement.setAttribute('data-theme',appTheme);},[appTheme]);
  const setColorMode=(m:ColorMode)=>{localStorage.setItem(K.c,m);setCM(m);};
  const setA11yMode=(m:A11yMode)=>{localStorage.setItem(K.a,m);setAM(m);};
  const setFontSize=(s:FontSize)=>{localStorage.setItem(K.f,s);setFS(s);};
  const setNarration=(v:boolean)=>{localStorage.setItem(K.n,String(v));setNR(v);};
  const setAppTheme=(t:AppTheme)=>{localStorage.setItem(K.t,t);setAT(t);};
  return<Ctx.Provider value={{colorMode,setColorMode,isDark,a11yMode,setA11yMode,fontSize,setFontSize,narration,setNarration,appTheme,setAppTheme}}>{children}</Ctx.Provider>;
};
export const useTheme=()=>{const c=useContext(Ctx);if(!c)throw new Error('useTheme outside provider');return c;};