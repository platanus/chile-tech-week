import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
} from '@react-email/components';

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
            src={`${process.env.DOMAIN}/assets/email/header-v1.png`}
            width="600"
            height="150"
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
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '560px',
};

const headerImage = {
  display: 'block',
  margin: '0 auto 24px auto',
  width: '100%',
  maxWidth: '600px',
};
