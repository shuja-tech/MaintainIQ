import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import Skeleton from '../components/Skeleton'
import DashboardCharts from '../components/DashboardCharts'

export default function Dashboard() {
  const { profile, isAdmin, user, createAdminRequest, hasPendingAdminRequest, getPendingAdminRequests, approveAdminRequest, rejectAdminRequest } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentIssues, setRecentIssues] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [submittingAdminReq, setSubmittingAdminReq] = useState(false)
  const [adminReqError, setAdminReqError] = useState(null)
  const [adminReqSuccess, setAdminReqSuccess] = useState(false)

  const showAdminRequestPrompt = searchParams.get('adminRequest') === '1' && !isAdmin && !hasPendingAdminRequest && !adminReqSuccess

  useEffect(() => {
    loadDashboard()
  }, [profile])

  async function loadDashboard() {
    setLoading(true)

    let issueQuery = supabase
      .from('issues')
      .select('id, status, priority, title, issue_number, created_at, assets(name, asset_code)')

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

    if (isAdmin) {
      loadPendingRequests()
    }
  }

  async function loadPendingRequests() {
    setRequestsLoading(true)
    const requests = await getPendingAdminRequests()
    setPendingRequests(requests)
    setRequestsLoading(false)
  }

  async function handleApprove(requestId) {
    const { error } = await approveAdminRequest(requestId)
    if (!error) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId))
    }
  }

  async function handleReject(requestId) {
    const { error } = await rejectAdminRequest(requestId)
    if (!error) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId))
    }
  }

  async function handleSubmitAdminRequest() {
    if (!user || !profile) return
    setSubmittingAdminReq(true)
    setAdminReqError(null)

    const { error } = await createAdminRequest(user.id, profile.full_name, user.email)
    if (error) {
      setAdminReqError(error.message)
    } else {
      setAdminReqSuccess(true)
      setSearchParams({})
    }
    setSubmittingAdminReq(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Skeleton variant="bar" width="240px" height="28px" />
        <Skeleton variant="bar" width="180px" height="16px" className="mt-2" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" lines={2} />
          ))}
        </div>
        <div className="mt-8">
          <Skeleton variant="card" lines={6} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="motion-in" style={{ animationDelay: '60ms' }}>
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

        {showAdminRequestPrompt && (
          <div className="mt-8 asset-tag p-5 border border-safety/30 bg-safety/5">
            <h2 className="font-semibold">Submit administrator approval request</h2>
            <p className="mt-1 text-sm text-muted">
              You registered as an Administrator. Submit a request to notify existing admins,
              who can then approve you.
            </p>
            {adminReqError && (
              <p className="mt-2 text-sm text-danger">{adminReqError}</p>
            )}
            <button
              onClick={handleSubmitAdminRequest}
              disabled={submittingAdminReq}
              className="mt-3 rounded-tag bg-safety px-4 py-2 text-sm font-semibold text-graphite-950 hover:brightness-95 transition disabled:opacity-60"
            >
              {submittingAdminReq ? 'Submitting...' : 'Submit admin request'}
            </button>
          </div>
        )}

        {adminReqSuccess && (
          <div className="mt-8 asset-tag p-5 border border-safety/30 bg-safety/5">
            <p className="text-sm text-teal">
              Your administrator approval request has been submitted. An existing admin will review and approve it from their Dashboard.
            </p>
          </div>
        )}

        {isAdmin && (
          <div className="mt-8 asset-tag p-5 border border-safety/20">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                Pending admin requests
                {pendingRequests.length > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-safety px-1.5 text-[11px] font-bold text-graphite-950">
                    {pendingRequests.length}
                  </span>
                )}
              </h2>
              {requestsLoading && (
                <span className="text-xs text-muted">Loading...</span>
              )}
            </div>

            <div className="mt-4 divide-y divide-graphite-700">
              {!requestsLoading && pendingRequests.length === 0 && (
                <p className="py-4 text-center text-sm text-muted">
                  No pending admin requests.
                </p>
              )}

              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{req.full_name}</p>
                    <p className="font-mono text-xs text-muted truncate">{req.email}</p>
                    <p className="text-[11px] text-muted/60 mt-0.5">
                      Requested {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="rounded-tag bg-safety px-3 py-1.5 text-xs font-semibold text-graphite-950 hover:brightness-95 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="rounded-tag border border-danger/60 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DashboardCharts />

        <div className="mt-8 asset-tag p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent issues</h2>
            <Link to="/issues" className="text-sm text-safety hover:underline">
              View all &rarr;
            </Link>
          </div>

          <div className="mt-4 divide-y divide-graphite-700">
            {recentIssues.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                No issues yet. They will show up here once reported.
              </p>
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
                  <p className="text-xs text-muted">
                    {issue.assets?.name} &middot; {issue.assets?.asset_code}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge value={issue.priority} />
                  <StatusBadge value={issue.status} />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/assets"
              className="rounded-tag bg-safety px-4 py-2 text-sm font-semibold text-graphite-950 hover:brightness-95 transition hover-lift"
            >
              Manage assets
            </Link>
            <Link
              to="/issues"
              className="rounded-tag border border-graphite-600 px-4 py-2 text-sm hover:border-safety hover:text-safety transition hover-lift"
            >
              View all issues
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


function StatCard({ label, value, accent }) {
  return (
    <div className="asset-tag p-5 hover-lift">
      <p className="font-mono text-xs uppercase text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-display font-semibold ${accent}`}>{value}</p>
    </div>
  )
}
