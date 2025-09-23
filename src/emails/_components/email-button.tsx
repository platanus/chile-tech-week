import { Button } from '@react-email/components';
import React from 'react';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export default function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button href={href} style={button}>
      {children}
    </Button>
  );
}

const button = {
  backgroundColor: '#000000',
  border: '4px solid #000000',
  borderRadius: '0px',
  color: '#ffffff',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  display: 'block',
  padding: '16px 24px',
  boxShadow: '4px 4px 0px 0px hsl(0, 85%, 55%)',
};
