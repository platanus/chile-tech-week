'use client';

import { useSession } from 'next-auth/react';
import type { SessionUser } from '@/app/(auth)/auth';

const emptyUser: SessionUser = {
  id: '',
  email: '',
  role: 'default',
  firstName: '',
  lastName: '',
  name: '',
  image: '',
};

export function useCurrentUser() {
  const { data: session } = useSession();

  return {
    user: session?.user ?? emptyUser,
    async fromDb() {
      if (!session?.user?.email) return emptyUser;

      const response = await fetch('/api/user/current');
      if (!response.ok) return emptyUser;

      return response.json();
    },
  };
}
