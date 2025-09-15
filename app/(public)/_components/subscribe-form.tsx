'use client';

import { Mail } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/src/components/ui/form';
import { Input } from '@/src/components/ui/input';
import { useFormAction } from '@/src/hooks/use-form-action';
import {
  type SubscribeEmailFormData,
  subscribeEmailFormSchema,
} from '@/src/lib/schemas/landing-sub.schema';
import { subscribeEmailAction } from '../_actions/subscribe.action';

export default function SubscribeForm() {
  const { form, handleSubmit, serverState, isPending } =
    useFormAction<SubscribeEmailFormData>({
      schema: subscribeEmailFormSchema,
      action: subscribeEmailAction,
      defaultValues: {
        email: '',
      },
    });

  // Show toast messages
  useEffect(() => {
    if (serverState.success && serverState.message) {
      toast.success(serverState.message);
      form.reset(); // Clear the form on success
    } else if (serverState.globalError) {
      toast.error(serverState.globalError);
    }
  }, [serverState, form]);

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-xs">
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <div className="-translate-y-1/2 absolute top-1/2 left-3 transform">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      type="email"
                      placeholder="get notified"
                      className="pl-10 text-center"
                      disabled={isPending}
                      onKeyDown={handleKeyDown}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-center text-xs" />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
