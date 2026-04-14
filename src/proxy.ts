import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = await getUserIdFromRequest(request);

  // Unauthenticated API calls (except auth routes) → 401
  if (!userId && pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/webhooks/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Unauthenticated page visits → redirect to login (skip API routes)
  if (!userId && pathname !== '/' && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Authenticated users on login page → redirect to dashboard
  if (userId && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|favicon.ico).*)'],
};
