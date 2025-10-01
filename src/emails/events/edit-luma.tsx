import { Heading, Hr, Section, Text } from '@react-email/components';
import React from 'react';
import EmailButton from '../_components/email-button';
import EmailLayout from '../_components/email-layout';

interface EditLumaEmailProps {
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

export default function EditLumaEmail({
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
}: EditLumaEmailProps) {
  const preview = `Event "${eventTitle}" approved! Edit your Luma event to publish`;
  const eventStatusUrl = `https://${process.env.DOMAIN}/events/${eventId}/status?publish=true`;

  return (
    <EmailLayout preview={preview}>
      <Section>
        <Heading style={h1}>🎉 Event Approved!</Heading>

        <Text style={text}>Hi {authorName},</Text>

        <Text style={text}>
          Great news! Your event has been approved and is now ready for the next
          step.
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

        <Text style={sectionTitle}>Next Steps:</Text>

        <div style={processContainer}>
          <div style={processStepCompleted}>
            <Text style={processStepText}>✓ 1. SUBMIT EVENT - COMPLETED</Text>
          </div>
          <div style={processStepCompleted}>
            <Text style={processStepText}>
              ✓ 2. EVENT CHECKING & APPROVAL - COMPLETED
            </Text>
          </div>
          <div style={processStepActive}>
            <Text style={processStepText}>
              → 3. EDIT LUMA & PUBLISH - CURRENT STEP
            </Text>
          </div>
          <div style={processStepPending}>
            <Text style={processStepText}>○ 4. EVENT PUBLISHED - PENDING</Text>
          </div>
        </div>

        <Text style={text}>
          <strong>
            You should have received an invitation to edit your Luma event in
            your email.
          </strong>
        </Text>

        {lumaEventUrl && (
          <div style={linkContainer}>
            <Text style={eventDetail}>
              📅{' '}
              <a
                href={lumaEventUrl}
                style={link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Click here to view your Luma Event
              </a>
            </Text>
            <Text
              style={{
                ...eventDetail,
                fontSize: '12px',
                color: '#666',
                marginTop: '8px',
              }}
            >
              (You'll see edit options when you're logged in as a host)
            </Text>
          </div>
        )}

        <Text style={text}>
          Please edit the Luma event with your final details including:
        </Text>

        <div style={checklistContainer}>
          <Text style={checklistItem}>□ Verify event time and date</Text>
          <Text style={checklistItem}>□ Add event images</Text>
          <Text style={checklistItem}>□ Confirm event location details</Text>
          <Text style={checklistItem}>□ Update event descriptions</Text>
          <Text style={checklistItem}>
            □{' '}
            <a
              href="https://luma.com/settings"
              style={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Edit your Luma profile
            </a>{' '}
            with company name and logo
          </Text>
        </div>

        <Text style={text}>
          Once you've finished editing your Luma event, click the button below
          to publish it:
        </Text>

        <Section style={buttonContainer}>
          <EmailButton href={eventStatusUrl}>
            Luma Edited - Publish Event
          </EmailButton>
        </Section>

        <Text style={text}>
          If you have any questions, contact the Chile Tech Week team at{' '}
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

const processContainer = {
  margin: '20px 0',
};

const processStepCompleted = {
  backgroundColor: 'hsl(0, 85%, 55%)',
  border: '4px solid #000000',
  padding: '12px',
  margin: '8px 0',
};

const processStepActive = {
  backgroundColor: 'hsl(45, 100%, 70%)',
  border: '4px solid #000000',
  padding: '12px',
  margin: '8px 0',
};

const processStepPending = {
  backgroundColor: '#f5f5f5',
  border: '4px solid #000000',
  padding: '12px',
  margin: '8px 0',
};

const processStepText = {
  color: '#000000',
  fontSize: '14px',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0',
};

const checklistContainer = {
  margin: '16px 0',
  padding: '16px',
  backgroundColor: '#f8f9fa',
  border: '4px solid #000000',
};

const checklistItem = {
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
