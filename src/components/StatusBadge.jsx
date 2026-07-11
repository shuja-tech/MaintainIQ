const STATUS_STYLES = {
  // Asset statuses
  Operational: 'bg-teal/10 text-teal border-teal/30',
  'Issue Reported': 'bg-safety/10 text-safety border-safety/30',
  'Under Inspection': 'bg-info/10 text-info border-info/30',
  'Under Maintenance': 'bg-info/10 text-info border-info/30',
  'Out of Service': 'bg-danger/10 text-danger border-danger/30',
  Retired: 'bg-graphite-500/40 text-muted border-graphite-500',
  // Issue statuses
  Reported: 'bg-safety/10 text-safety border-safety/30',
  Assigned: 'bg-info/10 text-info border-info/30',
  'Inspection Started': 'bg-info/10 text-info border-info/30',
  'Maintenance In Progress': 'bg-info/10 text-info border-info/30',
  'Waiting for Parts': 'bg-safety/10 text-safety border-safety/30',
  Resolved: 'bg-teal/10 text-teal border-teal/30',
  Closed: 'bg-graphite-500/40 text-muted border-graphite-500',
  Reopened: 'bg-danger/10 text-danger border-danger/30',
  // Priority
  Low: 'bg-graphite-500/40 text-muted border-graphite-500',
  Medium: 'bg-info/10 text-info border-info/30',
  High: 'bg-safety/10 text-safety border-safety/30',
  Critical: 'bg-danger/10 text-danger border-danger/30 animate-pulse',
}

export default function StatusBadge({ value, className = '' }) {
  const style = STATUS_STYLES[value] || 'bg-graphite-500/40 text-muted border-graphite-500'
  return (
    <span
      className={`inline-flex items-center rounded-tag border px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide ${style} ${className}`}
    >
      {value}
    </span>
  )
}
