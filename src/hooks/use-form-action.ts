'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  useForm,
} from 'react-hook-form';
import type { ZodType, ZodTypeDef } from 'zod';
import { useNavigateBack } from '@/src/hooks/use-navigate-back';
import type { FormActionState } from '@/src/lib/utils/forms';

/**
 * Simple hook that combines react-hook-form with server actions
 * Provides client-side validation with Zod and server-side error handling
 */
export function useFormAction<TInput extends FieldValues>(config: {
  schema: ZodType<TInput, ZodTypeDef, any>;
  action: (data: TInput) => Promise<FormActionState<TInput>>;
  defaultValues?: DefaultValues<TInput>;
  onSuccess?: (data: TInput) => void;
}) {
  const router = useRouter();
  const navigateBack = useNavigateBack();
  const [isPending, startTransition] = useTransition();
  const [serverState, setServerState] = useState<FormActionState<TInput>>({
    success: true,
  });

  // React Hook Form setup
  const form = useForm<TInput>({
    resolver: zodResolver(config.schema as any),
    defaultValues: config.defaultValues,
  });

  // Custom submit handler that integrates with server action
  const handleSubmit = form.handleSubmit((data: TInput) => {
    startTransition(async () => {
      try {
        // Clear any existing server errors
        form.clearErrors();
        setServerState({ success: true });

        // Call server action directly with validated data
        const result = await config.action(data);

        if (result.success) {
          form.reset(data as DefaultValues<TInput>); // Reset form state to clean submitted values

          if (config.onSuccess) {
            config.onSuccess(data);
            // IMPORTANT: Still handle redirect even when onSuccess is provided
            if (result.redirectTo) {
              router.push(result.redirectTo);
            }
          } else if (result.navigateBack && result.fallbackUrl) {
            // Use navigateBack when server action specifies it
            navigateBack(result.fallbackUrl);
          } else if (result.redirectTo) {
            // Only redirect if onSuccess is not provided
            router.push(result.redirectTo);
          } else {
            // Only update UI state when not redirecting and no onSuccess
            setServerState(result);
          }
        } else {
          // Always update UI state for errors
          setServerState(result);
          // Set server errors on form fields
          if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]) => {
              if (
                messages &&
                messages.length > 0 &&
                field in form.getValues()
              ) {
                form.setError(field as Path<TInput>, {
                  type: 'server',
                  message: messages[0],
                });
              }
            });
          }
        }
      } catch {
        setServerState({
          success: false,
          globalError: 'An unexpected error occurred. Please try again.',
        });
      }
    });
  });

  return {
    form,
    handleSubmit,
    serverState,
    isPending,
    isValid: form.formState.isValid,
    errors: form.formState.errors,
  };
}
