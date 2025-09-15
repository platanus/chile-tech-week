import { z } from 'zod';

// Form action state type
export type FormActionState<T = Record<string, any>> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Partial<Record<keyof T, string[]>>;
  globalError?: string;
  redirectTo?: string;
  navigateBack?: boolean;
  fallbackUrl?: string;
};

/**
 * Lightweight helper to handle Zod validation errors
 */
export function handleZodError<T>(error: z.ZodError): FormActionState<T> {
  const errors: Partial<Record<keyof T, string[]>> = {};

  error.errors.forEach((err) => {
    const field = err.path[0] as keyof T;
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field]?.push(err.message);
  });

  return {
    success: false,
    errors,
    globalError: 'Please fix the validation errors above',
  };
}

/**
 * Extracts field name from PostgreSQL constraint name
 */
function extractFieldFromConstraint(
  constraintName: string,
  suffix: string,
): string | null {
  const pattern = new RegExp(`^.+?_(.+?)_${suffix}$`);
  const match = constraintName.match(pattern);
  return match?.[1] ?? null;
}

/**
 * Extracts constraint name from PostgreSQL error message
 */
function extractConstraintName(errorMessage: string): string | null {
  const match = errorMessage.match(/constraint "(.+?)"/);
  return match?.[1] ?? null;
}

/**
 * Creates a field-specific error response
 */
function createFieldError<T>(
  fieldName: string,
  message: string,
): FormActionState<T> {
  return {
    success: false,
    errors: {
      [fieldName]: [message],
    } as Partial<Record<keyof T, string[]>>,
  };
}

/**
 * Checks if an error is a database constraint error that can be handled
 */
export function isDbConstraintError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;

  // Check for PostgreSQL error codes (if using postgres library)
  if ('code' in error) {
    const pgError = error as Error & { code: string };
    return ['23505', '23503', '23502', '23514'].includes(pgError.code);
  }

  // Fallback to message checking for other drivers
  const message = error.message;
  return (
    message.includes('duplicate key') ||
    message.includes('foreign key') ||
    message.includes('not null') ||
    message.includes('check constraint')
  );
}

/**
 * Maps PostgreSQL error codes and message patterns to constraint types
 */
const constraintPatterns = [
  {
    code: '23505',
    messagePattern: 'duplicate key',
    suffix: 'key',
    message: 'This value is already taken. Please choose a different one.',
  },
  {
    code: '23503',
    messagePattern: 'foreign key',
    suffix: 'fkey',
    message: 'Referenced record does not exist.',
  },
  {
    code: '23502',
    messagePattern: 'not null',
    suffix: null, // Special case - extract from column name
    message: 'This field is required.',
  },
] as const;

/**
 * Lightweight helper to handle database constraint errors
 * Automatically extracts field names from constraint names
 */
export function handleDbError<T>(error: Error): FormActionState<T> {
  const errorMessage = error.message;
  const constraintName = extractConstraintName(errorMessage);
  const pgError = error as Error & { code?: string };

  // Try to match by error code first, then by message pattern
  for (const pattern of constraintPatterns) {
    const isMatch =
      pgError.code === pattern.code ||
      errorMessage.includes(pattern.messagePattern);

    if (isMatch) {
      // Special handling for not null violations
      if (pattern.suffix === null) {
        const columnMatch = errorMessage.match(/column "(.+?)"/);
        const columnName = columnMatch?.[1];
        if (columnName) {
          return createFieldError<T>(columnName, pattern.message);
        }
      } else {
        // Handle constraint-based violations
        if (constraintName) {
          const fieldName = extractFieldFromConstraint(
            constraintName,
            pattern.suffix,
          );
          if (fieldName) {
            return createFieldError<T>(fieldName, pattern.message);
          }
        }
      }

      // Fallback to global error for this constraint type
      return {
        success: false,
        globalError: pattern.message,
      };
    }
  }

  return {
    success: false,
    globalError: 'A database constraint was violated.',
  };
}

/**
 * Checks if an error is a common error type that can be handled automatically
 */
export function isCommonError(error: unknown): error is Error | z.ZodError {
  return error instanceof z.ZodError || isDbConstraintError(error);
}

/**
 * Handles common error types (Zod validation + database constraints)
 */
export function handleCommonError<T>(
  error: Error | z.ZodError,
): FormActionState<T> {
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return handleZodError<T>(error);
  }

  // Handle database constraint errors (we know it's a constraint error from isCommonError)
  return handleDbError<T>(error);
}
