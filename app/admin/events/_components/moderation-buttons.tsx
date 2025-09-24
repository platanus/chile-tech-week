'use client';

import { Check, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { approveEventAction } from '../_actions/approve.action';
import { rejectEventAction } from '../_actions/reject.action';

interface ModerationButtonsProps {
  eventId: string;
  eventState: string;
}

export function ModerationButtons({
  eventId,
  eventState,
}: ModerationButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  if (eventState !== 'submitted') {
    return null;
  }

  const handleEventAction = (action: 'approve' | 'reject') => {
    setPendingAction(action);

    startTransition(async () => {
      try {
        const result =
          action === 'approve'
            ? await approveEventAction(eventId)
            : await rejectEventAction(eventId);

        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.error);
        }
      } catch (_error) {
        toast.error('An error occurred');
      } finally {
        setPendingAction(null);
      }
    });
  };

  const isPendingApprove = pendingAction === 'approve';
  const isPendingReject = pendingAction === 'reject';

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => handleEventAction('approve')}
        disabled={isPending}
        className="border border-white bg-green-600 px-4 py-2 font-bold font-mono text-white hover:bg-green-700"
        size="sm"
      >
        <Check className="mr-2 h-4 w-4" />
        {isPendingApprove ? 'Approving...' : 'Approve'}
      </Button>
      <Button
        onClick={() => handleEventAction('reject')}
        disabled={isPending}
        className="border border-white bg-red-600 px-4 py-2 font-bold font-mono text-white hover:bg-red-700"
        size="sm"
      >
        <X className="mr-2 h-4 w-4" />
        {isPendingReject ? 'Rejecting...' : 'Reject'}
      </Button>
    </div>
  );
}
