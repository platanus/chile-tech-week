import { getAllEvents } from '@/src/queries/events';
import { EventsClient } from './_components/events-client';

export default async function EventsPage() {
  const events = await getAllEvents();

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <EventsClient events={events} />
      </div>
    </div>
  );
}
