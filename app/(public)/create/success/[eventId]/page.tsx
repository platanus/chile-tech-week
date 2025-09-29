import { CheckCircle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { EventDetailsCard } from '@/src/components/event-details-card';
import { ProcessStepsCard } from '@/src/components/process-steps-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { getCurrentEventStep } from '@/src/lib/utils/event-steps';
import { getEventById } from '@/src/queries/events';
import SuccessClientWrapper from './success-client-wrapper';

interface CreateSuccessPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function CreateSuccessPage({
  params,
}: CreateSuccessPageProps) {
  const { eventId } = await params;
  const eventDetails = await getEventById(eventId);

  if (!eventDetails) {
    notFound();
  }

  const currentStep = getCurrentEventStep(eventDetails);

  return (
    <SuccessClientWrapper>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Success Header */}
        <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="font-black font-mono text-3xl text-black uppercase tracking-wider">
              🎉 EVENT SUBMITTED SUCCESSFULLY! 🎉
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="border-4 border-black bg-primary p-6">
              <p className="mb-2 font-bold font-mono text-black text-lg uppercase tracking-wider">
                WHAT HAPPENS NEXT?
              </p>
              <div className="space-y-2 text-left">
                <p className="font-mono text-black text-sm">
                  🔍 Our team will check your event. Once approved, we will
                  create your Luma event and invite you to edit it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Steps */}
        <ProcessStepsCard currentStep={currentStep} />

        {/* Event Summary */}
        <EventDetailsCard event={eventDetails} />
      </div>
    </SuccessClientWrapper>
  );
}
