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

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(session: VisualSession): Promise<VisualSession> {
  await kv.set(`mc:session:${session.session_id}`, session)
  await kv.lpush('mc:sessions', session.session_id)
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
  const ids = await kv.lrange<string>('mc:sessions', 0, -1)
  if (!ids || ids.length === 0) return []
  const sessions = await Promise.all(
    ids.map(id => kv.get<VisualSession>(`mc:session:${id}`))
  )
  return sessions
    .filter((s): s is VisualSession => s !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// ─── Cases ───────────────────────────────────────────────────────────────────

export async function createCase(serviceCase: ServiceCase): Promise<ServiceCase> {
  await kv.set(`mc:case:${serviceCase.case_id}`, serviceCase)
  await kv.lpush('mc:cases', serviceCase.case_id)
  return serviceCase
}

export async function getCase(case_id: string): Promise<ServiceCase | null> {
  return await kv.get<ServiceCase>(`mc:case:${case_id}`)
}

export async function getAllCases(): Promise<ServiceCase[]> {
  const ids = await kv.lrange<string>('mc:cases', 0, -1)
  if (!ids || ids.length === 0) return []
  const cases = await Promise.all(
    ids.map(id => kv.get<ServiceCase>(`mc:case:${id}`))
  )
  return cases
    .filter((c): c is ServiceCase => c !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
