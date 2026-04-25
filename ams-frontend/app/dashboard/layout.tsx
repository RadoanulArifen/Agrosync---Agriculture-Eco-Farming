import type { Metadata } from 'next';
import DashboardHydrationGuard from '@/components/dashboard/DashboardHydrationGuard';

export const metadata: Metadata = {
  title: 'AgriculMS Dashboard',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHydrationGuard>{children}</DashboardHydrationGuard>
    </div>
  );
}
