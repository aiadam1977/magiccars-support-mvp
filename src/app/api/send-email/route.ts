/**
 * POST /api/send-email
 *
 * Sends an email to a case's caller using a selected template.
 * Substitutes {{variables}} with case data before sending.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCase, getTemplate } from '@/lib/db'
import { substituteVariables, sendEmail, TemplateVars } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      case_id,
      template_id,
      override_email,
      // When the caller edits the email in the modal before sending, the
      // frontend passes the final composed subject + body directly so we
      // skip template substitution and send exactly what they typed.
      final_subject,
      final_body,
    } = body as {
      case_id: string
      template_id?: string
      override_email?: string
      final_subject?: string
      final_body?: string
    }

    if (!case_id) {
      return NextResponse.json({ success: false, error: 'case_id is required.' }, { status: 400 })
    }

    const serviceCase = await getCase(case_id)
    if (!serviceCase) {
      return NextResponse.json({ success: false, error: 'Case not found.' }, { status: 404 })
    }

    const toEmail = override_email || serviceCase.caller_email
    if (!toEmail) {
      return NextResponse.json(
        { success: false, error: 'No email address on file for this caller. Provide override_email.' },
        { status: 422 }
      )
    }

    let subject: string
    let emailBody: string

    if (final_subject !== undefined && final_body !== undefined) {
      // Use the caller-edited content directly — no further substitution
      subject = final_subject
      emailBody = final_body
    } else {
      // Fall back to template-based substitution
      if (!template_id) {
        return NextResponse.json(
          { success: false, error: 'Either template_id or final_subject + final_body are required.' },
          { status: 400 }
        )
      }
      const template = await getTemplate(template_id)
      if (!template) {
        return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 })
      }

      const vars: TemplateVars = {
        caller_name: serviceCase.caller_name,
        caller_phone: serviceCase.caller_phone,
        caller_email: toEmail,
        case_id: serviceCase.case_id,
        vehicle: serviceCase.vehicle,
        issue_description: serviceCase.issue_description,
        recommended_route: serviceCase.recommended_route,
        analysis_summary: serviceCase.analysis?.service_case_summary || serviceCase.analysis_summary,
      }

      subject = substituteVariables(template.subject, vars)
      emailBody = substituteVariables(template.body, vars)
    }

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
