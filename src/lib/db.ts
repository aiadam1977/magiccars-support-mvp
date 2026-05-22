/**
 * MagicCars Support MVP — Vercel KV Database
 *
 * All functions are async and backed by Vercel KV (Redis).
 * Replaces the local JSON file store that fails on Vercel's read-only filesystem.
 */

import { createClient } from '@vercel/kv'

/**
 * @vercel/kv defaults to cache:"default" which lets Next.js cache Upstash HTTP
 * responses, causing stale reads after writes within the same request/invocation.
 * Override with cache:"no-store" and readYourWrites:true so every read sees the
 * latest write from this client. Disable auto-pipelining to prevent batched
 * requests from reordering reads ahead of writes.
 */
const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
  cache: 'no-store',
  readYourWrites: true,
  enableAutoPipelining: false,
})

export interface VisualSession {
  session_id: string
  call_id: string
  caller_phone: string
  caller_name: string
  vehicle_id: string
  vehicle_year: string
  vehicle_make: string
  vehicle_model: string
  issue_type: string
  issue_description: string
  status: 'pending' | 'uploaded' | 'analyzing' | 'complete' | 'error'
  upload_url: string
  file_path?: string
  file_name?: string
  file_type?: string
  note?: string
  analysis?: AnalysisResult
  created_at: string
  updated_at: string
}

export type RecommendedRoute =
  | 'self_fix'
  | 'replacement_part'
  | 'warranty_replacement'
  | 'out_of_warranty'
  | 'safety_stop'
  | 'human_support'

export interface AnalysisResult {
  visual_summary: string
  likely_issue: string
  confidence_level: 'low' | 'medium' | 'high'
  safe_owner_steps: string[]
  do_not_do: string[]
  escalation_required: boolean
  recommended_route: RecommendedRoute
  service_case_summary: string
}

export interface CallMetadata {
  call_id: string
  recording_url?: string
  public_log_url?: string
  transcript?: string
  duration_ms?: number
  start_timestamp?: number
  end_timestamp?: number
  user_sentiment?: string
  call_summary?: string
  call_completion_rating?: string
  dynamic_variables?: Record<string, unknown>
  stored_at: string
}

export interface ServiceCase {
  case_id: string
  call_id: string
  session_id: string
  caller_name: string
  caller_phone: string
  caller_email?: string
  vehicle: string
  issue_description: string
  analysis_summary: string
  recommended_route: string
  escalation_reason: string
  analysis?: AnalysisResult
  call_metadata?: CallMetadata
  file_path?: string
  file_name?: string
  file_type?: string
  status: 'open' | 'assigned' | 'resolved'
  created_at: string
  updated_at: string
}

export type TemplateCategory =
  | 'general'
  | 'warranty'
  | 'parts'
  | 'self_fix'
  | 'safety'
  | 'follow_up'

export interface EmailTemplate {
  template_id: string
  name: string
  category: TemplateCategory
  subject: string
  body: string
  created_at: string
  updated_at: string
}

// ─── Call phone cache ────────────────────────────────────────────────────────
// Written on call_started so create_visual_session never needs to ask the LLM
// or call the Retell API — phone is in KV before Harold calls any tool.

export async function saveCallPhone(call_id: string, phone: string): Promise<void> {
  await kv.set(`mc:call-phone:${call_id}`, phone, { ex: 60 * 60 * 24 }) // 24 h TTL
  // Also store as the most-recent active call phone (30 min TTL) so
  // create_visual_session can find it even when Harold omits call_id.
  await kv.set('mc:last-call-phone', phone, { ex: 60 * 30 })
}

export async function getCallPhone(call_id: string): Promise<string | null> {
  return await kv.get<string>(`mc:call-phone:${call_id}`)
}

export async function getLastCallPhone(): Promise<string | null> {
  return await kv.get<string>('mc:last-call-phone')
}

// ─── ID list helpers ─────────────────────────────────────────────────────────
// Store ordered ID lists as plain JSON arrays. Newest entries are prepended so
// reads are always newest-first. kv.get / kv.set are the most reliable ops in
// @vercel/kv v3 and avoid sorted-set API surface issues.

async function prependId(listKey: string, id: string): Promise<void> {
  // kv.get<string[]> can silently mis-deserialize via the generic; read untyped
  // and use Array.isArray to guard, which reliably handles null and non-arrays.
  const raw = await kv.get(listKey)
  const existing: string[] = Array.isArray(raw) ? raw : []
  const updated = [id, ...existing.filter((x: string) => x !== id)]
  await kv.set(listKey, updated)
}

async function removeId(listKey: string, id: string): Promise<void> {
  const raw = await kv.get(listKey)
  const existing: string[] = Array.isArray(raw) ? raw : []
  await kv.set(listKey, existing.filter((x: string) => x !== id))
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(session: VisualSession): Promise<VisualSession> {
  await kv.set(`mc:session:${session.session_id}`, session)
  await prependId('mc:session-ids', session.session_id)
  // Index call_id → session_id so get_visual_analysis can fall back to call_id lookup
  if (session.call_id) {
    await kv.set(`mc:call-session:${session.call_id}`, session.session_id)
  }
  return session
}

export async function getSessionByCallId(call_id: string): Promise<VisualSession | null> {
  const session_id = await kv.get<string>(`mc:call-session:${call_id}`)
  if (!session_id) return null
  return await kv.get<VisualSession>(`mc:session:${session_id}`)
}

export async function getSession(session_id: string): Promise<VisualSession | null> {
  return await kv.get<VisualSession>(`mc:session:${session_id}`)
}

export async function updateSession(
  session_id: string,
  updates: Partial<VisualSession>
): Promise<VisualSession | null> {
  const existing = await kv.get<VisualSession>(`mc:session:${session_id}`)
  if (!existing) return null
  const updated: VisualSession = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  }
  await kv.set(`mc:session:${session_id}`, updated)
  return updated
}

export async function getAllSessions(): Promise<VisualSession[]> {
  const raw = await kv.get('mc:session-ids')
  const ids: string[] = Array.isArray(raw) ? raw : []
  if (ids.length === 0) return []
  const sessions = await Promise.all(
    ids.map(id => kv.get<VisualSession>(`mc:session:${id}`))
  )
  return sessions.filter((s): s is VisualSession => s !== null)
}

// ─── Cases ───────────────────────────────────────────────────────────────────

export async function createCase(serviceCase: ServiceCase): Promise<ServiceCase> {
  await kv.set(`mc:case:${serviceCase.case_id}`, serviceCase)
  await prependId('mc:case-ids', serviceCase.case_id)
  return serviceCase
}

export async function getCase(case_id: string): Promise<ServiceCase | null> {
  return await kv.get<ServiceCase>(`mc:case:${case_id}`)
}

export async function getAllCases(): Promise<ServiceCase[]> {
  const raw = await kv.get('mc:case-ids')
  const ids: string[] = Array.isArray(raw) ? raw : []
  if (ids.length === 0) return []
  const cases = await Promise.all(
    ids.map(id => kv.get<ServiceCase>(`mc:case:${id}`))
  )
  return cases.filter((c): c is ServiceCase => c !== null)
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export async function createTemplate(template: EmailTemplate): Promise<EmailTemplate> {
  await kv.set(`mc:template:${template.template_id}`, template)
  await prependId('mc:template-ids', template.template_id)
  return template
}

export async function getTemplate(template_id: string): Promise<EmailTemplate | null> {
  return await kv.get<EmailTemplate>(`mc:template:${template_id}`)
}

export async function updateTemplate(
  template_id: string,
  updates: Partial<Pick<EmailTemplate, 'name' | 'category' | 'subject' | 'body'>>
): Promise<EmailTemplate | null> {
  const existing = await kv.get<EmailTemplate>(`mc:template:${template_id}`)
  if (!existing) return null
  const updated: EmailTemplate = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  }
  await kv.set(`mc:template:${template_id}`, updated)
  return updated
}

export async function deleteTemplate(template_id: string): Promise<boolean> {
  const existing = await kv.get(`mc:template:${template_id}`)
  if (!existing) return false
  await kv.del(`mc:template:${template_id}`)
  await removeId('mc:template-ids', template_id)
  return true
}

export async function getAllTemplates(): Promise<EmailTemplate[]> {
  const raw = await kv.get('mc:template-ids')
  const ids: string[] = Array.isArray(raw) ? raw : []
  if (ids.length === 0) return []
  const templates = await Promise.all(
    ids.map(id => kv.get<EmailTemplate>(`mc:template:${id}`))
  )
  return templates.filter((t): t is EmailTemplate => t !== null)
}
