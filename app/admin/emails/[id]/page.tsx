import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/src/components/ui/badge';
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

  return (
    <div className="container space-y-6 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="w-fit border-4 border-white bg-primary px-4 py-2 font-black font-mono text-sm text-white uppercase tracking-wider shadow-[8px_8px_0px_0px_#ffffff] md:px-8 md:py-4 md:text-4xl">
            Email Record
          </h1>
          <p className="mt-2 font-bold font-mono text-sm text-white uppercase tracking-wide md:text-base">
            {outboundEmail.sentAt
              ? `Sent on ${outboundEmail.sentAt.toLocaleDateString()}`
              : `Created on ${outboundEmail.createdAt.toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ResendEmailButton emailId={outboundEmail.id} />
          <Button
            variant="outline"
            asChild
            className="border-2 border-white bg-black font-bold font-mono text-white text-xs uppercase tracking-wide hover:bg-white hover:text-black"
          >
            <Link href="/admin/emails">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
            <CardHeader>
              <CardTitle className="font-black font-mono text-white uppercase tracking-wide">
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <strong className="font-bold font-mono text-sm text-white/80 uppercase tracking-wide">
                  Template:
                </strong>
                <p className="mt-1 font-mono text-sm text-white">
                  {outboundEmail.templateName}
                </p>
              </div>
              <div>
                <strong className="font-bold font-mono text-sm text-white/80 uppercase tracking-wide">
                  To:
                </strong>
                <p className="mt-1 font-mono text-sm text-white">
                  {outboundEmail.to}
                </p>
              </div>
              {outboundEmail.cc && outboundEmail.cc.length > 0 && (
                <div>
                  <strong className="font-bold font-mono text-sm text-white/80 uppercase tracking-wide">
                    CC:
                  </strong>
                  <p className="mt-1 font-mono text-sm text-white">
                    {outboundEmail.cc.join(', ')}
                  </p>
                </div>
              )}
              {outboundEmail.bcc && outboundEmail.bcc.length > 0 && (
                <div>
                  <strong className="font-bold font-mono text-sm text-white/80 uppercase tracking-wide">
                    BCC:
                  </strong>
                  <p className="mt-1 font-mono text-sm text-white">
                    {outboundEmail.bcc.join(', ')}
                  </p>
                </div>
              )}
              <div>
                <strong className="font-bold font-mono text-sm text-white/80 uppercase tracking-wide">
                  Subject:
                </strong>
                <p className="mt-1 font-mono text-sm text-white">
                  {outboundEmail.subject}
                </p>
              </div>
              <div>
                <strong className="font-bold font-mono text-sm text-white/80 uppercase tracking-wide">
                  Status:
                </strong>
                <div className="mt-1">
                  {getStatusBadge(outboundEmail.status)}
                </div>
              </div>
              {outboundEmail.failureReason && (
                <div>
                  <strong className="font-bold font-mono text-red-500 text-sm uppercase tracking-wide">
                    Failure Reason:
                  </strong>
                  <p className="mt-1 font-mono text-red-500 text-sm">
                    {outboundEmail.failureReason}
                  </p>
                </div>
              )}
              <div>
                <strong className="font-bold font-mono text-sm text-white/80 uppercase tracking-wide">
                  Message ID:
                </strong>
                {outboundEmail.externalMessageId ? (
                  <p className="mt-1 break-all font-mono text-white text-xs">
                    {outboundEmail.externalMessageId}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-sm text-white/60 italic">
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
