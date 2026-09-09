"use client";

import { createContext, useContext } from 'react';
import type { SessionUser } from '@/lib/auth';

const SessionContext = createContext<SessionUser | null>(null);

/** Hydrates from the server-verified user fetched in the (app) layout -- never re-derives
 *  or trusts anything read client-side, since a client value could be tampered with. */
export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) throw new Error('useSession must be used within SessionProvider, inside the (app) route group');
  return user;
}
