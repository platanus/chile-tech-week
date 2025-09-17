import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider } from '@/src/components/ui/sidebar';
import { AdminSidebar } from './_components/admin-sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
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
