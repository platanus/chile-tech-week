import type { SessionUser } from '@/app/(auth)/auth';
import type { UserRole } from '@/src/lib/db/schema';

export type AuthUser = SessionUser | null | undefined;

export function isAdmin(user: AuthUser): boolean {
  return user?.role === 'admin';
}

export function isHacker(user: AuthUser): boolean {
  return user?.role === 'default';
}

export function hasRole(user: AuthUser, role: UserRole): boolean {
  return user?.role === role;
}

export function hasAnyRole(user: AuthUser, roles: UserRole[]): boolean {
  return user?.role ? roles.includes(user.role) : false;
}
