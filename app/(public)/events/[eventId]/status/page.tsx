import { notFound } from 'next/navigation';
import { EventDetailsCard } from '@/src/components/event-details-card';
import { ProcessStepsCard } from '@/src/components/process-steps-card';
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

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      {/* Event Summary */}
      <EventDetailsCard event={eventDetails} />

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
                  🔍 We are checking your event. Once approved, we will create
                  your Luma event and invite you to edit it.
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
                <p className="font-mono text-black text-sm">
                  🌐 Congratulations! Your event is now live on the Chile Tech
                  Week website.
                </p>
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
    </div>
  );
}
