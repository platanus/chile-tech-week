import { GitIcon } from '@/src/components/icons';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* <RotatingBanana /> */}
      <main className="flex-1">{children}</main>
      <footer className="mt-12 border-primary border-t-8 bg-black py-6">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <p className="font-bold font-mono text-sm text-white uppercase tracking-wider">
              CHILE TECH WEEK 2025
            </p>
            <a
              href="https://github.com/platanus/chile-tech-week"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white transition-colors hover:text-primary"
            >
              <GitIcon />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
