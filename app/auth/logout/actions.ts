'use server';

import { redirect } from 'next/navigation';
import { logout as logoutUser } from '@/lib/auth-unified';

export async function logout() {
  await logoutUser();
  redirect('/');
}
