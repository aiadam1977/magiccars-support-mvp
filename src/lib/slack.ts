/**
 * MagicCars — Slack notifications
 *
 * Set SLACK_WEBHOOK_URL in Vercel env vars to enable.
 * Create a webhook at: https://api.slack.com/messaging/webhooks
 * If the env var is not set, notifications are silently skipped.
 */

export interface SlackCasePayload {
  case_id: string
  caller_name: string
  caller_phone: string
  vehicle: string
  issue_description: string
  recommended_route: string
  is_safety: boolean
  case_url: string
}

export async function notifySlackNewCase(payload: SlackCasePayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return // silently skip if not configured

  const isSafety = payload.is_safety
  const routeLabels: Record<string, string> = {
    self_fix: 'Self-Fix', replacement_part: 'Replace Part',
    warranty_replacement: 'Warranty', out_of_warranty: 'Out-of-Warranty',
    safety_stop: '🚨 SAFETY STOP', human_support: 'Human Agent',
  }

  const message = {
    text: isSafety
      ? `🚨 *SAFETY ESCALATION* — ${payload.caller_name}`
      : `📋 New support case — ${payload.caller_name}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: isSafety ? '🚨 Safety Escalation — Immediate Attention Required' : '📋 New Support Case Created',
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Caller:*\n${payload.caller_name}` },
          { type: 'mrkdwn', text: `*Phone:*\n${payload.caller_phone}` },
          { type: 'mrkdwn', text: `*Vehicle:*\n${payload.vehicle || '—'}` },
          { type: 'mrkdwn', text: `*Route:*\n${routeLabels[payload.recommended_route] ?? payload.recommended_route}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Issue:*\n${payload.issue_description || '—'}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Case' },
            url: payload.case_url,
            style: isSafety ? 'danger' : 'primary',
          },
        ],
      },
    ],
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
  } catch (err) {
    console.error('[slack] Failed to send notification:', err)
  }
}
