export const dynamic = 'force-dynamic'

/**
 * POST /api/send-email
 *
 * Sends an email to a case's caller using a selected template.
 * Substitutes {{variables}} with case data before sending.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCase, getTemplate, addCaseActivity } from '@/lib/db'
import { substituteVariables, sendEmail, TemplateVars } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      case_id,
      template_id,
      override_email,
      // Fully-composed subject + body from the frontend editor.
      // When provided, case_id is optional — we send exactly what was typed.
      final_subject,
      final_body,
      // Inline vars for template substitution when no case_id is available
      // (e.g. emailing from the activity feed for a call without a case).
      inline_vars,
    } = body as {
      case_id?: string
      template_id?: string
      override_email?: string
      final_subject?: string
      final_body?: string
      inline_vars?: {
        caller_name?: string
        caller_phone?: string
        vehicle?: string
        issue_description?: string
        recommended_route?: string
      }
    }

    // ── Fast path: pre-composed content, no case lookup needed ──────────────
    if (final_subject !== undefined && final_body !== undefined) {
      const toEmail = override_email
      if (!toEmail) {
        return NextResponse.json(
          { success: false, error: 'override_email is required when sending with final_subject + final_body.' },
          { status: 400 }
        )
      }
      const result = await sendEmail(toEmail, final_subject, final_body)
      if (result.success && case_id) {
        await addCaseActivity(case_id, {
          type: 'email_sent',
          timestamp: new Date().toISOString(),
          label: `Email sent to ${toEmail}`,
          detail: final_subject,
        })
      }
      return NextResponse.json({ success: result.success, message: result.message, provider: result.provider, to: toEmail, subject: final_subject })
    }

    // ── Template path: need a template and variable values ───────────────────
    if (!template_id) {
      return NextResponse.json(
        { success: false, error: 'Either (final_subject + final_body) or template_id is required.' },
        { status: 400 }
      )
    }

    const template = await getTemplate(template_id)
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 })
    }

    // Resolve vars: prefer case record, fall back to inline_vars
    let vars: TemplateVars

    if (case_id) {
      const serviceCase = await getCase(case_id)
      if (!serviceCase) {
        return NextResponse.json({ success: false, error: 'Case not found.' }, { status: 404 })
      }
      const toEmail = override_email || serviceCase.caller_email
      if (!toEmail) {
        return NextResponse.json(
          { success: false, error: 'No email address on file. Provide override_email.' },
          { status: 422 }
        )
      }
      vars = {
        caller_name: serviceCase.caller_name,
        caller_phone: serviceCase.caller_phone,
        caller_email: toEmail,
        case_id: serviceCase.case_id,
        vehicle: serviceCase.vehicle,
        issue_description: serviceCase.issue_description,
        recommended_route: serviceCase.recommended_route,
        analysis_summary: serviceCase.analysis?.service_case_summary || serviceCase.analysis_summary,
      }
      const subject = substituteVariables(template.subject, vars)
      const emailBody = substituteVariables(template.body, vars)
      const result = await sendEmail(toEmail, subject, emailBody)
      if (result.success) {
        await addCaseActivity(case_id, {
          type: 'email_sent',
          timestamp: new Date().toISOString(),
          label: `Email sent to ${toEmail}`,
          detail: subject,
        })
      }
      return NextResponse.json({ success: result.success, message: result.message, provider: result.provider, to: toEmail, subject })
    }

    // No case_id — use inline_vars for substitution
    const toEmail = override_email
    if (!toEmail) {
      return NextResponse.json(
        { success: false, error: 'override_email is required when no case_id is provided.' },
        { status: 422 }
      )
    }
    vars = {
      caller_name: inline_vars?.caller_name,
      caller_phone: inline_vars?.caller_phone,
      caller_email: toEmail,
      vehicle: inline_vars?.vehicle,
      issue_description: inline_vars?.issue_description,
      recommended_route: inline_vars?.recommended_route,
    }

    const subject = substituteVariables(template.subject, vars)
    const emailBody = substituteVariables(template.body, vars)

    const result = await sendEmail(toEmail, subject, emailBody)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      provider: result.provider,
      to: toEmail,
      subject,
    })
  } catch (err) {
    console.error('[POST /api/send-email]', err)
    return NextResponse.json({ success: false, error: 'Failed to send email.' }, { status: 500 })
  }
}
