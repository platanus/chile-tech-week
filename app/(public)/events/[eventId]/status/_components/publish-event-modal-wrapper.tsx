'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import type { EventWithDetails } from '@/src/queries/events';
import { PublishEventModal } from './publish-event-modal';

interface PublishEventModalWrapperProps {
  event: EventWithDetails;
  openInitially?: boolean;
}

export function PublishEventModalWrapper({
  event,
  openInitially = false,
}: PublishEventModalWrapperProps) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (openInitially) {
      setModalOpen(true);
    }
  }, [openInitially]);

  return (
    <>
      <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <p className="font-bold font-mono text-black text-lg uppercase tracking-wider">
              🚀 Ready to Publish?
            </p>
            <p className="font-mono text-gray-600">
              Once you've completed editing your Luma event, click the button
              below to publish it on the Chile Tech Week website.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              className="border-2 border-black bg-primary font-bold font-mono text-lg uppercase hover:bg-primary/90"
              size="lg"
            >
              Publish Event
            </Button>
          </div>
        </CardContent>
      </Card>

      <PublishEventModal
        event={event}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
