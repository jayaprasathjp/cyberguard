import { useState } from 'react'
import { scanCurrency, type CurrencyScan } from '../api'

const VERDICT_STYLES: Record<string, string> = {
  LIKELY_GENUINE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  SUSPECT: 'bg-red-500/20 text-red-300 border-red-500/40',
  INCONCLUSIVE: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
}

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  pass: { dot: 'bg-emerald-400', label: 'text-emerald-300' },
  warn: { dot: 'bg-yellow-400', label: 'text-yellow-300' },
  fail: { dot: 'bg-red-400', label: 'text-red-300' },
}

export default function CurrencyScanner() {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CurrencyScan | null>(null)

  function onSelect(f: File | null) {
    setResult(null)
    setError(null)
    setFile(f)
    if (f) setPreview(URL.createObjectURL(f))
    else setPreview(null)
  }

  async function run() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      setResult(await scanCurrency(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Upload */}
      <div className="card p-5 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-1 text-white">Counterfeit Currency Scanner</h2>
        <p className="text-slate-400 text-sm mb-4">
          Upload a photo of an Indian banknote. The engine estimates the
          denomination and screens key security features.
        </p>

        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-white/15 bg-white/2 rounded-xl h-56 flex items-center justify-center overflow-hidden hover:border-blue-500/60 hover:bg-white/4 transition-colors">
            {preview ? (
              <img src={preview} alt="note" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-slate-500 text-sm">Click to upload a banknote image</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          onClick={run}
          disabled={loading || !file}
          className="btn-accent w-full mt-4 py-2.5 px-4"
        >
          {loading ? 'Scanning…' : 'Scan Note'}
        </button>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {/* Result */}
      <div className="card p-5 sm:p-6 min-h-[300px]">
        {!result ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Scan results will appear here.
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-white">
                  {result.denomination}
                </div>
                <div className="text-[11px] text-slate-500">
                  {(result.denomination_confidence * 100).toFixed(0)}% match
                </div>
              </div>
              <div className="flex-1">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${VERDICT_STYLES[result.verdict]}`}
                >
                  {result.verdict.replace(/_/g, ' ')}
                </span>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Authenticity</span>
                    <span>{result.authenticity_score}/100</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        result.authenticity_score >= 75
                          ? 'bg-emerald-400'
                          : result.authenticity_score >= 50
                            ? 'bg-yellow-400'
                            : 'bg-red-400'
                      }`}
                      style={{ width: `${result.authenticity_score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                Security Feature Checks
              </h3>
              <div className="space-y-2">
                {result.feature_checks.map((c) => {
                  const s = STATUS_STYLES[c.status]
                  return (
                    <div key={c.feature} className="surface p-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                        <span className="text-sm font-semibold text-slate-100">{c.feature}</span>
                        <span className={`ml-auto text-xs font-bold uppercase ${s.label}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{c.detail}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="surface p-2">
                <div className="text-sm font-semibold text-slate-100">{result.image_quality.aspect_ratio}</div>
                <div className="text-[10px] text-slate-500">Aspect</div>
              </div>
              <div className="surface p-2">
                <div className="text-sm font-semibold text-slate-100">{result.image_quality.sharpness}</div>
                <div className="text-[10px] text-slate-500">Sharpness</div>
              </div>
              <div className="surface p-2">
                <div className="text-sm font-semibold text-slate-100">
                  {(result.image_quality.brightness * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-500">Brightness</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">{result.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
