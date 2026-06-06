import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, UtensilsCrossed, Users, DollarSign,
  BarChart3, Settings, LogOut, Menu, X, ChefHat, UserCircle, CreditCard
} from 'lucide-react';

const AppSidebar = () => {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/super-admin', label: 'Hostels', icon: Settings, roles: ['super_admin'] },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'user', 'super_admin'] },
    { to: '/meals', label: 'Meal Management', icon: UtensilsCrossed, roles: ['admin', 'manager', 'user'] },
    { to: '/payments', label: 'Payments', icon: DollarSign, roles: ['admin', 'manager'] },
    { to: '/expenses', label: 'Expenses', icon: BarChart3, roles: ['admin', 'manager'] },
    { to: '/members', label: 'Members', icon: Users, roles: ['admin', 'super_admin'] },
    { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { to: '/subscription', label: 'Subscription', icon: CreditCard, roles: ['admin'] },
    { to: '/profile', label: 'My Profile', icon: UserCircle, roles: ['admin', 'manager', 'user', 'super_admin'] },
  ];

  const filtered = links.filter(l => l.roles.includes(role || ''));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground">MessFlow</h1>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{role} Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filtered.map(link => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`sidebar-link ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
            >
              <link.icon className="w-4.5 h-4.5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name}</p>
          <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.email}</p>
        </div>
        <button onClick={signOut} className="sidebar-link sidebar-link-inactive w-full">
          <LogOut className="w-4.5 h-4.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-sm"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-72 bg-sidebar animate-slide-in">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-sidebar-foreground/60">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 bg-sidebar border-r border-sidebar-border flex-col shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
};

export default AppSidebar;
