import { redirect } from 'next/navigation';
import { $path } from 'next-typesafe-url';
import { auth, type SessionUser } from '@/app/(auth)/auth';
import type { UserRole } from '@/src/lib/db/schema';
import { getUser } from '@/src/queries/users';
import { hasAnyRole, hasRole, isAdmin, isHacker } from './role-utils';

const emptyUser: SessionUser = {
  id: '',
  email: '',
  role: 'default',
  firstName: '',
  lastName: '',
  name: '',
  image: '',
};

export async function getAuthorization() {
  const session = await auth();
  const user = session?.user;

  return {
    user,
    role: user?.role,
    isAdmin: isAdmin(user),
    isHacker: isHacker(user),
    hasRole: (role: UserRole) => hasRole(user, role),
    hasAnyRole: (roles: UserRole[]) => hasAnyRole(user, roles),
    onlyLoggedIn: () => {
      if (!user) {
        redirect($path({ route: '/login' }));
      }
      return user;
    },
  };
}

export async function getCurrentUser() {
  const session = await auth();

  return {
    user: session?.user ?? emptyUser,
    async fromDb() {
      if (!session?.user?.email) return emptyUser;
      const users = await getUser(session.user.email);
      return users[0] || emptyUser;
    },
  };
}

// Simple helper to reduce redirect boilerplate
function requireAuth(
  user: SessionUser | undefined,
  hasAccess: boolean,
): SessionUser {
  if (!user || !hasAccess) {
    redirect($path({ route: '/login' }));
  }
  return user;
}

export async function onlyLoggedIn(): Promise<SessionUser> {
  const { user } = await getAuthorization();
  return requireAuth(user, !!user);
}

export async function onlyAdmin(): Promise<SessionUser> {
  const { user, isAdmin: userIsAdmin } = await getAuthorization();
  return requireAuth(user, userIsAdmin);
}

export async function onlyHacker(): Promise<SessionUser> {
  const { user, isHacker: userIsHacker } = await getAuthorization();
  return requireAuth(user, userIsHacker);
}

export async function onlyRole(role: UserRole): Promise<SessionUser> {
  const { user, hasRole } = await getAuthorization();
  return requireAuth(user, hasRole(role));
}

export async function onlyAnyRole(roles: UserRole[]): Promise<SessionUser> {
  const { user, hasAnyRole } = await getAuthorization();
  return requireAuth(user, hasAnyRole(roles));
}
