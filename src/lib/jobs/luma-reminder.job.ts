import { and, eq, isNotNull, lt } from 'drizzle-orm';
import LumaReminderEmail from '@/src/emails/events/luma-reminder';
import { db } from '@/src/lib/db';
import { events } from '@/src/lib/db/schema';
import { sendEmail } from '@/src/lib/email';

async function lumaReminder() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const waitingEvents = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.state, 'waiting-luma-edit'),
        isNotNull(events.lumaEventUrl),
        lt(events.waitingLumaEditAt, oneDayAgo),
      ),
    );

  if (waitingEvents.length === 0) {
    console.log('⏰ No events waiting for Luma edit beyond 1 day');
    return;
  }

  console.log(
    `⏰ Sending reminders for ${waitingEvents.length} events waiting for Luma edit`,
  );

  const results = await Promise.allSettled(
    waitingEvents.map(async (event) => {
      if (!event.lumaEventUrl || !event.waitingLumaEditAt) {
        return { sent: false };
      }

      const daysWaiting = Math.floor(
        (Date.now() - event.waitingLumaEditAt.getTime()) /
          (24 * 60 * 60 * 1000),
      );

      try {
        await sendEmail({
          template: LumaReminderEmail,
          templateProps: {
            authorName: event.authorName,
            eventTitle: event.title,
            eventId: event.id,
            lumaEventUrl: event.lumaEventUrl,
            daysWaiting,
          },
          to: event.authorEmail,
          subject: `Reminder: Edit your Luma event "${event.title}"`,
        });

        console.log(
          `📧 Sent Luma reminder to ${event.authorEmail} for event "${event.title}" (${daysWaiting} days)`,
        );

        return { sent: true };
      } catch (error) {
        console.error(
          `📧 Failed to send Luma reminder for event "${event.title}":`,
          error,
        );
        throw error;
      }
    }),
  );

  const sentCount = results.filter(
    (r) => r.status === 'fulfilled' && r.value.sent,
  ).length;
  const failedCount = results.filter((r) => r.status === 'rejected').length;

  console.log(
    `⏰ Finished sending Luma reminders. Sent ${sentCount} of ${waitingEvents.length} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
  );
}

export default lumaReminder;
