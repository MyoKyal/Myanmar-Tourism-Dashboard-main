"use server";

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/lib/documentStore';
import { verifyPassword } from '@/lib/password';
import { signSession, SESSION_COOKIE, ROLE_HOME, canAccessPath } from '@/lib/auth';

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  // Trimmed here even though real login forms usually shouldn't: this is a demo system whose
  // one password is displayed on-screen specifically to be copy-pasted, and a copy that picks
  // up a trailing space or newline would otherwise fail silently with the same generic
  // "Incorrect email or password" message as a genuine typo, with no way to tell them apart.
  const password = String(formData.get('password') || '').trim();
  const redirectTo = String(formData.get('redirectTo') || '');

  if (!email || !password) return { error: 'Enter both email and password.' };

  const user = await getUserByEmail(email);
  // Same generic message whether the email doesn't exist or the password is wrong -- telling
  // an attacker which one failed is a free account-enumeration oracle for no real benefit.
  if (!user || user.status !== 'ACTIVE' || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Incorrect email or password.' };
  }

  const token = await signSession({ id: user._id, email: user.email, fullName: user.fullName, role: user.role, businessName: user.businessName, assignedDestination: user.assignedDestination });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  const destination = redirectTo && canAccessPath(user.role, redirectTo) ? redirectTo : ROLE_HOME[user.role];
  redirect(destination);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
