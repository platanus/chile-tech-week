import { Heading, Hr, Section, Text } from '@react-email/components';
import React from 'react';
import EmailButton from '../_components/email-button';
import EmailLayout from '../_components/email-layout';

interface EventSuccessEmailProps {
  authorName: string;
  companyName: string;
  eventTitle: string;
  eventStartDate: string;
  eventEndDate: string;
  commune: string;
  eventFormat: string;
  themes: string;
  eventId: string;
}

export default function EventSuccessEmail({
  authorName,
  companyName,
  eventTitle,
  eventStartDate,
  eventEndDate,
  commune,
  eventFormat,
  themes,
  eventId,
}: EventSuccessEmailProps) {
  const preview = `Event "${eventTitle}" submitted successfully for Chile Tech Week 2025`;
  const eventStatusUrl = `${process.env.DOMAIN}/events/${eventId}/status`;

  return (
    <EmailLayout preview={preview}>
      <Section>
        <Heading style={h1}>🎉 Event Submitted Successfully!</Heading>

        <Text style={text}>Hi {authorName},</Text>

        <Text style={text}>
          Thank you for submitting your event for Chile Tech Week 2025! We've
          received your submission and it's now under review.
        </Text>

        <Hr style={hr} />

        <Text style={sectionTitle}>Event Details:</Text>

        <Text style={eventDetail}>
          <strong>Event:</strong> {eventTitle}
        </Text>

        <Text style={eventDetail}>
          <strong>Company:</strong> {companyName}
        </Text>

        <Text style={eventDetail}>
          <strong>Format:</strong> {eventFormat}
        </Text>

        <Text style={eventDetail}>
          <strong>Themes:</strong> {themes}
        </Text>

        <Text style={eventDetail}>
          <strong>When:</strong> {eventStartDate} - {eventEndDate}
        </Text>

        <Text style={eventDetail}>
          <strong>Location:</strong> {commune}
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          Your event will be reviewed by our team and published on the Chile
          Tech Week website once approved. You'll receive another email when
          your event goes live.
        </Text>

        <Section style={buttonContainer}>
          <EmailButton href={eventStatusUrl}>Check Event Status</EmailButton>
        </Section>

        <Text style={text}>
          You can track your event's approval status and see when it goes live
          by visiting{' '}
          <a href={eventStatusUrl} style={link}>
            your event status page
          </a>
          .
        </Text>

        <Text style={text}>
          If you have any questions or need to make changes to your submission,
          please contact us at{' '}
          <a href="mailto:hello@chiletechweek.com" style={link}>
            hello@chiletechweek.com
          </a>
        </Text>

        <Text style={footer}>
          Best regards,
          <br />
          The Chile Tech Week Team
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

const footer = {
  color: '#666666',
  fontSize: '14px',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'normal',
  lineHeight: '20px',
  margin: '32px 0 0',
  padding: '16px',
  border: '4px solid #000000',
  backgroundColor: '#ffffff',
};
