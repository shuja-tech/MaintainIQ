import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { runAiTriage } from '../lib/aiTriage'
import StatusBadge from '../components/StatusBadge'
import Loader from '../components/Loader'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const CATEGORIES = ['Electrical', 'Mechanical', 'Plumbing', 'HVAC', 'Structural', 'Software/Electronics', 'General']

export default function PublicAssetPage() {
  const { code } = useParams()
  const [asset, setAsset] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  useEffect(() => {
    load()
  }, [code])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('public_assets').select('*').eq('asset_code', code).single()
    if (!data) {
      setNotFound(true)
      setLoading(false)
      return
    }
    const { data: historyData } = await supabase
      .from('asset_history')
      .select('action, created_at')
      .eq('asset_id', data.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setAsset(data)
    setHistory(historyData || [])
    setLoading(false)
  }

  if (loading) return <Loader label="Looking up asset…" />

  if (notFound) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-mono text-xs text-danger uppercase">Not found</p>
        <h1 className="mt-2 text-xl font-semibold">We couldn't find that asset</h1>
        <p className="mt-2 text-sm text-muted">
          The code <span className="font-mono">{code}</span> doesn't match any registered asset.
          Double check the QR tag or link.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="asset-tag p-6">
        <p className="font-mono text-xs text-muted">{asset.asset_code}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">{asset.name}</h1>
          <StatusBadge value={asset.status} />
        </div>

        {asset.status === 'Retired' && (
          <p className="mt-3 rounded-tag border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            This asset has been retired and is no longer in active service.
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <Info label="Category" value={asset.category} />
          <Info label="Location" value={asset.location} />
          <Info label="Condition" value={asset.condition} />
          <Info label="Next service" value={asset.next_service_date || '—'} />
        </dl>

        {history.length > 0 && (
          <div className="mt-5">
            <p className="font-mono text-xs uppercase text-muted">Recent activity</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {history.map((h, i) => (
                <li key={i}>· {h.action} — {new Date(h.created_at).toLocaleDateString()}</li>
              ))}
            </ul>
          </div>
        )}

        {!submitted ? (
          <button
            onClick={() => setReportOpen((o) => !o)}
            className="mt-6 w-full rounded-tag bg-safety py-2.5 text-sm font-semibold text-graphite-950 hover:brightness-95 transition"
          >
            {reportOpen ? 'Cancel' : 'Report an issue'}
          </button>
        ) : (
          <div className="mt-6 rounded-tag border border-teal/30 bg-teal/10 p-4 text-sm text-teal">
            Issue <span className="font-mono">{submitted.issue_number}</span> submitted. A technician will follow up.
          </div>
        )}

        {reportOpen && !submitted && (
          <ReportIssueForm asset={asset} onSubmitted={setSubmitted} />
        )}
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

function ReportIssueForm({ asset, onSubmitted }) {
  const [complaint, setComplaint] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [reporterContact, setReporterContact] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [edited, setEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [manual, setManual] = useState({ title: '', category: 'General', priority: 'Medium' })

  async function requestTriage() {
    if (complaint.trim().length < 5) {
      setAiError('Please describe the problem in a bit more detail first.')
      return
    }
    setAiError(null)
    setAiLoading(true)
    const result = await runAiTriage(complaint, { name: asset.name, category: asset.category, location: asset.location, condition: asset.condition })
    setAiLoading(false)
    setAiResult(result)
    setManual({ title: result.title, category: result.category, priority: result.priority })
    if (result.source === 'fallback') {
      setAiError('AI triage is temporarily unavailable — you can still fill in the details manually below.')
    }
  }

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)

    const { data: numberData } = await supabase.rpc('next_issue_number')
    const issue_number = numberData || `ISS-${Date.now()}`

    const { data: inserted, error } = await supabase
      .from('issues')
      .insert({
        issue_number,
        asset_id: asset.id,
        title: manual.title || 'Untitled issue',
        description: complaint,
        category: manual.category,
        priority: manual.priority,
        reporter_name: reporterName || 'Anonymous',
        reporter_contact: reporterContact || null,
        ai_suggested: !!aiResult && aiResult.source === 'ai',
        ai_data: aiResult || null,
        ai_edited: edited,
      })
      .select()
      .single()

    if (!error && inserted) {
      await supabase.from('assets').update({ status: 'Issue Reported' }).eq('id', asset.id)
      await supabase.from('asset_history').insert({
        asset_id: asset.id,
        actor: reporterName || 'Reporter',
        action: 'Issue reported',
        related_issue_id: inserted.id,
        details: manual.title,
      })
      onSubmitted(inserted)
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 border-t border-graphite-700 pt-5">
      <label className="block">
        <span className="block text-xs font-mono uppercase text-muted mb-1">Describe the problem</span>
        <textarea
          required
          rows={3}
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          className="input"
          placeholder="e.g. The projector display is flickering and sometimes does not detect HDMI."
        />
      </label>

      <button
        type="button"
        onClick={requestTriage}
        disabled={aiLoading}
        className="w-full rounded-tag border border-info/40 py-2 text-sm text-info hover:bg-info/10 transition disabled:opacity-60"
      >
        {aiLoading ? 'Analyzing with AI…' : '✨ Get AI diagnostic suggestions'}
      </button>

      {aiError && <p className="text-xs text-safety">{aiError}</p>}

      {aiResult && (
        <div className="rounded-tag border border-info/30 bg-info/5 p-4 text-sm">
          <p className="font-mono text-[11px] uppercase text-info">
            {aiResult.source === 'ai' ? 'AI suggestion — review before submitting' : 'Fallback suggestion'}
          </p>
          {aiResult.possible_causes?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted">Possible causes</p>
              <ul className="mt-1 list-disc pl-4 text-muted">
                {aiResult.possible_causes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {aiResult.initial_checks?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted">Safe initial checks</p>
              <ul className="mt-1 list-disc pl-4 text-muted">
                {aiResult.initial_checks.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {aiResult.recurring_pattern_warning && (
            <p className="mt-2 rounded-tag border border-safety/30 bg-safety/10 p-2 text-safety text-xs">
              ⚠ {aiResult.recurring_pattern_warning}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2">
          <span className="block text-xs font-mono uppercase text-muted mb-1">Issue title</span>
          <input
            required
            className="input"
            value={manual.title}
            onChange={(e) => { setManual((m) => ({ ...m, title: e.target.value })); setEdited(true) }}
            placeholder="Short, clear summary"
          />
        </label>
        <label>
          <span className="block text-xs font-mono uppercase text-muted mb-1">Category</span>
          <select
            className="input"
            value={manual.category}
            onChange={(e) => { setManual((m) => ({ ...m, category: e.target.value })); setEdited(true) }}
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>
          <span className="block text-xs font-mono uppercase text-muted mb-1">Priority</span>
          <select
            className="input"
            value={manual.priority}
            onChange={(e) => { setManual((m) => ({ ...m, priority: e.target.value })); setEdited(true) }}
          >
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label>
          <span className="block text-xs font-mono uppercase text-muted mb-1">Your name (optional)</span>
          <input className="input" value={reporterName} onChange={(e) => setReporterName(e.target.value)} />
        </label>
        <label>
          <span className="block text-xs font-mono uppercase text-muted mb-1">Contact (optional)</span>
          <input className="input" value={reporterContact} onChange={(e) => setReporterContact(e.target.value)} />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-tag bg-teal py-2.5 text-sm font-semibold text-graphite-950 hover:brightness-95 transition disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit issue report'}
      </button>
    </form>
  )
}
