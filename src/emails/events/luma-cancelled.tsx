import { Heading, Hr, Section, Text } from '@react-email/components';
import React from 'react';
import EmailLayout from '../_components/email-layout';

interface LumaCancelledEmailProps {
  authorName: string;
  eventTitle: string;
  eventId: string;
}

export default function LumaCancelledEmail({
  authorName,
  eventTitle,
  eventId,
}: LumaCancelledEmailProps) {
  const preview = `Event "${eventTitle}" was cancelled on Luma`;
  const eventStatusUrl = `https://${process.env.DOMAIN}/events/${eventId}/status`;

  return (
    <EmailLayout preview={preview}>
      <Section>
        <Heading style={h1}>❌ Event Cancelled</Heading>

        <Text style={text}>Hi {authorName},</Text>

        <Text style={text}>
          We detected that your event <strong>{eventTitle}</strong> was
          cancelled on Luma and has been automatically removed from the Chile
          Tech Week website.
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          If this was a mistake or you'd like to reinstate the event, please
          contact the Chile Tech Week team at{' '}
          <a href={`mailto:hello@${process.env.DOMAIN}`} style={link}>
            hello@{process.env.DOMAIN}
          </a>
          .
        </Text>

        <div style={linkContainer}>
          <Text style={eventDetail}>
            🌐{' '}
            <a href={eventStatusUrl} style={link}>
              View Event Status
            </a>
          </Text>
        </div>
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

const hr = {
  borderColor: '#000000',
  borderWidth: '4px',
  borderStyle: 'solid',
  margin: '24px 0',
};

const link = {
  color: 'hsl(0, 85%, 55%)',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'bold',
  textDecoration: 'underline',
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

const linkContainer = {
  margin: '16px 0',
  padding: '16px',
  backgroundColor: '#f8f9fa',
  border: '4px solid #000000',
};
