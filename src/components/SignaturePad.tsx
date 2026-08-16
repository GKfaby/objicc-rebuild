import{useState,useRef,useEffect} from 'react';
import{Type,Pencil,Upload,Trash2,Check} from 'lucide-react';

const SIG_FONTS=[
  {label:'Elegant',family:"'Dancing Script',cursive"},
  {label:'Classic',family:"'Great Vibes',cursive"},
  {label:'Bold',family:"'Sacramento',cursive"},
];

// Loads the handwriting-style Google Fonts used for the "Type" signature
// option. Safe to call multiple times -- the browser dedupes identical
// stylesheet links.
function ensureSignatureFontsLoaded(){
  if(document.getElementById('sig-fonts-link'))return;
  const link=document.createElement('link');
  link.id='sig-fonts-link';
  link.rel='stylesheet';
  link.href='https://fonts.googleapis.com/css2?family=Dancing+Script&family=Great+Vibes&family=Sacramento&display=swap';
  document.head.appendChild(link);
}

export default function SignaturePad({value,onChange}:{value:string|null;onChange:(dataUrl:string|null)=>void}){
  const[tab,setTab]=useState<'type'|'draw'|'upload'>('type');
  const[typedName,setTypedName]=useState('');
  const[font,setFont]=useState(SIG_FONTS[0]);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const drawing=useRef(false);
  const hasStroke=useRef(false);

  useEffect(()=>{ensureSignatureFontsLoaded();},[]);

  // -- Type --
  useEffect(()=>{
    if(tab!=='type'||!typedName.trim()){if(tab==='type')onChange(null);return;}
    const t=setTimeout(async()=>{
      const maxFont=100;
      try{await(document as any).fonts?.load?.(`${maxFont}px ${font.family}`);}catch{}
      const canvas=document.createElement('canvas');canvas.width=600;canvas.height=180;
      const ctx=canvas.getContext('2d');if(!ctx)return;
      ctx.clearRect(0,0,600,180);
      ctx.fillStyle='#111';
      ctx.textBaseline='middle';ctx.textAlign='center';
      // Start large and shrink to fit long names, so the signature
      // always reads clearly instead of being scaled down to near-nothing.
      let size=maxFont;
      ctx.font=`${size}px ${font.family}`;
      while(ctx.measureText(typedName).width>560&&size>28){size-=4;ctx.font=`${size}px ${font.family}`;}
      ctx.fillText(typedName,300,90);
      onChange(canvas.toDataURL('image/png'));
    },150);
    return()=>clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[typedName,font,tab]);

  // -- Draw --
  const getPos=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    return{x:(e.clientX-rect.left)*(e.currentTarget.width/rect.width),y:(e.clientY-rect.top)*(e.currentTarget.height/rect.height)};
  };
  const startDraw=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    drawing.current=true;
    const ctx=canvasRef.current?.getContext('2d');if(!ctx)return;
    const{x,y}=getPos(e);ctx.beginPath();ctx.moveTo(x,y);
  };
  const moveDraw=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    if(!drawing.current)return;
    const ctx=canvasRef.current?.getContext('2d');if(!ctx)return;
    const{x,y}=getPos(e);
    ctx.lineWidth=2.5;ctx.lineCap='round';ctx.strokeStyle='#111';
    ctx.lineTo(x,y);ctx.stroke();
    hasStroke.current=true;
  };
  const endDraw=()=>{
    drawing.current=false;
    if(hasStroke.current&&canvasRef.current)onChange(canvasRef.current.toDataURL('image/png'));
  };
  const clearDraw=()=>{
    const canvas=canvasRef.current;const ctx=canvas?.getContext('2d');
    if(canvas&&ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
    hasStroke.current=false;onChange(null);
  };

  // -- Upload --
  const onUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return;
    const okType=['image/png','image/jpeg','image/jpg','image/svg+xml'].includes(f.type)||/\.(png|jpe?g|svg)$/i.test(f.name);
    if(!okType){onChange(null);return;}
    const reader=new FileReader();
    reader.onload=()=>onChange(reader.result as string);
    reader.readAsDataURL(f);
  };

  const switchTab=(t:'type'|'draw'|'upload')=>{setTab(t);onChange(null);setTypedName('');clearDraw();};

  return(<div>
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1 mb-4">
      {[{id:'type' as const,icon:Type,label:'Type'},{id:'draw' as const,icon:Pencil,label:'Draw'},{id:'upload' as const,icon:Upload,label:'Upload'}].map(t=>{
        const Icon=t.icon;
        return(<button key={t.id} onClick={()=>switchTab(t.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab===t.id?'bg-white dark:bg-slate-900 text-navy dark:text-white shadow-sm':'text-slate-400'}`}>
          <Icon className="w-3.5 h-3.5"/>{t.label}
        </button>);
      })}
    </div>

    {tab==='type'&&<div className="space-y-3">
      <input value={typedName} onChange={e=>setTypedName(e.target.value)} placeholder="Type your full name"
        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none border border-slate-200 dark:border-slate-600"/>
      <div className="flex gap-2">
        {SIG_FONTS.map(f=><button key={f.label} onClick={()=>setFont(f)} className={`flex-1 py-2 rounded-xl border-2 text-lg ${font.label===f.label?'border-navy dark:border-gold bg-navy/5 dark:bg-gold/10':'border-slate-100 dark:border-slate-700'}`} style={{fontFamily:f.family}}>{typedName||'Signature'}</button>)}
      </div>
    </div>}

    {tab==='draw'&&<div>
      <canvas ref={canvasRef} width={600} height={180}
        onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={endDraw} onPointerLeave={endDraw}
        className="w-full h-40 bg-slate-50 dark:bg-white rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 touch-none cursor-crosshair"/>
      <button onClick={clearDraw} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/>Clear</button>
    </div>}

    {tab==='upload'&&<label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 px-4 cursor-pointer transition-colors ${value?'border-navy/40 dark:border-gold/40 bg-navy/5 dark:bg-gold/5':'border-slate-200 dark:border-slate-700 hover:border-navy/30'}`}>
      <input type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={onUpload} className="hidden"/>
      {value?<img src={value} alt="Signature" className="max-h-20"/>:<>
        <Upload className="w-6 h-6 text-slate-300"/>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Tap to upload a signature image</p>
        <p className="text-xs text-slate-400">PNG, JPEG, or SVG</p>
      </>}
    </label>}

    {value&&tab!=='upload'&&<div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center gap-2">
      <Check className="w-4 h-4 text-green-500 shrink-0"/>
      <img src={value} alt="Signature preview" className="h-10 bg-white rounded"/>
    </div>}
  </div>);
}
