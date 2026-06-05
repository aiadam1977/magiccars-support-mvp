export const dynamic = 'force-dynamic'

/**
 * GET  /api/templates  — List all email templates
 * POST /api/templates  — Create a new email template
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAllTemplates, createTemplate, EmailTemplate, TemplateCategory } from '@/lib/db'

export async function GET() {
  try {
    const templates = await getAllTemplates()
    return NextResponse.json({ success: true, templates, total: templates.length })
  } catch (err) {
    console.error('[GET /api/templates]', err)
    return NextResponse.json({ success: false, error: 'Failed to load templates.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, category, subject, body: templateBody } = body as {
      name: string
      category: TemplateCategory
      subject: string
      body: string
    }

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { success: false, error: 'name, subject, and body are required.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const template: EmailTemplate = {
      template_id: uuidv4(),
      name: name.trim(),
      category: category || 'general',
      subject: subject.trim(),
      body: templateBody,
      created_at: now,
      updated_at: now,
    }

    await createTemplate(template)
    return NextResponse.json({ success: true, template }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/templates]', err)
    return NextResponse.json({ success: false, error: 'Failed to create template.' }, { status: 500 })
  }
}
