'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/src/lib/db';
import { eventCohosts, events } from '@/src/lib/db/schema';

export async function toggleEventLogoVisibility(
  eventId: string,
  show: boolean,
) {
  await db
    .update(events)
    .set({ logoShownAt: show ? new Date() : null })
    .where(eq(events.id, eventId));

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath('/');
}

export async function toggleCohostLogoVisibility(
  cohostId: string,
  show: boolean,
) {
  await db
    .update(eventCohosts)
    .set({ logoShownAt: show ? new Date() : null })
    .where(eq(eventCohosts.id, cohostId));

  revalidatePath('/');
}
