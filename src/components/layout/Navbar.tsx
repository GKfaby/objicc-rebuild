import{useState,useEffect} from 'react';
import{Link,useLocation,useNavigate} from 'react-router-dom';
import{Menu,X,Sun,Moon,User,LogIn,LayoutDashboard,Bell,Type} from 'lucide-react';
import{auth,db} from '../../firebase';
import{signOut} from 'firebase/auth';
import{collection,query,where,onSnapshot} from 'firebase/firestore';
import{useUser} from '../../contexts/UserContext';
import{useTheme} from '../../contexts/ThemeContext';
import EmailVerificationBanner from '../EmailVerificationBanner';
export default function Navbar(){
  const[scrolled,setScrolled]=useState(false);
  const[mobileOpen,setMobileOpen]=useState(false);
  const[fontMenuOpen,setFontMenuOpen]=useState(false);
  const[logoError,setLogoError]=useState(false);
  const[unreadCount,setUnreadCount]=useState(0);
  const{firebaseUser,profile,isStaff,isMember,isPending,systemSettings}=useUser();
  const{isDark,setColorMode,fontSize,setFontSize}=useTheme();
  const location=useLocation();
  const navigate=useNavigate();
  const isHome=location.pathname==='/';
  useEffect(()=>{const h=()=>setScrolled(window.scrollY>60);window.addEventListener('scroll',h,{passive:true});return()=>window.removeEventListener('scroll',h);},[]);
  useEffect(()=>{setMobileOpen(false);setFontMenuOpen(false);},[location]);
  useEffect(()=>setLogoError(false),[systemSettings.logoUrl]);
  // Notification badge count
  useEffect(()=>{
    if(!firebaseUser)return;
    const q=query(collection(db,'users',firebaseUser.uid,'notifications'),where('read','==',false));
    return onSnapshot(q,snap=>setUnreadCount(snap.size));
  },[firebaseUser]);
  const handleSignOut=async()=>{await signOut(auth);navigate('/');};
  const navLinks=[
    {label:'Home',href:'/'},
    {label:'Events',href:'/events',show:systemSettings.eventsEnabled},
    {label:'Contact',href:'/contact'},
    ...(isMember?[
      {label:'Shop',href:'/shop',show:systemSettings.shopEnabled},
      {label:'Suggestions',href:'/suggestions',show:systemSettings.suggestionsEnabled},
    ]:[]),
    ...((isMember||isPending)?[{label:'Messages',href:'/messages'}]:[]),
  ].filter(l=>l.show!==false);
  const navBg=scrolled||!isHome?'bg-navy/95 backdrop-blur-md shadow-xl py-3':'bg-transparent py-5';
  return(
    <div className="fixed top-0 left-0 w-full z-50">
      <EmailVerificationBanner/>
      <nav className={`transition-all duration-300 ${navBg}`}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          {systemSettings.logoUrl&&!logoError?(
            <div className="logo-nav-wrap">
              <img src={systemSettings.logoUrl} alt={systemSettings.orgName}
                onError={e=>{const img=e.target as HTMLImageElement;if(img.src!==window.location.origin+'/logo.png')img.src='/logo.png';else setLogoError(true);}}/>
            </div>
          ):(
            <div className="h-10 w-10 rounded-xl bg-gold flex items-center justify-center shrink-0">
              <span className="text-navy font-black text-sm">{systemSettings.orgName?.slice(0,2).toUpperCase()||'OB'}</span>
            </div>
          )}
          <span className="text-white font-black text-lg uppercase tracking-tighter">{systemSettings.orgName}</span>
        </Link>
        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map(l=>(
            <Link key={l.href} to={l.href}
              className={`text-xs font-black uppercase tracking-widest transition-colors relative group ${location.pathname===l.href?'text-gold':'text-white/75 hover:text-white'}`}>
              {l.label}
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gold rounded-full transition-transform origin-left ${location.pathname===l.href?'scale-x-100':'scale-x-0 group-hover:scale-x-100'}`}/>
            </Link>
          ))}
          <div className="flex items-center gap-2 pl-4 border-l border-white/10">
            <div className="relative">
              <button onClick={()=>setFontMenuOpen(!fontMenuOpen)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <Type className="w-4 h-4"/>
              </button>
              {fontMenuOpen&&(
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 w-32 animate-slide-up">
                  {(['sm','md','lg','xl'] as const).map(s=>(
                    <button key={s} onClick={()=>{setFontSize(s);setFontMenuOpen(false);}} className={`w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${fontSize===s?'bg-navy/5 dark:bg-gold/10 text-navy dark:text-gold':'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                      {s==='sm'?'Small':s==='md'?'Medium':s==='lg'?'Large':'X-Large'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={()=>setColorMode(isDark?'light':'dark')} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all">
              {isDark?<Sun className="w-4 h-4"/>:<Moon className="w-4 h-4"/>}
            </button>
            {firebaseUser&&profile?(
              <>
                {/* Bell with badge */}
                <Link to="/notifications" className="relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                  <Bell className="w-4 h-4"/>
                  {unreadCount>0&&(
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gold text-navy text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                      {unreadCount>99?'99+':unreadCount}
                    </span>
                  )}
                </Link>
                {isStaff&&<Link to="/admin" className="p-2 text-white/60 hover:text-gold hover:bg-white/10 rounded-lg transition-all"><LayoutDashboard className="w-4 h-4"/></Link>}
                <Link to="/profile" className="flex items-center gap-2 pl-3 pr-4 py-2 bg-white/10 hover:bg-gold hover:text-navy text-white rounded-full text-xs font-black uppercase tracking-widest transition-all border border-white/10">
                  {profile.avatarUrl?<img src={profile.avatarUrl} className="w-5 h-5 rounded-full object-cover" alt=""/>:<div className="w-5 h-5 rounded-full bg-gold/30 flex items-center justify-center"><User className="w-3 h-3"/></div>}
                  {profile.firstName}
                </Link>
              </>
            ):(
              <Link to="/login" className="flex items-center gap-2 px-5 py-2 bg-gold text-navy font-black rounded-full uppercase tracking-widest text-xs hover:bg-white transition-all shadow-lg shadow-gold/20">
                <LogIn className="w-3.5 h-3.5"/>Login
              </Link>
            )}
          </div>
        </div>
        {/* Mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          {firebaseUser&&unreadCount>0&&(
            <Link to="/notifications" className="relative p-2 text-white/70">
              <Bell className="w-4 h-4"/>
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-gold text-navy text-[9px] font-black rounded-full flex items-center justify-center px-0.5">{unreadCount>9?'9+':unreadCount}</span>
            </Link>
          )}
          <button onClick={()=>setColorMode(isDark?'light':'dark')} className="p-2 text-white/70"><Moon className="w-4 h-4"/></button>
          <button onClick={()=>setMobileOpen(!mobileOpen)} className="p-2 text-white hover:bg-white/10 rounded-xl">
            {mobileOpen?<X className="w-5 h-5"/>:<Menu className="w-5 h-5"/>}
          </button>
        </div>
      </div>
      {mobileOpen&&(
        <div className="lg:hidden bg-navy/98 backdrop-blur-md border-t border-white/10 px-4 py-6 flex flex-col gap-1 animate-slide-up">
          {navLinks.map(l=>(
            <Link key={l.href} to={l.href} className={`px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${location.pathname===l.href?'bg-white/10 text-gold':'text-white/70 hover:bg-white/5 hover:text-white'}`}>{l.label}</Link>
          ))}
          <div className="border-t border-white/10 mt-2 pt-4 flex flex-col gap-1">
            {firebaseUser&&profile?(
              <>
                <Link to="/profile" className="px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm text-gold hover:bg-white/5">My Profile</Link>
                <Link to="/notifications" className="px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm text-white/60 hover:bg-white/5 hover:text-white flex items-center justify-between">
                  Notifications{unreadCount>0&&<span className="px-2 py-0.5 bg-gold text-navy rounded-full text-xs font-black">{unreadCount}</span>}
                </Link>
                {isStaff&&<Link to="/admin" className="px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm text-white/60 hover:bg-white/5 hover:text-white">Admin Panel</Link>}
                <button onClick={handleSignOut} className="mt-2 px-4 py-3 rounded-xl text-left text-red-400 font-black uppercase tracking-widest text-sm hover:bg-red-400/10">Sign Out</button>
              </>
            ):(
              <Link to="/login" className="px-4 py-3 bg-gold text-navy rounded-xl font-black uppercase tracking-widest text-sm text-center">Login / Sign Up</Link>
            )}
          </div>
        </div>
      )}
    </nav>
    </div>
  );
}