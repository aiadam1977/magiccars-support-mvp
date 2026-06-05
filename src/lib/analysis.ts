/**
 * MagicCars Support MVP — Visual Analysis Engine
 *
 * Uses OpenAI vision if OPENAI_API_KEY is set.
 * Falls back to deterministic demo analysis based on issue type.
 */

import { AnalysisResult } from './db'
import { matchKnowledgeEntry, getKnowledgeBasePrompt } from './knowledge-base'

const VISION_PROMPT = `You are a MagicCars Support specialist — a knowledgeable, warm parent-support agent for Magic Cars ride-on vehicles.

Analyze the uploaded media carefully, but do not overstate certainty. Use the vehicle knowledge base below as the source of truth. Identify what is visible, what issue it may suggest, what safe parent-level steps are appropriate, what the parent should NOT do, and whether escalation is required.

IMPORTANT SAFETY RULES — CHILD PRODUCT:
- This vehicle is ridden by children aged 3 to 6. Safety is the absolute top priority.
- Any burning smell, smoke, sparks, battery swelling, or exposed wiring: recommend safety_stop immediately. Do not troubleshoot further.
- If a child was hurt during use: recommend human_support immediately. Do not troubleshoot.
- Never give dangerous repair instructions.
- Never tell the parent to perform electrical repairs, bypass safety switches, or modify the vehicle.
- Use warm, reassuring language: "Based on what I can see...", "This appears to be...", "A MagicCars specialist should confirm this before the vehicle is used again."
- Never claim certainty from a photo or video alone.
- If in doubt, escalate.

VEHICLE KNOWLEDGE BASE:
{{KNOWLEDGE_BASE}}

CALLER ISSUE TYPE: {{ISSUE_TYPE}}
CALLER DESCRIPTION: {{ISSUE_DESCRIPTION}}
CALLER NOTE: {{NOTE}}

Return ONLY a valid JSON object with exactly these fields:
{
  "visual_summary": "What you can see in the image/video",
  "likely_issue": "What issue this appears to suggest based on the knowledge base",
  "confidence_level": "low | medium | high",
  "safe_owner_steps": ["step 1", "step 2"],
  "do_not_do": ["warning 1", "warning 2"],
  "escalation_required": true | false,
  "recommended_route": "self_fix | replacement_part | warranty_replacement | out_of_warranty | safety_stop | human_support",
  "service_case_summary": "A plain English summary for the service case"
}`

/**
 * Run visual AI analysis on one or more uploaded files.
 * When multiple fileUrls are provided, all images are passed to GPT-4o in a
 * single request so the model can reason across all views at once.
 * Falls back to deterministic demo analysis when OpenAI is not configured or
 * when all files are videos.
 */
export async function runAnalysis(params: {
  fileUrl: string         // primary file (kept for backward compat)
  fileType: string
  issueType: string
  issueDescription: string
  note?: string
  // Optional additional files from multi-upload
  additionalFileUrls?: Array<{ url: string; type: string }>
}): Promise<AnalysisResult> {
  const { fileUrl, fileType, issueType, issueDescription, note, additionalFileUrls } = params

  // Collect all image URLs (skip videos — GPT-4o vision only handles images)
  const imageEntries = [
    ...(isImage(fileType) && fileUrl.startsWith('https://') ? [{ url: fileUrl, type: fileType }] : []),
    ...(additionalFileUrls ?? []).filter(f => isImage(f.type) && f.url.startsWith('https://')),
  ]

  if (process.env.OPENAI_API_KEY && imageEntries.length > 0) {
    try {
      return await runOpenAIAnalysis({ images: imageEntries, issueType, issueDescription, note })
    } catch (err) {
      console.error('[Analysis] OpenAI vision failed, falling back to demo:', err)
    }
  }

  // Fallback: deterministic demo analysis
  return runDemoAnalysis({ issueType, issueDescription, note })
}

function isImage(fileType: string): boolean {
  return fileType.startsWith('image/')
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const headers: Record<string, string> = {}
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
  }
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`Failed to fetch image from blob: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  return { base64: Buffer.from(arrayBuffer).toString('base64'), mimeType: contentType.split(';')[0] }
}

async function runOpenAIAnalysis(params: {
  images: Array<{ url: string; type: string }>
  issueType: string
  issueDescription: string
  note?: string
}): Promise<AnalysisResult> {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Fetch all images in parallel
  const imageData = await Promise.all(
    params.images.map(img => fetchImageAsBase64(img.url))
  )

  const prompt = VISION_PROMPT
    .replace('{{KNOWLEDGE_BASE}}', getKnowledgeBasePrompt())
    .replace('{{ISSUE_TYPE}}', params.issueType)
    .replace('{{ISSUE_DESCRIPTION}}', params.issueDescription)
    .replace('{{NOTE}}', params.note || 'None provided')

  // Add a note about multiple images if more than one
  const imageCountNote = imageData.length > 1
    ? `\n\nNOTE: The caller has provided ${imageData.length} photos. Analyze all of them together to get the most complete picture of the issue.`
    : ''

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  type ImageUrlContent = { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' | 'auto' } }
  type TextContent = { type: 'text'; text: string }

  const imageContent: ImageUrlContent[] = imageData.map(({ base64, mimeType }) => ({
    type: 'image_url' as const,
    image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' as const },
  }))

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt + imageCountNote } as TextContent,
          ...imageContent,
        ],
      },
    ],
    max_tokens: 1400,
  })

  const content = completion.choices[0]?.message?.content || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in OpenAI response')

  return sanitizeAnalysis(JSON.parse(jsonMatch[0]) as AnalysisResult)
}

/**
 * Deterministic demo analysis based on issue type.
 * Used when OpenAI is not configured or when file is a video.
 */
function runDemoAnalysis(params: {
  issueType: string
  issueDescription: string
  note?: string
}): AnalysisResult {
  const { issueType, issueDescription, note } = params
  const match = matchKnowledgeEntry(issueType, issueDescription)

  if (!match) {
    return {
      visual_summary:
        'Based on what I can see, the uploaded media shows the reported area of concern. I was not able to match this to a specific known issue in the MagicCars knowledge base for this vehicle.',
      likely_issue:
        'Unknown issue — not matched to the knowledge base. A MagicCars specialist should inspect this.',
      confidence_level: 'low',
      safe_owner_steps: [
        'Stop operating the vehicle until the issue is identified.',
        'Document the issue with photos and notes.',
        'Contact MagicCars support for further assistance.',
      ],
      do_not_do: [
        'Do not attempt repairs without a specialist diagnosis.',
        'Do not allow the child to use the vehicle until the issue is resolved.',
      ],
      escalation_required: true,
      recommended_route: 'human_support',
      service_case_summary:
        `Parent reported: "${issueDescription}". Issue type: ${issueType}. ${note ? `Parent note: "${note}".` : ''} Issue could not be matched to the MagicCars knowledge base. Specialist review recommended.`,
    }
  }

  // Safety escalation issues — override with safety-first messaging
  if (match.recommended_route === 'safety_stop') {
    return {
      visual_summary:
        `Based on what I can see, the uploaded media shows the ${match.system_name.toLowerCase()} concern on the vehicle.${note ? ` Parent note: "${note}".` : ''} This is a safety-critical issue requiring immediate action.`,
      likely_issue: `SAFETY ISSUE: ${match.possible_causes[0]}. This vehicle must not be used until the issue is resolved.`,
      confidence_level: 'high',
      safe_owner_steps: match.safe_owner_steps,
      do_not_do: match.do_not_do,
      escalation_required: true,
      recommended_route: 'safety_stop',
      service_case_summary:
        `SAFETY ESCALATION. Parent reported ${match.system_name.toLowerCase()} on their ${getVehicleName()}. Issue: "${issueDescription}". This vehicle must not be used. Immediate specialist follow-up required.`,
    }
  }

  // Build a realistic-sounding demo analysis from the knowledge base entry
  const noteText = note ? ` Parent also noted: "${note}".` : ''

  return {
    visual_summary:
      `Based on what I can see in the uploaded media, the image shows the ${match.system_name.toLowerCase()} area of the vehicle.${noteText} The visible details appear consistent with the reported issue of "${match.issue_description}". This is a visual assessment only — a MagicCars specialist should confirm before the vehicle is used again.`,
    likely_issue:
      `This appears to be consistent with: ${match.possible_causes[0]}. Other possible causes include: ${match.possible_causes.slice(1).join(', ')}.`,
    confidence_level: 'medium',
    safe_owner_steps: match.safe_owner_steps,
    do_not_do: match.do_not_do,
    escalation_required: match.escalation_required,
    recommended_route: match.recommended_route,
    service_case_summary:
      `Parent reported an issue with the ${match.system_name} (${match.component}) on their ${getVehicleName()}. Issue: "${issueDescription}". Based on visual review: ${match.possible_causes[0]}. ${match.escalation_trigger}. Recommended route: ${match.recommended_route}.`,
  }
}

function getVehicleName(): string {
  return process.env.DEMO_VEHICLE_NAME || 'Magic Cars 12V 2WD Ride-On Jeep'
}

function sanitizeAnalysis(raw: Partial<AnalysisResult>): AnalysisResult {
  const validConfidence = ['low', 'medium', 'high']
  const validRoutes = [
    'self_fix', 'replacement_part', 'warranty_replacement',
    'out_of_warranty', 'safety_stop', 'human_support',
  ]

  return {
    visual_summary: raw.visual_summary || 'Visual analysis completed.',
    likely_issue: raw.likely_issue || 'Unable to determine likely issue.',
    confidence_level: validConfidence.includes(raw.confidence_level || '')
      ? (raw.confidence_level as AnalysisResult['confidence_level'])
      : 'low',
    safe_owner_steps: Array.isArray(raw.safe_owner_steps) ? raw.safe_owner_steps : [],
    do_not_do: Array.isArray(raw.do_not_do) ? raw.do_not_do : [],
    escalation_required: raw.escalation_required ?? true,
    recommended_route: validRoutes.includes(raw.recommended_route || '')
      ? (raw.recommended_route as AnalysisResult['recommended_route'])
      : 'human_support',
    service_case_summary:
      raw.service_case_summary || 'Service case created from visual diagnostic session.',
  }
}
