'use server';

import { revalidatePath } from 'next/cache';
import PublishedEmail from '@/src/emails/events/published';
import { sendEmail } from '@/src/lib/email';
import { eventFormatLabels } from '@/src/lib/schemas/events.schema';
import {
  getAllEventThemes,
  getEventById,
  publishEvent,
} from '@/src/queries/events';
import { lumaService } from '@/src/services/luma';

export type PublishEventResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function publishEventAction(
  eventId: string,
): Promise<PublishEventResult> {
  try {
    // Get the event details
    const event = await getEventById(eventId);
    if (!event) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    // Check if event is in waiting-luma-edit state
    if (event.state !== 'waiting-luma-edit') {
      return {
        success: false,
        error: 'Event is not ready to be published',
      };
    }

    // Update Luma event visibility to public before publishing
    if (event.lumaEventApiId) {
      await lumaService.updateEventVisibility(event.lumaEventApiId, 'public');
    }

    // Publish the event
    await publishEvent(eventId);

    // Send confirmation email to event organizer
    try {
      const themes = await getAllEventThemes();

      const selectedThemes = themes
        .filter((theme) =>
          event.themes.some((eventTheme) => eventTheme.id === theme.id),
        )
        .map((theme) => theme.name)
        .join(', ');

      const startDateFormatted = event.startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Santiago',
      });

      const endDateFormatted = event.endDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Santiago',
      });

      sendEmail({
        template: PublishedEmail,
        templateProps: {
          authorName: event.authorName,
          companyName: event.companyName,
          eventTitle: event.title,
          eventStartDate: startDateFormatted,
          eventEndDate: endDateFormatted,
          commune: event.commune,
          eventFormat: eventFormatLabels[event.format],
          themes: selectedThemes || 'No themes selected',
          eventId: event.id,
          lumaEventUrl: event.lumaEventUrl || '',
        },
        to: event.authorEmail,
        subject: `Event published - ${event.title} - Chile Tech Week 2025`,
      }).catch(console.error);
    } catch (error) {
      console.error('Failed to send published email:', error);
    }

    revalidatePath(`/events/${eventId}/status`);
    revalidatePath('/events');

    return {
      success: true,
      message: 'Event published successfully and confirmation email sent',
    };
  } catch (error) {
    console.error('Error publishing event:', error);
    return {
      success: false,
      error: 'Failed to publish event',
    };
  }
}
