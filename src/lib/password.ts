import bcrypt from 'bcryptjs';

// Split out from auth.ts on purpose: proxy.ts (Next.js 16's renamed middleware.ts) imports
// auth.ts on every request just to verify a JWT, and has no reason to also pull in
// bcryptjs's password-hashing code path -- auth.ts stays jose-only for that reason, not
// because of an Edge-runtime constraint (proxy defaults to the Node.js runtime now; see
// proxy.ts). This file is only ever imported from server actions and the seed script.
export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
