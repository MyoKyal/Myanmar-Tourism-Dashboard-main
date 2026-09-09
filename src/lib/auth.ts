import { SignJWT, jwtVerify } from 'jose';

// Deliberately jose-only in this file (no bcryptjs) -- proxy.ts (Next.js 16's renamed
// middleware.ts) imports this module directly on every request, and it only ever needs to
// verify a signed JWT, never hash/compare a password. Proxy now defaults to the Node.js
// runtime rather than Edge (see proxy.ts), so this split is no longer an Edge-bundle
// constraint -- it's just no reason to pull bcryptjs's code path into every request here.
// Node-oriented password hashing lives in lib/password.ts instead, imported only from
// server actions and the seed script.

export type Role = 'SUPER_ADMIN' | 'DESTINATION_MANAGER' | 'BUSINESS_USER' | 'TOURIST';

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  businessName?: string;
  assignedDestination?: string;
};

export const SESSION_COOKIE = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours -- a work-shift-length session, not a "remember me" token

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is required. Copy .env.example and generate one -- see the comment there.');
  return new TextEncoder().encode(secret);
}

// JWT (not an opaque session id + DB lookup) so proxy.ts can verify a session on every
// request without a database round-trip -- jose is lightweight enough to run there
// regardless of runtime, and this avoids adding a mongodb dependency to that path. The
// trade-off: role changes don't take effect until the token expires
// (max 8h) or the user logs in again. Acceptable for this app's scale; a revocation list
// would be the fix if that lag ever becomes a real problem.
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, fullName: user.fullName, role: user.role, businessName: user.businessName, assignedDestination: user.assignedDestination })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      id: payload.sub,
      email: String(payload.email),
      fullName: String(payload.fullName ?? ''),
      role: payload.role as Role,
      businessName: payload.businessName ? String(payload.businessName) : undefined,
      assignedDestination: payload.assignedDestination ? String(payload.assignedDestination) : undefined,
    };
  } catch {
    return null;
  }
}

// Page-level access control -- decides which PAGES a role can open. This alone still isn't
// row-level scoping (it doesn't know that Kyaw Zin Latt manages Bagan specifically, only that
// Destination Managers as a role can open /manage-destinations at all); the actual "only your
// own destination" enforcement happens inside the server actions in
// actions/manageDestinations.ts, which re-check session.assignedDestination against the
// record being written no matter what the page-level check already allowed. Both layers are
// required: this one stops an unauthorized page from ever rendering, the other stops a
// crafted request to the action itself.
export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: '/',
  DESTINATION_MANAGER: '/',
  BUSINESS_USER: '/business',
  TOURIST: '/decisions',
};

const DESTINATION_MANAGER_PATHS = ['/', '/trends', '/domestic', '/destinations', '/hotels', '/expenditure', '/decisions', '/itinerary', '/crowd', '/alerts', '/manage-destinations'];
const BUSINESS_USER_PATHS = ['/business'];
const TOURIST_PATHS = ['/decisions', '/itinerary', '/crowd'];

export function allowedPaths(role: Role): string[] | '*' {
  switch (role) {
    case 'SUPER_ADMIN': return '*';
    case 'DESTINATION_MANAGER': return DESTINATION_MANAGER_PATHS;
    case 'BUSINESS_USER': return BUSINESS_USER_PATHS;
    case 'TOURIST': return TOURIST_PATHS;
  }
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const allowed = allowedPaths(role);
  if (allowed === '*') return true;
  // Prefix match (not just exact) so a listed entry also covers its own sub-routes --
  // /manage-destinations/bagan is allowed by a /manage-destinations entry without needing
  // every destination's edit URL enumerated here.
  return allowed.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
