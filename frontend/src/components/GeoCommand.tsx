import { useEffect, useMemo, useState } from 'react'
import { getGeoIntel, type GeoHotspot, type GeoIntel } from '../api'

const MAP_W = 560
const MAP_H = 640
const LNG_MIN = 68
const LNG_MAX = 98
const LAT_MIN = 8
const LAT_MAX = 37

const TYPE_META: Record<string, { label: string; color: string }> = {
  digital_arrest: { label: 'Digital Arrest', color: '#f87171' },
  phishing: { label: 'Phishing', color: '#fb923c' },
  counterfeit: { label: 'Counterfeit', color: '#a78bfa' },
  mule_account: { label: 'Mule Accounts', color: '#fbbf24' },
}

function project(lat: number, lng: number) {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H
  return { x, y }
}

function riskColor(score: number) {
  if (score >= 70) return '#ef4444'
  if (score >= 50) return '#f97316'
  if (score >= 30) return '#eab308'
  return '#3b82f6'
}

export default function GeoCommand() {
  const [data, setData] = useState<GeoIntel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<GeoHotspot | null>(null)

  useEffect(() => {
    getGeoIntel()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load geo intel'))
  }, [])

  const incidents = useMemo(
    () => (data ? data.incidents.filter((i) => !filter || i.type === filter) : []),
    [data, filter],
  )

  if (error) return <div className="text-red-400 text-sm">{error}</div>
  if (!data) return <div className="text-slate-500 text-sm">Loading geospatial intel…</div>

  const maxIncidents = Math.max(...data.hotspots.map((h) => h.total_incidents), 1)

  return (
    <div className="space-y-4">
      {/* Stats + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Stat label="Incidents" value={String(data.stats.total_incidents)} />
        <Stat label="Cities" value={String(data.stats.cities_monitored)} />
        <Stat label="High-risk zones" value={String(data.stats.high_risk_zones)} />
        <Stat label="Top hotspot" value={String(data.stats.top_hotspot)} />
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              !filter ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'
            }`}
          >
            All
          </button>
          {Object.entries(TYPE_META).map(([t, m]) => (
            <button
              key={t}
              onClick={() => setFilter(filter === t ? null : t)}
              className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1.5 transition-colors ${
                filter === t ? 'border-white/60 text-white bg-white/10' : 'border-white/10 text-slate-400 hover:bg-white/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 card p-2">
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full h-[440px] sm:h-[600px]">
            {/* graticule */}
            {Array.from({ length: 7 }).map((_, i) => {
              const x = (i / 6) * MAP_W
              const y = (i / 6) * MAP_H
              return (
                <g key={i}>
                  <line x1={x} y1={0} x2={x} y2={MAP_H} stroke="#1e293b" strokeWidth={1} />
                  <line x1={0} y1={y} x2={MAP_W} y2={y} stroke="#1e293b" strokeWidth={1} />
                </g>
              )
            })}

            {/* hotspot halos */}
            {data.hotspots.map((h) => {
              const { x, y } = project(h.lat, h.lng)
              const radius = 10 + (h.total_incidents / maxIncidents) * 34
              return (
                <circle
                  key={`halo-${h.city}`}
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={riskColor(h.risk_score)}
                  fillOpacity={0.12}
                  stroke={riskColor(h.risk_score)}
                  strokeOpacity={0.25}
                />
              )
            })}

            {/* incident points */}
            {incidents.map((i) => {
              const { x, y } = project(i.lat, i.lng)
              return (
                <circle
                  key={i.id}
                  cx={x}
                  cy={y}
                  r={i.severity === 'high' ? 4 : i.severity === 'medium' ? 3 : 2}
                  fill={TYPE_META[i.type].color}
                  fillOpacity={0.9}
                />
              )
            })}

            {/* hotspot markers */}
            {data.hotspots.map((h) => {
              const { x, y } = project(h.lat, h.lng)
              const active = selected?.city === h.city
              return (
                <g
                  key={h.city}
                  transform={`translate(${x} ${y})`}
                  className="cursor-pointer"
                  onClick={() => setSelected(active ? null : h)}
                >
                  <circle
                    r={active ? 7 : 5}
                    fill={riskColor(h.risk_score)}
                    stroke="#fff"
                    strokeWidth={active ? 2 : 1}
                  />
                  {h.patrol_priority <= 6 && (
                    <text x={8} y={4} fontSize={10} className="fill-slate-300">
                      {h.city}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Patrol priority */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-400">
            Patrol Priority Ranking
          </h3>
          <div className="space-y-2 lg:max-h-[560px] lg:overflow-auto pr-1">
            {data.hotspots.map((h) => (
              <button
                key={h.city}
                onClick={() => setSelected(selected?.city === h.city ? null : h)}
                className={`w-full text-left bg-slate-900/40 backdrop-blur-xl rounded-xl p-3 border transition-colors ${
                  selected?.city === h.city
                    ? 'border-blue-500/60 bg-blue-600/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: riskColor(h.risk_score) }}
                  >
                    {h.patrol_priority}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-slate-100">
                      {h.city}, {h.state}
                    </div>
                    <div className="text-[11px] text-slate-500 capitalize">
                      {h.dominant_type.replace(/_/g, ' ')} · {h.total_incidents} incidents
                    </div>
                  </div>
                  <span className="ml-auto text-xs font-bold" style={{ color: riskColor(h.risk_score) }}>
                    {h.risk_score}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-2">
      <div className="text-base font-bold text-white">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}
