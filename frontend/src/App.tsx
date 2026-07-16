import { useEffect, useState, type ReactNode } from 'react'
import { getHealth } from './api'
import ScamDetector from './components/ScamDetector'
import CurrencyScanner from './components/CurrencyScanner'
import FraudNetwork from './components/FraudNetwork'
import GeoCommand from './components/GeoCommand'
import './index.css'

type Tab = 'scam' | 'currency' | 'network' | 'geo'

function Icon({ name, className = 'w-5 h-5' }: { name: Tab; className?: string }) {
  const paths: Record<Tab, ReactNode> = {
    scam: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z M9.5 11.5l1.8 1.8 3.2-3.6"
      />
    ),
    currency: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.4" />
        <path strokeLinecap="round" d="M6 9v6M18 9v6" />
      </>
    ),
    network: (
      <>
        <circle cx="6" cy="7" r="2.2" />
        <circle cx="18" cy="7" r="2.2" />
        <circle cx="12" cy="17" r="2.2" />
        <path strokeLinecap="round" d="M7.6 8.6l3 6.4M16.4 8.6l-3 6.4M8 7h8" />
      </>
    ),
    geo: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21c4-4.5 6.5-8 6.5-11a6.5 6.5 0 10-13 0c0 3 2.5 6.5 6.5 11z M12 10.5a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z"
      />
    ),
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className={className}>
      {paths[name]}
    </svg>
  )
}

const NAV: { id: Tab; label: string; short: string; hint: string }[] = [
  { id: 'scam', label: 'Scam Detection', short: 'Scam', hint: 'Digital-arrest & fraud NLP' },
  { id: 'currency', label: 'Currency Scanner', short: 'Notes', hint: 'Counterfeit note screening' },
  { id: 'network', label: 'Fraud Network', short: 'Network', hint: 'Graph intelligence' },
  { id: 'geo', label: 'Geo Command', short: 'Geo', hint: 'Crime hotspot map' },
]

function StatusDot({ health }: { health: 'checking' | 'ok' | 'offline' }) {
  const color =
    health === 'ok' ? 'bg-emerald-400' : health === 'checking' ? 'bg-amber-400' : 'bg-red-400'
  return (
    <span className="flex items-center gap-2 text-xs text-slate-400">
      <span className={`w-2 h-2 rounded-full ${color} ${health === 'ok' ? 'pulse-dot' : ''}`} />
      API {health === 'ok' ? 'online' : health === 'checking' ? 'connecting…' : 'offline'}
    </span>
  )
}

function App() {
  const [tab, setTab] = useState<Tab>('scam')
  const [health, setHealth] = useState<'checking' | 'ok' | 'offline'>('checking')

  useEffect(() => {
    getHealth()
      .then((d) => setHealth(d.status === 'ok' ? 'ok' : 'offline'))
      .catch(() => setHealth('offline'))
  }, [])

  const active = NAV.find((n) => n.id === tab)!

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col p-4 border-r border-white/5 bg-slate-950/40 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-950/50">
            <Icon name="scam" className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold gradient-text leading-tight">CyberGuard</h1>
            <p className="text-[10px] text-slate-500 leading-tight">
              Public Safety Intelligence
            </p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          {NAV.map((n) => {
            const isActive = tab === n.id
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-linear-to-r from-blue-600/25 to-emerald-500/10 border border-blue-500/40 shadow-lg shadow-blue-950/30'
                    : 'border border-transparent hover:bg-white/5'
                }`}
              >
                <span
                  className={`shrink-0 ${isActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-slate-200'}`}
                >
                  <Icon name={n.id} />
                </span>
                <span className="text-left">
                  <span
                    className={`block text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}
                  >
                    {n.label}
                  </span>
                  <span className="block text-[11px] text-slate-500">{n.hint}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="surface px-3 py-2.5 mt-4">
          <StatusDot health={health} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 px-4 md:px-6 py-3.5 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl flex items-center gap-3">
          {/* Mobile brand */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-emerald-400 flex items-center justify-center">
              <Icon name="scam" className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold gradient-text">CyberGuard</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-blue-300">
              <Icon name={active.id} className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">{active.label}</h2>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden sm:block text-xs text-slate-500">
              Proactive threat neutralisation
            </span>
            <span className="md:hidden">
              <StatusDot health={health} />
            </span>
          </div>
        </header>

        {/* Content */}
        <main
          key={tab}
          className="animate-fade-in flex-1 p-4 md:p-6 pb-28 md:pb-8 overflow-auto"
        >
          {tab === 'scam' && <ScamDetector />}
          {tab === 'currency' && <CurrencyScanner />}
          {tab === 'network' && <FraudNetwork />}
          {tab === 'geo' && <GeoCommand />}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="grid grid-cols-4">
          {NAV.map((n) => {
            const isActive = tab === n.id
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${
                  isActive ? 'text-blue-300' : 'text-slate-500'
                }`}
              >
                <span
                  className={`relative ${isActive ? '-translate-y-0.5' : ''} transition-transform`}
                >
                  <Icon name={n.id} className="w-6 h-6" />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </span>
                <span className="text-[10px] font-medium">{n.short}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default App
