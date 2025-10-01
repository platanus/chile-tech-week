import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventDetailsCard } from '@/src/components/event-details-card';
import { ProcessStepsCard } from '@/src/components/process-steps-card';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { getCurrentEventStep } from '@/src/lib/utils/event-steps';
import { getEventById } from '@/src/queries/events';
import { PublishEventModalWrapper } from './_components/publish-event-modal-wrapper';

interface EventStatusPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ publish?: string }>;
}

export default async function EventStatusPage({
  params,
  searchParams,
}: EventStatusPageProps) {
  const { eventId } = await params;
  const { publish } = await searchParams;
  const eventDetails = await getEventById(eventId);

  if (!eventDetails) {
    notFound();
  }

  const currentStep = getCurrentEventStep(eventDetails);
  const shouldOpenModal = publish === 'true' && currentStep === 3;
  const isDeleted = eventDetails.state === 'deleted';

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      {/* Event Summary */}
      <EventDetailsCard event={eventDetails} />

      {isDeleted ? (
        <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
          <CardContent className="space-y-6 p-6 text-center">
            <div className="border-4 border-black bg-red-100 p-6">
              <p className="mb-4 font-bold font-mono text-black text-lg uppercase tracking-wider">
                EVENT DELETED
              </p>
              <div className="space-y-4 text-left">
                <p className="font-mono text-black text-sm">
                  🗑️ This event has been deleted and is no longer active.
                </p>
                <p className="font-mono text-black text-sm">
                  You can submit a new event to participate in Chile Tech Week.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <Button asChild size="lg" className="font-bold uppercase">
                <Link href="/create">Upload New Event</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Current Status */}
          <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="border-4 border-black bg-primary p-6">
                <p className="mb-2 font-bold font-mono text-black text-lg uppercase tracking-wider">
                  CURRENT STATUS: STEP {currentStep} OF 4
                </p>
                <div className="space-y-2 text-left">
                  {currentStep === 1 && (
                    <p className="font-mono text-black text-sm">
                      🔍 We are checking your event. Once approved, we will
                      create your Luma event and invite you to edit it.
                    </p>
                  )}
                  {currentStep === 2 && (
                    <p className="font-mono text-black text-sm">
                      ✅ Your event has been approved! We are now preparing your
                      Luma event.
                    </p>
                  )}
                  {currentStep === 3 && (
                    <p className="font-mono text-black text-sm">
                      🎯 Your Luma event is ready for editing. Please check your
                      email for further instructions.
                    </p>
                  )}
                  {currentStep === 4 && (
                    <>
                      <p className="font-mono text-black text-sm">
                        🌐 Congratulations! Your event is now live on the Chile
                        Tech Week website.
                      </p>
                      <p className="mt-4 font-mono text-black text-sm">
                        🔄 Any changes you make to your Luma event (title, date,
                        time) will be automatically synced to the Tech Week
                        page.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Steps */}
          <ProcessStepsCard currentStep={currentStep} />

          {/* Publish Modal Wrapper */}
          {currentStep === 3 && (
            <PublishEventModalWrapper
              event={eventDetails}
              openInitially={shouldOpenModal}
            />
          )}
        </>
      )}
    </div>
  );
}
