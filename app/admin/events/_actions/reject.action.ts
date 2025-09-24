'use server';

import { revalidatePath } from 'next/cache';
import { rejectEvent } from '@/src/queries/events';

export type ModerationResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function rejectEventAction(
  eventId: string,
): Promise<ModerationResult> {
  try {
    await rejectEvent(eventId);
    revalidatePath('/admin/events');
    revalidatePath(`/admin/events/${eventId}`);
    return {
      success: true,
      message: 'Event rejected successfully',
    };
  } catch (error) {
    console.error('Error rejecting event:', error);
    return {
      success: false,
      error: 'Failed to reject event',
    };
  }
}
