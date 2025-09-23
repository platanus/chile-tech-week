import {
  Building,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { eventFormatLabels } from '@/src/lib/schemas/events.schema';
import { getEventById } from '@/src/queries/events';

interface EventStatusPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventStatusPage({
  params,
}: EventStatusPageProps) {
  const { eventId } = await params;
  const eventDetails = await getEventById(eventId);

  if (!eventDetails) {
    notFound();
  }

  // Determine current step based on event state
  const getCurrentStep = () => {
    switch (eventDetails.state) {
      case 'submitted':
        // If event has been submitted but not yet moved to waiting-luma-edit,
        // we can assume it's either pending approval (step 1) or approved (step 2)
        // For now, we'll show it as step 1 until it moves to waiting-luma-edit
        return 1;
      case 'waiting-luma-edit':
        // Event is approved and now in Luma editing phase
        return 3;
      case 'published':
        return 4;
      case 'rejected':
      case 'deleted':
        return 1;
      default:
        return 1;
    }
  };

  const currentStep = getCurrentStep();

  const steps = [
    {
      number: 1,
      title: 'SUBMIT EVENT',
      description: 'Event submitted for review',
      completed: currentStep >= 1,
    },
    {
      number: 2,
      title: 'EVENT APPROVAL',
      description: 'Team reviewing and approving event details',
      completed: currentStep >= 2,
    },
    {
      number: 3,
      title: 'EDIT LUMA & PREPARE',
      description: 'Luma event creation and final preparations',
      completed: currentStep >= 3,
    },
    {
      number: 4,
      title: 'EVENT PUBLISHED',
      description: 'Event live on Chile Tech Week website',
      completed: currentStep >= 4,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      {/* Event Summary */}
      <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
        <CardHeader>
          <CardTitle className="font-black font-mono text-2xl text-black uppercase tracking-wider">
            EVENT DETAILS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Title */}
          <div className="border-4 border-black bg-primary p-4">
            <h2 className="font-black font-mono text-black text-xl uppercase tracking-wider">
              {eventDetails.title}
            </h2>
          </div>

          {/* Event Details Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building className="mt-1 h-5 w-5 text-black" />
                <div>
                  <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                    ORGANIZER
                  </p>
                  <p className="font-mono text-black">
                    {eventDetails.authorName}
                  </p>
                  <p className="font-mono text-gray-600 text-sm">
                    {eventDetails.companyName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-5 w-5 text-black" />
                <div>
                  <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                    DATE & TIME
                  </p>
                  <p className="font-mono text-black">
                    {eventDetails.startDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="font-mono text-gray-600 text-sm">
                    {eventDetails.startDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Santiago',
                    })}{' '}
                    -{' '}
                    {eventDetails.endDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/Santiago',
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-black" />
                <div>
                  <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                    LOCATION
                  </p>
                  <p className="font-mono text-black">{eventDetails.commune}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="mt-1 h-5 w-5 text-black" />
                <div>
                  <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                    FORMAT
                  </p>
                  <p className="font-mono text-black">
                    {eventFormatLabels[eventDetails.format]}
                  </p>
                </div>
              </div>

              {eventDetails.cohosts.length > 0 && (
                <div className="flex items-start gap-3">
                  <Users className="mt-1 h-5 w-5 text-black" />
                  <div>
                    <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                      CO-HOSTS
                    </p>
                    <p className="font-mono text-black">
                      {eventDetails.cohosts.length} companies
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Themes */}
          {eventDetails.themes.length > 0 && (
            <div>
              <p className="mb-3 font-bold font-mono text-black text-sm uppercase tracking-wider">
                THEMES
              </p>
              <div className="flex flex-wrap gap-2">
                {eventDetails.themes.map((theme) => (
                  <div
                    key={theme.id}
                    className="border-2 border-black bg-primary px-3 py-1"
                  >
                    <span className="font-bold font-mono text-black text-xs uppercase tracking-wider">
                      {theme.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Header */}
      <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Clock className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="font-black font-mono text-3xl text-black uppercase tracking-wider">
            EVENT STATUS TRACKER
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="border-4 border-black bg-primary p-6">
            <p className="mb-2 font-bold font-mono text-black text-lg uppercase tracking-wider">
              CURRENT STATUS: STEP {currentStep} OF 4
            </p>
            <p className="font-mono text-black text-sm">
              {steps[currentStep - 1]?.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Process Steps */}
      <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
        <CardHeader>
          <CardTitle className="font-black font-mono text-2xl text-black uppercase tracking-wider">
            PROCESS STEPS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex items-center gap-4 rounded border-4 border-black p-4 ${
                  step.completed
                    ? 'bg-primary'
                    : step.number === currentStep
                      ? 'bg-yellow-200'
                      : 'bg-gray-100'
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="h-6 w-6 text-black" />
                ) : step.number === currentStep ? (
                  <div className="h-6 w-6 rounded-full border-4 border-black bg-yellow-400"></div>
                ) : (
                  <div className="h-6 w-6 rounded-full border-4 border-black bg-white"></div>
                )}
                <div className="flex-1">
                  <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                    {step.number}. {step.title}
                  </p>
                  <p
                    className={`font-mono text-xs ${
                      step.completed
                        ? 'text-black'
                        : step.number === currentStep
                          ? 'text-yellow-800'
                          : 'text-gray-600'
                    }`}
                  >
                    {step.completed
                      ? 'COMPLETED ✓'
                      : step.number === currentStep
                        ? 'IN PROGRESS...'
                        : 'PENDING'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
