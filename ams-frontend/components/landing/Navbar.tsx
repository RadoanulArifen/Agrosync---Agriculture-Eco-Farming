'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Leaf } from 'lucide-react';
import { DASHBOARD_ROUTES, NAV_LINKS } from '@/constants';
import { authService } from '@/services';
import type { ManagedUserRole } from '@/types';
import { cn } from '@/utils';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dashboardHref, setDashboardHref] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const resolveDashboardHref = () => {
      const currentFarmer = authService.getCurrentFarmer();
      if (currentFarmer?.id) {
        setDashboardHref(DASHBOARD_ROUTES.farmer);
        return;
      }

      const currentUser = authService.getCurrentUser();
      const role = currentUser?.role as ManagedUserRole | undefined;
      if (role && role in DASHBOARD_ROUTES) {
        setDashboardHref(DASHBOARD_ROUTES[role]);
        return;
      }

      setDashboardHref(null);
    };

    resolveDashboardHref();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && ![
        'ams_current_role_user_id',
        'ams_current_farmer_id',
        'ams_current_role_user_ids_by_role',
      ].includes(event.key)) {
        return;
      }
      resolveDashboardHref();
    };

    const handleUserSessionUpdated = () => {
      resolveDashboardHref();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('ams:user-session-updated', handleUserSessionUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('ams:user-session-updated', handleUserSessionUpdated);
    };
  }, []);

  const hasActiveSession = Boolean(dashboardHref);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white shadow-md py-3' : 'bg-transparent py-5',
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center',
            scrolled ? 'bg-forest' : 'bg-white/20 backdrop-blur-sm',
          )}>
            <Leaf className={cn('w-5 h-5', scrolled ? 'text-white' : 'text-white')} />
          </div>
          <div>
            <span className={cn('font-bold text-xl tracking-tight', scrolled ? 'text-forest' : 'text-white')}>
              Agricul<span className="text-harvest">MS</span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-semibold transition-colors hover:text-harvest',
                scrolled ? 'text-gray-700' : 'text-white',
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {hasActiveSession ? (
            <Link href={dashboardHref || '/'} className="btn-primary text-sm py-2.5">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/farmer-login"
                className={cn(
                  'text-sm font-semibold px-4 py-2 rounded-full transition-colors',
                  scrolled ? 'text-forest hover:text-harvest' : 'text-white hover:text-harvest',
                )}
              >
                Farmer Login
              </Link>
              <Link
                href="/auth/admin-login"
                className="btn-primary text-sm py-2.5"
              >
                Dashboard Access
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen
            ? <X className={cn('w-6 h-6', scrolled ? 'text-forest' : 'text-white')} />
            : <Menu className={cn('w-6 h-6', scrolled ? 'text-forest' : 'text-white')} />
          }
        </button>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-lg border-t border-gray-100 px-4 py-4 flex flex-col gap-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-gray-700 font-medium text-sm py-2 hover:text-forest"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <hr className="border-gray-100 my-1" />
          {hasActiveSession ? (
            <Link href={dashboardHref || '/'} className="btn-primary text-center text-sm" onClick={() => setMenuOpen(false)}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/farmer-login" className="btn-secondary text-center text-sm" onClick={() => setMenuOpen(false)}>
                Farmer Login
              </Link>
              <Link href="/auth/admin-login" className="btn-primary text-center text-sm" onClick={() => setMenuOpen(false)}>
                Dashboard Access
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
