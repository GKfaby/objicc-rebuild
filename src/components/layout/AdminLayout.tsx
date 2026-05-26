import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ShoppingBag, Settings,
  Shield, MessageSquare, Bell, History, ChevronLeft, ChevronRight,
  LogOut, CreditCard, Home, Menu, X
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useUser } from '../../contexts/UserContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: keyof import('../../types').RolePermissions;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Applications', href: '/admin/applications', icon: FileText, permission: 'manageApplications' },
  { label: 'Users', href: '/admin/users', icon: Users, permission: 'manageUsers' },
  { label: 'Roles', href: '/admin/roles', icon: Shield, permission: 'manageRoles' },
  { label: 'Posts & Events', href: '/admin/posts', icon: Bell, permission: 'managePosts' },
  { label: 'Merchandise', href: '/admin/merchandise', icon: ShoppingBag, permission: 'manageMerchandise' },
  { label: 'Suggestions', href: '/admin/suggestions', icon: MessageSquare },
  { label: 'Activity Log', href: '/admin/activity', icon: History, permission: 'canViewUserUpdates' },
  { label: 'Payment Gateways', href: '/admin/payments', icon: CreditCard, permission: 'managePaymentGateways' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, permission: 'manageSettings' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, permissions, systemSettings } = useUser();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return permissions[item.permission];
  });

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center gap-3 p-4 border-b border-white/10 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            {systemSettings.logoUrl && (
              <img src={systemSettings.logoUrl} alt="" className="h-8 w-8 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <span className="text-white font-black text-sm uppercase tracking-tighter">Admin</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden lg:block"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-sm font-bold ${
                isActive
                  ? 'bg-gold text-navy'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={`p-3 border-t border-white/10 flex flex-col gap-2 ${collapsed ? 'items-center' : ''}`}>
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors"
          title={collapsed ? 'Back to site' : undefined}
        >
          <Home className="w-4 h-4 shrink-0" />
          {!collapsed && 'Back to site'}
        </NavLink>
        {!collapsed && profile && (
          <div className="px-3 py-2 rounded-xl bg-white/5">
            <p className="text-white text-xs font-bold truncate">{profile.displayName}</p>
            <p className="text-white/40 text-xs truncate">{profile.role.replace(/_/g, ' ')}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-400/10 text-xs font-bold transition-colors w-full"
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-darkbg">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-navy transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-60 bg-navy z-50 lg:hidden flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-navy text-white">
          <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-white/10 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-black uppercase tracking-tighter">Admin Panel</span>
        </div>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
