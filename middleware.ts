import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import { isDevelopmentEnvironment } from '@/src/lib/constants';

const intlMiddleware = createIntlMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass pathname to the layout via headers
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  if (pathname.startsWith('/api/auth')) {
    return response;
  }

  // Handle i18n only for locale-prefixed routes
  if (pathname.startsWith('/en/') || pathname.startsWith('/es/')) {
    const intlResponse = intlMiddleware(request);
    if (intlResponse) {
      intlResponse.headers.set('x-pathname', pathname);
      return intlResponse;
    }
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  // Handle login/register redirects first
  if (['/login', '/register'].includes(pathname)) {
    if (token) {
      const redirectUrl = request.nextUrl.searchParams.get('redirectUrl');
      return NextResponse.redirect(
        new URL(redirectUrl || '/admin', request.url),
      );
    }
    return response;
  }

  // Check if the route requires authentication (only admin routes)
  const requiresAuth = pathname.includes('admin');

  // Allow all non-admin routes to pass through
  if (!requiresAuth) {
    return response;
  }

  if (!token) {
    const redirectUrl = encodeURIComponent(request.url);

    return NextResponse.redirect(
      new URL(`/login?redirectUrl=${redirectUrl}`, request.url),
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
