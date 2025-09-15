'use client';

import { Mail } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { $path } from 'next-typesafe-url';
import type { SessionUser } from '@/app/(auth)/auth';
import { SidebarUserNav } from '@/src/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/src/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import type { UserRole } from '@/src/lib/db/schema';

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Emails',
    icon: Mail,
    url: $path({ route: '/emails' }),
    roles: ['admin', 'hacker'],
  },
];

interface AppSidebarProps {
  user: SessionUser;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();

  const filteredMenuItems = menuItems.filter(
    (item) => user?.role && item.roles.includes(user.role),
  );

  const isCollapsed = state === 'collapsed';

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon" className="group-data-[side=left]:border-r-0">
        <SidebarHeader>
          <SidebarMenu>
            {!isCollapsed ? (
              <div className="flex flex-row items-center justify-between">
                <Link
                  href={$path({ route: '/' })}
                  className="flex flex-row items-center gap-3"
                >
                  <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                    Platanus Hack
                  </span>
                </Link>
                <SidebarTrigger className="ml-auto" />
              </div>
            ) : (
              <div className="flex justify-center">
                <SidebarTrigger />
              </div>
            )}
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {filteredMenuItems.map((item) => {
              const isActive = pathname.startsWith(item.url);

              return (
                <SidebarMenuItem key={item.title}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link
                            href={item.url}
                            className="flex w-full items-center justify-center"
                          >
                            <item.icon className="h-4 w-4" />
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.url}
                        className="flex w-full items-center gap-3"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {user && (
            <div className="space-y-2">
              {!isCollapsed && (
                <div className="border-t px-3 py-2 text-muted-foreground text-xs">
                  <div className="flex items-center justify-between">
                    <span>Logged in as:</span>
                    <span className="font-medium capitalize">{user.role}</span>
                  </div>
                  <div className="truncate">
                    {user.firstName} {user.lastName}
                  </div>
                </div>
              )}
              <SidebarUserNav user={user} />
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
