'use server';

import { login } from '@/lib/auth-unified';

export type SignInState = {
  error?: string;
  success?: boolean;
};

export async function signIn(
  prevState: SignInState | null,
  formData: FormData
): Promise<SignInState> {
  const username = formData.get('username') as string;

  if (!username || username.trim().length === 0) {
    return { error: 'Username is required' };
  }

  const result = await login(username);

  if (result.success) {
    return { success: true };
  } else {
    return { error: result.error };
  }
}
