import Form from 'next/form';

import { Input } from './ui/input';
import { Label } from './ui/label';

export function AuthForm({
  action,
  onSubmit,
  children,
  defaultEmail = '',
}: {
  action?: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  const formContent = (
    <>
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="font-normal text-zinc-600 dark:text-zinc-400"
        >
          Email Address
        </Label>

        <Input
          id="email"
          name="email"
          className="bg-muted text-md md:text-sm"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          autoFocus
          defaultValue={defaultEmail}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="font-normal text-zinc-600 dark:text-zinc-400"
        >
          Password
        </Label>

        <Input
          id="password"
          name="password"
          className="bg-muted text-md md:text-sm"
          type="password"
          required
        />
      </div>

      {children}
    </>
  );

  if (onSubmit) {
    return (
      <form onSubmit={onSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
        {formContent}
      </form>
    );
  }

  if (!action) {
    throw new Error('AuthForm requires either action or onSubmit prop');
  }

  return (
    <Form action={action} className="flex flex-col gap-4 px-4 sm:px-16">
      {formContent}
    </Form>
  );
}
