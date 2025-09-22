'use client';

import { format } from 'date-fns';
import {
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import type { EventStatus, EventWithDetails } from '@/src/queries/events';
import {
  approveEventAction,
  rejectEventAction,
} from '../_actions/event-moderation.action';

interface AdminEventsTableProps {
  events: EventWithDetails[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentStatus: EventStatus;
  currentSearch: string;
}

export function AdminEventsTable({
  events,
  total,
  totalPages,
  currentPage,
  currentStatus,
  currentSearch,
}: AdminEventsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState(currentSearch);

  const handleStatusChange = (status: EventStatus) => {
    const params = new URLSearchParams(searchParams);
    params.set('status', status);
    params.delete('page'); // Reset to first page when changing status
    router.push(`/admin/events?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/admin/events?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    params.delete('page'); // Reset to first page when searching
    router.push(`/admin/events?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.delete('page');
    router.push(`/admin/events?${params.toString()}`);
  };

  const getStatusBadge = (event: EventWithDetails) => {
    if (event.approvedAt) {
      return (
        <Badge className="border-2 border-white bg-primary font-bold font-mono text-primary-foreground uppercase tracking-wide">
          Approved
        </Badge>
      );
    }
    if (event.rejectedAt) {
      return (
        <Badge className="border-2 border-primary bg-black font-bold font-mono text-white uppercase tracking-wide">
          Rejected
        </Badge>
      );
    }
    return (
      <Badge className="border-2 border-black bg-white font-bold font-mono text-black uppercase tracking-wide">
        Pending
      </Badge>
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  const handleEventAction = (eventId: string, action: 'approve' | 'reject') => {
    setPendingActions((prev) => new Set([...prev, eventId]));

    startTransition(async () => {
      try {
        const result =
          action === 'approve'
            ? await approveEventAction(eventId)
            : await rejectEventAction(eventId);

        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.error);
        }
      } catch (_error) {
        toast.error('An error occurred');
      } finally {
        setPendingActions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      }
    });
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Header with Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="w-fit border-4 border-white bg-primary px-4 py-2 font-black font-mono text-white text-xl uppercase tracking-wider shadow-[8px_8px_0px_0px_#ffffff] md:px-8 md:py-4 md:text-4xl">
              Event Management
            </h1>
            <p className="mt-2 font-bold font-mono text-sm text-white uppercase tracking-wide md:text-base">
              Manage event submissions and approvals
            </p>
          </div>

          <div className="w-fit border-2 border-white bg-white/10 px-4 py-2 font-bold font-mono text-sm text-white uppercase tracking-wide">
            Total: {total} events
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <form onSubmit={handleSearchSubmit} className="flex-1 md:max-w-md">
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-white/60" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="border-2 border-white bg-black pl-10 font-bold font-mono text-sm text-white placeholder:text-white/60 focus:border-primary"
              />
              {currentSearch && (
                <Button
                  type="button"
                  onClick={handleClearSearch}
                  className="-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6 transform border-none bg-white/20 p-0 text-white hover:bg-white/30"
                  size="sm"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </form>

          <div className="flex items-center gap-2">
            <span className="font-bold font-mono text-sm text-white uppercase tracking-wide">
              Status:
            </span>
            <Select value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32 border-2 border-white bg-black font-bold font-mono text-sm text-white md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-2 border-white bg-black">
                <SelectItem
                  value="pending"
                  className="font-mono text-sm text-white"
                >
                  Pending
                </SelectItem>
                <SelectItem
                  value="approved"
                  className="font-mono text-sm text-white"
                >
                  Approved
                </SelectItem>
                <SelectItem
                  value="rejected"
                  className="font-mono text-sm text-white"
                >
                  Rejected
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {currentSearch && (
          <div className="flex items-center gap-2 font-mono text-sm text-white/80">
            <span>Searching for:</span>
            <Badge
              variant="outline"
              className="border-primary font-mono text-primary"
            >
              &quot;{currentSearch}&quot;
            </Badge>
            <Button
              onClick={handleClearSearch}
              variant="ghost"
              size="sm"
              className="h-auto p-1 font-mono text-white/60 text-xs hover:text-white"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Events Grid */}
      <div className="flex-1 overflow-hidden">
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Calendar className="mx-auto mb-4 h-16 w-16 text-white/50" />
              <p className="font-bold font-mono text-white text-xl uppercase tracking-wide">
                No events found for {currentStatus} status
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full space-y-2 overflow-y-auto pr-2">
            {events.map((event) => {
              const isPendingAction = pendingActions.has(event.id);
              return (
                <Card
                  key={event.id}
                  className="border-2 border-white bg-black shadow-[2px_2px_0px_0px_#ffffff] transition-all duration-200 hover:shadow-[4px_4px_0px_0px_hsl(var(--primary))]"
                >
                  <CardContent className="p-3">
                    <div className="grid grid-cols-12 items-center gap-4">
                      {/* Logo */}
                      <div className="col-span-1">
                        {event.companyLogoUrl ? (
                          <div className="flex h-8 w-8 items-center justify-center overflow-hidden border border-white bg-black">
                            <div
                              style={{
                                backgroundImage: `url(${event.companyLogoUrl})`,
                              }}
                              className="h-full w-full bg-center bg-contain bg-no-repeat"
                            />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center border border-white bg-gray-700">
                            <Building2 className="h-4 w-4 text-white/50" />
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="col-span-8">
                        <div className="mb-1 flex items-center justify-between">
                          <h3 className="truncate font-black font-mono text-lg text-white uppercase tracking-wide">
                            {event.title}
                          </h3>
                          {getStatusBadge(event)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-white/80">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span className="font-bold font-mono uppercase tracking-wide">
                              {event.companyName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-bold font-mono">
                              {formatDate(event.startDate)}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="border border-primary px-2 py-0 font-bold font-mono text-primary text-xs uppercase tracking-wide"
                          >
                            {event.format.replace(/_/g, ' ')}
                          </Badge>
                          <span className="ml-auto font-mono text-white/50 text-xs">
                            {formatDate(event.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-3 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border border-white px-2 font-bold font-mono text-white uppercase tracking-wide hover:bg-white hover:text-black"
                          asChild
                        >
                          <Link href={`/admin/events/${event.id}`}>
                            <Eye className="h-3 w-3" />
                          </Link>
                        </Button>

                        {event.lumaEventUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border border-primary px-2 font-bold font-mono text-primary text-xs hover:bg-primary hover:text-primary-foreground"
                            asChild
                          >
                            <Link
                              href={event.lumaEventUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        )}

                        {currentStatus === 'pending' && (
                          <>
                            <Button
                              onClick={() =>
                                handleEventAction(event.id, 'approve')
                              }
                              disabled={isPendingAction}
                              className="border border-white bg-green-600 px-2 font-bold font-mono text-white text-xs hover:bg-green-700"
                              size="sm"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() =>
                                handleEventAction(event.id, 'reject')
                              }
                              disabled={isPendingAction}
                              className="border border-white bg-red-600 px-2 font-bold font-mono text-white text-xs hover:bg-red-700"
                              size="sm"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-center font-bold font-mono text-sm text-white uppercase tracking-wide md:text-left">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex justify-center gap-2 md:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="border-2 border-white font-bold font-mono text-white text-xs uppercase tracking-wide hover:bg-white hover:text-black"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden md:inline">Previous</span>
            </Button>

            {/* Page numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = Math.max(1, currentPage - 2) + i;
                if (pageNumber > totalPages) return null;

                return (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className={`w-8 border-2 font-bold font-mono text-xs uppercase tracking-wide md:w-10 ${
                      pageNumber === currentPage
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-white text-white hover:bg-white hover:text-black'
                    }`}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="border-2 border-white font-bold font-mono text-white text-xs uppercase tracking-wide hover:bg-white hover:text-black"
            >
              <span className="hidden md:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
