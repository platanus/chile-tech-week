'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import EditLumaEmail from '@/src/emails/events/edit-luma';
import { db } from '@/src/lib/db';
import { events } from '@/src/lib/db/schema';
import { sendEmail } from '@/src/lib/email';
import { eventFormatLabels } from '@/src/lib/schemas/events.schema';
import {
  approveEvent,
  getAllEventThemes,
  getEventById,
} from '@/src/queries/events';
import { lumaService } from '@/src/services/luma';

export type ModerationResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function approveEventAction(
  eventId: string,
): Promise<ModerationResult> {
  try {
    // First, get the event details
    const event = await getEventById(eventId);
    if (!event) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    // Approve the event in the database
    await approveEvent(eventId);

    // Create Luma event
    const formData = {
      authorEmail: event.authorEmail,
      authorName: event.authorName,
      companyName: event.companyName,
      companyWebsite: event.companyWebsite,
      authorPhoneNumber: event.authorPhoneNumber,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      commune: event.commune,
      format: event.format,
      capacity: event.capacity,
      lumaLink: event.lumaLink || '',
      companyLogoUrl: event.companyLogoUrl,
      logoFile: new File([], ''), // Empty file since we already have the URL
      cohosts: event.cohosts.map((cohost) => ({
        companyName: cohost.companyName,
        companyLogoUrl: '', // Cohosts don't have logo URLs in the current schema
        logoFile: new File([], ''), // Empty file
        primaryContactName: cohost.primaryContactName,
        primaryContactEmail: cohost.primaryContactEmail,
        primaryContactPhoneNumber: cohost.primaryContactPhoneNumber || '',
        primaryContactWebsite: cohost.primaryContactWebsite || '',
        primaryContactLinkedin: cohost.primaryContactLinkedin || '',
      })),
      themeIds: event.themes.map((theme) => theme.id),
      audienceIds: event.audiences.map((audience) => audience.id),
    };

    const lumaResult = await lumaService.createEventFromFormData(
      formData,
      eventId,
    );

    // Update the event with Luma details if successful
    if (lumaResult.success && lumaResult.eventUrl && lumaResult.eventApiId) {
      await db
        .update(events)
        .set({
          lumaEventUrl: lumaResult.eventUrl,
          lumaEventApiId: lumaResult.eventApiId,
          lumaEventCreatedAt: new Date(),
        })
        .where(eq(events.id, eventId));
    }

    // Send notification email to event organizer
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

      // Send edit-luma email to event organizer
      sendEmail({
        template: EditLumaEmail,
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
        },
        to: event.authorEmail,
        subject: `Event approved - Edit your Luma event - Chile Tech Week 2025`,
      }).catch(console.error);
    } catch (error) {
      console.error('Failed to send edit-luma email:', error);
    }

    revalidatePath('/admin/events');
    revalidatePath(`/admin/events/${eventId}`);

    if (lumaResult.success) {
      return {
        success: true,
        message:
          'Event approved, Luma event created, and notification email sent successfully',
      };
    } else {
      // Event was approved but Luma creation failed
      return {
        success: true,
        message: `Event approved successfully, but Luma event creation failed: ${lumaResult.error}`,
      };
    }
  } catch (error) {
    console.error('Error approving event:', error);
    return {
      success: false,
      error: 'Failed to approve event',
    };
  }
}
