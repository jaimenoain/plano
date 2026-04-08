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

export type CreditModerationOutcome = 'verified' | 'hidden'

export interface CreditOutcomeEmailProps {
  outcome: CreditModerationOutcome
  buildingName: string
  entityLine: string
  buildingPageUrl: string
  siteUrl: string
}

export const CreditOutcomeEmail = ({
  outcome,
  buildingName,
  entityLine,
  buildingPageUrl,
  siteUrl,
}: CreditOutcomeEmailProps) => {
  const isVerified = outcome === 'verified'
  const preview = isVerified
    ? `Your credit on ${buildingName} was verified on Plano.`
    : `Your credit on ${buildingName} was removed on Plano.`

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
            <Heading style={h1}>{isVerified ? 'Credit verified' : 'Credit removed'}</Heading>
            <Text style={text}>
              {isVerified ? (
                <>
                  After review, your credit for <strong>{entityLine}</strong> on{' '}
                  <strong>{buildingName}</strong> has been <strong>verified</strong> on Plano.
                </>
              ) : (
                <>
                  After review, your credit for <strong>{entityLine}</strong> on{' '}
                  <strong>{buildingName}</strong> has been <strong>hidden</strong> and no longer appears on
                  the public building page.
                </>
              )}
            </Text>
            <Section style={btnContainer}>
              <Button style={button} href={buildingPageUrl}>
                View building
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
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
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
  color: '#000000',
  margin: '0',
}

const contentSection = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px 24px',
}

const h1 = {
  fontSize: '22px',
  fontWeight: 600,
  color: '#18181b',
  margin: '0 0 16px',
}

const text = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#3f3f46',
  margin: '0 0 16px',
}

const btnContainer = { margin: '24px 0 0' }

const button = {
  backgroundColor: '#000000',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
}

const footer = { marginTop: '24px', fontSize: '13px', color: '#71717a' }

const link = { color: '#71717a', textDecoration: 'underline' }
