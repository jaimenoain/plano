import React from 'https://esm.sh/react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from 'https://esm.sh/@react-email/components@1.0.8'

interface ResetPasswordEmailProps {
  resetLink?: string;
  userEmail?: string;
}

export const ResetPasswordEmail = ({
  resetLink = 'https://plano.app/reset-password',
  userEmail = 'user@example.com',
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your PLANO password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>PLANO</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Password Reset</Heading>
            <Text style={text}>
              We received a request to reset the password for the account associated with <strong>{userEmail}</strong>.
            </Text>
            <Text style={text}>
              If you didn't make this request, you can safely ignore this email. Otherwise, click the button below to set a new password.
            </Text>

            <Section style={btnContainer}>
              <Button style={button} href={resetLink}>
                Reset Password
              </Button>
            </Section>

            <Text style={subText}>
              This link is valid for 1 hour.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              © 2024 PLANO
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  padding: '40px 0',
}

const container = {
  backgroundColor: '#ffffff',
  border: '2px solid #000000',
  boxShadow: '4px 4px 0px 0px #000000',
  maxWidth: '500px',
  margin: '0 auto',
  padding: '20px',
}

const header = {
  borderBottom: '2px solid #000000',
  paddingBottom: '15px',
  marginBottom: '25px',
}

const logo = {
  fontSize: '20px',
  fontWeight: '900',
  letterSpacing: '1px',
  margin: '0',
  color: '#000000',
  textTransform: 'uppercase' as const,
}

const content = {
  padding: '0 10px',
}

const h1 = {
  color: '#000000',
  fontSize: '24px',
  fontWeight: '800',
  margin: '0 0 20px',
}

const text = {
  color: '#000000',
  fontSize: '16px',
  lineHeight: '1.5',
  marginBottom: '15px',
}

const subText = {
  color: '#666666',
  fontSize: '14px',
  marginTop: '20px',
}

const btnContainer = {
  margin: '30px 0',
}

const button = {
  backgroundColor: '#eeff41', // Lime accent for high visibility
  border: '2px solid #000000',
  boxShadow: '4px 4px 0px 0px #000000',
  color: '#000000', // Black text on lime
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '14px 0',
  cursor: 'pointer',
}

const hr = {
  borderColor: '#000000',
  margin: '30px 0 20px',
  borderWidth: '1px',
  borderStyle: 'dashed',
}

const footer = {
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: '12px',
  color: '#888888',
}
