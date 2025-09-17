'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useActionState, useEffect, useState } from 'react';

import { AuthForm } from '@/src/components/auth-form';
import { SubmitButton } from '@/src/components/submit-button';
import { toast } from '@/src/components/toast';
import { type LoginActionState, login } from '../actions';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === 'failed') {
      toast({
        type: 'error',
        description: 'Invalid credentials!',
      });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Failed validating your submission!',
      });
    } else if (state.status === 'success') {
      setIsSuccessful(true);
      updateSession();
      router.push('/admin');
    }
  }, [state.status, router, updateSession]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-black p-6">
      <div className="w-full max-w-md">
        <div className="space-y-8">
          {/* Header */}
          <div className="-skew-x-2 transform border-8 border-primary bg-black p-8 shadow-[8px_8px_0px_0px_theme(colors.primary)]">
            <h1 className="text-center font-black font-mono text-4xl text-white uppercase tracking-wider">
              SIGN IN
            </h1>
            <div className="mt-2 border-2 border-white bg-white p-2">
              <Link
                href="/"
                className="block text-center font-bold font-mono text-black text-xs uppercase tracking-wider hover:text-gray-700"
              >
                CHILE TECH WEEK 2025
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_theme(colors.black)]">
            <p className="mb-6 text-center font-bold font-mono text-black text-sm uppercase tracking-wider">
              USE YOUR EMAIL AND PASSWORD TO SIGN IN
            </p>

            <AuthForm action={handleSubmit} defaultEmail={email}>
              <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
            </AuthForm>
          </div>
        </div>
      </div>
    </div>
  );
}
