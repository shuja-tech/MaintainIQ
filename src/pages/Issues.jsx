import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import Loader from '../components/Loader'

const STATUS_OPTIONS = ['All', 'Reported', 'Assigned', 'Inspection Started', 'Maintenance In Progress', 'Waiting for Parts', 'Resolved', 'Closed', 'Reopened']
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High', 'Critical']

export default function Issues() {
  const { isAdmin, profile } = useAuth()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [mineOnly, setMineOnly] = useState(!isAdmin)
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('issues')
      .select('*, assets(name, asset_code)')
      .order('created_at', { ascending: false })
    setIssues(data || [])
    setLoading(false)
  }

  const filtered = issues.filter((i) => {
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter
    const matchesPriority = priorityFilter === 'All' || i.priority === priorityFilter
    const matchesMine = !mineOnly || i.assigned_technician === profile?.id
    const matchesSearch =
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.issue_number.toLowerCase().includes(search.toLowerCase()) ||
      i.assets?.asset_code?.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesPriority && matchesMine && matchesSearch
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Issues</h1>
      <p className="mt-1 text-sm text-muted">{issues.length} total reported</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, issue #, or asset code…"
          className="min-w-[220px] flex-1 rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety">
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-tag border border-graphite-600 px-3 py-2 text-sm">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          Assigned to me
        </label>
      </div>

      {loading ? (
        <Loader label="Loading issues…" />
      ) : (
        <div className="mt-6 asset-tag divide-y divide-graphite-700">
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">No issues match your filters.</p>}
          {filtered.map((issue) => (
            <Link
              key={issue.id}
              to={`/issues/${issue.id}`}
              className="flex flex-col gap-2 p-4 hover:bg-graphite-800/50 transition sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-xs text-muted">{issue.issue_number}</p>
                <p className="font-medium">{issue.title}</p>
                <p className="text-xs text-muted">{issue.assets?.name} · {issue.assets?.asset_code}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge value={issue.priority} />
                <StatusBadge value={issue.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
