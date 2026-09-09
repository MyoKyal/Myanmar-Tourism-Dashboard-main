import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession, canAccessPath, ROLE_HOME } from '@/lib/auth';

const PUBLIC_PATHS = new Set(['/login']);

// Next.js 16 renamed "middleware" to "proxy" (this file used to be middleware.ts) -- the old
// convention is deprecated, per the build warning and node_modules/next/dist/docs. Proxy now
// defaults to the Node.js runtime rather than Edge, but this stays jose-only (no bcryptjs)
// regardless: it only ever needs to verify a signed JWT, never hash/compare a password, so
// there's no reason to pull bcryptjs's code path into every request here.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPath(user.role, pathname)) {
    return NextResponse.redirect(new URL(ROLE_HOME[user.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except static assets and Next's internals -- API routes don't exist yet in
  // this app (it's all server actions), so there's no /api prefix to carve out.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
