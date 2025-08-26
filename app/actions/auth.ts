'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { login, logout } from '@/lib/auth-unified';

export type AuthState = {
  error?: string | null;
};

export async function loginAction(
  _prevState: AuthState, 
  formData: FormData
): Promise<AuthState> {
  const username = formData.get('username');
  
  if (!username || typeof username !== 'string') {
    return { error: 'Username is required' };
  }
  
  const result = await login(username);
  
  if (!result.success) {
    return { error: result.error };
  }
  
  // Revalidate the layout to refresh user data
  revalidatePath('/', 'layout');
  
  // Redirect to home page after successful login
  redirect('/');
}

export async function logoutAction() {
  await logout();
  
  // Revalidate the layout to refresh user data
  revalidatePath('/', 'layout');
  
  redirect('/');
}