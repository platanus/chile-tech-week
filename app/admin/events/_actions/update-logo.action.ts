'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/src/lib/db';
import { eventCohosts, events } from '@/src/lib/db/schema';

export async function updateEventLogoAction(
  eventId: string,
  logoUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(events)
      .set({ companyLogoUrl: logoUrl })
      .where(eq(events.id, eventId));

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath('/admin/events');

    return { success: true };
  } catch (error) {
    console.error('Update event logo error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update event logo',
    };
  }
}

export async function updateCohostLogoAction(
  cohostId: string,
  logoUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(eventCohosts)
      .set({ companyLogoUrl: logoUrl })
      .where(eq(eventCohosts.id, cohostId));

    // Need to get the event ID to revalidate the correct path
    const [cohost] = await db
      .select({ eventId: eventCohosts.eventId })
      .from(eventCohosts)
      .where(eq(eventCohosts.id, cohostId))
      .limit(1);

    if (cohost) {
      revalidatePath(`/admin/events/${cohost.eventId}`);
      revalidatePath('/admin/events');
    }

    return { success: true };
  } catch (error) {
    console.error('Update cohost logo error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update cohost logo',
    };
  }
}
