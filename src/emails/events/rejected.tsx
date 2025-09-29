import { Heading, Hr, Section, Text } from '@react-email/components';
import React from 'react';
import EmailButton from '../_components/email-button';
import EmailLayout from '../_components/email-layout';

interface EventRejectedEmailProps {
  authorName: string;
  eventTitle: string;
  rejectionReason: string;
}

export default function EventRejectedEmail({
  authorName,
  eventTitle,
  rejectionReason,
}: EventRejectedEmailProps) {
  const preview = `Event "${eventTitle}" requires changes - Chile Tech Week 2025`;
  const createEventUrl = `${process.env.DOMAIN}/create`;

  return (
    <EmailLayout preview={preview}>
      <Section>
        <Heading style={h1}>Event Submission Update</Heading>

        <Text style={text}>Hi {authorName},</Text>

        <Text style={text}>
          Your event submission for Chile Tech Week 2025 requires some changes
          before approval.
        </Text>

        <Hr style={hr} />

        <Text style={sectionTitle}>Feedback:</Text>

        <div style={reasonBox}>
          <Text style={reasonText}>{rejectionReason}</Text>
        </div>

        <Hr style={hr} />

        <Text style={text}>
          Please address the feedback above and resubmit your event.
        </Text>

        <Section style={buttonContainer}>
          <EmailButton href={createEventUrl}>Submit Event Again</EmailButton>
        </Section>

        <Text style={text}>
          Questions? Contact us at{' '}
          <a href="mailto:hello@techweek.cl" style={link}>
            hello@techweek.cl
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

const sectionTitle = {
  color: '#000000',
  fontSize: '20px',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '24px 0 16px',
  padding: '12px',
  backgroundColor: 'hsl(0, 85%, 55%)',
  border: '4px solid #000000',
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

const reasonBox = {
  backgroundColor: '#fff3cd',
  border: '4px solid #000000',
  padding: '16px',
  margin: '16px 0',
};

const reasonText = {
  color: '#000000',
  fontSize: '16px',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'normal',
  lineHeight: '24px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};
