'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Leaf, Bell, Search, Menu, X, LogOut, ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { cn, getInitials } from '@/utils';
import { DASHBOARD_NOTIFICATION_ROUTES, DASHBOARD_PROFILE_ROUTES } from '@/constants';
import { authService } from '@/services';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  role: string;
  userName: string;
  userSubtitle: string;
  notificationCount?: number;
}

export default function DashboardShell({
  children, navItems, role, userName, userSubtitle, notificationCount = 0,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const profileHref = DASHBOARD_PROFILE_ROUTES[role as keyof typeof DASHBOARD_PROFILE_ROUTES] || '/';
  const notificationHref = DASHBOARD_NOTIFICATION_ROUTES[role as keyof typeof DASHBOARD_NOTIFICATION_ROUTES] || '/';
  const loginHref = role === 'farmer' ? '/auth/farmer-login' : '/auth/admin-login';

  const roleColors: Record<string, string> = {
    farmer: 'bg-green-500',
    admin: 'bg-purple-500',
    officer: 'bg-blue-500',
    vendor: 'bg-orange-500',
    company: 'bg-teal-500',
  };

  const handleLogout = () => {
    authService.logout();
    setUserMenuOpen(false);
    setSidebarOpen(false);
    router.push(loginHref);
    router.refresh();
  };

  const [subtitleLabel, subtitleValue] = userSubtitle.includes(':')
    ? userSubtitle.split(/:\s(.+)/)
    : ['Profile', userSubtitle];

  const Sidebar = (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-forest rounded-xl flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-forest text-base">Agricul<span className="text-harvest">MS</span></div>
          <div className="text-sm text-gray-400 capitalize">{role} Portal</div>
        </div>
      </div>

      {/* User card */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-start gap-4 bg-gray-50 rounded-2xl p-5">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0', roleColors[role] || 'bg-gray-400')}>
            {getInitials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-gray-800 leading-tight">{userName}</div>
            <div className="mt-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                {subtitleLabel}
              </div>
              <div className="text-sm font-medium text-gray-600 font-mono break-all leading-relaxed">
                {subtitleValue}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn('sidebar-link', isActive && 'active')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className={cn('text-sm font-bold px-2.5 py-1 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600')}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-link text-red-500 hover:bg-red-50 hover:text-red-600 w-full"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 xl:w-80 2xl:w-[22rem] flex-shrink-0">
        {Sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-[min(20rem,88vw)] flex-shrink-0">
            {Sidebar}
          </div>
          <button className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg"
            onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-3 sm:px-4 py-3 flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="hidden md:block flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search..." className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-forest/20" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto min-w-0">
            {/* Notification bell */}
            <Link href={notificationHref} className="relative p-2 hover:bg-gray-100 rounded-xl">
              <Bell className="w-5 h-5 text-gray-600" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex max-w-[220px] lg:max-w-[260px] items-center gap-2 sm:gap-3 hover:bg-gray-50 rounded-2xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 min-w-0"
              >
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0', roleColors[role] || 'bg-gray-400')}>
                  {getInitials(userName)}
                </div>
                <div className="hidden min-[420px]:block min-w-0 text-left">
                  <div className="text-sm font-semibold text-gray-800 truncate leading-tight">{userName}</div>
                  <div className="text-xs text-gray-400 truncate capitalize">{role} account</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 bg-white shadow-lg p-2 z-20">
                  <Link
                    href={profileHref}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base text-gray-700 hover:bg-gray-50"
                  >
                    Profile & Edit Info
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-base text-red-500 hover:bg-red-50 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
