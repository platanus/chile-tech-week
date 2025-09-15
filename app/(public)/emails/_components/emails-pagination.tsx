'use client';

import { useSearchParams } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/src/components/ui/pagination';

interface EmailsPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
}

export function EmailsPagination({
  currentPage,
  totalPages,
  total,
}: EmailsPaginationProps) {
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `/emails?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  const renderPageLinks = () => {
    const items = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href={createPageURL(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink href={createPageURL(1)} isActive={currentPage === 1}>
            1
          </PaginationLink>
        </PaginationItem>,
      );

      // Show ellipsis if needed
      if (currentPage > 4) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href={createPageURL(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 3) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      // Show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              href={createPageURL(totalPages)}
              isActive={currentPage === totalPages}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    }

    return items;
  };

  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm">
        Showing {(currentPage - 1) * 20 + 1} to{' '}
        {Math.min(currentPage * 20, total)} of {total} emails
      </p>
      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious href={createPageURL(currentPage - 1)} />
              </PaginationItem>
            )}
            {renderPageLinks()}
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext href={createPageURL(currentPage + 1)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
