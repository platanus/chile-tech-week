'use client';

import { Calendar, Clock, LogOut, Mail } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/src/components/ui/sidebar';

const navigation = [
  {
    title: 'Events',
    url: '/admin/events',
    icon: Calendar,
  },
  {
    title: 'Emails',
    url: '/admin/emails',
    icon: Mail,
  },
  {
    title: 'Cron Jobs',
    url: '/admin/cron',
    icon: Clock,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <Sidebar className="border-primary border-r-4 bg-black shadow-[8px_0px_0px_0px_hsl(var(--primary))]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mx-2 mb-4 border-4 border-primary bg-white px-4 py-6 font-black font-mono text-black text-xl uppercase tracking-widest shadow-[4px_4px_0px_0px_hsl(var(--primary))]">
            Admin Panel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 px-2">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className={`border-2 p-3 font-black font-mono uppercase tracking-wide transition-colors ${
                      pathname === item.url
                        ? 'border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_#ffffff]'
                        : 'border-white bg-black text-white hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[2px_2px_0px_0px_#ffffff]'
                    }`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className="space-y-2 border-2 border-white bg-black p-3">
          <div className="font-mono text-sm text-white">
            {session?.user?.email}
          </div>
          <SidebarMenuButton
            onClick={handleSignOut}
            className="w-full border-2 border-white bg-black p-2 font-black font-mono text-white uppercase tracking-wide transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[2px_2px_0px_0px_#ffffff]"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
