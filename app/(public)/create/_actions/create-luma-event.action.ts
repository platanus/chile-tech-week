'use server';

import {
  type CreateEventFormData,
  createEventFormSchema,
} from '@/src/lib/schemas/events.schema';
import {
  type FormActionState,
  handleCommonError,
  isCommonError,
} from '@/src/lib/utils/forms';
import { lumaService } from '@/src/services/luma';

export async function createLumaEventAction(data: CreateEventFormData): Promise<
  FormActionState<CreateEventFormData> & {
    lumaEventUrl?: string;
    lumaEventApiId?: string;
  }
> {
  try {
    // Validate data
    const validatedData = createEventFormSchema.parse(data);

    // Create event on Luma
    const lumaResult = await lumaService.createEventFromFormData(validatedData);

    if (!lumaResult.success) {
      return {
        success: false,
        globalError: `Failed to create Luma event: ${lumaResult.error}`,
      };
    }

    // Return success with Luma event details
    return {
      success: true,
      data: validatedData,
      message: 'Luma event created successfully!',
      lumaEventUrl: lumaResult.eventUrl,
      lumaEventApiId: lumaResult.eventApiId,
    };
  } catch (error) {
    // Handle common error types (Zod validation)
    if (isCommonError(error)) {
      return handleCommonError<CreateEventFormData>(error);
    }

    // Handle other error types
    console.error('Create Luma event error:', error);
    return {
      success: false,
      globalError:
        error instanceof Error
          ? error.message
          : 'Failed to create Luma event. Please try again.',
    };
  }
}
