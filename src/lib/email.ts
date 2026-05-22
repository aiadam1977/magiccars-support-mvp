/**
 * MagicCars Support MVP — Email Utility
 *
 * Variable substitution and email sending via Resend.
 * Requires RESEND_API_KEY env var set in Vercel and .env.local.
 *
 * From address: uses RESEND_FROM_EMAIL env var if set, otherwise falls back
 * to "onboarding@resend.dev" which works on Resend's free plan without
 * domain verification.
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
 * Send an email via Resend.
 * Set RESEND_API_KEY in your Vercel env vars and .env.local.
 * Set RESEND_FROM_EMAIL to a verified sender (e.g. support@yourdomain.com).
 * If RESEND_FROM_EMAIL is not set, falls back to onboarding@resend.dev which
 * works on Resend free plan without domain verification.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  fromName = 'MagicCars Support',
  fromAddress?: string
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    // No Resend key — log and return success stub so the call doesn't fail
    /* eslint-disable no-console */
    console.info('[email:stub] RESEND_API_KEY not set — email not sent')
    console.info('[email:stub] To:     ', to)
    console.info('[email:stub] Subject:', subject)
    /* eslint-enable no-console */
    return { success: true, message: 'Email skipped — RESEND_API_KEY not configured', provider: 'stub' }
  }

  const from = fromAddress ?? process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const result = await resend.emails.send({
    from: `${fromName} <${from}>`,
    to,
    subject,
    html: body,
  })

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`)
  }

  return { success: true, message: `Sent via Resend (id: ${result.data?.id})`, provider: 'resend' }
}
