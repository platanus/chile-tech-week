import { onlyAdmin } from '@/src/lib/auth/server';
import { EmailList } from './_components/email-list';
import { EmailStats } from './_components/email-stats';

interface EmailsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function EmailsPage({ searchParams }: EmailsPageProps) {
  await onlyAdmin();

  const { page, search } = await searchParams;

  return (
    <div className="container space-y-6 py-6">
      <div>
        <h1 className="font-bold text-3xl">Email Management</h1>
        <p className="text-muted-foreground">View and manage all sent emails</p>
      </div>

      <EmailStats />
      <EmailList page={page} search={search} />
    </div>
  );
}
