'use server';

import { z } from 'zod';

import { createUser, getUser } from '@/src/queries/users';

import { signIn } from './auth';

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      role: 'hacker' as const,
    };
    const [existingUser] = await getUser(data.email as string);
    if (existingUser) {
      return { status: 'user_exists' };
    }

    await createUser(data);
    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }
    return { status: 'failed' };
  }
};
