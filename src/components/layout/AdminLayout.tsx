import{useState} from 'react';
import{NavLink,useNavigate,Outlet} from 'react-router-dom';
import{LayoutDashboard,Users,FileText,ShoppingBag,Settings,Shield,MessageSquare,Bell,History,ChevronLeft,ChevronRight,LogOut,CreditCard,Home,Menu,Package,Printer} from 'lucide-react';
import{signOut} from 'firebase/auth';
import{auth} from '../../firebase';
import{useUser} from '../../contexts/UserContext';
import{publicAsset} from '../../lib/publicAsset';
const NAV=[
  {label:'Dashboard',href:'/admin',icon:LayoutDashboard},
  {label:'Applications',href:'/admin/applications',icon:FileText,perm:'manageApplications'},
  {label:'Users',href:'/admin/users',icon:Users,perm:'manageUsers'},
  {label:'Roles',href:'/admin/roles',icon:Shield,perm:'manageRoles'},
  {label:'Posts & Events',href:'/admin/posts',icon:Bell,perm:'managePosts'},
  {label:'Merchandise',href:'/admin/merchandise',icon:ShoppingBag,perm:'manageMerchandise'},
  {label:'Orders',href:'/admin/orders',icon:Package,perm:'manageRequests'},
  {label:'Permission Slips',href:'/admin/slips',icon:Printer,perm:'printPermissionSlips'},
  {label:'Messages',href:'/admin/messages',icon:MessageSquare},
  {label:'Suggestions',href:'/admin/suggestions',icon:MessageSquare},
  {label:'Activity Log',href:'/admin/activity',icon:History,perm:'canViewUserUpdates'},
  {label:'Payment Gateways',href:'/admin/payments',icon:CreditCard,perm:'managePaymentGateways'},
  {label:'Settings',href:'/admin/settings',icon:Settings,perm:'manageSettings'},
];
export default function AdminLayout(){
  const[collapsed,setCollapsed]=useState(false);
  const[mobileOpen,setMobileOpen]=useState(false);
  const{profile,permissions,systemSettings}=useUser();
  const navigate=useNavigate();
  const handleSignOut=async()=>{await signOut(auth);navigate('/');};
  const visible=NAV.filter(n=>!n.perm||(permissions as any)[n.perm]);
  const SB=()=>(
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 p-4 border-b border-white/10 ${collapsed?'justify-center':'justify-between'}`}>
        {!collapsed&&<div className="flex items-center gap-2">
          {systemSettings.logoUrl&&<div className="logo-nav-wrap w-8 h-8"><img src={publicAsset(systemSettings.logoUrl)} alt="" className="w-6 h-6 object-contain mix-blend-screen"/></div>}
          <span className="text-white font-black text-sm uppercase tracking-tighter">Admin</span>
        </div>}
        <button onClick={()=>setCollapsed(!collapsed)} className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg hidden lg:block">
          {collapsed?<ChevronRight className="w-4 h-4"/>:<ChevronLeft className="w-4 h-4"/>}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {visible.map(n=>(
          <NavLink key={n.href} to={n.href} end={n.href==='/admin'}
            className={({isActive})=>`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-sm font-bold ${isActive?'bg-gold text-navy':'text-white/70 hover:bg-white/10 hover:text-white'} ${collapsed?'justify-center':''}`}
            title={collapsed?n.label:undefined}>
            <n.icon className="w-4 h-4 shrink-0"/>
            {!collapsed&&<span>{n.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className={`p-3 border-t border-white/10 flex flex-col gap-2 ${collapsed?'items-center':''}`}>
        <NavLink to="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-xs font-bold" title={collapsed?'Back to site':undefined}>
          <Home className="w-4 h-4 shrink-0"/>{!collapsed&&'Back to site'}
        </NavLink>
        {!collapsed&&profile&&<div className="px-3 py-2 rounded-xl bg-white/5"><p className="text-white text-xs font-bold truncate">{profile.displayName}</p><p className="text-white/40 text-xs truncate">{profile.role.replace(/_/g,' ')}</p></div>}
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-400/10 text-xs font-bold w-full" title={collapsed?'Sign out':undefined}>
          <LogOut className="w-4 h-4 shrink-0"/>{!collapsed&&'Sign Out'}
        </button>
      </div>
    </div>
  );
  return(
    <div className="flex min-h-screen bg-slate-50 dark:bg-darkbg">
      <aside className={`hidden lg:flex flex-col bg-navy transition-all duration-300 shrink-0 ${collapsed?'w-16':'w-60'}`}><SB/></aside>
      {mobileOpen&&<><div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={()=>setMobileOpen(false)}/><aside className="fixed left-0 top-0 h-full w-60 bg-navy z-50 lg:hidden flex flex-col"><SB/></aside></>}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-navy text-white">
          <button onClick={()=>setMobileOpen(true)} className="p-2 hover:bg-white/10 rounded-lg"><Menu className="w-5 h-5"/></button>
          <span className="font-black uppercase tracking-tighter">Admin Panel</span>
        </div>
        <main className="flex-1 overflow-auto p-4 lg:p-8"><Outlet/></main>
      </div>
    </div>
  );
}