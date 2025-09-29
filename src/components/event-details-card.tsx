import { Building, Calendar, MapPin, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { eventFormatLabels } from '@/src/lib/schemas/events.schema';
import type { EventWithDetails } from '@/src/queries/events';

interface EventDetailsCardProps {
  event: EventWithDetails;
}

export function EventDetailsCard({ event }: EventDetailsCardProps) {
  return (
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
            {event.title}
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
                <p className="font-mono text-black">{event.authorName}</p>
                <p className="font-mono text-gray-600 text-sm">
                  {event.companyName}
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
                  {event.startDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="font-mono text-gray-600 text-sm">
                  {event.startDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Santiago',
                  })}{' '}
                  -{' '}
                  {event.endDate.toLocaleTimeString('en-US', {
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
                <p className="font-mono text-black">{event.commune}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building className="mt-1 h-5 w-5 text-black" />
              <div>
                <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                  FORMAT
                </p>
                <p className="font-mono text-black">
                  {eventFormatLabels[event.format]}
                </p>
              </div>
            </div>

            {event.cohosts.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="mt-1 h-5 w-5 text-black" />
                <div>
                  <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                    CO-HOSTS
                  </p>
                  <div className="space-y-1">
                    {event.cohosts.map((cohost) => (
                      <p
                        key={cohost.id}
                        className="font-mono text-black text-sm"
                      >
                        • {cohost.companyName}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Themes */}
        {event.themes.length > 0 && (
          <div>
            <p className="mb-3 font-bold font-mono text-black text-sm uppercase tracking-wider">
              THEMES
            </p>
            <div className="flex flex-wrap gap-2">
              {event.themes.map((theme) => (
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

        {/* Target Audiences */}
        {event.audiences.length > 0 && (
          <div>
            <p className="mb-3 font-bold font-mono text-black text-sm uppercase tracking-wider">
              TARGET AUDIENCES
            </p>
            <div className="flex flex-wrap gap-2">
              {event.audiences.map((audience) => (
                <div
                  key={audience.id}
                  className="border-2 border-black bg-white px-3 py-1"
                >
                  <span className="font-bold font-mono text-black text-xs uppercase tracking-wider">
                    {audience.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
