import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import QRCodeDisplay from '../components/QRCodeDisplay'
import Loader from '../components/Loader'

const STATUS_OPTIONS = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired']

export default function AssetDetails() {
  const { code } = useParams()
  const { isAdmin, profile } = useAuth()
  const [asset, setAsset] = useState(null)
  const [history, setHistory] = useState([])
  const [issues, setIssues] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [code])

  async function load() {
    setLoading(true)
    const { data: assetData } = await supabase.from('assets').select('*').eq('asset_code', code).single()
    if (assetData) {
      const [{ data: historyData }, { data: issuesData }, { data: techs }] = await Promise.all([
        supabase.from('asset_history').select('*').eq('asset_id', assetData.id).order('created_at', { ascending: false }),
        supabase.from('issues').select('*').eq('asset_id', assetData.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'technician'),
      ])
      setHistory(historyData || [])
      setIssues(issuesData || [])
      setTechnicians(techs || [])
    }
    setAsset(assetData)
    setLoading(false)
  }

  async function saveEdit(updates) {
    setSaving(true)
    const { error } = await supabase.from('assets').update(updates).eq('id', asset.id)
    if (!error) {
      await supabase.from('asset_history').insert({
        asset_id: asset.id,
        actor: profile?.full_name || 'Administrator',
        action: 'Asset details updated',
        details: Object.keys(updates).join(', ') + ' changed.',
      })
      await load()
      setEditing(false)
    }
    setSaving(false)
  }

  async function assignTechnician(techId) {
    await saveEdit({ assigned_technician: techId || null })
  }

  if (loading) return <Loader label="Loading asset…" />
  if (!asset) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Asset not found</h1>
        <p className="mt-2 text-sm text-muted">No asset matches code <span className="font-mono">{code}</span>.</p>
        <Link to="/assets" className="mt-4 inline-block text-safety hover:underline">← Back to assets</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted">{asset.asset_code}</p>
          <h1 className="mt-1 text-2xl font-semibold">{asset.name}</h1>
          <div className="mt-2 flex gap-2">
            <StatusBadge value={asset.status} />
            <StatusBadge value={asset.condition} />
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditing((e) => !e)}
            className="rounded-tag border border-graphite-600 px-4 py-2 text-sm hover:border-safety hover:text-safety transition"
          >
            {editing ? 'Cancel edit' : 'Edit asset'}
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="asset-tag p-5">
            <h2 className="font-semibold">Overview</h2>
            {editing ? (
              <EditForm asset={asset} onSave={saveEdit} saving={saving} statusOptions={STATUS_OPTIONS} />
            ) : (
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <Info label="Category" value={asset.category} />
                <Info label="Location" value={asset.location} />
                <Info label="Model" value={asset.model || '—'} />
                <Info label="Last service" value={asset.last_service_date || '—'} />
                <Info label="Next service" value={asset.next_service_date || '—'} />
                <Info label="Registered" value={new Date(asset.created_at).toLocaleDateString()} />
              </dl>
            )}
          </div>

          {isAdmin && (
            <div className="asset-tag p-5">
              <h2 className="font-semibold">Assigned technician</h2>
              <select
                value={asset.assigned_technician || ''}
                onChange={(e) => assignTechnician(e.target.value)}
                className="input mt-3"
              >
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="asset-tag p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Issue history</h2>
              <span className="font-mono text-xs text-muted">{issues.length} total</span>
            </div>
            <div className="mt-4 divide-y divide-graphite-700">
              {issues.length === 0 && <p className="py-4 text-sm text-muted">No issues reported for this asset yet.</p>}
              {issues.map((issue) => (
                <Link key={issue.id} to={`/issues/${issue.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-graphite-800/50 -mx-2 px-2 rounded-tag transition">
                  <div>
                    <p className="font-mono text-xs text-muted">{issue.issue_number}</p>
                    <p className="font-medium">{issue.title}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <StatusBadge value={issue.priority} />
                    <StatusBadge value={issue.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="asset-tag p-5">
            <h2 className="font-semibold">Activity timeline</h2>
            <ol className="mt-4 space-y-4 border-l border-graphite-700 pl-4">
              {history.length === 0 && <p className="text-sm text-muted">No recorded activity yet.</p>}
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-safety" />
                  <p className="text-sm font-medium">{h.action}</p>
                  {h.details && <p className="text-sm text-muted">{h.details}</p>}
                  <p className="font-mono text-[11px] text-muted mt-0.5">
                    {new Date(h.created_at).toLocaleString()} · {h.actor}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          <QRCodeDisplay asset={asset} />
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase text-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  )
}

function EditForm({ asset, onSave, saving, statusOptions }) {
  const [form, setForm] = useState({
    name: asset.name,
    category: asset.category,
    location: asset.location,
    model: asset.model || '',
    condition: asset.condition,
    status: asset.status,
    last_service_date: asset.last_service_date || '',
    next_service_date: asset.next_service_date || '',
  })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function submit(e) {
    e.preventDefault()
    if (form.next_service_date && form.last_service_date && form.next_service_date < form.last_service_date) {
      alert('Next service date cannot be before the last service date.')
      return
    }
    onSave({
      name: form.name,
      category: form.category,
      location: form.location,
      model: form.model || null,
      condition: form.condition,
      status: form.status,
      last_service_date: form.last_service_date || null,
      next_service_date: form.next_service_date || null,
    })
  }

  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-4 text-sm">
      <label className="col-span-2">
        <span className="block text-xs font-mono uppercase text-muted mb-1">Name</span>
        <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
      </label>
      <label>
        <span className="block text-xs font-mono uppercase text-muted mb-1">Category</span>
        <input className="input" value={form.category} onChange={(e) => update('category', e.target.value)} />
      </label>
      <label>
        <span className="block text-xs font-mono uppercase text-muted mb-1">Location</span>
        <input className="input" value={form.location} onChange={(e) => update('location', e.target.value)} />
      </label>
      <label>
        <span className="block text-xs font-mono uppercase text-muted mb-1">Condition</span>
        <select className="input" value={form.condition} onChange={(e) => update('condition', e.target.value)}>
          {['Excellent', 'Good', 'Fair', 'Poor', 'Unsafe'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>
        <span className="block text-xs font-mono uppercase text-muted mb-1">Status</span>
        <select className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
          {statusOptions.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>
        <span className="block text-xs font-mono uppercase text-muted mb-1">Last service</span>
        <input type="date" className="input" value={form.last_service_date} onChange={(e) => update('last_service_date', e.target.value)} />
      </label>
      <label>
        <span className="block text-xs font-mono uppercase text-muted mb-1">Next service</span>
        <input type="date" className="input" value={form.next_service_date} onChange={(e) => update('next_service_date', e.target.value)} />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="col-span-2 mt-2 rounded-tag bg-safety py-2 text-sm font-semibold text-graphite-950 hover:brightness-95 transition disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
