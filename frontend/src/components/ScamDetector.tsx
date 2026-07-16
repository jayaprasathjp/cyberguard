import { useState } from 'react'
import { analyzeCall, type ScamAnalysis } from '../api'

const SAMPLES: Record<string, string> = {
  'Digital Arrest':
    "This is Inspector Sharma from CBI. Your Aadhaar is linked to a money laundering case and an arrest warrant has been issued. You are under digital arrest — do not disconnect this video call or tell your family. To clear your name you must transfer the funds in your account to this government verification account immediately via RTGS.",
  'Bank Phishing':
    "Dear customer, your bank account will be blocked today. Share your OTP and CVV now to complete KYC verification, otherwise your account is suspended.",
  'Normal Message':
    "Hi, are we still meeting for lunch tomorrow at 1pm? Let me know if the place works for you.",
}

const LEVEL_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-300 border-red-500/40',
  HIGH: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  SUSPICIOUS: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  LOW: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  SAFE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
}

const SEVERITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
}

function gaugeColor(score: number) {
  if (score >= 85) return 'text-red-400'
  if (score >= 65) return 'text-orange-400'
  if (score >= 40) return 'text-yellow-400'
  if (score >= 15) return 'text-blue-400'
  return 'text-emerald-400'
}

export default function ScamDetector() {
  const [text, setText] = useState('')
  const [channel, setChannel] = useState('call')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScamAnalysis | null>(null)

  async function run() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      setResult(await analyzeCall(text, channel))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const circumference = 2 * Math.PI * 52

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Input */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-1 text-white">Scam Call / Message Analyser</h2>
        <p className="text-slate-400 text-sm mb-4">
          Paste a call transcript or message. The engine flags digital-arrest and
          fraud patterns before any money is transferred.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {Object.keys(SAMPLES).map((k) => (
            <button
              key={k}
              onClick={() => setText(SAMPLES[k])}
              className="chip text-xs px-3 py-1"
            >
              {k}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          placeholder="Paste the suspicious call transcript or message here…"
          className="input w-full p-3 text-sm resize-none"
        />

        <div className="flex items-center gap-3 mt-3">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="input px-3 py-2.5 text-sm"
          >
            <option value="call">Call</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
          <button
            onClick={run}
            disabled={loading || !text.trim()}
            className="btn-primary flex-1 py-2.5 px-4"
          >
            {loading ? 'Analysing…' : 'Analyse for Fraud'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Result */}
      <div className="card p-5 sm:p-6 min-h-[300px]">
        {!result ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Results will appear here after analysis.
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-5">
              <div className="relative w-32 h-32 shrink-0">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className={gaugeColor(result.risk_score)}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - result.risk_score / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${gaugeColor(result.risk_score)}`}>
                    {result.risk_score}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Risk</span>
                </div>
              </div>
              <div className="space-y-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${LEVEL_STYLES[result.risk_level]}`}
                >
                  {result.risk_level}
                </span>
                <p className="text-sm text-slate-300 font-medium capitalize">
                  {result.scam_category.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-slate-500">
                  Confidence {(result.confidence * 100).toFixed(0)}% · engine:{' '}
                  {result.analysis_engine}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300">{result.summary}</p>

            {result.indicators.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                  Detected Indicators
                </h3>
                <div className="space-y-2">
                  {result.indicators.map((ind) => (
                    <div key={ind.category} className="surface p-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[ind.severity]}`} />
                        <span className="text-sm font-semibold text-slate-100">{ind.category}</span>
                        <span className="ml-auto text-xs text-slate-500">+{ind.weight}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{ind.explanation}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ind.matches.map((m, i) => (
                          <span
                            key={i}
                            className="text-[11px] bg-white/5 border border-white/10 text-slate-200 px-2 py-0.5 rounded"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                Recommended Actions
              </h3>
              <ul className="space-y-1">
                {result.recommended_actions.map((a, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-emerald-400">→</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {result.mha_alert && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-300 font-bold text-sm">
                    MHA / I4C Alert Generated
                  </span>
                  <span className="ml-auto text-[11px] font-mono bg-red-500/20 text-red-200 px-2 py-0.5 rounded">
                    {result.mha_alert.priority}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-300">
                  {result.mha_alert.alert_id}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Routing: {result.mha_alert.recommended_routing}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
