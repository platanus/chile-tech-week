import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider } from '@/src/components/ui/sidebar';
import { onlyAdmin } from '@/src/lib/auth/server';
import { AdminSidebar } from './_components/admin-sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await onlyAdmin();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-black">
        <AdminSidebar />
        <SidebarInset className="flex-1 bg-black">
          <main className="h-screen overflow-hidden bg-black p-6">
            <div className="h-full w-full">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
