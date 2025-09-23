import EventSuccessEmail from '@/src/emails/events/success';
import { sendEmail } from '@/src/lib/email';

async function testEmail() {
  try {
    console.log('🚀 Sending test email...');

    const result = await sendEmail({
      template: EventSuccessEmail,
      templateProps: {
        authorName: 'Rafael',
        companyName: 'Platanus',
        eventTitle: 'Test Event for Chile Tech Week',
        eventStartDate: 'December 1, 2025',
        eventEndDate: 'December 1, 2025',
        commune: 'Las Condes',
        eventFormat: 'In-person',
        themes: 'AI, Startups',
        eventId: 'test-123',
      },
      to: 'rafael@platan.us',
      subject: 'Test Email - Chile Tech Week Event Submission',
    });

    console.log('✅ Email sent successfully!');
    console.log(`📧 Email ID: ${result.outboundEmailId}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

testEmail();
