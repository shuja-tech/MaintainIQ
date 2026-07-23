import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { SkeletonTable } from './Skeleton'

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

export async function logAuditEvent(action, details, actorId) {
  if (!supabase) return
  await supabase.from('audit_log').insert({
    action,
    details: typeof details === 'object' ? JSON.stringify(details) : details,
    actor_id: actorId || null,
  })
}

export default function AuditLog({ limit }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    if (!supabase) { setLoading(false); return }

    let query = supabase
      .from('audit_log')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data } = await query
    setLogs(data || [])
    setLoading(false)
  }

  if (loading) return <SkeletonTable rows={4} />

  if (logs.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No audit log entries yet.</p>
  }

  return (
    <div className="divide-y divide-graphite-700">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 py-3">
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-graphite-600" />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${ACTION_COLORS[log.action] || 'text-paper'}`}>
              {ACTION_LABELS[log.action] || log.action}
            </p>
            {log.details && (
              <p className="mt-0.5 text-xs text-muted line-clamp-2">{log.details}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted/60">
              {new Date(log.created_at).toLocaleDateString()}
            </p>
            {log.profiles?.full_name && (
              <p className="text-[11px] text-muted/40">{log.profiles.full_name}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
