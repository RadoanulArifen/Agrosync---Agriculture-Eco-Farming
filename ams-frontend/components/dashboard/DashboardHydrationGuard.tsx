'use client';

import { useEffect, useState } from 'react';

export default function DashboardHydrationGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6">
        <div className="mx-auto flex max-w-7xl animate-pulse gap-6">
          <div className="hidden h-[calc(100vh-3rem)] w-72 rounded-3xl bg-white lg:block" />
          <div className="flex-1 space-y-6">
            <div className="h-20 rounded-3xl bg-white" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-72 rounded-3xl bg-white lg:col-span-2" />
              <div className="h-72 rounded-3xl bg-white" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
