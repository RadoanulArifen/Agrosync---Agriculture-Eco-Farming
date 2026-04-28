'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompanyMatchesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/company/cart');
  }, [router]);

  return null;
}
