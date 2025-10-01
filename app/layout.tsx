import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';

import { auth } from '@/app/(auth)/auth';
import { ThemeProvider } from '@/src/components/theme-provider';
import { identifyUser } from '@/src/lib/utils/tracking';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${process.env.DOMAIN}`),
  title: 'Chile Tech Week 2025',
  description: 'The decentralized Tech Week in Chile. November 17-23, 2025.',
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const _isAdminRoute = pathname.startsWith('/admin');

  identifyUser(session?.user);

  return (
    <html
      lang="es"
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
      className={`${jetBrainsMono.variable} ${GeistSans.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="min-h-screen bg-black antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider session={session}>{children}</SessionProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
