import { Building, Calendar, CheckCircle, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { eventFormatLabels } from '@/src/lib/schemas/events.schema';
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
                  ✅ Your event has been submitted for review
                </p>
                <p className="font-mono text-black text-sm">
                  📧 Further instructions will be sent via email
                </p>
                <p className="font-mono text-black text-sm">
                  🔍 Our team will review and approve your event within 24-48
                  hours
                </p>
                <p className="font-mono text-black text-sm">
                  🎯 We&apos;ll automatically create a Luma event and add your
                  co-hosts
                </p>
                <p className="font-mono text-black text-sm">
                  🌐 Once approved, your event will appear on the Chile Tech
                  Week website
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Summary */}
        <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
          <CardHeader>
            <CardTitle className="font-black font-mono text-2xl text-black uppercase tracking-wider">
              EVENT SUMMARY
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
                    <p className="font-mono text-black">
                      {eventDetails.commune}
                    </p>
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

        {/* Actions */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            className="hover:-translate-y-1 transform border-4 border-black bg-primary px-8 py-4 font-bold font-mono text-black text-lg uppercase tracking-wider transition-all duration-200 hover:shadow-[8px_8px_0px_0px_theme(colors.black)]"
          >
            <Link href="/events">VIEW ALL EVENTS</Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="hover:-translate-y-1 transform border-4 border-black bg-white px-8 py-4 font-bold font-mono text-black text-lg uppercase tracking-wider transition-all duration-200 hover:shadow-[8px_8px_0px_0px_theme(colors.black)]"
          >
            <Link href="/create">CREATE ANOTHER EVENT</Link>
          </Button>
        </div>
      </div>
    </SuccessClientWrapper>
  );
}
