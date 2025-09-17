'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/src/components/ui/badge';
import { TableCell, TableRow } from '@/src/components/ui/table';

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'sent':
      return 'default' as const; // green
    case 'failed':
      return 'destructive' as const; // red
    case 'pending':
      return 'secondary' as const; // yellow/gray
    default:
      return 'secondary' as const;
  }
}

interface EmailRowProps {
  email: {
    id: string;
    templateName: string;
    to: string;
    subject: string;
    status: string;
    formattedDate: string;
  };
}

export function EmailRow({ email }: EmailRowProps) {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(`/emails/${email.id}`);
  };

  return (
    <TableRow
      key={email.id}
      className="cursor-pointer hover:bg-muted/50"
      onClick={handleRowClick}
    >
      <TableCell>
        <span className="font-mono text-sm">{email.templateName}</span>
      </TableCell>
      <TableCell>
        <div className="max-w-[200px] truncate" title={email.to}>
          {email.to}
        </div>
      </TableCell>
      <TableCell>
        <div className="max-w-[300px] truncate" title={email.subject}>
          {email.subject}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(email.status)}>
          {email.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-muted-foreground text-sm">
          {email.formattedDate}
        </div>
      </TableCell>
    </TableRow>
  );
}
