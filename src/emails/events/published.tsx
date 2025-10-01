import { Heading, Hr, Section, Text } from '@react-email/components';
import React from 'react';
import EmailButton from '../_components/email-button';
import EmailLayout from '../_components/email-layout';

interface PublishedEmailProps {
  authorName: string;
  companyName: string;
  eventTitle: string;
  eventStartDate: string;
  eventEndDate: string;
  commune: string;
  eventFormat: string;
  themes: string;
  eventId: string;
  lumaEventUrl: string;
}

export default function PublishedEmail({
  authorName,
  companyName,
  eventTitle,
  eventStartDate,
  eventEndDate,
  commune,
  eventFormat,
  themes,
  eventId,
  lumaEventUrl,
}: PublishedEmailProps) {
  const preview = `Event "${eventTitle}" is now published!`;
  const eventStatusUrl = `https://${process.env.DOMAIN}/events/${eventId}/status`;
  const websiteUrl = `https://${process.env.DOMAIN}/events`;
  const lumaCalendarUrl = 'https://lu.ma/cltw';

  return (
    <EmailLayout preview={preview}>
      <Section>
        <Heading style={h1}>🎉 Event Published!</Heading>

        <Text style={text}>Hi {authorName},</Text>

        <Text style={text}>
          Congratulations! Your event has been successfully published on the
          Chile Tech Week website and is now live on the Luma calendar.
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
          <strong>Your event is now live on:</strong>
        </Text>

        <div style={linkContainer}>
          <Text style={eventDetail}>
            🎫{' '}
            <a href={lumaEventUrl} style={link}>
              Your Luma Event
            </a>
          </Text>
          <Text style={eventDetail}>
            📅{' '}
            <a href={lumaCalendarUrl} style={link}>
              Luma Calendar
            </a>
          </Text>
          <Text style={eventDetail}>
            🌐{' '}
            <a href={websiteUrl} style={link}>
              Chile Tech Week Website
            </a>
          </Text>
        </div>

        <Hr style={hr} />

        <Text style={text}>
          <strong>Need to update your event information?</strong>
        </Text>

        <Text style={text}>
          If you need to change any details about your event on the Tech Week
          page, you can manage it here:
        </Text>

        <Section style={buttonContainer}>
          <EmailButton href={eventStatusUrl}>Manage Event</EmailButton>
        </Section>

        <Text style={text}>
          Thank you for being part of Chile Tech Week 2025! We're excited to see
          you at your event.
        </Text>

        <Text style={text}>
          If you have any questions, contact the Chile Tech Week team at{' '}
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

const _processContainer = {
  margin: '20px 0',
};

const _processStepCompleted = {
  backgroundColor: 'hsl(0, 85%, 55%)',
  border: '4px solid #000000',
  padding: '12px',
  margin: '8px 0',
};

const _processStepText = {
  color: '#000000',
  fontSize: '14px',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0',
};

const linkContainer = {
  margin: '16px 0',
  padding: '16px',
  backgroundColor: '#f8f9fa',
  border: '4px solid #000000',
};
