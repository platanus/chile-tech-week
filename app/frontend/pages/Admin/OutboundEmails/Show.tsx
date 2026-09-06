import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { EmailStatusBadge, Field, Flash, formatDateTime } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { admin_outbound_email_resend_path, admin_outbound_emails_path } from '@/routes';
import type { AdminOutboundEmailsShow } from '@/types';

// /admin/emails/:id — one message: its envelope, its outcome and the HTML as it went out.
export default function Show({ email, htmlContent }: AdminOutboundEmailsShow) {
  const [sending, setSending] = useState(false);
  const resend = () => router.post(admin_outbound_email_resend_path(email.id), {}, { onStart: () => setSending(true), onFinish: () => setSending(false) });

  return (
    <div className="mx-auto max-w-4xl">
      <Head>
        <title>{`${email.subject} · Correos · Admin`}</title>
      </Head>
      <Link href={admin_outbound_emails_path()} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Volver a correos
      </Link>
      <Flash />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-extrabold uppercase tracking-[-0.03em]">Correo</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {email.sentAt ? `Enviado el ${formatDateTime(email.sentAt)}` : `Creado el ${formatDateTime(email.createdAt)}`}
          </p>
        </div>
        <Button onClick={resend} disabled={sending} variant="outline">
          <RotateCw /> {sending ? 'Reenviando…' : 'Reenviar'}
        </Button>
      </div>

      <Card className="gap-4 rounded-sm border-border py-5 shadow-none">
        <CardHeader>
          <CardTitle className="label text-[10px] text-muted-foreground">Detalles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Plantilla"><span className="font-mono">{email.templateName}</span></Field>
          <Field label="Estado"><EmailStatusBadge status={email.status} /></Field>
          <Field label="Para">{email.to}</Field>
          <Field label="Asunto">{email.subject}</Field>
          {email.cc && email.cc.length > 0 && <Field label="CC">{email.cc.join(', ')}</Field>}
          {email.bcc && email.bcc.length > 0 && <Field label="BCC">{email.bcc.join(', ')}</Field>}
          <Field label="ID del mensaje"><span className="font-mono">{email.externalMessageId ?? '—'}</span></Field>
          <Field label="En cola"><span className="font-mono">{formatDateTime(email.queuedAt)}</span></Field>
          {email.failureReason && <Field label="Motivo del fallo" className="md:col-span-2"><p className="text-primary">{email.failureReason}</p></Field>}
        </CardContent>
      </Card>

      <Card className="mt-4 gap-4 rounded-sm border-border py-5 shadow-none">
        <CardHeader>
          <CardTitle className="label text-[10px] text-muted-foreground">Vista previa</CardTitle>
        </CardHeader>
        <CardContent>
          <iframe title="Vista previa del correo" srcDoc={htmlContent} sandbox="" className="h-[640px] w-full rounded-sm border border-border bg-white" />
        </CardContent>
      </Card>
    </div>
  );
}
