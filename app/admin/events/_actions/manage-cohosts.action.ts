'use server';

import { revalidatePath } from 'next/cache';
import { onlyAdmin } from '@/src/lib/auth/server';
import {
  type AddCohostFormData,
  addCohostFormSchema,
} from '@/src/lib/schemas/events.schema';
import {
  type FormActionState,
  handleCommonError,
  isCommonError,
} from '@/src/lib/utils/forms';
import { createEventCohost, deleteEventCohost } from '@/src/queries/events';

export async function addCohostAction(
  data: AddCohostFormData,
): Promise<FormActionState<AddCohostFormData>> {
  try {
    await onlyAdmin();

    const validatedData = addCohostFormSchema.parse(data);

    await createEventCohost({
      eventId: validatedData.eventId,
      companyName: validatedData.companyName,
      companyLogoUrl: validatedData.companyLogoUrl,
      primaryContactName: validatedData.primaryContactName,
      primaryContactEmail: validatedData.primaryContactEmail,
      primaryContactPhoneNumber:
        validatedData.primaryContactPhoneNumber || null,
      primaryContactWebsite: validatedData.primaryContactWebsite || null,
      primaryContactLinkedin: validatedData.primaryContactLinkedin || null,
    });

    revalidatePath(`/admin/events/${validatedData.eventId}`);
    revalidatePath('/admin/events');

    return {
      success: true,
      data: validatedData,
      message: 'Co-host added successfully!',
    };
  } catch (error) {
    if (isCommonError(error)) {
      return handleCommonError<AddCohostFormData>(error);
    }

    console.error('Add cohost error:', error);
    return {
      success: false,
      globalError:
        error instanceof Error ? error.message : 'Failed to add co-host',
    };
  }
}

export async function removeCohostAction(
  cohostId: string,
  eventId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await onlyAdmin();

    await deleteEventCohost(cohostId);

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath('/admin/events');

    return { success: true };
  } catch (error) {
    console.error('Remove cohost error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to remove co-host',
    };
  }
}
