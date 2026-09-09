import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession, type SessionUser } from './auth';

/** Server-only: reads and verifies the session cookie for the current request. Used by
 *  layout.tsx (to hydrate the client SessionProvider) and by any server component/action
 *  that needs to know who's asking without re-deriving it from middleware headers. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
