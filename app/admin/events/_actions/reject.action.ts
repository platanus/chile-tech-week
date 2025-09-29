'use server';

import { revalidatePath } from 'next/cache';
import EventRejectedEmail from '@/src/emails/events/rejected';
import { sendEmail } from '@/src/lib/email';
import { getEventById, rejectEvent } from '@/src/queries/events';

export type ModerationResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function rejectEventAction(
  eventId: string,
  rejectionReason: string,
): Promise<ModerationResult> {
  try {
    const event = await getEventById(eventId);
    if (!event) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    await rejectEvent(eventId, rejectionReason);

    try {
      sendEmail({
        template: EventRejectedEmail,
        templateProps: {
          authorName: event.authorName,
          eventTitle: event.title,
          rejectionReason,
        },
        to: event.authorEmail,
        subject: 'Event Submission Update - Chile Tech Week 2025',
      }).catch(console.error);
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }

    revalidatePath('/admin/events');
    revalidatePath(`/admin/events/${eventId}`);
    return {
      success: true,
      message: 'Event rejected and notification email sent successfully',
    };
  } catch (error) {
    console.error('Error rejecting event:', error);
    return {
      success: false,
      error: 'Failed to reject event',
    };
  }
}
