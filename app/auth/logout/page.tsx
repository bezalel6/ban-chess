'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear any local storage or session data
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to home
    router.push('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p>Logging out...</p>
    </div>
  );
}