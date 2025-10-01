import { Heading, Hr, Section, Text } from '@react-email/components';
import React from 'react';
import EmailButton from '../_components/email-button';
import EmailLayout from '../_components/email-layout';

interface LumaReminderEmailProps {
  authorName: string;
  eventTitle: string;
  eventId: string;
  lumaEventUrl: string;
  daysWaiting: number;
}

export default function LumaReminderEmail({
  authorName,
  eventTitle,
  eventId,
  lumaEventUrl,
  daysWaiting,
}: LumaReminderEmailProps) {
  const preview = `Reminder: Edit your Luma event "${eventTitle}"`;
  const eventStatusUrl = `https://${process.env.DOMAIN}/events/${eventId}/status?publish=true`;

  return (
    <EmailLayout preview={preview}>
      <Section>
        <Heading style={h1}>⏰ Luma Edit Reminder</Heading>

        <Text style={text}>Hi {authorName},</Text>

        <Text style={text}>
          It's been{' '}
          <strong>
            {daysWaiting} day{daysWaiting > 1 ? 's' : ''}
          </strong>{' '}
          since we created your Luma event for <strong>{eventTitle}</strong>.
        </Text>

        <Text style={text}>
          Remember to edit your Luma event with final details and then publish
          it on Chile Tech Week.
        </Text>

        <Hr style={hr} />

        <div style={linkContainer}>
          <Text style={eventDetail}>
            📅{' '}
            <a href={lumaEventUrl} style={link}>
              Edit Luma Event
            </a>
          </Text>
          <Text style={eventDetail}>
            🌐{' '}
            <a href={eventStatusUrl} style={link}>
              Publish on Chile Tech Week
            </a>
          </Text>
        </div>

        <Text style={text}>
          Once you've finished editing, click the "Publish Event" button on your
          event status page.
        </Text>

        <Section style={buttonContainer}>
          <EmailButton href={eventStatusUrl}>
            Luma Edited - Publish Event
          </EmailButton>
        </Section>

        <Text style={text}>
          Questions? Contact us at{' '}
          <a href={`mailto:hello@${process.env.DOMAIN}`} style={link}>
            hello@{process.env.DOMAIN}
          </a>
          .
        </Text>
      </Section>
    </EmailLayout>
  );
}

const h1 = {
  color: '#000000',
  fontSize: '28px',
  fontWeight: 'bold',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '40px 0 20px',
  padding: '16px',
  backgroundColor: 'hsl(0, 85%, 55%)',
  border: '4px solid #000000',
};

const text = {
  color: '#000000',
  fontSize: '16px',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'normal',
  lineHeight: '24px',
  margin: '16px 0',
};

const eventDetail = {
  color: '#000000',
  fontSize: '14px',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'normal',
  lineHeight: '20px',
  margin: '8px 0',
};

const hr = {
  borderColor: '#000000',
  borderWidth: '4px',
  borderStyle: 'solid',
  margin: '24px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const link = {
  color: 'hsl(0, 85%, 55%)',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'bold',
  textDecoration: 'underline',
};

const linkContainer = {
  margin: '16px 0',
  padding: '16px',
  backgroundColor: '#f8f9fa',
  border: '4px solid #000000',
};
