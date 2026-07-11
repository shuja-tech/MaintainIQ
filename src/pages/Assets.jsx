import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import Loader from '../components/Loader'

const STATUS_OPTIONS = ['All', 'Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired']

export default function Assets() {
  const { isAdmin } = useAuth()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  useEffect(() => {
    loadAssets()
  }, [])

  async function loadAssets() {
    setLoading(true)
    const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  const categories = useMemo(
    () => ['All', ...new Set(assets.map((a) => a.category))],
    [assets]
  )

  const filtered = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.asset_code.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter
    const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Assets</h1>
          <p className="mt-1 text-sm text-muted">{assets.length} registered asset{assets.length !== 1 && 's'}</p>
        </div>
        {isAdmin && (
          <Link to="/assets/new" className="rounded-tag bg-safety px-4 py-2 text-sm font-semibold text-graphite-950 hover:brightness-95 transition">
            + Register asset
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, code, or location…"
          className="min-w-[220px] flex-1 rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
        >
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <Loader label="Loading assets…" />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted">
              No assets match your filters.
            </p>
          )}
          {filtered.map((asset) => (
            <Link key={asset.id} to={`/assets/${asset.asset_code}`} className="asset-tag p-5 hover:border-safety/40 transition block">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted">{asset.asset_code}</p>
                  <h3 className="mt-1 font-semibold leading-tight">{asset.name}</h3>
                </div>
                <StatusBadge value={asset.status} />
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted">
                <p>{asset.category} · {asset.location}</p>
                {asset.next_service_date && <p>Next service: {asset.next_service_date}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
