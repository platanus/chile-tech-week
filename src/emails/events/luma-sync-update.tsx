import { Heading, Hr, Section, Text } from '@react-email/components';
import React from 'react';
import EmailLayout from '../_components/email-layout';

interface LumaSyncUpdateEmailProps {
  authorName: string;
  eventTitle: string;
  changes: {
    title?: { old: string; new: string };
    startDate?: { old: string; new: string };
    endDate?: { old: string; new: string };
  };
  eventId: string;
  lumaEventUrl: string;
}

export default function LumaSyncUpdateEmail({
  authorName,
  eventTitle,
  changes,
  eventId,
  lumaEventUrl,
}: LumaSyncUpdateEmailProps) {
  const preview = `Event "${eventTitle}" was updated from Luma`;
  const eventStatusUrl = `https://${process.env.DOMAIN}/events/${eventId}/status`;

  return (
    <EmailLayout preview={preview}>
      <Section>
        <Heading style={h1}>🔄 Event Updated</Heading>

        <Text style={text}>Hi {authorName},</Text>

        <Text style={text}>
          We detected changes in your Luma event and updated your event on the
          Chile Tech Week website.
        </Text>

        <Hr style={hr} />

        <Text style={sectionTitle}>What Changed:</Text>

        {changes.title && (
          <>
            <Text style={eventDetail}>
              <strong>Title:</strong>
            </Text>
            <Text style={changeDetail}>
              From: {changes.title.old}
              <br />
              To: {changes.title.new}
            </Text>
          </>
        )}

        {changes.startDate && (
          <>
            <Text style={eventDetail}>
              <strong>Start Date:</strong>
            </Text>
            <Text style={changeDetail}>
              From: {changes.startDate.old}
              <br />
              To: {changes.startDate.new}
            </Text>
          </>
        )}

        {changes.endDate && (
          <>
            <Text style={eventDetail}>
              <strong>End Date:</strong>
            </Text>
            <Text style={changeDetail}>
              From: {changes.endDate.old}
              <br />
              To: {changes.endDate.new}
            </Text>
          </>
        )}

        <Hr style={hr} />

        <div style={linkContainer}>
          <Text style={eventDetail}>
            📅{' '}
            <a href={lumaEventUrl} style={link}>
              View Luma Event
            </a>
          </Text>
          <Text style={eventDetail}>
            🌐{' '}
            <a href={eventStatusUrl} style={link}>
              View Chile Tech Week Event
            </a>
          </Text>
        </div>

        <Text style={text}>
          Your event is automatically synced with Luma. If you have any
          questions, contact the Chile Tech Week team at{' '}
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

const eventDetail = {
  color: '#000000',
  fontSize: '14px',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'normal',
  lineHeight: '20px',
  margin: '8px 0',
};

const changeDetail = {
  color: '#000000',
  fontSize: '14px',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'normal',
  lineHeight: '20px',
  margin: '8px 0 16px 16px',
  padding: '12px',
  backgroundColor: '#f8f9fa',
  border: '2px solid #000000',
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

const linkContainer = {
  margin: '16px 0',
  padding: '16px',
  backgroundColor: '#f8f9fa',
  border: '4px solid #000000',
};
