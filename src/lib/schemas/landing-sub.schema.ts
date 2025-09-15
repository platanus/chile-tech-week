import { z } from 'zod';
import type { landingSub } from '@/src/lib/db/schema';
import type { FormDataFor } from '@/src/lib/types';

export const subscribeEmailFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
}) satisfies z.ZodSchema<FormDataFor<typeof landingSub>>;

export type SubscribeEmailFormData = z.infer<typeof subscribeEmailFormSchema>;
