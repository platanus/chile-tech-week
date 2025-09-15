import type { InferInsertModel, Table } from 'drizzle-orm';

export type ActionState = {
  success: boolean;
  error?: Record<string, string[]>;
  message?: string;
  exception?: Error | null;
};

// Generic type to create field-specific errors from form data type
export type FieldErrors<T> = {
  [K in keyof T]: string[] | null;
};

export type ActionStateWithData<T> = {
  success: boolean;
  message?: string;
  formData: T | null;
  error?: FieldErrors<T>;
  exception?: Error | null;
};

// Type helper to ensure form data satisfies database insert requirements
export type FormDataFor<TTable extends Table> = Partial<
  InferInsertModel<TTable>
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
