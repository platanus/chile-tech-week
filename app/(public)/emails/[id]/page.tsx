import Link from 'next/link';
import { notFound } from 'next/navigation';
import { $path } from 'next-typesafe-url';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { onlyAdmin } from '@/src/lib/auth/server';
import { getOutboundEmail } from '@/src/queries/emails';
import { EmailPreview } from './email-preview';
import { ResendEmailButton } from './resend-email-button';

interface EmailRecordPageProps {
  params: Promise<{ id: string }>;
}

export default async function EmailRecordPage({
  params,
}: EmailRecordPageProps) {
  const { id } = await params;
  await onlyAdmin();

  const outboundEmail = await getOutboundEmail(id);

  if (!outboundEmail) {
    notFound();
  }

  return (
    <div className="container space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Email Record</h1>
          <p className="text-muted-foreground">
            {outboundEmail.sentAt
              ? `Sent on ${outboundEmail.sentAt.toLocaleDateString()}`
              : `Created on ${outboundEmail.createdAt.toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ResendEmailButton emailId={outboundEmail.id} />
          <Button variant="outline" asChild>
            <Link href={$path({ route: '/emails' })}>Back to List</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <strong className="font-medium text-sm">Template:</strong>
                <p className="text-muted-foreground text-sm">
                  {outboundEmail.templateName}
                </p>
              </div>
              <div>
                <strong className="font-medium text-sm">To:</strong>
                <p className="text-muted-foreground text-sm">
                  {outboundEmail.to}
                </p>
              </div>
              {outboundEmail.cc && outboundEmail.cc.length > 0 && (
                <div>
                  <strong className="font-medium text-sm">CC:</strong>
                  <p className="text-muted-foreground text-sm">
                    {outboundEmail.cc.join(', ')}
                  </p>
                </div>
              )}
              {outboundEmail.bcc && outboundEmail.bcc.length > 0 && (
                <div>
                  <strong className="font-medium text-sm">BCC:</strong>
                  <p className="text-muted-foreground text-sm">
                    {outboundEmail.bcc.join(', ')}
                  </p>
                </div>
              )}
              <div>
                <strong className="font-medium text-sm">Subject:</strong>
                <p className="text-muted-foreground text-sm">
                  {outboundEmail.subject}
                </p>
              </div>
              <div>
                <strong className="font-medium text-sm">Status:</strong>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 font-medium text-xs ${
                      outboundEmail.status === 'sent'
                        ? 'bg-green-100 text-green-800'
                        : outboundEmail.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {outboundEmail.status}
                  </span>
                </div>
              </div>
              {outboundEmail.failureReason && (
                <div>
                  <strong className="font-medium text-red-600 text-sm">
                    Failure Reason:
                  </strong>
                  <p className="mt-1 text-red-600 text-sm">
                    {outboundEmail.failureReason}
                  </p>
                </div>
              )}
              <div>
                <strong className="font-medium text-sm">Message ID:</strong>
                {outboundEmail.externalMessageId ? (
                  <p className="font-mono text-muted-foreground text-sm">
                    {outboundEmail.externalMessageId}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    No external message ID available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <EmailPreview htmlContent={outboundEmail.htmlContent} />
        </div>
      </div>
    </div>
  );
}
