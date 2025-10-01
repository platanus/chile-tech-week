'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { AuthForm } from '@/src/components/auth-form';
import { SubmitButton } from '@/src/components/submit-button';

export default function Page() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/admin',
    });

    setIsPending(false);

    if (result?.error) {
      setError('Invalid credentials!');
    } else if (result?.ok) {
      window.location.href = result.url || '/admin';
    }
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

            <AuthForm onSubmit={handleSubmit}>
              {error && (
                <p className="text-center font-mono text-red-600 text-sm">
                  {error}
                </p>
              )}
              <SubmitButton isSuccessful={isPending}>
                {isPending ? 'Signing in...' : 'Sign in'}
              </SubmitButton>
            </AuthForm>
          </div>
        </div>
      </div>
    </div>
  );
}
