/**
 * MagicCars Support MVP — Local JSON Database
 *
 * A simple file-based store for demo purposes.
 * In production, replace with a real database (Postgres, MySQL, etc.)
 */

import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

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

interface DB {
  sessions: Record<string, VisualSession>
  cases: Record<string, ServiceCase>
}

function ensureDataDir() {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readDB(): DB {
  ensureDataDir()
  if (!fs.existsSync(DB_PATH)) {
    const empty: DB = { sessions: {}, cases: {} }
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2))
    return empty
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8')
    return JSON.parse(raw) as DB
  } catch {
    const empty: DB = { sessions: {}, cases: {} }
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2))
    return empty
  }
}

function writeDB(db: DB): void {
  ensureDataDir()
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function createSession(session: VisualSession): VisualSession {
  const db = readDB()
  db.sessions[session.session_id] = session
  writeDB(db)
  return session
}

export function getSession(session_id: string): VisualSession | null {
  const db = readDB()
  return db.sessions[session_id] ?? null
}

export function updateSession(
  session_id: string,
  updates: Partial<VisualSession>
): VisualSession | null {
  const db = readDB()
  const existing = db.sessions[session_id]
  if (!existing) return null
  const updated = { ...existing, ...updates, updated_at: new Date().toISOString() }
  db.sessions[session_id] = updated
  writeDB(db)
  return updated
}

export function getAllSessions(): VisualSession[] {
  const db = readDB()
  return Object.values(db.sessions).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

// ─── Cases ───────────────────────────────────────────────────────────────────

export function createCase(serviceCase: ServiceCase): ServiceCase {
  const db = readDB()
  db.cases[serviceCase.case_id] = serviceCase
  writeDB(db)
  return serviceCase
}

export function getCase(case_id: string): ServiceCase | null {
  const db = readDB()
  return db.cases[case_id] ?? null
}

export function getAllCases(): ServiceCase[] {
  const db = readDB()
  return Object.values(db.cases).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}
