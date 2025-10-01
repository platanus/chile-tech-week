'use client';

import { useRouter } from 'next/navigation';
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
import { eventFormatLabels } from '@/src/lib/schemas/events.schema';
import type { EventWithDetails } from '@/src/queries/events';
import { publishEventAction } from '../_actions/publish-event.action';

interface PublishEventModalProps {
  event: EventWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishEventModal({
  event,
  open,
  onOpenChange,
}: PublishEventModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const router = useRouter();

  const handleNext = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const result = await publishEventAction(event.id);
      if (result.success) {
        onOpenChange(false);
        router.refresh();
      } else {
        alert(`Failed to publish event: ${result.error}`);
      }
    } catch (error) {
      alert('An error occurred while publishing the event');
      console.error(error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-black font-mono text-2xl text-black uppercase tracking-wider">
                ⚠️ BEFORE PUBLISHING
              </DialogTitle>
              <DialogDescription className="font-mono text-base text-black">
                Please confirm you have completed all these steps in Luma:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 border-4 border-black bg-gray-50 p-6">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 shrink-0 rounded-sm border-2 border-black bg-white"></div>
                <p className="font-mono text-black">
                  <strong>Verify event time and date</strong> - Double check the
                  start and end times are correct
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 shrink-0 rounded-sm border-2 border-black bg-white"></div>
                <p className="font-mono text-black">
                  <strong>Add event images</strong> - Upload attractive cover
                  and promotional images
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 shrink-0 rounded-sm border-2 border-black bg-white"></div>
                <p className="font-mono text-black">
                  <strong>Confirm event location details</strong> - Ensure the
                  venue and address are accurate
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 shrink-0 rounded-sm border-2 border-black bg-white"></div>
                <p className="font-mono text-black">
                  <strong>Update event descriptions</strong> - Add complete
                  details in both English and Spanish
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 shrink-0 rounded-sm border-2 border-black bg-white"></div>
                <p className="font-mono text-black">
                  <strong>
                    <a
                      href="https://luma.com/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-primary"
                    >
                      Edit your Luma profile
                    </a>
                  </strong>{' '}
                  - Update with company name and logo
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-2 border-black font-bold font-mono uppercase"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                className="border-2 border-black bg-primary font-bold font-mono uppercase hover:bg-primary/90"
              >
                Next →
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-black font-mono text-2xl text-black uppercase tracking-wider">
                🚀 READY TO PUBLISH
              </DialogTitle>
              <DialogDescription className="font-mono text-base text-black">
                Review your event details before publishing
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 border-4 border-black bg-gray-50 p-6">
              <div>
                <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                  Event Title
                </p>
                <p className="font-mono text-black">{event.title}</p>
              </div>

              <div>
                <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                  Organizer
                </p>
                <p className="font-mono text-black">
                  {event.authorName} - {event.companyName}
                </p>
              </div>

              <div>
                <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                  Date & Time
                </p>
                <p className="font-mono text-black">
                  {event.startDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="font-mono text-gray-600 text-sm">
                  {event.startDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Santiago',
                  })}{' '}
                  -{' '}
                  {event.endDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Santiago',
                  })}
                </p>
              </div>

              <div>
                <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                  Location
                </p>
                <p className="font-mono text-black">{event.commune}</p>
              </div>

              <div>
                <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                  Format
                </p>
                <p className="font-mono text-black">
                  {eventFormatLabels[event.format]}
                </p>
              </div>

              {event.lumaEventUrl && (
                <div>
                  <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                    Luma Event
                  </p>
                  <a
                    href={event.lumaEventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-primary underline hover:text-primary/80"
                  >
                    {event.lumaEventUrl}
                  </a>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isPublishing}
                className="border-2 border-black font-bold font-mono uppercase"
              >
                ← Back
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing}
                className="border-2 border-black bg-primary font-bold font-mono uppercase hover:bg-primary/90"
              >
                {isPublishing ? 'Publishing...' : '🚀 Publish Event'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
