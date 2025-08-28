'use client';

import { useEffect } from 'react';
import { logout } from './actions';

export default function LogoutPage() {
  useEffect(() => {
    logout();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p>Logging out...</p>
    </div>
  );
}