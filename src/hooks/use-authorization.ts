'use client';

import { useSession } from 'next-auth/react';
import {
  hasAnyRole,
  hasRole,
  isAdmin,
  isHacker,
} from '@/src/lib/auth/role-utils';
import type { UserRole } from '@/src/lib/db/schema';

export function useAuthorization() {
  const { data: session, status } = useSession();
  const user = session?.user;

  return {
    user,
    role: user?.role,
    status,
    isAdmin: isAdmin(user),
    isHacker: isHacker(user),
    hasRole: (role: UserRole) => hasRole(user, role),
    hasAnyRole: (roles: UserRole[]) => hasAnyRole(user, roles),
  };
}
