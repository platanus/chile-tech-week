'use client';

import { RotateCcw } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from '@/src/components/toast';
import { Button } from '@/src/components/ui/button';
import { resendEmailAction } from './resend-email.action';

interface ResendEmailButtonProps {
  emailId: string;
}

export function ResendEmailButton({ emailId }: ResendEmailButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleResendEmail = () => {
    startTransition(async () => {
      try {
        const result = await resendEmailAction(emailId);

        if (result.success) {
          toast({
            type: 'success',
            description: result.message || 'Email resent successfully!',
          });
        } else {
          toast({
            type: 'error',
            description: result.error || 'Failed to resend email',
          });
        }
      } catch (_error) {
        toast({
          type: 'error',
          description: 'An unexpected error occurred while resending the email',
        });
      }
    });
  };

  return (
    <Button
      onClick={handleResendEmail}
      disabled={isPending}
      variant="outline"
      size="sm"
      className="border-2 border-white bg-black font-bold font-mono text-white text-xs uppercase tracking-wide hover:bg-white hover:text-black disabled:bg-black/50"
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      {isPending ? 'Resending...' : 'Resend Email'}
    </Button>
  );
}
