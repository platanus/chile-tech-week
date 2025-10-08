'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CommuneSelector } from '@/src/components/commune-selector';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { updateEventAction } from '../_actions/update-event.action';

interface EditEventModalProps {
  eventId: string;
  currentCommune: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEventModal({
  eventId,
  currentCommune,
  open,
  onOpenChange,
}: EditEventModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedCommune, setSelectedCommune] = useState(currentCommune);

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const result = await updateEventAction(eventId, {
          commune: selectedCommune,
        });

        if (result.success) {
          toast.success(result.message);
          onOpenChange(false);
        } else {
          toast.error(result.error);
        }
      } catch (_error) {
        toast.error('An error occurred while updating the event');
      }
    });
  };

  const hasChanges = selectedCommune !== currentCommune;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-4 border-white bg-black shadow-[8px_8px_0px_0px_#ffffff] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-bold font-mono text-2xl text-white uppercase tracking-wide">
            Edit Event
          </DialogTitle>
          <DialogDescription className="font-mono text-white/60">
            Update the event details below. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label
              htmlFor="commune"
              className="font-bold font-mono text-sm text-white uppercase tracking-wide"
            >
              Commune
            </label>
            <CommuneSelector
              value={selectedCommune}
              onChange={setSelectedCommune}
              disabled={isPending}
              variant="admin"
            />
            <p className="font-mono text-white/60 text-xs">
              Current: {currentCommune}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wide hover:bg-white hover:text-black"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !hasChanges}
            className="border-2 border-white bg-primary font-bold font-mono text-white uppercase tracking-wide hover:bg-primary/80"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
