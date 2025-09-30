import { onlyAdmin } from '@/src/lib/auth/server';
import { getOutboundEmails } from '@/src/queries/emails';
import { AdminEmailsTable } from './_components/admin-emails-table';

interface EmailsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function EmailsPage({ searchParams }: EmailsPageProps) {
  await onlyAdmin();

  const { page, search } = await searchParams;
  const currentPage = Number(page) || 1;
  const currentSearch = search || '';

  const { emails, pagination } = await getOutboundEmails({
    page: currentPage,
    search: currentSearch,
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black p-4 md:p-6">
      <AdminEmailsTable
        emails={emails}
        total={pagination.total}
        totalPages={pagination.totalPages}
        currentPage={currentPage}
        currentSearch={currentSearch}
      />
    </div>
  );
}
