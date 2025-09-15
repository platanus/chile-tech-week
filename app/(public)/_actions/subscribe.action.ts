'use server';

import { revalidatePath } from 'next/cache';
import {
  type SubscribeEmailFormData,
  subscribeEmailFormSchema,
} from '@/src/lib/schemas/landing-sub.schema';
import {
  type FormActionState,
  handleCommonError,
  isCommonError,
} from '@/src/lib/utils/forms';
import {
  createLandingSub,
  findLandingSubByEmail,
} from '@/src/queries/landing-sub';
import { slackService } from '@/src/services/slack';

export async function subscribeEmailAction(
  data: SubscribeEmailFormData,
): Promise<FormActionState<SubscribeEmailFormData>> {
  try {
    // Validate data
    const validatedData = subscribeEmailFormSchema.parse(data);
    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // Check if email already exists
    const existingSubscription = await findLandingSubByEmail(normalizedEmail);

    if (existingSubscription) {
      return {
        success: false,
        globalError: '📧 This email is already subscribed!',
      };
    }

    // Insert email into database
    await createLandingSub({
      email: normalizedEmail,
    });

    // Send Slack notification (don't await to avoid blocking the response)
    const notificationMessage = `New subscription: ${normalizedEmail}`;
    slackService.sendMessage(notificationMessage).catch(console.error);

    // Revalidate the page
    revalidatePath('/');

    return {
      success: true,
      data: validatedData,
      message: 'you have been subscribed!',
    };
  } catch (error) {
    // Handle common error types (Zod validation + database constraints)
    if (isCommonError(error)) {
      return handleCommonError<SubscribeEmailFormData>(error);
    }

    // Handle other error types
    console.error('Subscribe email error:', error);
    return {
      success: false,
      globalError: 'Something went wrong. Please try again.',
    };
  }
}
