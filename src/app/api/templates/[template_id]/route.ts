/**
 * GET    /api/templates/[template_id]  — Fetch one template
 * PUT    /api/templates/[template_id]  — Update a template
 * DELETE /api/templates/[template_id]  — Delete a template
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTemplate, updateTemplate, deleteTemplate, TemplateCategory } from '@/lib/db'

type Params = { params: { template_id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const template = await getTemplate(params.template_id)
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, template })
  } catch (err) {
    console.error('[GET /api/templates/:id]', err)
    return NextResponse.json({ success: false, error: 'Failed to load template.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const { name, category, subject, body: templateBody } = body as {
      name?: string
      category?: TemplateCategory
      subject?: string
      body?: string
    }

    const updated = await updateTemplate(params.template_id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(category !== undefined && { category }),
      ...(subject !== undefined && { subject: subject.trim() }),
      ...(templateBody !== undefined && { body: templateBody }),
    })

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, template: updated })
  } catch (err) {
    console.error('[PUT /api/templates/:id]', err)
    return NextResponse.json({ success: false, error: 'Failed to update template.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const deleted = await deleteTemplate(params.template_id)
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Template deleted.' })
  } catch (err) {
    console.error('[DELETE /api/templates/:id]', err)
    return NextResponse.json({ success: false, error: 'Failed to delete template.' }, { status: 500 })
  }
}
