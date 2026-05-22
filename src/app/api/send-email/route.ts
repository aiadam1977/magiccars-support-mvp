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
    const { case_id, template_id, override_email } = body as {
      case_id: string
      template_id: string
      override_email?: string
    }

    if (!case_id || !template_id) {
      return NextResponse.json(
        { success: false, error: 'case_id and template_id are required.' },
        { status: 400 }
      )
    }

    const [serviceCase, template] = await Promise.all([
      getCase(case_id),
      getTemplate(template_id),
    ])

    if (!serviceCase) {
      return NextResponse.json({ success: false, error: 'Case not found.' }, { status: 404 })
    }
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 })
    }

    const toEmail = override_email || serviceCase.caller_email
    if (!toEmail) {
      return NextResponse.json(
        { success: false, error: 'No email address on file for this caller. Provide override_email.' },
        { status: 422 }
      )
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
