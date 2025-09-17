'use server';

import { revalidatePath } from 'next/cache';
import { approveEvent, rejectEvent } from '@/src/queries/events';

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

export async function rejectEventAction(
  eventId: string,
): Promise<ModerationResult> {
  try {
    await rejectEvent(eventId);
    revalidatePath('/admin/events');
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
