import React from 'https://esm.sh/react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'https://esm.sh/@react-email/components@1.0.8'

export interface EntityClaimedEmailProps {
  personName: string
  siteUrl: string
}

export const EntityClaimedEmail = ({ personName, siteUrl }: EntityClaimedEmailProps) => {
  const preview = `The profile for ${personName} was claimed on Plano.`

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>PLANO</Text>
          </Section>
          <Section style={contentSection}>
            <Heading style={h1}>Profile claimed</Heading>
            <Text style={text}>
              Someone has claimed the profile for <strong>{personName}</strong> on Plano.
            </Text>
            <Text style={text}>
              If you believe this is incorrect, you can flag it from the building page where you added the
              credit.
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href={siteUrl}>
                Open Plano
              </Button>
            </Section>
            <Text style={footer}>
              <Link href={siteUrl} style={link}>
                {siteUrl}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f4f4f5',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '24px 16px 48px',
  maxWidth: '560px',
}

const logoSection = { marginBottom: '24px' }
const logo = {
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.2em',
  color: '#09090b',
  margin: '0',
}

const contentSection = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px 28px',
  border: '1px solid #e4e4e7',
}

const h1 = {
  fontSize: '22px',
  fontWeight: 600,
  color: '#09090b',
  margin: '0 0 16px',
  lineHeight: '1.3',
}

const text = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#3f3f46',
  margin: '0 0 16px',
}

const btnContainer = { margin: '24px 0 8px' }

const button = {
  backgroundColor: '#09090b',
  borderRadius: '6px',
  color: '#fafafa',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
}

const footer = { fontSize: '12px', color: '#71717a', margin: '24px 0 0' }
const link = { color: '#18181b', textDecoration: 'underline' }
