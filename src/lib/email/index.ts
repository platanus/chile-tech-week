import { render } from '@react-email/render';
import React, { createElement } from 'react';
import { Resend } from 'resend';
import {
  isDevelopmentEnvironment,
  isProductionEnvironment,
} from '@/src/lib/constants';
import { createOutboundEmail, updateOutboundEmail } from '@/src/queries/emails';

export interface SendEmailOptions<T = Record<string, any>> {
  template: React.ComponentType<T>;
  templateProps: T;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  sentByUserId: string;
}

export interface SendPreRenderedEmailOptions {
  templateName: string;
  htmlContent: string;
  textContent: string;
  templateData?: any;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  sentByUserId: string;
}

function shouldSendEmails(): boolean {
  if (isProductionEnvironment) {
    return true;
  }

  return process.env.SEND_EMAILS_DEVELOPMENT === 'true';
}

async function renderTemplate<T>(Template: React.ComponentType<T>, props: T) {
  const element = createElement(Template as React.ComponentType<any>, props);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  return { html, text };
}

async function sendEmailInternal(params: {
  templateName: string;
  htmlContent: string;
  textContent: string;
  templateData?: any;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  sentByUserId: string;
}) {
  const emailRecord = await createOutboundEmail({
    templateName: params.templateName,
    to: Array.isArray(params.to) ? params.to[0] : params.to,
    cc: params.cc || null,
    bcc: params.bcc || null,
    subject: params.subject,
    htmlContent: params.htmlContent,
    textContent: params.textContent,
    templateData: params.templateData,
    sentByUserId: params.sentByUserId,
    status: 'pending',
  });

  const shouldSend = shouldSendEmails();

  if (!shouldSend) {
    await updateOutboundEmail(emailRecord.id, {
      status: 'sent',
      sentAt: new Date(),
      externalMessageId: 'dev-mock-id',
    });

    console.log(
      '📧 Email not sent in development (SEND_EMAILS_DEVELOPMENT !== "true")',
    );
    console.log(`📧 To: ${params.to}`);
    console.log(`📧 Subject: ${params.subject}`);

    return { success: true, outboundEmailId: emailRecord.id };
  }

  try {
    const resendClient = new Resend(process.env.RESEND_API_KEY);

    const isDevelopment = isDevelopmentEnvironment;
    const developmentCatchAll =
      process.env.DEVELOPMENT_CATCH_ALL_ADDRESS || 'rafael@platan.us';

    const emailTo = isDevelopment ? developmentCatchAll : params.to;
    const emailCc = isDevelopment ? undefined : params.cc;
    const emailBcc = isDevelopment ? undefined : params.bcc;

    const result = await resendClient.emails.send({
      from: process.env.DEFAULT_FROM_EMAIL || 'mailer@hack.platan.us',
      to: emailTo,
      cc: emailCc,
      bcc: emailBcc,
      subject: params.subject,
      html: params.htmlContent,
      text: params.textContent,
    });

    if (result.error) {
      const errorObj = result.error as any;
      const failureMessage = `Resend API Error: ${errorObj.name || 'Unknown'} - ${errorObj.error || 'Unknown error'}`;
      await updateOutboundEmail(emailRecord.id, {
        status: 'failed',
        failureReason: failureMessage,
      });

      throw new Error(failureMessage);
    }

    await updateOutboundEmail(emailRecord.id, {
      status: 'sent',
      sentAt: new Date(),
      externalMessageId: result.data?.id,
    });

    return { success: true, outboundEmailId: emailRecord.id };
  } catch (error) {
    console.error('Email sending failed:', error);

    await updateOutboundEmail(emailRecord.id, {
      status: 'failed',
      failureReason: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

export async function sendEmail<T>(options: SendEmailOptions<T>) {
  const { html, text } = await renderTemplate(
    options.template,
    options.templateProps,
  );

  return sendEmailInternal({
    templateName: options.template.name || 'Unknown',
    htmlContent: html,
    textContent: text,
    templateData: options.templateProps,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    sentByUserId: options.sentByUserId,
  });
}

export async function sendPreRenderedEmail(
  options: SendPreRenderedEmailOptions,
) {
  return sendEmailInternal({
    templateName: options.templateName,
    htmlContent: options.htmlContent,
    textContent: options.textContent || '',
    templateData: options.templateData,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    sentByUserId: options.sentByUserId,
  });
}
