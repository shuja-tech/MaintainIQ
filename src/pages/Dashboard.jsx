import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import Loader from '../components/Loader'

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentIssues, setRecentIssues] = useState([])

  useEffect(() => {
    loadDashboard()
  }, [profile])

  async function loadDashboard() {
    setLoading(true)

    let issueQuery = supabase.from('issues').select('id, status, priority, title, issue_number, created_at, assets(name, asset_code)')
    if (!isAdmin && profile) {
      issueQuery = issueQuery.eq('assigned_technician', profile.id)
    }
    const { data: issues } = await issueQuery.order('created_at', { ascending: false })

    const { data: assets } = await supabase.from('assets').select('id, status')

    const openIssues = (issues || []).filter((i) => !['Resolved', 'Closed'].includes(i.status))
    const critical = (issues || []).filter((i) => i.priority === 'Critical' && i.status !== 'Closed')
    const outOfService = (assets || []).filter((a) => a.status === 'Out of Service').length

    setStats({
      totalAssets: assets?.length || 0,
      openIssues: openIssues.length,
      critical: critical.length,
      outOfService,
    })
    setRecentIssues((issues || []).slice(0, 8))
    setLoading(false)
  }

  if (loading) return <Loader label="Loading dashboard…" />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {isAdmin ? 'Organization-wide overview.' : 'Here is what is assigned to you.'}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total assets" value={stats.totalAssets} accent="text-paper" />
        <StatCard label="Open issues" value={stats.openIssues} accent="text-safety" />
        <StatCard label="Critical priority" value={stats.critical} accent="text-danger" />
        <StatCard label="Out of service" value={stats.outOfService} accent="text-danger" />
      </div>

      <div className="mt-8 asset-tag p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent issues</h2>
          <Link to="/issues" className="text-sm text-safety hover:underline">View all →</Link>
        </div>
        <div className="mt-4 divide-y divide-graphite-700">
          {recentIssues.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">No issues yet. They'll show up here once reported.</p>
          )}
          {recentIssues.map((issue) => (
            <Link
              key={issue.id}
              to={`/issues/${issue.id}`}
              className="flex flex-col gap-2 py-3 hover:bg-graphite-800/50 -mx-2 px-2 rounded-tag transition sm:flex-row sm:items-center sm:justify-between"
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
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/assets" className="rounded-tag bg-safety px-4 py-2 text-sm font-semibold text-graphite-950 hover:brightness-95 transition">
          Manage assets
        </Link>
        <Link to="/issues" className="rounded-tag border border-graphite-600 px-4 py-2 text-sm hover:border-safety hover:text-safety transition">
          View all issues
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className="asset-tag p-5">
      <p className="font-mono text-xs uppercase text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-display font-semibold ${accent}`}>{value}</p>
    </div>
  )
}
