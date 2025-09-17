'use server';

import { revalidatePath } from 'next/cache';
import { onlyAdmin } from '@/src/lib/auth/server';
import { sendPreRenderedEmail } from '@/src/lib/email';
import { getOutboundEmail } from '@/src/queries/emails';

export async function resendEmailAction(emailId: string) {
  try {
    const sessionUser = await onlyAdmin();

    const originalEmail = await getOutboundEmail(emailId);
    if (!originalEmail) {
      return { success: false, error: 'Email record not found' };
    }

    await sendPreRenderedEmail({
      templateName: originalEmail.templateName,
      htmlContent: originalEmail.htmlContent,
      textContent: originalEmail.textContent || '',
      templateData: originalEmail.templateData,
      to: originalEmail.to,
      cc: originalEmail.cc || undefined,
      bcc: originalEmail.bcc || undefined,
      subject: originalEmail.subject,
      sentByUserId: sessionUser.id,
    });

    revalidatePath('/emails');
    revalidatePath(`/emails/${emailId}`);

    return { success: true, message: 'Email resent successfully!' };
  } catch (error) {
    console.error('Resend email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend email',
    };
  }
}
