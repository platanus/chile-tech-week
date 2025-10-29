'use client';

import { format } from 'date-fns';
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
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

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Header with Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="w-fit border-4 border-white bg-primary px-4 py-2 font-black font-mono text-sm text-white uppercase tracking-wider shadow-[8px_8px_0px_0px_#ffffff] md:px-8 md:py-4 md:text-4xl">
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
                  value="submitted"
                  className="font-mono text-sm text-white"
                >
                  Submitted
                </SelectItem>
                <SelectItem
                  value="rejected"
                  className="font-mono text-sm text-white"
                >
                  Rejected
                </SelectItem>
                <SelectItem
                  value="waiting-luma-edit"
                  className="font-mono text-sm text-white"
                >
                  Waiting Luma Edit
                </SelectItem>
                <SelectItem
                  value="published"
                  className="font-mono text-sm text-white"
                >
                  Published
                </SelectItem>
                <SelectItem
                  value="deleted"
                  className="font-mono text-sm text-white"
                >
                  Deleted
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
                No events found for {currentStatus.replace(/-/g, ' ')} status
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full space-y-2 overflow-y-auto pr-2">
            {events.map((event) => {
              return (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className="block"
                >
                  <Card className="cursor-pointer border-2 border-white bg-black shadow-[2px_2px_0px_0px_#ffffff] transition-all duration-200 hover:shadow-[4px_4px_0px_0px_hsl(var(--primary))]">
                    <CardContent className="p-4">
                      {/* Event Title */}
                      <h3 className="mb-3 line-clamp-1 font-black font-mono text-lg text-white uppercase tracking-wide">
                        {event.title}
                      </h3>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Company */}
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 flex-shrink-0 text-white/60" />
                          <span className="line-clamp-1 font-bold font-mono text-sm text-white uppercase tracking-wide">
                            {event.companyName}
                          </span>
                        </div>

                        {/* Submitted Date */}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 flex-shrink-0 text-white/60" />
                          <span className="font-mono text-sm text-white/80">
                            {formatDate(event.submittedAt)}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="ml-auto flex-shrink-0">
                          {getStatusBadge(event)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
              className="border-2 border-white bg-black font-bold font-mono text-white text-xs uppercase tracking-wide hover:bg-white hover:text-black disabled:bg-black/50"
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
                        : 'border-white bg-black text-white hover:bg-white hover:text-black'
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
              className="border-2 border-white bg-black font-bold font-mono text-white text-xs uppercase tracking-wide hover:bg-white hover:text-black disabled:bg-black/50"
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
