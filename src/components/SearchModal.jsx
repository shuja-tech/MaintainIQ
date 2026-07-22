import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function SearchModal({ open, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ assets: [], issues: [], technicians: [] })
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ assets: [], issues: [], technicians: [] })
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const search = useCallback(async (q) => {
    if (!q.trim() || !supabase) {
      setResults({ assets: [], issues: [], technicians: [] })
      return
    }

    setLoading(true)
    const term = `%${q.trim()}%`

    const [assetsRes, issuesRes, techsRes] = await Promise.all([
      supabase.from('assets').select('id, name, asset_code').or(`name.ilike.${term},asset_code.ilike.${term}`).limit(5),
      supabase.from('issues').select('id, title, issue_number').or(`title.ilike.${term},issue_number.ilike.${term}`).limit(5),
      supabase.from('profiles').select('id, full_name, role').ilike('full_name', term).limit(5),
    ])

    setResults({
      assets: assetsRes.data || [],
      issues: issuesRes.data || [],
      technicians: techsRes.data || [],
    })
    setSelectedIndex(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  const flatResults = [
    ...results.assets.map((a) => ({ type: 'asset', label: a.name, sub: a.asset_code, to: `/assets/${a.asset_code}` })),
    ...results.issues.map((i) => ({ type: 'issue', label: i.title, sub: i.issue_number, to: `/issues/${i.id}` })),
    ...results.technicians.map((t) => ({ type: 'technician', label: t.full_name, sub: t.role, to: `/dashboard` })),
  ]

  function handleSelect(item) {
    onClose()
    navigate(item.to)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      handleSelect(flatResults[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-xl border border-graphite-600 bg-graphite-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-graphite-700 px-4 py-3">
          <svg className="h-5 w-5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search assets, issues, technicians…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/50"
          />
          <kbd className="hidden rounded border border-graphite-600 px-1.5 py-0.5 font-mono text-[11px] text-muted sm:inline-block">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <p className="py-8 text-center text-sm text-muted">Searching…</p>
          )}

          {!loading && query.trim() && flatResults.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No results found.</p>
          )}

          {!loading && !query.trim() && (
            <p className="py-8 text-center text-sm text-muted">
              Type to search across assets, issues, and team members.
            </p>
          )}

          {flatResults.length > 0 && (
            <div>
              {results.assets.length > 0 && (
                <div>
                  <p className="px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted/60">Assets</p>
                  {results.assets.map((asset, i) => (
                    <SearchItem
                      key={asset.id}
                      selected={selectedIndex === i}
                      icon="🔧"
                      label={asset.name}
                      sub={asset.asset_code}
                      onClick={() => handleSelect(flatResults[i])}
                    />
                  ))}
                </div>
              )}
              {results.issues.length > 0 && (
                <div className="mt-1">
                  <p className="px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted/60">Issues</p>
                  {results.issues.map((issue, i) => {
                    const idx = results.assets.length + i
                    return (
                      <SearchItem
                        key={issue.id}
                        selected={selectedIndex === idx}
                        icon="⚠️"
                        label={issue.title}
                        sub={issue.issue_number}
                        onClick={() => handleSelect(flatResults[idx])}
                      />
                    )
                  })}
                </div>
              )}
              {results.technicians.length > 0 && (
                <div className="mt-1">
                  <p className="px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted/60">Team</p>
                  {results.technicians.map((tech, i) => {
                    const idx = results.assets.length + results.issues.length + i
                    return (
                      <SearchItem
                        key={tech.id}
                        selected={selectedIndex === idx}
                        icon="👤"
                        label={tech.full_name}
                        sub={tech.role}
                        onClick={() => handleSelect(flatResults[idx])}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  )
}

function SearchItem({ selected, icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        selected ? 'bg-safety/10 text-safety' : 'text-paper hover:bg-graphite-800'
      }`}
    >
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{label}</p>
        <p className="truncate font-mono text-xs text-muted">{sub}</p>
      </div>
    </button>
  )
}
