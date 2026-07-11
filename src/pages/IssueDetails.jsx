import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import Loader from '../components/Loader'

// Maps current issue status -> asset status kept in sync automatically.
const ASSET_STATUS_FOR_ISSUE_STATUS = {
  Assigned: 'Issue Reported',
  'Inspection Started': 'Under Inspection',
  'Maintenance In Progress': 'Under Maintenance',
  'Waiting for Parts': 'Under Maintenance',
  Resolved: 'Operational',
}

// Valid forward transitions per the business rules in the brief.
const ALLOWED_NEXT = {
  Reported: ['Assigned'],
  Assigned: ['Inspection Started'],
  'Inspection Started': ['Maintenance In Progress', 'Waiting for Parts'],
  'Maintenance In Progress': ['Waiting for Parts', 'Resolved'],
  'Waiting for Parts': ['Maintenance In Progress'],
  Resolved: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Reopened: ['Assigned', 'Inspection Started'],
}

export default function IssueDetails() {
  const { id } = useParams()
  const { isAdmin, profile } = useAuth()
  const [issue, setIssue] = useState(null)
  const [asset, setAsset] = useState(null)
  const [records, setRecords] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMaintForm, setShowMaintForm] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const { data: issueData } = await supabase.from('issues').select('*').eq('id', id).single()
    if (issueData) {
      const [{ data: assetData }, { data: recordData }, { data: techs }] = await Promise.all([
        supabase.from('assets').select('*').eq('id', issueData.asset_id).single(),
        supabase.from('maintenance_records').select('*').eq('issue_id', id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'technician'),
      ])
      setAsset(assetData)
      setRecords(recordData || [])
      setTechnicians(techs || [])
    }
    setIssue(issueData)
    setLoading(false)
  }

  const canEdit = isAdmin || issue?.assigned_technician === profile?.id
  const isLocked = issue?.status === 'Closed'

  async function logHistory(action, details) {
    await supabase.from('asset_history').insert({
      asset_id: issue.asset_id,
      actor: profile?.full_name || 'Staff',
      action,
      related_issue_id: issue.id,
      details,
    })
  }

  async function assignTechnician(techId) {
    setError(null)
    const nextStatus = issue.status === 'Reported' ? 'Assigned' : issue.status
    const { error } = await supabase
      .from('issues')
      .update({ assigned_technician: techId || null, status: nextStatus })
      .eq('id', issue.id)
    if (error) return setError(error.message)
    await logHistory('Issue assigned', `Assigned to ${technicians.find((t) => t.id === techId)?.full_name || 'technician'}.`)
    if (asset && ASSET_STATUS_FOR_ISSUE_STATUS[nextStatus]) {
      await supabase.from('assets').update({ status: ASSET_STATUS_FOR_ISSUE_STATUS[nextStatus] }).eq('id', asset.id)
    }
    load()
  }

  async function changeStatus(nextStatus) {
    setError(null)

    if (nextStatus === 'Resolved' && records.length === 0) {
      setError('Add a maintenance note before resolving this issue.')
      return
    }

    const { error } = await supabase.from('issues').update({ status: nextStatus }).eq('id', issue.id)
    if (error) return setError(error.message)

    await logHistory(`Issue status changed to ${nextStatus}`, null)

    const assetStatus = ASSET_STATUS_FOR_ISSUE_STATUS[nextStatus]
    if (assetStatus) {
      await supabase.from('assets').update({ status: assetStatus }).eq('id', issue.asset_id)
    }
    load()
  }

  async function markOutOfService() {
    await supabase.from('assets').update({ status: 'Out of Service' }).eq('id', issue.asset_id)
    await logHistory('Asset marked Out of Service', 'Flagged as a safety concern pending repair.')
    load()
  }

  if (loading) return <Loader label="Loading issue…" />
  if (!issue) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Issue not found</h1>
        <Link to="/issues" className="mt-4 inline-block text-safety hover:underline">← Back to issues</Link>
      </div>
    )
  }

  const nextOptions = ALLOWED_NEXT[issue.status] || []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted">{issue.issue_number}</p>
          <h1 className="mt-1 text-2xl font-semibold">{issue.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Asset:{' '}
            <Link to={`/assets/${asset?.asset_code}`} className="text-safety hover:underline">
              {asset?.name} ({asset?.asset_code})
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge value={issue.priority} />
          <StatusBadge value={issue.status} />
        </div>
      </div>

      {issue.priority === 'Critical' && (
        <div className="mt-4 rounded-tag border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          ⚠ Critical priority issue — treat as a safety concern and prioritize accordingly.
          {isAdmin && issue.status !== 'Resolved' && issue.status !== 'Closed' && (
            <button onClick={markOutOfService} className="ml-3 underline hover:no-underline">
              Mark asset Out of Service
            </button>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="asset-tag p-5">
            <h2 className="font-semibold">Reported description</h2>
            <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{issue.description}</p>
            <div className="mt-3 flex gap-4 text-xs text-muted">
              <span>Reported by: {issue.reporter_name || 'Anonymous'}</span>
              <span>{new Date(issue.created_at).toLocaleString()}</span>
            </div>
          </div>

          {issue.ai_data && (
            <div className="asset-tag p-5 border-info/30">
              <p className="font-mono text-[11px] uppercase text-info">
                {issue.ai_suggested ? 'AI triage suggestion' : 'Fallback suggestion'}
                {issue.ai_edited && ' · edited by reporter'}
              </p>
              {issue.ai_data.possible_causes?.length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="text-xs font-medium text-muted">Possible causes</p>
                  <ul className="mt-1 list-disc pl-4 text-muted">
                    {issue.ai_data.possible_causes.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              {issue.ai_data.initial_checks?.length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="text-xs font-medium text-muted">Initial checks</p>
                  <ul className="mt-1 list-disc pl-4 text-muted">
                    {issue.ai_data.initial_checks.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="asset-tag p-5">
            <h2 className="font-semibold">Maintenance records</h2>
            <div className="mt-3 space-y-4">
              {records.length === 0 && <p className="text-sm text-muted">No maintenance work logged yet.</p>}
              {records.map((r) => (
                <div key={r.id} className="rounded-tag border border-graphite-700 p-3 text-sm">
                  <p className="font-mono text-[11px] text-muted">{new Date(r.created_at).toLocaleString()}</p>
                  {r.inspection_notes && <p className="mt-1"><span className="text-muted">Inspection: </span>{r.inspection_notes}</p>}
                  {r.work_performed && <p className="mt-1"><span className="text-muted">Work performed: </span>{r.work_performed}</p>}
                  {r.parts_used && <p className="mt-1"><span className="text-muted">Parts: </span>{r.parts_used}</p>}
                  {r.cost > 0 && <p className="mt-1"><span className="text-muted">Cost: </span>${Number(r.cost).toFixed(2)}</p>}
                  {r.condition_after && <p className="mt-1"><span className="text-muted">Condition after: </span>{r.condition_after}</p>}
                </div>
              ))}
            </div>

            {canEdit && !isLocked && (
              <div className="mt-4">
                <button
                  onClick={() => setShowMaintForm((s) => !s)}
                  className="rounded-tag border border-graphite-600 px-4 py-2 text-sm hover:border-safety hover:text-safety transition"
                >
                  {showMaintForm ? 'Cancel' : '+ Add maintenance note'}
                </button>
                {showMaintForm && (
                  <MaintenanceForm
                    issueId={issue.id}
                    onSaved={() => { setShowMaintForm(false); load() }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {isAdmin && (
            <div className="asset-tag p-5">
              <h2 className="font-semibold">Assign technician</h2>
              <select
                value={issue.assigned_technician || ''}
                onChange={(e) => assignTechnician(e.target.value)}
                disabled={isLocked}
                className="input mt-3"
              >
                <option value="">Unassigned</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          )}

          <div className="asset-tag p-5">
            <h2 className="font-semibold">Update status</h2>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            {isLocked ? (
              <p className="mt-3 text-sm text-muted">Closed issues can only be reopened.</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Only valid next steps are shown.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {nextOptions.length === 0 && <p className="text-sm text-muted">No further transitions.</p>}
              {nextOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={!canEdit}
                  className="rounded-tag border border-graphite-600 px-3 py-1.5 text-xs hover:border-safety hover:text-safety transition disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MaintenanceForm({ issueId, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    inspection_notes: '',
    work_performed: '',
    parts_used: '',
    cost: '',
    condition_after: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    const cost = form.cost === '' ? 0 : Number(form.cost)
    if (cost < 0 || Number.isNaN(cost)) {
      setError('Cost cannot be negative.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('maintenance_records').insert({
      issue_id: issueId,
      technician_id: profile?.id,
      inspection_notes: form.inspection_notes || null,
      work_performed: form.work_performed || null,
      parts_used: form.parts_used || null,
      cost,
      condition_after: form.condition_after || null,
    })
    setSaving(false)
    if (error) return setError(error.message)
    onSaved()
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 text-sm">
      <label className="block">
        <span className="block text-xs font-mono uppercase text-muted mb-1">Inspection notes</span>
        <textarea className="input" rows={2} value={form.inspection_notes} onChange={(e) => update('inspection_notes', e.target.value)} />
      </label>
      <label className="block">
        <span className="block text-xs font-mono uppercase text-muted mb-1">Work performed</span>
        <textarea className="input" rows={2} value={form.work_performed} onChange={(e) => update('work_performed', e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="block text-xs font-mono uppercase text-muted mb-1">Parts used</span>
          <input className="input" value={form.parts_used} onChange={(e) => update('parts_used', e.target.value)} />
        </label>
        <label>
          <span className="block text-xs font-mono uppercase text-muted mb-1">Cost ($)</span>
          <input type="number" min="0" step="0.01" className="input" value={form.cost} onChange={(e) => update('cost', e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="block text-xs font-mono uppercase text-muted mb-1">Condition after work</span>
        <select className="input" value={form.condition_after} onChange={(e) => update('condition_after', e.target.value)}>
          <option value="">—</option>
          {['Excellent', 'Good', 'Fair', 'Poor', 'Unsafe'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      {error && <p className="text-danger text-sm">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-tag bg-safety py-2 text-sm font-semibold text-graphite-950 hover:brightness-95 transition disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save maintenance note'}
      </button>
    </form>
  )
}
