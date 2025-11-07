import {
  Building,
  Calendar,
  ChevronLeft,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/src/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { getEventById } from '@/src/queries/events';
import { CohostManager } from '../_components/cohost-manager';
import { CustomUrlEdit } from '../_components/custom-url-edit';
import { EditEventButton } from '../_components/edit-event-button';
import { LogoEditButton } from '../_components/logo-edit-button';
import { LogoVisibilityToggle } from '../_components/logo-visibility-toggle';
import { ModerationButtons } from '../_components/moderation-buttons';

interface AdminEventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEventDetailPage({
  params,
}: AdminEventDetailPageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  const getStatusBadge = () => {
    const stateDisplayMap = {
      submitted: {
        label: 'Submitted',
        className:
          'border-2 border-black bg-white font-bold font-mono text-black uppercase tracking-wide',
      },
      rejected: {
        label: 'Rejected',
        className:
          'border-2 border-primary bg-black font-bold font-mono text-white uppercase tracking-wide',
      },
      'waiting-luma-edit': {
        label: 'Waiting Luma Edit',
        className:
          'border-2 border-yellow-500 bg-yellow-500 font-bold font-mono text-black uppercase tracking-wide',
      },
      published: {
        label: 'Published',
        className:
          'border-2 border-white bg-primary font-bold font-mono text-primary-foreground uppercase tracking-wide',
      },
      deleted: {
        label: 'Deleted',
        className:
          'border-2 border-red-500 bg-red-500 font-bold font-mono text-white uppercase tracking-wide',
      },
    };

    const stateInfo = stateDisplayMap[event.state] || stateDisplayMap.submitted;

    return <Badge className={stateInfo.className}>{stateInfo.label}</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/admin/events"
            className="flex items-center gap-2 font-bold font-mono text-sm text-white/80 uppercase tracking-wide hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Events
          </Link>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div>
              <h1 className="w-fit border-4 border-white bg-primary px-8 py-4 font-black font-mono text-4xl text-white uppercase tracking-wider shadow-[8px_8px_0px_0px_#ffffff]">
                {event.title}
              </h1>
              <p className="mt-2 font-bold font-mono text-white/60 uppercase tracking-wide">
                Event ID: {event.id}
              </p>
              <p className="font-bold font-mono text-white/60 uppercase tracking-wide">
                Public ID: {event.publicId}
              </p>
            </div>
            {event.companyLogoUrl && (
              <div className="mt-2">
                <div className="flex h-20 w-20 items-center justify-center border-4 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
                  <div
                    style={{
                      backgroundImage: `url(${event.companyLogoUrl})`,
                    }}
                    className="h-full w-full bg-center bg-contain bg-no-repeat"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-4">
            {getStatusBadge()}
            <div className="flex gap-2">
              <EditEventButton
                eventId={event.id}
                currentCommune={event.commune}
              />
              <ModerationButtons eventId={event.id} eventState={event.state} />
            </div>
          </div>
        </div>

        {/* Basic Event Information */}
        <Card className="border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold font-mono text-white uppercase tracking-wide">
              <Calendar className="h-5 w-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Start Date
                </p>
                <p className="font-mono text-white">
                  {formatDate(event.startDate)}
                </p>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  End Date
                </p>
                <p className="font-mono text-white">
                  {formatDate(event.endDate)}
                </p>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Format
                </p>
                <p className="font-mono text-white capitalize">
                  {event.format.replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Location
                </p>
                <p className="flex items-center gap-1 font-mono text-white">
                  <MapPin className="h-4 w-4" />
                  {event.commune}
                </p>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Capacity
                </p>
                <p className="font-mono text-white">{event.capacity} people</p>
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                Description
              </p>
              <p className="whitespace-pre-wrap font-mono text-white">
                {event.description}
              </p>
            </div>

            {event.latitude && event.longitude && (
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Coordinates
                </p>
                <p className="font-mono text-white">
                  {event.latitude}, {event.longitude}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Author Information */}
        <Card className="border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold font-mono text-white uppercase tracking-wide">
              <Users className="h-5 w-5" />
              Event Organizer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Name
                </p>
                <p className="font-mono text-white">{event.authorName}</p>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Company
                </p>
                <p className="flex items-center gap-1 font-mono text-white">
                  <Building className="h-4 w-4" />
                  {event.companyName}
                </p>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Email
                </p>
                <a
                  href={`mailto:${event.authorEmail}`}
                  className="flex items-center gap-1 font-bold font-mono text-primary hover:text-primary/80"
                >
                  <Mail className="h-4 w-4" />
                  {event.authorEmail}
                </a>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Phone
                </p>
                <a
                  href={`tel:${event.authorPhoneNumber}`}
                  className="flex items-center gap-1 font-bold font-mono text-primary hover:text-primary/80"
                >
                  <Phone className="h-4 w-4" />
                  {event.authorPhoneNumber}
                </a>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Company Website
                </p>
                <a
                  href={event.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-bold font-mono text-primary hover:text-primary/80"
                >
                  <Globe className="h-4 w-4" />
                  {event.companyWebsite}
                </a>
              </div>
            </div>

            {event.companyLogoUrl && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                    Company Logo
                  </p>
                  <div className="flex items-center gap-2">
                    <LogoEditButton id={event.id} type="event" />
                    {event.state === 'published' && (
                      <LogoVisibilityToggle
                        id={event.id}
                        isShown={!!event.logoShownAt}
                        type="event"
                      />
                    )}
                  </div>
                </div>
                <div className="mt-2 flex h-16 w-32 items-center justify-center border-2 border-white bg-black">
                  <div
                    style={{
                      backgroundImage: `url(${event.companyLogoUrl})`,
                    }}
                    className="h-full w-full bg-center bg-contain bg-no-repeat"
                  />
                </div>
                <p className="mt-1 font-mono text-white/40 text-xs">
                  Logo displayed against black background for contrast testing
                  {event.state === 'published' &&
                    event.logoShownAt &&
                    ' • Visible on landing page'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Themes */}
        {event.themes.length > 0 && (
          <Card className="border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
            <CardHeader>
              <CardTitle className="font-bold font-mono text-white uppercase tracking-wide">
                Event Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {event.themes.map((theme) => (
                  <Badge
                    key={theme.id}
                    className="border-2 border-primary bg-primary font-bold font-mono text-white uppercase tracking-wide"
                  >
                    {theme.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audiences */}
        {event.audiences.length > 0 && (
          <Card className="border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
            <CardHeader>
              <CardTitle className="font-bold font-mono text-white uppercase tracking-wide">
                Target Audiences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {event.audiences.map((audience) => (
                  <Badge
                    key={audience.id}
                    className="border-2 border-white bg-white font-bold font-mono text-black uppercase tracking-wide"
                  >
                    {audience.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Co-hosts */}
        <CohostManager
          eventId={event.id}
          eventState={event.state}
          cohosts={event.cohosts}
        />

        {/* Event URLs */}
        <Card className="border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
          <CardHeader>
            <CardTitle className="font-bold font-mono text-white uppercase tracking-wide">
              Event URLs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CustomUrlEdit
              eventId={event.id}
              currentCustomUrl={event.customUrl}
            />
            {event.lumaEventApiId && (
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Luma Event API ID
                </p>
                <p className="font-mono text-white">{event.lumaEventApiId}</p>
              </div>
            )}
            {event.lumaEventUrl && (
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Luma Event URL
                </p>
                <a
                  href={event.lumaEventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-bold font-mono text-primary hover:text-primary/80"
                >
                  {event.lumaEventUrl}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
            {event.lumaEventCreatedAt && (
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Luma Event Created
                </p>
                <p className="font-mono text-white">
                  {formatDate(event.lumaEventCreatedAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Information */}
        <Card className="border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
          <CardHeader>
            <CardTitle className="font-bold font-mono text-white uppercase tracking-wide">
              Status & Timestamps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Current State
                </p>
                <p className="font-mono text-white capitalize">
                  {event.state.replace(/-/g, ' ')}
                </p>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Created At
                </p>
                <p className="font-mono text-white">
                  {formatDate(event.createdAt)}
                </p>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Submitted At
                </p>
                <p className="font-mono text-white">
                  {event.submittedAt
                    ? formatDate(event.submittedAt)
                    : 'Not submitted'}
                </p>
              </div>
              <div>
                <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                  Last Updated
                </p>
                <p className="font-mono text-white">
                  {formatDate(event.updatedAt)}
                </p>
              </div>
              {event.approvedAt && (
                <div>
                  <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                    Approved At
                  </p>
                  <p className="font-mono text-white">
                    {formatDate(event.approvedAt)}
                  </p>
                </div>
              )}
              {event.rejectedAt && (
                <div>
                  <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                    Rejected At
                  </p>
                  <p className="font-mono text-white">
                    {formatDate(event.rejectedAt)}
                  </p>
                </div>
              )}
              {event.waitingLumaEditAt && (
                <div>
                  <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                    Waiting Luma Edit At
                  </p>
                  <p className="font-mono text-white">
                    {formatDate(event.waitingLumaEditAt)}
                  </p>
                </div>
              )}
              {event.publishedAt && (
                <div>
                  <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                    Published At
                  </p>
                  <p className="font-mono text-white">
                    {formatDate(event.publishedAt)}
                  </p>
                </div>
              )}
              {event.deletedAt && (
                <div>
                  <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                    Deleted At
                  </p>
                  <p className="font-mono text-white">
                    {formatDate(event.deletedAt)}
                  </p>
                </div>
              )}
              {event.rejectionReason && (
                <div className="md:col-span-2">
                  <p className="font-bold font-medium font-mono text-sm text-white/60 uppercase tracking-wide">
                    Rejection Reason
                  </p>
                  <p className="font-bold font-mono text-red-400">
                    {event.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
