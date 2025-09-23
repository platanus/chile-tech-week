import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
} from '@react-email/components';
import React from 'react';

interface EmailLayoutProps {
  children: React.ReactNode;
  preview: string;
}

export default function EmailLayout({ children, preview }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src={`https://${process.env.DOMAIN}/assets/email/header-v1.png`}
            alt="Chile Tech Week 2025"
            style={headerImage}
          />
          {children}
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  fontSize: '14px',
  fontWeight: 'normal',
};

const container = {
  margin: '0 auto',
  padding: '20px',
  width: '600px',
  maxWidth: '100%',
  border: '4px solid #000000',
  backgroundColor: '#ffffff',
  boxShadow: '8px 8px 0px 0px #000000',
};

const headerImage = {
  display: 'block',
  margin: '0 auto 24px auto',
  width: '100%',
  height: 'auto',
  maxWidth: '560px',
};
