export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* <RotatingBanana /> */}
      <main className="flex-1">{children}</main>
    </>
  );
}
