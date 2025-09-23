import { getAllEventThemes, getEventCountsByHour } from '@/src/queries/events';
import { CreateEventForm } from './_components/create-event-form';

export default async function CreateEventPage() {
  const [themes, eventCounts] = await Promise.all([
    getAllEventThemes(),
    getEventCountsByHour(
      new Date('2025-11-17'),
      new Date('2025-11-23T23:59:59'),
    ),
  ]);

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="-skew-x-2 transform border-8 border-primary bg-black p-8 shadow-[8px_8px_0px_0px_theme(colors.primary)]">
              <h1 className="font-black font-mono text-5xl text-white uppercase tracking-wider">
                HOST AN EVENT
              </h1>
              <a
                href="/"
                className="mt-2 block font-bold font-mono text-white text-xs uppercase tracking-wider hover:text-primary"
              >
                CHILE TECH WEEK 2025
              </a>
            </div>
            <p className="border-4 border-white bg-white p-6 font-bold font-mono text-black text-lg uppercase tracking-wider">
              Submit your event for Chile Tech Week 2025. All events require
              approval before being published.
            </p>
          </div>

          {/* Form */}
          <CreateEventForm themes={themes} eventCounts={eventCounts} />
        </div>
      </div>
    </div>
  );
}
