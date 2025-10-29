'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { onlyAdmin } from '@/src/lib/auth/server';
import { db } from '@/src/lib/db';
import { events } from '@/src/lib/db/schema';

const updateCustomUrlSchema = z.object({
  customUrl: z
    .string()
    .url('Must be a valid URL')
    .max(500, 'URL is too long')
    .nullable(),
});

export type UpdateCustomUrlResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function updateCustomUrlAction(
  eventId: string,
  data: z.infer<typeof updateCustomUrlSchema>,
): Promise<UpdateCustomUrlResult> {
  try {
    await onlyAdmin();

    const validatedData = updateCustomUrlSchema.parse(data);

    const result = await db
      .update(events)
      .set({
        customUrl: validatedData.customUrl,
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
    revalidatePath('/events');

    return {
      success: true,
      message: validatedData.customUrl
        ? 'Custom URL updated successfully'
        : 'Custom URL cleared successfully',
    };
  } catch (error) {
    console.error('Error updating custom URL:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Invalid data',
      };
    }

    return {
      success: false,
      error: 'Failed to update custom URL',
    };
  }
}
