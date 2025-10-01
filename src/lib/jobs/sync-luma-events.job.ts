import { and, eq, isNotNull } from 'drizzle-orm';
import LumaCancelledEmail from '@/src/emails/events/luma-cancelled';
import LumaSyncUpdateEmail from '@/src/emails/events/luma-sync-update';
import { db } from '@/src/lib/db';
import { events } from '@/src/lib/db/schema';
import { sendEmail } from '@/src/lib/email';
import { lumaService } from '@/src/services/luma';

async function syncLumaEvents() {
  const publishedEvents = await db
    .select()
    .from(events)
    .where(
      and(eq(events.state, 'published'), isNotNull(events.lumaEventApiId)),
    );

  if (publishedEvents.length === 0) {
    console.log('🔄 No published events with Luma integration to sync');
    return;
  }

  console.log(
    `🔄 Syncing ${publishedEvents.length} published events with Luma`,
  );

  const results = await Promise.allSettled(
    publishedEvents.map(async (event) => {
      if (!event.lumaEventApiId) {
        return { updated: false };
      }

      let lumaEvent: Awaited<ReturnType<typeof lumaService.getEvent>>;
      try {
        lumaEvent = await lumaService.getEvent(event.lumaEventApiId);
      } catch (error) {
        // Check if the event was cancelled on Luma (404 error)
        if (
          error instanceof Error &&
          error.message.includes('404') &&
          error.message.includes('canceled')
        ) {
          console.log(
            `❌ Event "${event.title}" was cancelled on Luma, marking as deleted`,
          );

          // Update the event as deleted
          await db
            .update(events)
            .set({
              state: 'deleted',
              deletedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(events.id, event.id));

          // Send cancellation email
          try {
            await sendEmail({
              template: LumaCancelledEmail,
              templateProps: {
                authorName: event.authorName,
                eventTitle: event.title,
                eventId: event.id,
              },
              to: event.authorEmail,
              subject: `Event Cancelled: ${event.title}`,
            });

            console.log(
              `📧 Sent cancellation email to ${event.authorEmail} for event "${event.title}"`,
            );
          } catch (emailError) {
            console.error(
              `📧 Failed to send cancellation email for event "${event.title}":`,
              emailError,
            );
          }

          return { updated: true, cancelled: true };
        }

        // Re-throw other errors
        throw error;
      }

      const changes: {
        title?: { old: string; new: string };
        startDate?: { old: string; new: string };
        endDate?: { old: string; new: string };
      } = {};

      let hasChanges = false;

      // Check title changes
      if (lumaEvent.name !== event.title) {
        changes.title = { old: event.title, new: lumaEvent.name };
        hasChanges = true;
      }

      // Check start date changes
      const lumaStartDate = new Date(lumaEvent.start_at);
      if (lumaStartDate.getTime() !== event.startDate.getTime()) {
        changes.startDate = {
          old: event.startDate.toLocaleString('en-US', {
            timeZone: 'America/Santiago',
            dateStyle: 'full',
            timeStyle: 'short',
          }),
          new: lumaStartDate.toLocaleString('en-US', {
            timeZone: 'America/Santiago',
            dateStyle: 'full',
            timeStyle: 'short',
          }),
        };
        hasChanges = true;
      }

      // Check end date changes
      const lumaEndDate = new Date(lumaEvent.end_at);
      if (lumaEndDate.getTime() !== event.endDate.getTime()) {
        changes.endDate = {
          old: event.endDate.toLocaleString('en-US', {
            timeZone: 'America/Santiago',
            dateStyle: 'full',
            timeStyle: 'short',
          }),
          new: lumaEndDate.toLocaleString('en-US', {
            timeZone: 'America/Santiago',
            dateStyle: 'full',
            timeStyle: 'short',
          }),
        };
        hasChanges = true;
      }

      if (!hasChanges) {
        return { updated: false };
      }

      // Update the event in the database
      await db
        .update(events)
        .set({
          title: lumaEvent.name,
          startDate: lumaStartDate,
          endDate: lumaEndDate,
          updatedAt: new Date(),
        })
        .where(eq(events.id, event.id));

      console.log(`🔄 Updated event "${event.title}" from Luma changes`);

      // Send email notification to the event author
      try {
        await sendEmail({
          template: LumaSyncUpdateEmail,
          templateProps: {
            authorName: event.authorName,
            eventTitle: event.title,
            changes,
            eventId: event.id,
            lumaEventUrl: event.lumaEventUrl || '',
          },
          to: event.authorEmail,
          subject: `Event Updated: ${event.title}`,
        });

        console.log(
          `📧 Sent sync update email to ${event.authorEmail} for event "${event.title}"`,
        );
      } catch (emailError) {
        console.error(
          `📧 Failed to send sync email for event "${event.title}":`,
          emailError,
        );
      }

      return { updated: true };
    }),
  );

  const updatedCount = results.filter(
    (r) => r.status === 'fulfilled' && r.value.updated,
  ).length;
  const failedCount = results.filter((r) => r.status === 'rejected').length;

  console.log(
    `🔄 Finished syncing Luma events. Updated ${updatedCount} of ${publishedEvents.length} events${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
  );
}

export default syncLumaEvents;
