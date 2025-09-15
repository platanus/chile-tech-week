import * as Sentry from '@sentry/nextjs';
import { posthog } from 'posthog-js';
import type { SessionUser } from '@/app/(auth)/auth';

export function identifySentryUser(user: SessionUser | undefined) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: `${user.firstName} ${user.lastName}`.trim() || user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  });
}

export function identifyPostHogUser(user: SessionUser | undefined) {
  if (!user) {
    posthog.reset();
    return;
  }

  posthog.identify(user.id, {
    email: user.email,
    role: user.role,
  });
}

export function identifyUser(user: SessionUser | undefined) {
  identifySentryUser(user);
  identifyPostHogUser(user);
}
