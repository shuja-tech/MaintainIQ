import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [code, setCode] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)
  const navigate = useNavigate()

  function goToAsset(e) {
    e.preventDefault()
    if (code.trim()) navigate(`/asset/${code.trim().toUpperCase()}`)
  }

  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim()
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    if (!supabase) return
    setSearching(true)
    const term = `%${trimmed}%`
    try {
      const { data } = await supabase
        .from('assets')
        .select('id, asset_code, name, category, location, condition, status')
        .or(`name.ilike.${term},asset_code.ilike.${term},location.ilike.${term},category.ilike.${term}`)
        .limit(10)
      setSearchResults(data || [])
      setShowResults(true)
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 250)
    return () => clearTimeout(timer)
  }, [searchQuery, doSearch])

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-15 sm:px-7">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-8 -top-10 -z-10 opacity-70"
          style={{
            background: 'url(/src/images/image_503c9e43.png), radial-gradient(closest-side at 30% 20%, rgba(255,201,60,0.18), transparent 65%), radial-gradient(closest-side at 70% 10%, rgba(45,212,191,0.12), transparent 55%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <br></br>
        <br></br>
        <br></br>
        
        <div className="motion-in" style={{ animationDelay: '20ms' }}>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-safety">
            Scan. Report. Diagnose. Maintain.
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Every asset gets a digital identity and a permanent service history.
          </h1>
          <p className="mt-4 max-w-xl text-muted leading-relaxed">
            MaintainIQ turns a scattered mess of registers, phone calls, and spreadsheets into one
            traceable workflow: scan a QR tag, report the issue, let AI triage it, and track it through resolution.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { n: '1', t: 'Scan' },
              { n: '2', t: 'Report' },
              { n: '3', t: 'Resolve' },
            ].map((item) => (
              <div key={item.t} className="asset-tag px-4 py-2 hover-lift">
                <p className="font-mono text-xs text-safety">{item.n}</p>
                <p className="mt-0.5 text-sm font-semibold">{item.t}</p>
              </div>
            ))}
          </div>
          <br></br>
          <br></br>
          <br></br>
          <br></br>
          <br></br>
          <br></br>
        </div>
      </div>

      <div className="mt-8 motion-in" style={{ animationDelay: '30ms' }} ref={searchRef}>
        <div className="asset-tag p-6">
          <p className="font-mono text-xs uppercase text-muted">Find an asset</p>
          <h2 className="mt-1 text-lg font-semibold">Search our product catalog</h2>
          <div className="relative mt-4">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true) }}
              placeholder="Search by name, code, location, or category..."
              className="w-full rounded-tag border border-graphite-600 bg-graphite-800 px-4 py-3 text-sm outline-none focus:border-safety pr-10"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">Searching...</span>
            )}
            {!searching && searchQuery.trim() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted/50">Type to search</span>
            )}
            {showResults && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-graphite-600 bg-graphite-900 shadow-2xl max-h-72 overflow-y-auto">
                {searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                  <p className="py-6 text-center text-sm text-muted">
                    No assets found matching "{searchQuery.trim()}".
                  </p>
                )}
                {searchResults.map((asset) => (
                  <Link
                    key={asset.asset_code}
                    to={`/asset/${asset.asset_code}`}
                    onClick={() => { setShowResults(false); setSearchQuery('') }}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-graphite-800 transition border-b border-graphite-700/60 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{asset.name}</p>
                      <p className="font-mono text-xs text-muted truncate">
                        {asset.asset_code} &middot; {asset.location} &middot; {asset.category}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-tag border border-graphite-600 px-2 py-0.5 text-[11px] text-muted">
                      {asset.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="asset-tag p-6 hover-lift motion-in" style={{ animationDelay: '40ms' }}>
          <p className="font-mono text-xs uppercase text-muted">Have an asset tag?</p>
          <h2 className="mt-1 text-lg font-semibold">Look up by code</h2>
          <form onSubmit={goToAsset} className="mt-4 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. AST-000123"
              className="w-full rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm font-mono outline-none focus:border-safety"
            />
            <button
              type="submit"
              className="rounded-tag bg-safety px-4 py-2 text-sm font-semibold text-graphite-950 hover:brightness-95 transition"
            >
              Go
            </button>
          </form>
        </div>
        <div className="asset-tag p-6 hover-lift motion-in" style={{ animationDelay: '120ms' }}>
          <p className="font-mono text-xs uppercase text-muted">Team member?</p>
          <h2 className="mt-1 text-lg font-semibold">Manage assets &amp; issues</h2>
          <p className="mt-2 text-sm text-muted">
            Sign in to register assets, generate QR labels, triage issues with AI, and assign work to technicians.
          </p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-tag border border-graphite-600 px-4 py-2 text-sm hover:border-safety hover:text-safety transition"
          >
            Staff sign in &rarr;
          </a>
        </div>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          ['01', 'Register', 'Create a digital record and a unique asset code for every piece of equipment.'],
          ['02', 'Report', 'Anyone can scan the QR tag and describe the problem - no login required.'],
          ['03', 'Resolve', 'AI triage suggests a diagnosis; technicians close the loop with a service record.'],
        ].map(([n, title, body], idx) => (
          
          <div
            key={n}
            className="rounded-tag border border-graphite-700 p-5 hover-lift motion-in"
            style={{ animationDelay: `${160 + idx * 60}ms` }}
          >
            <p className="font-mono text-xs text-safety">{n}</p>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
