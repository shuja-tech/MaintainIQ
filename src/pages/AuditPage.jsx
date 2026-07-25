import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Skeleton from '../components/Skeleton'

const ACTION_LABELS = {
  asset_created: 'Asset created',
  asset_updated: 'Asset updated',
  issue_reported: 'Issue reported',
  issue_assigned: 'Issue assigned',
  issue_resolved: 'Issue resolved',
  issue_closed: 'Issue closed',
  maintenance_added: 'Maintenance record added',
  profile_updated: 'Profile updated',
  admin_request_approved: 'Admin request approved',
  admin_request_rejected: 'Admin request rejected',
}

const ACTION_COLORS = {
  asset_created: 'text-teal',
  issue_reported: 'text-safety',
  issue_resolved: 'text-teal',
  issue_closed: 'text-muted',
  admin_request_approved: 'text-safety',
  admin_request_rejected: 'text-danger',
}

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
  { label: 'All', days: null },
]

function formatDate(d) {
  return d.toISOString().split('T')[0]
}

export default function AuditPage() {
  const { isAdmin } = useAuth()
  const tableRef = useRef(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return formatDate(d)
  })
  const [dateTo, setDateTo] = useState(() => formatDate(new Date()))
  const [activePreset, setActivePreset] = useState('30 days')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    loadLogs()
  }, [dateFrom, dateTo])

  async function loadLogs() {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const query = supabase
      .from('audit_log')
      .select('*, profiles(full_name)', { count: 'exact' })
      .gte('created_at', dateFrom + 'T00:00:00')
      .lte('created_at', dateTo + 'T23:59:59')
      .order('created_at', { ascending: false })
    const { data, count } = await query
    setLogs(data || [])
    setTotalCount(count || 0)
    setLoading(false)
  }

  function applyPreset(preset) {
    setActivePreset(preset.label)
    if (preset.days === null) {
      setDateFrom('2000-01-01')
      setDateTo(formatDate(new Date()))
      return
    }
    const from = new Date()
    from.setDate(from.getDate() - preset.days)
    setDateFrom(formatDate(from))
    setDateTo(formatDate(new Date()))
  }

  function downloadPdf() {
    setGeneratingPdf(true)
    const rowsHtml = logs.map((log) => '<tr>' +
        '<td style="padding:6px 10px;border-bottom:1px solid #ddd;font-size:12px">' + (ACTION_LABELS[log.action] || log.action) + '</td>' +
        '<td style="padding:6px 10px;border-bottom:1px solid #ddd;font-size:12px;color:#555">' + (log.details ? (log.details.length > 80 ? log.details.substring(0,80) + '...' : log.details) : '-') + '</td>' +
        '<td style="padding:6px 10px;border-bottom:1px solid #ddd;font-size:12px">' + (log.profiles?.full_name || '-') + '</td>' +
        '<td style="padding:6px 10px;border-bottom:1px solid #ddd;font-size:12px;white-space:nowrap">' + new Date(log.created_at).toLocaleDateString() + '</td>' +
        '<td style="padding:6px 10px;border-bottom:1px solid #ddd;font-size:12px;white-space:nowrap">' + new Date(log.created_at).toLocaleTimeString() + '</td>' +
      '</tr>').join('')
    const html = '<html><head><title>MaintainIQ - Audit Report</title><style>' +
"body{font-family:'Courier New',monospace;padding:24px}" +
'h1{font-size:20px;margin-bottom:4px}' +
'.sub{font-size:12px;color:#666;margin-bottom:20px}' +
'table{width:100%;border-collapse:collapse}' +
'th{background:#222;color:#fff;padding:8px 10px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:1px}' +
'td{padding:6px 10px;border-bottom:1px solid #eee;font-size:12px}' +
'.footer{margin-top:20px;font-size:11px;color:#999;text-align:center}' +
'</style></head><body onload="window.print()">' +
'<h1>MaintainIQ &mdash; Audit Report</h1>' +
'<div class="sub">' + dateFrom + ' to ' + dateTo + ' &middot; ' + totalCount + ' entries</div>' +
'<table><thead><tr><th>Action</th><th>Details</th><th>User</th><th>Date</th><th>Time</th></tr></thead>' +
'<tbody>' + rowsHtml + '</tbody></table>' +
'<div class="footer">Generated on ' + new Date().toLocaleString() + ' &middot; MaintainIQ</div>' +
'</body></html>'
    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(html)
    win.document.close()
    setTimeout(() => setGeneratingPdf(false), 1000)
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-muted">Only administrators can view the audit log.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="motion-in" style={{ animationDelay: '60ms' }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Audit log</h1>
            <p className="mt-1 text-sm text-muted">{totalCount} entries found</p>
          </div>
          <button onClick={downloadPdf} disabled={logs.length === 0 || generatingPdf} className="rounded-tag bg-safety px-4 py-2 text-sm font-semibold text-graphite-950 hover:brightness-95 transition disabled:opacity-60 flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {generatingPdf ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono uppercase text-muted">From</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setActivePreset(null) }} className="rounded-tag border border-graphite-600 bg-graphite-800 px-2 py-1.5 text-xs outline-none focus:border-safety" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono uppercase text-muted">To</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setActivePreset(null) }} className="rounded-tag border border-graphite-600 bg-graphite-800 px-2 py-1.5 text-xs outline-none focus:border-safety" />
          </div>
          <div className="flex items-center gap-1.5">
            {PRESETS.map((preset) => (
              <button key={preset.label} onClick={() => applyPreset(preset)} className={'rounded-tag px-3 py-1.5 text-xs font-medium transition ' + (activePreset === preset.label ? 'bg-safety text-graphite-950' : 'border border-graphite-600 text-muted hover:border-safety hover:text-safety')}>
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 asset-tag p-5 overflow-x-auto" ref={tableRef}>
          {loading ? (
            <div className="space-y-3">
              <Skeleton variant="bar" height="20px" />
              <Skeleton variant="bar" height="20px" />
              <Skeleton variant="bar" height="20px" />
              <Skeleton variant="bar" height="20px" />
              <Skeleton variant="bar" height="20px" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">No audit entries found for the selected date range.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-graphite-700">
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-wider text-muted">Action</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-wider text-muted">Details</th>
                  <th className="pb-3 pr-4 font-mono text-[11px] uppercase tracking-wider text-muted">User</th>
                  <th className="pb-3 font-mono text-[11px] uppercase tracking-wider text-muted">Date</th>
                  <th className="pb-3 pl-4 font-mono text-[11px] uppercase tracking-wider text-muted">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-graphite-800/60 hover:bg-graphite-800/30 transition">
                    <td className={'py-3 pr-4 text-sm ' + (ACTION_COLORS[log.action] || 'text-paper')}>{ACTION_LABELS[log.action] || log.action}</td>
                    <td className="py-3 pr-4 text-xs text-muted max-w-xs truncate">{log.details || ''}</td>
                    <td className="py-3 pr-4 text-sm">{log.profiles?.full_name || <span className="text-muted/50">-</span>}</td>
                    <td className="py-3 text-sm whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</td>
                    <td className="py-3 pl-4 text-sm text-muted whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {logs.length > 0 && (
          <p className="mt-4 text-center text-xs text-muted/60">
            Showing all {totalCount} entries from {dateFrom} to {dateTo}
          </p>
        )}
      </div>
    </div>
  )
}

