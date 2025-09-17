import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { getOutboundEmails } from '@/src/queries/emails';
import { EmailRow } from './email-row';
import { EmailsPagination } from './emails-pagination';
import { EmailsSearch } from './emails-search';

interface EmailListProps {
  page?: string;
  search?: string;
}

export async function EmailList({ page, search }: EmailListProps) {
  const currentPage = Number(page) || 1;
  const { emails, pagination } = await getOutboundEmails({
    page: currentPage,
    search,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <EmailsSearch />
        </div>
      </div>

      {emails.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          {search
            ? `No emails found matching "${search}".`
            : 'No emails have been sent yet.'}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <EmailRow
                    key={email.id}
                    email={{
                      id: email.id,
                      templateName: email.templateName,
                      to: email.to,
                      subject: email.subject,
                      status: email.status,
                      formattedDate: email.sentAt
                        ? new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(email.sentAt)
                        : new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(email.createdAt),
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <EmailsPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
          />
        </>
      )}
    </div>
  );
}
