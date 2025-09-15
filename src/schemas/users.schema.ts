import { z } from 'zod';
import type { UserRole, user } from '@/src/lib/db/schema';
import { userRoles } from '@/src/lib/db/schema';
import type { FormDataFor } from '@/src/lib/types';

// Core user schema - matches database structure
export const userSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(255, 'First name is too long'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(255, 'Last name is too long'),
  role: z
    .enum(userRoles, {
      required_error: 'Please select a user role',
    })
    .refine((val): val is UserRole => userRoles.includes(val as UserRole)),
  encryptedPassword: z.string().optional(),
}) satisfies z.ZodSchema<FormDataFor<typeof user>>;

// Form schema for creating users - includes password
export const createUserFormSchema = userSchema
  .omit({ encryptedPassword: true })
  .extend({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(255, 'Password is too long'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Server input schema for creating users
export const createUserServerInputSchema = userSchema
  .omit({ encryptedPassword: true })
  .extend({
    password: z.string().min(8, 'Password must be at least 8 characters'),
  });

// Form schema for updating users - excludes password fields and id
export const updateUserFormSchema = userSchema
  .omit({ encryptedPassword: true })
  .partial();

// Server input schema for updating users - includes id for validation
export const updateUserServerInputSchema = updateUserFormSchema.extend({
  id: z.string().uuid('Invalid user ID'),
});

// Types
export type CreateUserFormData = z.infer<typeof createUserFormSchema>;
export type CreateUserServerInputData = z.infer<
  typeof createUserServerInputSchema
>;
export type UpdateUserFormData = z.infer<typeof updateUserFormSchema>;
export type UpdateUserServerInputData = z.infer<
  typeof updateUserServerInputSchema
>;
export type UserData = z.infer<typeof userSchema>;
export type UpdateUserServerData = Omit<UpdateUserServerInputData, 'id'>;
