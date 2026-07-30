import React from 'https://esm.sh/react@18.3.1'

// Components come from ./reactEmail.ts, never from the react-email barrel — see that
// file for why the barrel cannot boot under Deno.
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from './reactEmail.ts'

export interface WeeklyDigestRow {
  label: string
  count: number
}

export interface WeeklyDigestEmailProps {
  recipientName: string
  chapterName: string
  weekLabel: string
  previewLine: string
  youRows: WeeklyDigestRow[]
  youTotal: number
  chapterRows: WeeklyDigestRow[]
  chapterTotal: number
  activeMembers: number
  tasksLabel: string
  taskRows: WeeklyDigestRow[]
  tasksUrl: string
  impactUrl: string
  settingsUrl: string
  siteUrl: string
}

const CountRows = ({ rows }: { rows: WeeklyDigestRow[] }) => (
  <>
    {rows.map((row) => (
      <Text key={row.label} style={countRow}>
        <strong style={countValue}>{row.count}</strong> {row.label}
      </Text>
    ))}
  </>
)

export const WeeklyDigestEmail = ({
  recipientName,
  chapterName,
  weekLabel,
  previewLine,
  youRows,
  youTotal,
  chapterRows,
  chapterTotal,
  activeMembers,
  tasksLabel,
  taskRows,
  tasksUrl,
  impactUrl,
  settingsUrl,
  siteUrl,
}: WeeklyDigestEmailProps) => (
  <Html>
    <Head />
    <Preview>{previewLine}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logo}>PLANO</Text>
        </Section>
        <Section style={contentSection}>
          <Heading style={h1}>Your week in {chapterName}</Heading>
          <Text style={eyebrow}>{weekLabel}</Text>

          <Text style={sectionTitle}>What you did</Text>
          {youTotal === 0 ? (
            <Text style={text}>
              {recipientName}, you didn't log anything in {chapterName} this week — here's
              what's waiting.
            </Text>
          ) : (
            <CountRows rows={youRows} />
          )}

          <Hr style={rule} />

          <Text style={sectionTitle}>What the chapter did</Text>
          {chapterTotal === 0 ? (
            <Text style={text}>{chapterName} was quiet this week.</Text>
          ) : (
            <>
              <Text style={text}>
                <strong>{chapterTotal}</strong>{' '}
                {chapterTotal === 1 ? 'contribution' : 'contributions'} from{' '}
                <strong>{activeMembers}</strong>{' '}
                {activeMembers === 1 ? 'ambassador' : 'ambassadors'}.
              </Text>
              <CountRows rows={chapterRows} />
            </>
          )}

          <Hr style={rule} />

          <Text style={sectionTitle}>Waiting for you</Text>
          <Text style={text}>
            <strong>{tasksLabel}</strong> ready to pick up in {chapterName}.
          </Text>
          <CountRows rows={taskRows} />

          <Section style={btnContainer}>
            <Button style={button} href={tasksUrl}>
              Pick up a task
            </Button>
          </Section>
          <Text style={text}>
            <Link href={impactUrl} style={link}>
              See your impact
            </Link>
          </Text>

          <Text style={footer}>
            Don't want these?{' '}
            <Link href={settingsUrl} style={link}>
              Manage notification preferences
            </Link>
            .
          </Text>
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
  margin: '0 0 4px',
  lineHeight: '1.3',
}

const eyebrow = {
  fontSize: '13px',
  color: '#71717a',
  margin: '0 0 24px',
}

const sectionTitle = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: '#71717a',
  margin: '0 0 12px',
}

const text = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#3f3f46',
  margin: '0 0 16px',
}

const countRow = {
  fontSize: '15px',
  lineHeight: '1.5',
  color: '#3f3f46',
  margin: '0 0 6px',
}

const countValue = { color: '#09090b' }

const rule = { borderColor: '#e4e4e7', margin: '24px 0' }

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
