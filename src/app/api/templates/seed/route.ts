/**
 * POST /api/templates/seed
 *
 * Seeds the template library with 6 default MagicCars support templates.
 * Safe to call multiple times — skips seeding if templates already exist.
 */

import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAllTemplates, createTemplate, EmailTemplate } from '@/lib/db'

const DEFAULT_TEMPLATES: Omit<EmailTemplate, 'template_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Case Opened — Acknowledgment',
    category: 'general',
    subject: 'We received your support request — Case {{case_id}}',
    body: `Hi {{caller_name}},

Thank you for contacting MagicCars support. We have received your case and our team will be in touch with you shortly.

Case Reference: {{case_id}}
Vehicle: {{vehicle}}
Issue Reported: {{issue_description}}

If you have any additional photos, videos, or details to share, please reply to this email and we will add them to your case.

We appreciate your patience and look forward to getting your little one back on the road!

Warm regards,
MagicCars Support Team
support@magiccars.com`,
  },
  {
    name: 'Self-Fix — Follow-Up Instructions',
    category: 'self_fix',
    subject: 'Your MagicCars repair steps — Case {{case_id}}',
    body: `Hi {{caller_name}},

Thank you for calling MagicCars technical support. As discussed, here is a written summary of the recommended steps for your vehicle.

Case Reference: {{case_id}}
Vehicle: {{vehicle}}

What our AI identified:
{{analysis_summary}}

Please follow the steps Harold walked you through during your call. If you try these steps and still experience issues, please do not hesitate to call us back or reply to this email.

A few reminders:
— Work in a dry, well-lit area
— Make sure the vehicle is powered off before inspecting any components
— If anything looks unsafe or the issue worsens, stop and contact us immediately

We are always here to help. Thank you for choosing MagicCars!

Best,
MagicCars Support Team
support@magiccars.com`,
  },
  {
    name: 'Replacement Part — Order Confirmation',
    category: 'parts',
    subject: 'Replacement part on the way — Case {{case_id}}',
    body: `Hi {{caller_name}},

Great news! Our team has reviewed your case and identified the replacement part your vehicle needs. Our parts team will be reaching out to you within one business day to confirm the part details and arrange delivery.

Case Reference: {{case_id}}
Vehicle: {{vehicle}}
Issue: {{issue_description}}

What to expect next:
— A member of our parts team will contact you at {{caller_phone}} or reply to this email
— They will confirm the exact part needed based on the visual evidence from your call
— Standard parts delivery takes 2–7 business days

If you have any questions in the meantime, reply to this email and we will get back to you promptly.

Thank you for your patience!

MagicCars Support Team
support@magiccars.com`,
  },
  {
    name: 'Warranty Replacement — Next Steps',
    category: 'warranty',
    subject: 'Your warranty claim is being processed — Case {{case_id}}',
    body: `Hi {{caller_name}},

We have reviewed your case and the issue with your vehicle appears to be covered under your MagicCars warranty. Our warranty team will be reaching out to you within 1–2 business days to walk you through the replacement process.

Case Reference: {{case_id}}
Vehicle: {{vehicle}}
Issue: {{issue_description}}

What to expect:
— Our warranty team will contact you at {{caller_phone}} or reply to this email
— You may be asked to return the original unit or provide additional photos
— Replacement vehicles typically ship within 3–5 business days of claim approval

Please hold onto your original packaging if you still have it, as this can speed up the process.

We appreciate your patience and apologize for the inconvenience.

MagicCars Support Team
support@magiccars.com`,
  },
  {
    name: 'Out of Warranty — Options Available',
    category: 'general',
    subject: 'Service options for your MagicCars vehicle — Case {{case_id}}',
    body: `Hi {{caller_name}},

Thank you for reaching out to MagicCars support. We have reviewed your case and want to make sure we can still help you get your vehicle back in great shape.

Case Reference: {{case_id}}
Vehicle: {{vehicle}}
Issue: {{issue_description}}

While the standard warranty period for your vehicle has passed, we do have options available:

1. Replacement Parts — Many components can be ordered directly from our website at MagicCars.com. Click "Replacement Parts" at the top of any product page to find compatible parts for your vehicle.

2. Trade-In Program — We offer a trade-in program that allows you to upgrade to a new MagicCars vehicle. Ask us for details and we will make sure your child is always riding in style.

3. Service Support — Our technical team can still review your case and recommend the best path forward.

A member of our team will follow up with you at {{caller_phone}} shortly. In the meantime, feel free to reply to this email with any questions.

Thank you for being a MagicCars customer!

MagicCars Support Team
support@magiccars.com`,
  },
  {
    name: 'Safety Stop — Urgent Notice',
    category: 'safety',
    subject: 'IMPORTANT: Do not use your MagicCars vehicle — Case {{case_id}}',
    body: `Hi {{caller_name}},

IMPORTANT SAFETY NOTICE

Following your call with our support team, we want to confirm in writing: please do not use the vehicle until this issue has been fully resolved by a MagicCars specialist.

Case Reference: {{case_id}}
Vehicle: {{vehicle}}
Issue: {{issue_description}}

Our safety team has been notified and will contact you at {{caller_phone}} as a priority. We take safety very seriously and want to make sure your child is protected.

In the meantime:
— Keep the vehicle powered off and out of reach of children
— Do not attempt to repair the vehicle yourself
— If you notice any unusual smells, sparks, or heat from the vehicle, move it away from flammable materials and contact us immediately

We apologize for the inconvenience and appreciate your cooperation. Our team will be in touch with you very shortly.

MagicCars Support Team
support@magiccars.com
Priority Escalation Line: 1-800-828-5699`,
  },
]

export async function POST() {
  try {
    const existing = await getAllTemplates()
    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Skipped — ${existing.length} template(s) already exist.`,
        seeded: 0,
      })
    }

    const now = new Date().toISOString()
    for (const t of DEFAULT_TEMPLATES) {
      await createTemplate({
        ...t,
        template_id: uuidv4(),
        created_at: now,
        updated_at: now,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${DEFAULT_TEMPLATES.length} default templates.`,
      seeded: DEFAULT_TEMPLATES.length,
    })
  } catch (err) {
    console.error('[POST /api/templates/seed]', err)
    return NextResponse.json({ success: false, error: 'Failed to seed templates.' }, { status: 500 })
  }
}
