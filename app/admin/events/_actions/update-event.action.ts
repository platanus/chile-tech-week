'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { onlyAdmin } from '@/src/lib/auth/server';
import { db } from '@/src/lib/db';
import { events } from '@/src/lib/db/schema';

const updateEventSchema = z.object({
  commune: z
    .string()
    .min(1, 'Commune is required')
    .max(255, 'Commune name is too long'),
});

export type UpdateEventResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function updateEventAction(
  eventId: string,
  data: z.infer<typeof updateEventSchema>,
): Promise<UpdateEventResult> {
  try {
    await onlyAdmin();

    const validatedData = updateEventSchema.parse(data);

    const result = await db
      .update(events)
      .set({
        commune: validatedData.commune,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId))
      .returning();

    if (!result.length) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    revalidatePath('/admin/events');
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath('/');

    return {
      success: true,
      message: 'Event updated successfully',
    };
  } catch (error) {
    console.error('Error updating event:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Invalid data',
      };
    }

    return {
      success: false,
      error: 'Failed to update event',
    };
  }
}
