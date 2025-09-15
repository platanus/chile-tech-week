import { compare } from 'bcrypt-ts';
import NextAuth, { type DefaultSession, type Session } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';
import type { UserRole } from '@/src/lib/db/schema';
import { getUser } from '@/src/queries/users';
import { authConfig } from './auth.config';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      role: UserRole;
      firstName: string;
      lastName: string;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    email?: string | null;
    role: UserRole;
    firstName?: string | null;
    lastName?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    email: string;
    role: UserRole;
    firstName: string | null;
    lastName: string | null;
  }
}

export type SessionUser = Session['user'];

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        const [user] = users;

        if (!user) return null;

        const passwordsMatch = await compare(password, user.encryptedPassword);

        if (!passwordsMatch) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
        };
      },
    }),
    // Guest provider removed
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? '';
        token.email = user.email ?? '';
        token.role = user.role;
        token.firstName = user.firstName ?? '';
        token.lastName = user.lastName ?? '';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email ?? '';
        session.user.role = token.role as UserRole;
        session.user.firstName = token.firstName ?? '';
        session.user.lastName = token.lastName ?? '';
      }
      return session;
    },
  },
});
