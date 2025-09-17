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
          <p className="font-bold font-mono text-sm text-white uppercase tracking-wider">
            CHILE TECH WEEK 2025
          </p>
        </div>
      </footer>
    </>
  );
}
