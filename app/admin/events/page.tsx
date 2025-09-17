import { type EventStatus, getAdminEvents } from '@/src/queries/events';
import { AdminEventsTable } from './_components/admin-events-table';

interface AdminEventsPageProps {
  searchParams: Promise<{
    status?: EventStatus;
    page?: string;
    search?: string;
  }>;
}

export default async function AdminEventsPage({
  searchParams,
}: AdminEventsPageProps) {
  const params = await searchParams;
  const status = params.status || 'pending';
  const page = Number(params.page) || 1;
  const search = params.search || '';

  const result = await getAdminEvents({
    status,
    page,
    limit: 10,
    search,
  });

  return (
    <div className="h-full">
      <AdminEventsTable
        events={result.events}
        total={result.total}
        totalPages={result.totalPages}
        currentPage={result.currentPage}
        currentStatus={status}
        currentSearch={search}
      />
    </div>
  );
}
