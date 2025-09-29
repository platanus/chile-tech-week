'use server';

import { revalidatePath } from 'next/cache';
import NewEventSubmissionEmail from '@/src/emails/events/new-submission';
import EventSuccessEmail from '@/src/emails/events/success';
import { sendEmail } from '@/src/lib/email';
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
import {
  type CreateCohostData,
  createEvent,
  createEventAudienceRelations,
  createEventCohosts,
  createEventThemeRelations,
  getAllEventAudiences,
  getAllEventThemes,
} from '@/src/queries/events';
import { getUsersWithNotificationsEnabled } from '@/src/queries/users';
import { slackService } from '@/src/services/slack';

export async function createEventAction(
  data: CreateEventFormData,
): Promise<FormActionState<CreateEventFormData>> {
  try {
    // Validate data
    const validatedData = createEventFormSchema.parse(data);

    // Create event in database
    const newEvent = await createEvent({
      authorEmail: validatedData.authorEmail,
      authorName: validatedData.authorName,
      companyName: validatedData.companyName,
      companyWebsite: validatedData.companyWebsite,
      authorPhoneNumber: validatedData.authorPhoneNumber,
      title: validatedData.title,
      description: validatedData.description,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      commune: validatedData.commune,
      format: validatedData.format,
      capacity: validatedData.capacity,
      lumaLink: validatedData.lumaLink || null,
      companyLogoUrl: validatedData.companyLogoUrl,
    });

    // Add co-hosts if any
    if (validatedData.cohosts && validatedData.cohosts.length > 0) {
      const cohostsData: CreateCohostData[] = validatedData.cohosts.map(
        (cohost) => ({
          eventId: newEvent.id,
          companyName: cohost.companyName,
          primaryContactName: cohost.primaryContactName,
          primaryContactEmail: cohost.primaryContactEmail,
          primaryContactPhoneNumber: cohost.primaryContactPhoneNumber || null,
          primaryContactWebsite: cohost.primaryContactWebsite || null,
          primaryContactLinkedin: cohost.primaryContactLinkedin || null,
        }),
      );

      await createEventCohosts(cohostsData);
    }

    // Add theme relations if any
    if (validatedData.themeIds && validatedData.themeIds.length > 0) {
      await createEventThemeRelations(newEvent.id, validatedData.themeIds);
    }

    // Add audience relations if any
    if (validatedData.audienceIds && validatedData.audienceIds.length > 0) {
      await createEventAudienceRelations(
        newEvent.id,
        validatedData.audienceIds,
      );
    }

    // Send formatted Slack notification and success email (don't await to avoid blocking response)
    try {
      const [themes, audiences] = await Promise.all([
        getAllEventThemes(),
        getAllEventAudiences(),
      ]);

      const selectedThemes = themes
        .filter((theme) => validatedData.themeIds?.includes(theme.id))
        .map((theme) => theme.name)
        .join(', ');

      const selectedAudiences = audiences
        .filter((audience) => validatedData.audienceIds?.includes(audience.id))
        .map((audience) => audience.name)
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

      // Send Slack notification
      const slackMessage = `🎉 *NEW EVENT SUBMISSION* 🎉

📋 *Event:* ${validatedData.title}
👤 *Organizer:* ${validatedData.authorName} from ${validatedData.companyName} (${validatedData.authorEmail})
🏷️ *Format:* ${eventFormatLabels[validatedData.format]}
🎯 *Themes:* ${selectedThemes || 'No themes selected'}
👥 *Audiences:* ${selectedAudiences || 'No audiences selected'}

📅 *Start:* ${startDateFormatted}
📅 *End:* ${endDateFormatted}
📍 *Commune:* ${validatedData.commune}

🎯 *Luma Event:* Created separately via form workflow
${validatedData.lumaLink ? `🔗 *Original Luma:* ${validatedData.lumaLink}` : ''}
${validatedData.cohosts && validatedData.cohosts.length > 0 ? `🤝 *Co-hosts:* ${validatedData.cohosts.length} companies` : ''}

⚠️ *Requires approval before going live*`;

      slackService.sendMessage(slackMessage).catch(console.error);

      // Send success email to event organizer
      sendEmail({
        template: EventSuccessEmail,
        templateProps: {
          authorName: validatedData.authorName,
          companyName: validatedData.companyName,
          eventTitle: validatedData.title,
          eventStartDate: startDateFormatted,
          eventEndDate: endDateFormatted,
          commune: validatedData.commune,
          eventFormat: eventFormatLabels[validatedData.format],
          themes: selectedThemes || 'No themes selected',
          eventId: newEvent.id,
        },
        to: validatedData.authorEmail,
        subject: `Event submitted successfully - Chile Tech Week 2025`,
      }).catch(console.error);

      // Notify users with notifications enabled
      const notifiedUsers = await getUsersWithNotificationsEnabled();
      for (const notifiedUser of notifiedUsers) {
        sendEmail({
          template: NewEventSubmissionEmail,
          templateProps: {
            eventTitle: validatedData.title,
            companyName: validatedData.companyName,
            eventId: newEvent.id,
          },
          to: notifiedUser.email,
          subject: `New event submission: ${validatedData.title}`,
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Failed to send notifications for event:', error);
    }

    // Revalidate events page
    revalidatePath('/events');

    // Return success with redirect URL to success page
    return {
      success: true,
      data: validatedData,
      message:
        'Event submitted successfully! It will be reviewed and published once approved.',
      redirectTo: `/create/success/${newEvent.id}`,
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
