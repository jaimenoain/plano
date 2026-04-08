import React from 'https://esm.sh/react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'https://esm.sh/@react-email/components@1.0.8'

export interface CreditNotificationCreditLine {
  roleLabel: string
  entityLine: string
  removeUrl: string
}

export interface CreditNotificationEmailProps {
  buildingName: string
  buildingImageUrl?: string | null
  buildingPageUrl: string
  claimProfileUrl: string
  credits: CreditNotificationCreditLine[]
}

export const CreditNotificationEmail = ({
  buildingName,
  buildingImageUrl,
  buildingPageUrl,
  claimProfileUrl,
  credits,
}: CreditNotificationEmailProps) => {
  const preview = `You've been credited on ${buildingName} on Plano.`

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
            <Heading style={h1}>You have a new credit on Plano</Heading>
            <Text style={text}>
              Someone listed credits for <strong>{buildingName}</strong>. Here is what they shared:
            </Text>

            {buildingImageUrl ? (
              <Section style={imageWrap}>
                <Img src={buildingImageUrl} alt="" width={560} style={heroImg} />
              </Section>
            ) : null}

            <Section style={btnContainer}>
              <Button style={buttonSecondary} href={buildingPageUrl}>
                View the building
              </Button>
            </Section>

            {credits.map((c, i) => (
              <Section key={i} style={creditBlock}>
                {i > 0 ? <Hr style={hr} /> : null}
                <Text style={creditRole}>{c.roleLabel}</Text>
                <Text style={creditEntity}>{c.entityLine}</Text>
                <Section style={btnRow}>
                  <Button style={buttonDanger} href={c.removeUrl}>
                    Remove this credit
                  </Button>
                </Section>
              </Section>
            ))}

            <Hr style={hr} />

            <Text style={text}>If this is you, claim your profile to manage how you appear on Plano.</Text>
            <Section style={btnContainer}>
              <Button style={button} href={claimProfileUrl}>
                Claim your profile on Plano
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>© Plano. All rights reserved.</Text>
            <Link href="https://plano.app" style={link}>
              plano.app
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  padding: '40px 0',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '4px',
  overflow: 'hidden' as const,
}

const logoSection = {
  backgroundColor: '#000000',
  padding: '24px',
  textAlign: 'center' as const,
}

const logo = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '0.2em',
}

const contentSection = {
  padding: '32px 40px',
}

const h1 = {
  color: '#111111',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const text = {
  color: '#444444',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const imageWrap = {
  margin: '0 0 24px',
}

const heroImg = {
  maxWidth: '100%',
  height: 'auto',
  borderRadius: '4px',
  display: 'block',
}

const creditBlock = {
  margin: '16px 0',
}

const creditRole = {
  color: '#111111',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  margin: '0 0 4px',
}

const creditEntity = {
  color: '#333333',
  fontSize: '18px',
  fontWeight: '500',
  margin: '0 0 12px',
}

const btnContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const btnRow = {
  textAlign: 'left' as const,
  margin: '8px 0 0',
}

const button = {
  backgroundColor: '#000000',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const buttonSecondary = {
  ...button,
  backgroundColor: '#ffffff',
  color: '#111111',
  border: '1px solid #cccccc',
}

const buttonDanger = {
  ...button,
  backgroundColor: '#ffffff',
  color: '#b91c1c',
  border: '1px solid #fecaca',
}

const hr = {
  borderColor: '#e5e5e5',
  margin: '24px 0',
}

const footer = {
  padding: '24px 40px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#888888',
  fontSize: '12px',
  margin: '0 0 8px',
}

const link = {
  color: '#888888',
  fontSize: '12px',
}
