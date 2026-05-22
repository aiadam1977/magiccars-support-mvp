/**
 * MagicCars Support MVP — Email Utility
 *
 * Variable substitution and a stubbed sendEmail function.
 * To go live, replace the sendEmail body with your chosen provider:
 *
 *   Resend:    npm install resend
 *              import { Resend } from 'resend'
 *              const resend = new Resend(process.env.RESEND_API_KEY)
 *              await resend.emails.send({ from, to, subject, html: body })
 *
 *   SendGrid:  npm install @sendgrid/mail
 *              import sgMail from '@sendgrid/mail'
 *              sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
 *              await sgMail.send({ to, from, subject, html: body })
 *
 *   Postmark:  npm install postmark
 *              import { ServerClient } from 'postmark'
 *              const client = new ServerClient(process.env.POSTMARK_API_KEY!)
 *              await client.sendEmail({ From: from, To: to, Subject: subject, HtmlBody: body })
 */

export interface TemplateVars {
  caller_name?: string
  caller_phone?: string
  caller_email?: string
  case_id?: string
  vehicle?: string
  issue_description?: string
  recommended_route?: string
  analysis_summary?: string
}

/**
 * Replace all {{variable}} placeholders in a string with values from vars.
 * Unmatched placeholders are left as-is so agents can spot missing data.
 */
export function substituteVariables(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = (vars as Record<string, string | undefined>)[key]
    return value !== undefined && value !== '' ? value : match
  })
}

export interface SendEmailResult {
  success: boolean
  message: string
  provider?: string
}

/**
 * Send an email to a caller.
 * Currently stubbed — swap the body below for your chosen provider.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  fromName = 'MagicCars Support',
  fromAddress = 'support@magiccars.com'
): Promise<SendEmailResult> {
  // ── TODO: Uncomment your provider below and add the env var to Vercel ──────

  // --- Resend ---
  // const { Resend } = await import('resend')
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: `${fromName} <${fromAddress}>`,
  //   to,
  //   subject,
  //   html: body,
  // })
  // return { success: true, message: 'Sent via Resend', provider: 'resend' }

  // --- SendGrid ---
  // const sgMail = (await import('@sendgrid/mail')).default
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  // await sgMail.send({ to, from: { name: fromName, email: fromAddress }, subject, html: body })
  // return { success: true, message: 'Sent via SendGrid', provider: 'sendgrid' }

  // ── Stub (no provider configured) ────────────────────────────────────────
  void fromName
  void fromAddress
  // In development/staging, log what would have been sent
  if (process.env.NODE_ENV !== 'production') {
    /* eslint-disable no-console */
    console.info('[email:stub] ─────────────────────────────────')
    console.info('[email:stub] To:     ', to)
    console.info('[email:stub] Subject:', subject)
    console.info('[email:stub] Body preview:', body.slice(0, 200))
    console.info('[email:stub] ─────────────────────────────────')
    /* eslint-enable no-console */
  }
  return {
    success: true,
    message: 'Email logged (no provider configured — see src/lib/email.ts to wire one up)',
    provider: 'stub',
  }
}
