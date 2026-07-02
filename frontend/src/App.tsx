import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [health, setHealth] = useState<string>('checking...')

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then(res => res.json())
      .then(data => setHealth(data.status))
      .catch(err => setHealth('offline'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-8">
      <header className="w-full max-w-4xl text-center mb-12 mt-8">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          CyberGuard Console
        </h1>
        <p className="mt-4 text-gray-400 text-lg">
          Advanced Fraud Detection & Scam Analysis Network
        </p>
      </header>

      <main className="flex-1 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* API Status Card */}
        <section className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 transition-transform hover:-translate-y-1 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-100">System Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${health === 'ok' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {health === 'ok' ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-gray-400">
            Backend API connection is {health === 'ok' ? 'established and healthy' : 'currently disconnected or unreachable'}.
          </p>
        </section>

        {/* Feature Stubs */}
        <section className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 transition-transform hover:-translate-y-1 hover:shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">NLP Scam Detection</h2>
          <p className="text-gray-400 mb-4">Analyze call transcripts for fraudulent intent.</p>
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Analyze Call
          </button>
        </section>

        <section className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 transition-transform hover:-translate-y-1 hover:shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Fraud Network Graph</h2>
          <p className="text-gray-400 mb-4">Visualize complex scammer networks and node connections.</p>
          <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            View Graph
          </button>
        </section>

        <section className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 transition-transform hover:-translate-y-1 hover:shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Currency Scanner</h2>
          <p className="text-gray-400 mb-4">Verify image authenticity to detect counterfeit currency.</p>
          <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Scan Image
          </button>
        </section>

      </main>

      <footer className="mt-16 text-gray-500 text-sm">
        &copy; 2024 CyberGuard Systems. All rights reserved.
      </footer>
    </div>
  )
}

export default App
