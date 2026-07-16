// API client and shared types for the CyberGuard console.

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:8000'

export interface ScamIndicator {
  category: string
  severity: 'low' | 'medium' | 'high'
  weight: number
  matches: string[]
  explanation: string
}

export interface MhaAlert {
  alert_id: string
  priority: string
  scam_category: string
  channel: string
  recommended_routing: string
  generated_at: string
  summary: string
}

export interface ScamAnalysis {
  risk_score: number
  risk_level: 'SAFE' | 'LOW' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL'
  scam_category: string
  confidence: number
  summary: string
  indicators: ScamIndicator[]
  recommended_actions: string[]
  mha_alert: MhaAlert | null
  analysis_engine: string
}

export interface FeatureCheck {
  feature: string
  status: 'pass' | 'warn' | 'fail'
  score: number
  detail: string
}

export interface CurrencyScan {
  denomination: string
  denomination_confidence: number
  verdict: 'LIKELY_GENUINE' | 'SUSPECT' | 'INCONCLUSIVE'
  authenticity_score: number
  image_quality: {
    width: number
    height: number
    aspect_ratio: number
    sharpness: number
    brightness: number
  }
  feature_checks: FeatureCheck[]
  notes: string
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.detail) msg = body.detail
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/health`)
  return handle(res)
}

export async function analyzeCall(
  text: string,
  channel: string,
): Promise<ScamAnalysis> {
  const res = await fetch(`${API_BASE}/api/analyze-call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, channel }),
  })
  return handle(res)
}

export async function scanCurrency(file: File): Promise<CurrencyScan> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/api/scan-currency`, {
    method: 'POST',
    body: form,
  })
  return handle(res)
}

// ---------- Fraud network ----------

export interface GraphNode {
  id: string
  label: string
  type: 'scammer' | 'mule' | 'victim' | 'account' | 'device' | 'phone'
  ring: number
  risk: number
  amount: number
  jurisdiction: string
}

export interface GraphEdge {
  source: string
  target: string
  type: 'call' | 'transaction' | 'owns' | 'uses'
  amount?: number | null
  weight: number
}

export interface RingPackage {
  ring_id: number
  label: string
  node_count: number
  victim_count: number
  mule_count: number
  total_defrauded: number
  jurisdictions: string[]
  cross_jurisdiction: boolean
  kingpins: string[]
  lead_time_days: number
  evidence_hash: string
  summary: string
}

export interface FraudNetwork {
  nodes: GraphNode[]
  edges: GraphEdge[]
  rings: RingPackage[]
  stats: Record<string, number>
}

export async function getFraudNetwork(): Promise<FraudNetwork> {
  const res = await fetch(`${API_BASE}/api/fraud-network`)
  return handle(res)
}

// ---------- Geospatial ----------

export interface GeoIncident {
  id: string
  city: string
  state: string
  lat: number
  lng: number
  type: 'digital_arrest' | 'phishing' | 'counterfeit' | 'mule_account'
  severity: 'low' | 'medium' | 'high'
  count: number
}

export interface GeoHotspot {
  city: string
  state: string
  lat: number
  lng: number
  total_incidents: number
  dominant_type: string
  risk_score: number
  patrol_priority: number
}

export interface GeoIntel {
  incidents: GeoIncident[]
  hotspots: GeoHotspot[]
  stats: Record<string, number | string>
}

export async function getGeoIntel(): Promise<GeoIntel> {
  const res = await fetch(`${API_BASE}/api/geo-intel`)
  return handle(res)
}
