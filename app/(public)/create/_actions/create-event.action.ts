'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/src/lib/db';
import { eventCohosts, events, eventThemeRelations } from '@/src/lib/db/schema';
import {
  type CreateEventFormData,
  createEventFormSchema,
  eventFormatLabels,
} from '@/src/lib/schemas/events.schema';
import {
  type FormActionState,
  handleCommonError,
  isCommonError,
} from '@/src/lib/utils/forms';
import { getAllEventThemes } from '@/src/queries/events';
import { slackService } from '@/src/services/slack';

export async function createEventAction(
  data: CreateEventFormData,
): Promise<FormActionState<CreateEventFormData>> {
  try {
    // Validate data
    const validatedData = createEventFormSchema.parse(data);

    // Create event in database (Luma event should already be created)
    const [newEvent] = await db
      .insert(events)
      .values({
        authorEmail: validatedData.authorEmail,
        authorName: validatedData.authorName,
        authorCompanyName: validatedData.authorCompanyName,
        authorPhoneNumber: validatedData.authorPhoneNumber,
        title: validatedData.title,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        commune: validatedData.commune,
        format: validatedData.format,
        lumaLink: validatedData.lumaLink || null,
        companyLogoUrl: validatedData.companyLogoUrl,
        // Luma integration fields will be populated by the separate Luma action
        lumaEventApiId: null, // Will be updated separately if needed
        lumaEventUrl: null, // Will be updated separately if needed
        lumaEventCreatedAt: null, // Will be updated separately if needed
        // Status tracking
        submittedAt: new Date(),
      })
      .returning();

    // Add co-hosts if any
    if (validatedData.cohosts && validatedData.cohosts.length > 0) {
      await db.insert(eventCohosts).values(
        validatedData.cohosts.map((cohost) => ({
          eventId: newEvent.id,
          companyName: cohost.companyName,
          primaryContactName: cohost.primaryContactName,
          primaryContactEmail: cohost.primaryContactEmail,
          primaryContactPhoneNumber: cohost.primaryContactPhoneNumber || null,
          primaryContactWebsite: cohost.primaryContactWebsite || null,
          primaryContactLinkedin: cohost.primaryContactLinkedin || null,
        })),
      );
    }

    // Add theme relations if any
    if (validatedData.themeIds && validatedData.themeIds.length > 0) {
      await db.insert(eventThemeRelations).values(
        validatedData.themeIds.map((themeId) => ({
          eventId: newEvent.id,
          themeId,
        })),
      );
    }

    // Send formatted Slack notification (don't await to avoid blocking response)
    try {
      const themes = await getAllEventThemes();
      const selectedThemes = themes
        .filter((theme) => validatedData.themeIds?.includes(theme.id))
        .map((theme) => theme.name)
        .join(', ');

      const startDateFormatted = validatedData.startDate.toLocaleDateString(
        'en-US',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Santiago',
        },
      );

      const endDateFormatted = validatedData.endDate.toLocaleDateString(
        'en-US',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Santiago',
        },
      );

      const slackMessage = `🎉 *NEW EVENT SUBMISSION* 🎉

📋 *Event:* ${validatedData.title}
👤 *Organizer:* ${validatedData.authorName} from ${validatedData.authorCompanyName} (${validatedData.authorEmail})
🏷️ *Format:* ${eventFormatLabels[validatedData.format]}
🎯 *Themes:* ${selectedThemes || 'No themes selected'}

📅 *Start:* ${startDateFormatted}
📅 *End:* ${endDateFormatted}
📍 *Commune:* ${validatedData.commune}

🎯 *Luma Event:* Created separately via form workflow
${validatedData.lumaLink ? `🔗 *Original Luma:* ${validatedData.lumaLink}` : ''}
${validatedData.cohosts && validatedData.cohosts.length > 0 ? `🤝 *Co-hosts:* ${validatedData.cohosts.length} companies` : ''}

⚠️ *Requires approval before going live*`;

      slackService.sendMessage(slackMessage).catch(console.error);
    } catch (error) {
      console.error('Failed to send Slack notification for event:', error);
    }

    // Revalidate events page
    revalidatePath('/events');

    // Return success with redirect URL to success page
    return {
      success: true,
      data: validatedData,
      message:
        'Event submitted successfully! It will be reviewed and published once approved.',
      redirectTo: `/create/success?event_id=${newEvent.id}`,
    };
  } catch (error) {
    // Handle common error types (Zod validation + database constraints)
    if (isCommonError(error)) {
      return handleCommonError<CreateEventFormData>(error);
    }

    // Handle other error types
    console.error('Create event error:', error);
    return {
      success: false,
      globalError:
        error instanceof Error
          ? error.message
          : 'Failed to create event. Please try again.',
    };
  }
}
