import{useState} from 'react';
import{Sun,Moon,Monitor,Type,Palette,Save,Globe,Phone,MapPin,AlertTriangle,Check,BarChart2} from 'lucide-react';
import{doc,setDoc} from 'firebase/firestore';
import{db} from '../../../firebase';
import{useUser} from '../../../contexts/UserContext';
import{useTheme} from '../../../contexts/ThemeContext';
import{useToast} from '../../../contexts/ToastContext';
import type{SystemSettings,AppTheme,ColorMode,FontSize} from '../../../types';
const TABS=['Appearance','Branding','Accessibility','Features','Deployment'] as const;
export default function SettingsPanel(){
  const{systemSettings,permissions}=useUser();
  const{colorMode,setColorMode,fontSize,setFontSize,appTheme,setAppTheme}=useTheme();
  const{showToast}=useToast();
  const[tab,setTab]=useState<typeof TABS[number]>('Appearance');
  const[settings,setSettings]=useState<SystemSettings>(systemSettings);
  const[saving,setSaving]=useState(false);
  const updateSetting=(k:keyof SystemSettings,v:any)=>setSettings(p=>({...p,[k]:v}));
  const save=async()=>{setSaving(true);try{await setDoc(doc(db,'settings','global'),settings,{merge:true});showToast('Settings saved!','success');}catch{showToast('Failed to save.','error');}finally{setSaving(false);}};
  if(!permissions.manageSettings)return<div className="text-center py-20 text-slate-400">You do not have permission to view this page.</div>;
  return(<div className="space-y-6 max-w-3xl">
    <div><h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Settings</h1><p className="text-slate-500 text-sm mt-1">Manage site appearance, branding and features.</p></div>
    <div className="flex gap-2 flex-wrap">{TABS.map(t=><button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab===t?'bg-navy text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'}`}>{t}</button>)}</div>
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 space-y-5">

      {tab==='Appearance'&&<>
        <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Color Mode</label>
          <div className="grid grid-cols-3 gap-2">{[{v:'light',icon:Sun,l:'Light'},{v:'dark',icon:Moon,l:'Dark'},{v:'system',icon:Monitor,l:'System'}].map(({v,icon:Icon,l})=><button key={v} onClick={()=>setColorMode(v as ColorMode)} className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${colorMode===v?'border-navy bg-navy/5 dark:border-gold':'border-slate-100 dark:border-slate-700'}`}><Icon className="w-5 h-5"/><span className="text-xs font-black uppercase">{l}</span></button>)}</div>
        </div>
        <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">App Theme</label>
          <div className="grid grid-cols-5 gap-2">{(['default','midnight','forest','sunset','ocean'] as AppTheme[]).map(t=><button key={t} onClick={()=>setAppTheme(t)} className={`py-3 rounded-xl border-2 text-xs font-black uppercase capitalize transition-all ${appTheme===t?'border-navy bg-navy/5 dark:border-gold':'border-slate-100 dark:border-slate-700'}`}>{t}</button>)}</div>
        </div>
      </>}

      {tab==='Branding'&&<>
        {[{key:'orgName',label:'Organization Name',icon:Globe},{key:'heroText',label:'Hero Headline',icon:Type},{key:'heroSubtext',label:'Hero Subtext',icon:Type},{key:'address',label:'Address',icon:MapPin},{key:'whatsappNumber',label:'WhatsApp Number',icon:Phone},{key:'email',label:'Contact Email',icon:Globe}].map(({key,label,icon:Icon})=>(
          <div key={key}><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label><div className="relative"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={(settings as any)[key]||''} onChange={e=>updateSetting(key as any,e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"/></div></div>
        ))}
        <div><div className="flex items-center gap-2 mb-3"><BarChart2 className="w-4 h-4 text-slate-400"/><label className="text-xs font-black text-slate-500 uppercase tracking-widest">Home Page Stats Strip</label></div>
          <p className="text-xs text-slate-400 mb-3">Three stats shown at the bottom of the home page hero.</p>
          <div className="space-y-3">{(settings.heroStats??[{label:'',desc:''},{label:'',desc:''},{label:'',desc:''}]).map((stat,i)=>(
            <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-navy/10 dark:bg-white/10 flex items-center justify-center shrink-0 mt-2.5"><span className="text-xs font-black text-navy dark:text-white">{i+1}</span></div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Label</label><input value={stat.label} onChange={e=>{const u=[...(settings.heroStats??[])];u[i]={...u[i],label:e.target.value};updateSetting('heroStats',u);}} placeholder="e.g. Est. 2015" className="w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-navy dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-navy/20"/></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label><input value={stat.desc} onChange={e=>{const u=[...(settings.heroStats??[])];u[i]={...u[i],desc:e.target.value};updateSetting('heroStats',u);}} placeholder="e.g. Years of Excellence" className="w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-navy dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-navy/20"/></div>
              </div>
            </div>
          ))}</div>
        </div>
      </>}

      {tab==='Accessibility'&&<div>
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Font Size</label>
        <div className="grid grid-cols-4 gap-2">{(['sm','md','lg','xl'] as FontSize[]).map(s=><button key={s} onClick={()=>setFontSize(s)} className={`py-3 rounded-xl border-2 text-xs font-black uppercase transition-all ${fontSize===s?'border-navy bg-navy/5 dark:border-gold':'border-slate-100 dark:border-slate-700'}`}>{s}</button>)}</div>
      </div>}

      {tab==='Features'&&<div className="space-y-2">
        {[{k:'shopEnabled',l:'Shop'},{k:'suggestionsEnabled',l:'Suggestions'},{k:'eventsEnabled',l:'Events'}].map(({k,l})=>(
          <div key={k} onClick={()=>updateSetting(k as any,!(settings as any)[k])} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${(settings as any)[k]?'border-navy bg-navy/5 dark:border-gold':'border-slate-200 dark:border-slate-700'}`}>
            <p className={`text-sm font-black flex-1 ${(settings as any)[k]?'text-navy dark:text-white':'text-slate-500'}`}>{l} Page</p>
            <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${(settings as any)[k]?'bg-navy dark:bg-gold':'bg-slate-200 dark:bg-slate-600'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(settings as any)[k]?'left-5':'left-0.5'}`}/></div>
          </div>
        ))}
      </div>}

      {tab==='Deployment'&&<>
        <div onClick={()=>updateSetting('maintenanceMode',!settings.maintenanceMode)} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${settings.maintenanceMode?'border-amber-400 bg-amber-50 dark:bg-amber-900/20':'border-slate-200 dark:border-slate-700'}`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 ${settings.maintenanceMode?'text-amber-600':'text-slate-400'}`}/>
          <div className="flex-1"><p className={`text-sm font-black ${settings.maintenanceMode?'text-amber-700 dark:text-amber-400':'text-slate-500'}`}>Maintenance Mode</p><p className="text-xs text-slate-400">Show maintenance screen to non-admin users</p></div>
          <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${settings.maintenanceMode?'bg-amber-500':'bg-slate-200 dark:bg-slate-600'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.maintenanceMode?'left-5':'left-0.5'}`}/></div>
        </div>
        {settings.maintenanceMode&&<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Maintenance Message</label><textarea rows={3} value={settings.maintenanceMessage||''} onChange={e=>updateSetting('maintenanceMessage',e.target.value)} placeholder="We are down for scheduled maintenance..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none text-sm resize-none"/></div>}
      </>}

      <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-ocean transition-colors disabled:opacity-60">
        {saving?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Save className="w-4 h-4"/>}
        {saving?'Saving...':'Save Settings'}
      </button>
    </div>
  </div>);
}