import { Heading, Section, Text } from '@react-email/components';
import React from 'react';
import EmailButton from '../_components/email-button';
import EmailLayout from '../_components/email-layout';

interface NewEventSubmissionEmailProps {
  eventTitle: string;
  companyName: string;
  eventId: string;
}

export default function NewEventSubmissionEmail({
  eventTitle,
  companyName,
  eventId,
}: NewEventSubmissionEmailProps) {
  const preview = `New event submission: ${eventTitle} by ${companyName}`;
  const adminUrl = `${process.env.DOMAIN}/admin/events/${eventId}`;

  return (
    <EmailLayout preview={preview}>
      <Section>
        <Heading style={h1}>🎉 New Event Submission</Heading>

        <Text style={text}>
          <strong>{eventTitle}</strong> by {companyName} has been submitted and
          requires review.
        </Text>

        <Section style={buttonContainer}>
          <EmailButton href={adminUrl}>Review Event</EmailButton>
        </Section>
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};
