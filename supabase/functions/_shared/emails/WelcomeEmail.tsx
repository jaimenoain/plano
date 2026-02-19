import React from 'https://esm.sh/react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from 'https://esm.sh/@react-email/components@1.0.8'

interface WelcomeEmailProps {
  name?: string;
  actionUrl?: string;
}

export const WelcomeEmail = ({
  name = 'Architect',
  actionUrl = 'https://plano.app/discover',
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to PLANO - Discover Amazing Architecture</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>PLANO</Text>
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>Welcome to the Club, {name}!</Heading>
            <Text style={text}>
              You've joined a community of architecture enthusiasts who believe that
              every building has a story.
            </Text>
            <Text style={text}>
              With PLANO, you can:
            </Text>
            <ul style={list}>
              <li style={listItem}><strong>Discover</strong> hidden gems and brutalist masterpieces.</li>
              <li style={listItem}><strong>Rate</strong> architecture with our unique scoring system.</li>
              <li style={listItem}><strong>Organize</strong> field trips and share your map with friends.</li>
            </ul>

            <Section style={btnContainer}>
              <Button style={button} href={actionUrl}>
                Explore the Map
              </Button>
            </Section>

            <Text style={text}>
              Ready to start your collection?
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              © 2024 PLANO. All rights reserved.
            </Text>
            <Link href="https://plano.app" style={link}>plano.app</Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f5f5f5', // Light grey background
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  padding: '40px 0',
}

const container = {
  backgroundColor: '#ffffff',
  border: '2px solid #000000',
  boxShadow: '4px 4px 0px 0px #000000', // Hard shadow
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
}

const logoSection = {
  borderBottom: '2px solid #000000',
  paddingBottom: '20px',
  marginBottom: '30px',
  textAlign: 'center' as const,
}

const logo = {
  fontSize: '24px',
  fontWeight: '900',
  letterSpacing: '1px',
  margin: '0',
  color: '#000000',
  textTransform: 'uppercase' as const,
}

const contentSection = {
  padding: '0 20px',
}

const h1 = {
  color: '#000000',
  fontSize: '28px',
  fontWeight: '800',
  margin: '0 0 20px',
  lineHeight: '1.2',
}

const text = {
  color: '#000000',
  fontSize: '16px',
  lineHeight: '1.6',
  marginBottom: '20px',
}

const list = {
  paddingLeft: '20px',
  marginBottom: '30px',
}

const listItem = {
  color: '#000000',
  fontSize: '16px',
  lineHeight: '1.6',
  marginBottom: '10px',
}

const btnContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
}

const button = {
  backgroundColor: '#eeff41', // Lime accent
  border: '2px solid #000000',
  boxShadow: '4px 4px 0px 0px #000000',
  color: '#000000',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
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
  color: '#666666',
  marginBottom: '10px',
}

const link = {
  fontSize: '12px',
  color: '#000000',
  textDecoration: 'underline',
  fontWeight: 'bold',
}
