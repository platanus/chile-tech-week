'use server';

import { revalidatePath } from 'next/cache';
import { approveEvent } from '@/src/queries/events';

export type ModerationResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function approveEventAction(
  eventId: string,
): Promise<ModerationResult> {
  try {
    await approveEvent(eventId);
    revalidatePath('/admin/events');
    revalidatePath(`/admin/events/${eventId}`);
    return {
      success: true,
      message: 'Event approved successfully',
    };
  } catch (error) {
    console.error('Error approving event:', error);
    return {
      success: false,
      error: 'Failed to approve event',
    };
  }
}
