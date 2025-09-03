import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import AdminSettingsClient from './AdminSettingsClient';

export default async function AdminPage() {
  const admin = await isAdmin();
  
  if (!admin) {
    redirect('/');
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        <AdminSettingsClient />
      </div>
    </div>
  );
}