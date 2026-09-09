import bcrypt from 'bcryptjs';

// Split out from auth.ts on purpose: bcryptjs is Node-oriented and must never end up in the
// Edge middleware bundle (middleware.ts only imports auth.ts, which stays jose-only for
// exactly this reason). This file is only ever imported from Node-runtime code -- server
// actions and the seed script.
export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
