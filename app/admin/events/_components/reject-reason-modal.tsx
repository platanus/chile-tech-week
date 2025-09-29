'use client';

import { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';

interface RejectReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

export function RejectReasonModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_#000000] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-bold font-mono text-2xl uppercase tracking-wide">
            REJECT EVENT
          </DialogTitle>
          <DialogDescription className="font-mono text-black/70">
            Please provide a reason for rejecting this event. The organizer will
            receive this message via email.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label
              htmlFor="reason"
              className="font-bold font-mono uppercase tracking-wide"
            >
              Rejection Reason
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g., Event does not meet our guidelines..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px] resize-none border-2 border-black font-mono focus:shadow-[4px_4px_0px_0px_#000000]"
              disabled={isPending}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason('');
            }}
            disabled={isPending}
            className="border-2 border-black font-bold font-mono uppercase"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !reason.trim()}
            className="border-2 border-white bg-red-600 font-bold font-mono text-white uppercase hover:bg-red-700"
          >
            {isPending ? 'Rejecting...' : 'Reject Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
