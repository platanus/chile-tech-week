import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import {
  isDevelopmentEnvironment,
  isProductionEnvironment,
} from '@/src/lib/constants';
import { db } from '@/src/lib/db';
import { outboundEmails } from '@/src/lib/db/schema';

function shouldSendEmails(): boolean {
  if (isProductionEnvironment) {
    return true;
  }

  return process.env.SEND_EMAILS_DEVELOPMENT === 'true';
}

async function processEmailQueue() {
  const queuedEmails = await db
    .select()
    .from(outboundEmails)
    .where(eq(outboundEmails.status, 'queued'))
    .limit(2);

  if (queuedEmails.length === 0) {
    console.log('📧 No queued emails to process');
    return;
  }

  console.log(`📧 Processing ${queuedEmails.length} queued emails`);

  for (const email of queuedEmails) {
    try {
      await db
        .update(outboundEmails)
        .set({
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(outboundEmails.id, email.id));

      const shouldSend = shouldSendEmails();

      if (!shouldSend) {
        await db
          .update(outboundEmails)
          .set({
            status: 'sent',
            sentAt: new Date(),
            externalMessageId: 'dev-mock-id',
            updatedAt: new Date(),
          })
          .where(eq(outboundEmails.id, email.id));

        console.log(
          `📧 Email ${email.id} not sent in development (SEND_EMAILS_DEVELOPMENT !== "true")`,
        );
        continue;
      }

      const resendClient = new Resend(process.env.RESEND_API_KEY);

      const isDevelopment = isDevelopmentEnvironment;
      const developmentCatchAll =
        process.env.DEVELOPMENT_CATCH_ALL_ADDRESS || 'rafael@platan.us';

      const emailTo = isDevelopment ? developmentCatchAll : email.to;
      const emailCc = isDevelopment ? undefined : (email.cc ?? undefined);
      const emailBcc = isDevelopment ? undefined : (email.bcc ?? undefined);

      const result = await resendClient.emails.send({
        from: process.env.DEFAULT_FROM_EMAIL || 'mailer@hack.platan.us',
        to: emailTo,
        cc: emailCc,
        bcc: emailBcc,
        replyTo: process.env.EMAIL_REPLY_TO,
        subject: email.subject,
        html: email.htmlContent,
        text: email.textContent ?? undefined,
      });

      if (result.error) {
        const errorObj = result.error as any;
        const failureMessage = `Resend API Error: ${errorObj.name || 'Unknown'} - ${errorObj.error || 'Unknown error'}`;
        await db
          .update(outboundEmails)
          .set({
            status: 'failed',
            failureReason: failureMessage,
            updatedAt: new Date(),
          })
          .where(eq(outboundEmails.id, email.id));

        console.error(`📧 Email ${email.id} failed:`, failureMessage);
        continue;
      }

      await db
        .update(outboundEmails)
        .set({
          status: 'sent',
          sentAt: new Date(),
          externalMessageId: result.data?.id,
          updatedAt: new Date(),
        })
        .where(eq(outboundEmails.id, email.id));

      console.log(`📧 Email ${email.id} sent successfully`);
    } catch (error) {
      console.error(`📧 Error processing email ${email.id}:`, error);

      await db
        .update(outboundEmails)
        .set({
          status: 'failed',
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(outboundEmails.id, email.id));
    }
  }

  console.log(`📧 Finished processing ${queuedEmails.length} emails`);
}

export default processEmailQueue;
