import { Resend } from 'https://esm.sh/resend@2.0.0'
import React from 'https://esm.sh/react@18.3.1'
import { WelcomeEmail } from '../_shared/emails/WelcomeEmail.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: {
    id: string
    email?: string
    first_name?: string
    username?: string
    last_login?: string
    [key: string]: any
  }
  old_record: {
    last_login?: string
    [key: string]: any
  }
  schema: string
}

Deno.serve(async (req) => {
  // 1. CORS Handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: WebhookPayload = await req.json()
    const { record, old_record } = payload

    console.log('Processing welcome email check for user:', record.id)

    // 2. First Login Check
    // If old_record.last_login is NULL AND record.last_login is NOT NULL
    const isFirstLogin = !old_record?.last_login && record?.last_login

    if (!isFirstLogin) {
      console.log('Not first login, skipping email.')
      return new Response(JSON.stringify({ message: 'Not first login, skipping email' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Extract Email and Name
    const email = record.email
    const name = record.first_name || record.username || 'Architect'

    if (!email) {
      console.error('No email found in record')
      return new Response(JSON.stringify({ error: 'No email found in record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Send Email
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not set')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resend = new Resend(resendApiKey)

    const { data, error } = await resend.emails.send({
      from: 'PLANO <hello@plano.app>',
      to: [email],
      subject: 'Welcome to PLANO',
      react: React.createElement(WelcomeEmail, { name }),
    })

    if (error) {
      console.error('Error sending email:', error)
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Welcome email sent to:', email)
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
