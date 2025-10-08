'use client';

import { Edit } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { EditEventModal } from './edit-event-modal';

interface EditEventButtonProps {
  eventId: string;
  currentCommune: string;
}

export function EditEventButton({
  eventId,
  currentCommune,
}: EditEventButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        size="sm"
        className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wide hover:bg-white hover:text-black"
      >
        <Edit className="mr-2 h-4 w-4" />
        Edit Event
      </Button>

      <EditEventModal
        eventId={eventId}
        currentCommune={currentCommune}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
