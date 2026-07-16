import { useEffect, useMemo, useRef, useState } from 'react'
import { getFraudNetwork, type FraudNetwork, type GraphNode } from '../api'

const VIEW_W = 900
const VIEW_H = 620

const NODE_STYLE: Record<string, { color: string; r: number }> = {
  scammer: { color: '#f87171', r: 16 },
  mule: { color: '#fb923c', r: 12 },
  account: { color: '#fbbf24', r: 9 },
  device: { color: '#a78bfa', r: 8 },
  victim: { color: '#60a5fa', r: 9 },
  phone: { color: '#34d399', r: 8 },
}

const EDGE_COLOR: Record<string, string> = {
  transaction: '#fbbf24',
  call: '#64748b',
  owns: '#fb923c',
  uses: '#a78bfa',
}

interface Pos {
  x: number
  y: number
  vx: number
  vy: number
  fixed: boolean
}

function inr(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

export default function FraudNetwork() {
  const [data, setData] = useState<FraudNetwork | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [activeRing, setActiveRing] = useState<number | null>(null)
  const [, setTick] = useState(0)

  const posRef = useRef<Record<string, Pos>>({})
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<string | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    getFraudNetwork()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load network'))
  }, [])

  const ringCount = data?.rings.length ?? 1

  // Initialise positions clustered by ring.
  useEffect(() => {
    if (!data) return
    const pos: Record<string, Pos> = {}
    data.nodes.forEach((n) => {
      const cx = ((n.ring + 0.5) / ringCount) * VIEW_W
      const cy = VIEW_H / 2
      pos[n.id] = {
        x: cx + (Math.random() - 0.5) * 160,
        y: cy + (Math.random() - 0.5) * 220,
        vx: 0,
        vy: 0,
        fixed: false,
      }
    })
    posRef.current = pos
  }, [data, ringCount])

  // Force simulation loop.
  useEffect(() => {
    if (!data) return
    const nodes = data.nodes
    const edges = data.edges
    const pos = posRef.current

    function step() {
      const REP = 5200
      const SPRING = 0.02
      const REST = 90
      const GRAV = 0.015
      const DAMP = 0.86

      for (let i = 0; i < nodes.length; i++) {
        const a = pos[nodes[i].id]
        if (!a) continue
        for (let j = i + 1; j < nodes.length; j++) {
          const b = pos[nodes[j].id]
          if (!b) continue
          let dx = a.x - b.x
          let dy = a.y - b.y
          let d2 = dx * dx + dy * dy
          if (d2 < 0.01) {
            dx = Math.random()
            dy = Math.random()
            d2 = 1
          }
          const d = Math.sqrt(d2)
          const f = REP / d2
          const fx = (dx / d) * f
          const fy = (dy / d) * f
          a.vx += fx
          a.vy += fy
          b.vx -= fx
          b.vy -= fy
        }
      }

      for (const e of edges) {
        const a = pos[e.source]
        const b = pos[e.target]
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const f = (d - REST) * SPRING
        const fx = (dx / d) * f
        const fy = (dy / d) * f
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }

      nodes.forEach((n) => {
        const p = pos[n.id]
        if (!p) return
        const cx = ((n.ring + 0.5) / ringCount) * VIEW_W
        p.vx += (cx - p.x) * GRAV
        p.vy += (VIEW_H / 2 - p.y) * GRAV
        if (p.fixed || dragRef.current === n.id) {
          p.vx = 0
          p.vy = 0
          return
        }
        p.vx *= DAMP
        p.vy *= DAMP
        p.vx = Math.max(-30, Math.min(30, p.vx))
        p.vy = Math.max(-30, Math.min(30, p.vy))
        p.x = Math.max(20, Math.min(VIEW_W - 20, p.x + p.vx))
        p.y = Math.max(20, Math.min(VIEW_H - 20, p.y + p.vy))
      })

      setTick((t) => (t + 1) % 100000)
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [data, ringCount])

  function toSvg(e: React.PointerEvent) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const id = dragRef.current
    if (!id) return
    const p = posRef.current[id]
    if (!p) return
    const { x, y } = toSvg(e)
    p.x = x
    p.y = y
  }

  const nodeById = useMemo(() => {
    const m: Record<string, GraphNode> = {}
    data?.nodes.forEach((n) => (m[n.id] = n))
    return m
  }, [data])

  if (error) return <div className="text-red-400 text-sm">{error}</div>
  if (!data) return <div className="text-slate-500 text-sm">Loading fraud network…</div>

  const pos = posRef.current
  const dim = (ring: number) => activeRing !== null && activeRing !== ring

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Rings" value={String(data.stats.rings_detected)} />
        <Stat label="Entities" value={String(data.stats.total_nodes)} />
        <Stat label="Victims" value={String(data.stats.total_victims)} />
        <Stat label="Defrauded" value={inr(Number(data.stats.total_defrauded))} />
        <Stat label="Cross-jurisdiction" value={String(data.stats.cross_jurisdiction_rings)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Graph */}
        <div className="xl:col-span-2 card p-2 relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full h-[380px] sm:h-[520px] touch-none"
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragRef.current = null)}
            onPointerLeave={() => (dragRef.current = null)}
          >
            {data.edges.map((e, i) => {
              const a = pos[e.source]
              const b = pos[e.target]
              if (!a || !b) return null
              const node = nodeById[e.source]
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={EDGE_COLOR[e.type]}
                  strokeWidth={e.type === 'transaction' ? 2 : 1}
                  strokeOpacity={dim(node?.ring ?? -1) ? 0.06 : 0.35}
                />
              )
            })}
            {data.nodes.map((n) => {
              const p = pos[n.id]
              if (!p) return null
              const st = NODE_STYLE[n.type]
              const faded = dim(n.ring)
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  className="cursor-pointer"
                  opacity={faded ? 0.15 : 1}
                  onPointerDown={(e) => {
                    dragRef.current = n.id
                    setSelectedNode(n)
                    ;(e.target as Element).setPointerCapture?.(e.pointerId)
                  }}
                >
                  <circle
                    r={st.r}
                    fill={st.color}
                    stroke={selectedNode?.id === n.id ? '#fff' : '#111827'}
                    strokeWidth={selectedNode?.id === n.id ? 3 : 1.5}
                  />
                  {(n.type === 'scammer' || n.type === 'mule') && (
                    <text
                      y={st.r + 12}
                      textAnchor="middle"
                      className="fill-gray-300"
                      fontSize={11}
                    >
                      {n.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 bg-slate-950/80 backdrop-blur border border-white/10 rounded-lg px-3 py-2">
            {Object.entries(NODE_STYLE).map(([type, st]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: st.color }} />
                <span className="text-[11px] text-slate-300 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Intelligence packages */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wide text-slate-400">
            Intelligence Packages
          </h3>
          {data.rings.map((r) => (
            <button
              key={r.ring_id}
              onClick={() => setActiveRing(activeRing === r.ring_id ? null : r.ring_id)}
              className={`w-full text-left bg-slate-900/40 backdrop-blur-xl rounded-xl p-4 border transition-colors ${
                activeRing === r.ring_id
                  ? 'border-blue-500/60 bg-blue-600/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100">{r.label}</span>
                {r.cross_jurisdiction && (
                  <span className="text-[9px] uppercase bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                    cross-border
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{r.summary}</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="text-slate-500">
                  Defrauded <span className="text-slate-200 font-semibold">{inr(r.total_defrauded)}</span>
                </div>
                <div className="text-slate-500">
                  Lead time <span className="text-slate-200 font-semibold">{r.lead_time_days}d</span>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Kingpins: <span className="text-slate-300">{r.kingpins.join(', ')}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                <span>Evidence</span>
                <span className="font-mono text-emerald-400">#{r.evidence_hash}</span>
              </div>
            </button>
          ))}

          {selectedNode && (
            <div className="surface p-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: NODE_STYLE[selectedNode.type].color }}
                />
                <span className="font-semibold text-sm text-slate-100">{selectedNode.label}</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-1">
                <div>Type: <span className="text-slate-200 capitalize">{selectedNode.type}</span></div>
                <div>Risk: <span className="text-slate-200">{selectedNode.risk}/100</span></div>
                <div>Jurisdiction: <span className="text-slate-200">{selectedNode.jurisdiction}</span></div>
                {selectedNode.amount > 0 && (
                  <div>Amount: <span className="text-slate-200">{inr(selectedNode.amount)}</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}
