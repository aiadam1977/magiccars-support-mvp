/**
 * MagicCars Support MVP — Vercel KV Database
 *
 * All functions are async and backed by Vercel KV (Redis).
 * Replaces the local JSON file store that fails on Vercel's read-only filesystem.
 */

import { kv } from '@vercel/kv'

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

export interface ServiceCase {
  case_id: string
  call_id: string
  session_id: string
  caller_name: string
  caller_phone: string
  vehicle: string
  issue_description: string
  analysis_summary: string
  recommended_route: string
  escalation_reason: string
  analysis?: AnalysisResult
  file_path?: string
  file_name?: string
  file_type?: string
  status: 'open' | 'assigned' | 'resolved'
  created_at: string
  updated_at: string
}

// ─── ID list helpers ─────────────────────────────────────────────────────────
// Store ordered ID lists as plain JSON arrays. Newest entries are prepended so
// reads are always newest-first. kv.get / kv.set are the most reliable ops in
// @vercel/kv v3 and avoid sorted-set API surface issues.

async function prependId(listKey: string, id: string): Promise<void> {
  const existing = (await kv.get<string[]>(listKey)) ?? []
  // Deduplicate just in case, then prepend
  const updated = [id, ...existing.filter(x => x !== id)]
  await kv.set(listKey, updated)
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(session: VisualSession): Promise<VisualSession> {
  await kv.set(`mc:session:${session.session_id}`, session)
  await prependId('mc:session-ids', session.session_id)
  return session
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
  const ids = (await kv.get<string[]>('mc:session-ids')) ?? []
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
  const ids = (await kv.get<string[]>('mc:case-ids')) ?? []
  if (ids.length === 0) return []
  const cases = await Promise.all(
    ids.map(id => kv.get<ServiceCase>(`mc:case:${id}`))
  )
  return cases.filter((c): c is ServiceCase => c !== null)
}
