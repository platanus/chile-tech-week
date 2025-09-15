import Form from 'next/form';

import { Input } from './ui/input';
import { Label } from './ui/label';

export function RegisterForm({
  action,
  children,
  defaultEmail = '',
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  return (
    <Form action={action} className="flex flex-col gap-4 px-4 sm:px-16">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="firstName"
          className="font-normal text-zinc-600 dark:text-zinc-400"
        >
          First Name
        </Label>
        <Input
          id="firstName"
          name="firstName"
          className="bg-muted text-md md:text-sm"
          type="text"
          placeholder="John"
          autoComplete="given-name"
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="lastName"
          className="font-normal text-zinc-600 dark:text-zinc-400"
        >
          Last Name
        </Label>
        <Input
          id="lastName"
          name="lastName"
          className="bg-muted text-md md:text-sm"
          type="text"
          placeholder="Doe"
          autoComplete="family-name"
          required
        />
      </div>

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
    </Form>
  );
}
