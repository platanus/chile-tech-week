'use client';

import { Building, Calendar, CheckCircle, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';

interface EventDetails {
  id: string;
  title: string;
  authorName: string;
  authorCompanyName: string;
  authorEmail: string;
  startDate: string;
  endDate: string;
  commune: string;
  format: string;
  themes: string[];
  cohostsCount: number;
}

export default function CreateSuccessPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // Set up window dimensions for confetti
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    // In a real implementation, you would fetch event details by ID
    // For now, we'll use mock data or extract from URL params
    if (eventId) {
      // Mock event details - in real implementation, fetch from API
      setEventDetails({
        id: eventId,
        title: 'AI Innovation Summit',
        authorName: 'John Doe',
        authorCompanyName: 'Tech Innovations Inc.',
        authorEmail: 'john@techinnovations.com',
        startDate: '2025-11-18T09:00:00Z',
        endDate: '2025-11-18T17:00:00Z',
        commune: 'Las Condes',
        format: 'CONFERENCE',
        themes: ['AI & Machine Learning', 'Startup Ecosystem'],
        cohostsCount: 2,
      });
    }
  }, [eventId]);

  if (!eventId) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="mx-auto max-w-2xl border-4 border-red-500 bg-white shadow-[8px_8px_0px_0px_theme(colors.red.500)]">
          <CardContent className="p-8 text-center">
            <h1 className="mb-4 font-black font-mono text-2xl text-red-600 uppercase tracking-wider">
              ERROR: NO EVENT ID
            </h1>
            <p className="mb-6 font-mono text-red-600">
              Unable to find the event information. Please try again.
            </p>
            <Button
              asChild
              className="border-4 border-black bg-primary hover:bg-primary/90"
            >
              <Link href="/create">CREATE NEW EVENT</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {showConfetti && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
        />
      )}

      <div className="mx-auto max-w-4xl space-y-8">
        {/* Success Header */}
        <Card className="border-4 border-green-500 bg-white shadow-[8px_8px_0px_0px_theme(colors.green.500)]">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="font-black font-mono text-3xl text-green-600 uppercase tracking-wider">
              🎉 EVENT SUBMITTED SUCCESSFULLY! 🎉
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="border-4 border-green-500 bg-green-50 p-6">
              <p className="mb-2 font-bold font-mono text-green-800 text-lg uppercase tracking-wider">
                WHAT HAPPENS NEXT?
              </p>
              <div className="space-y-2 text-left">
                <p className="font-mono text-green-700 text-sm">
                  ✅ Your event has been submitted for review
                </p>
                <p className="font-mono text-green-700 text-sm">
                  📧 A confirmation email will be sent to{' '}
                  {eventDetails?.authorEmail || 'your email'}
                </p>
                <p className="font-mono text-green-700 text-sm">
                  🔍 Our team will review and approve your event within 24-48
                  hours
                </p>
                <p className="font-mono text-green-700 text-sm">
                  🎯 We&apos;ll automatically create a Luma event and add your
                  co-hosts
                </p>
                <p className="font-mono text-green-700 text-sm">
                  🌐 Once approved, your event will appear on the Chile Tech
                  Week website
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Summary */}
        {eventDetails && (
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
                        {eventDetails.authorCompanyName}
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
                        {new Date(eventDetails.startDate).toLocaleDateString(
                          'en-US',
                          {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          },
                        )}
                      </p>
                      <p className="font-mono text-gray-600 text-sm">
                        {new Date(eventDetails.startDate).toLocaleTimeString(
                          'en-US',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Santiago',
                          },
                        )}{' '}
                        -{' '}
                        {new Date(eventDetails.endDate).toLocaleTimeString(
                          'en-US',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Santiago',
                          },
                        )}
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

                  {eventDetails.cohostsCount > 0 && (
                    <div className="flex items-start gap-3">
                      <Users className="mt-1 h-5 w-5 text-black" />
                      <div>
                        <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                          CO-HOSTS
                        </p>
                        <p className="font-mono text-black">
                          {eventDetails.cohostsCount} companies
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
                    {eventDetails.themes.map((theme, _index) => (
                      <div
                        key={theme}
                        className="border-2 border-black bg-primary px-3 py-1"
                      >
                        <span className="font-bold font-mono text-black text-xs uppercase tracking-wider">
                          {theme}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

        {/* Contact Info */}
        <Card className="border-4 border-blue-500 bg-blue-50 shadow-[8px_8px_0px_0px_theme(colors.blue.500)]">
          <CardContent className="p-6 text-center">
            <p className="mb-2 font-bold font-mono text-blue-800 text-sm uppercase tracking-wider">
              QUESTIONS OR NEED HELP?
            </p>
            <p className="font-mono text-blue-700 text-sm">
              Contact us at{' '}
              <a
                href="mailto:hello@chiletechweek.com"
                className="underline hover:no-underline"
              >
                hello@chiletechweek.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
