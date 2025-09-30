'use client';

import { format } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Mail,
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
import type { OutboundEmail } from '@/src/lib/db/schema';

interface AdminEmailsTableProps {
  emails: OutboundEmail[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentSearch: string;
}

export function AdminEmailsTable({
  emails,
  total,
  totalPages,
  currentPage,
  currentSearch,
}: AdminEmailsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/admin/emails?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    params.delete('page');
    router.push(`/admin/emails?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.delete('page');
    router.push(`/admin/emails?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      sent: {
        label: 'Sent',
        className:
          'border-2 border-white bg-primary font-bold font-mono text-primary-foreground uppercase tracking-wide',
      },
      failed: {
        label: 'Failed',
        className:
          'border-2 border-red-500 bg-red-500 font-bold font-mono text-white uppercase tracking-wide',
      },
      pending: {
        label: 'Pending',
        className:
          'border-2 border-yellow-500 bg-yellow-500 font-bold font-mono text-black uppercase tracking-wide',
      },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || {
      label: status,
      className:
        'border-2 border-white bg-white/10 font-bold font-mono text-white uppercase tracking-wide',
    };

    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
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
              Email Management
            </h1>
            <p className="mt-2 font-bold font-mono text-sm text-white uppercase tracking-wide md:text-base">
              View and manage all sent emails
            </p>
          </div>

          <div className="w-fit border-2 border-white bg-white/10 px-4 py-2 font-bold font-mono text-sm text-white uppercase tracking-wide">
            Total: {total} emails
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <form onSubmit={handleSearchSubmit} className="flex-1 md:max-w-md">
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-white/60" />
              <Input
                type="text"
                placeholder="Search emails..."
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

      {/* Emails Grid */}
      <div className="flex-1 overflow-hidden">
        {emails.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Calendar className="mx-auto mb-4 h-16 w-16 text-white/50" />
              <p className="font-bold font-mono text-white text-xl uppercase tracking-wide">
                {currentSearch
                  ? `No emails found matching "${currentSearch}"`
                  : 'No emails have been sent yet'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full space-y-2 overflow-y-auto pr-2">
            {emails.map((email) => {
              return (
                <Link key={email.id} href={`/admin/emails/${email.id}`}>
                  <Card className="cursor-pointer border-2 border-white bg-black shadow-[2px_2px_0px_0px_#ffffff] transition-all duration-200 hover:shadow-[4px_4px_0px_0px_hsl(var(--primary))]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        {/* Template Name */}
                        <div className="mr-4 min-w-0 flex-shrink-0">
                          <span className="truncate font-bold font-mono text-sm text-white/80 uppercase tracking-wide">
                            {email.templateName}
                          </span>
                        </div>

                        {/* To Email */}
                        <div className="mr-4 flex min-w-0 flex-1 items-center gap-2">
                          <Mail className="h-4 w-4 flex-shrink-0 text-white/60" />
                          <span className="truncate font-bold font-mono text-sm text-white uppercase tracking-wide">
                            {email.to}
                          </span>
                        </div>

                        {/* Subject */}
                        <div className="mr-4 min-w-0 flex-1">
                          <span className="truncate font-mono text-sm text-white/80">
                            {email.subject}
                          </span>
                        </div>

                        {/* Sent Date */}
                        <div className="mr-4 flex min-w-0 items-center gap-2">
                          <span className="font-mono text-sm text-white/80">
                            {formatDate(email.sentAt || email.createdAt)}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {getStatusBadge(email.status)}
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
