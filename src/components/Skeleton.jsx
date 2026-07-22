export function SkeletonBar({ width, height, className }) {
  return (
    <div
      className={`animate-pulse rounded bg-graphite-700/50 ${className || ''}`}
      style={{ width: width || '100%', height: height || '16px' }}
    />
  )
}

export function SkeletonCard({ lines }) {
  const count = lines || 3
  return (
    <div className="asset-tag p-5 space-y-3">
      <SkeletonBar width="60%" height="14px" />
      <SkeletonBar width="40%" height="28px" />
      {count > 2 && <SkeletonBar width="80%" height="12px" />}
    </div>
  )
}

export function SkeletonTable({ rows }) {
  const count = rows || 5
  const items = Array.from({ length: count }, (_, i) => i)
  return (
    <div className="divide-y divide-graphite-700">
      {items.map((i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="space-y-1.5 flex-1">
            <SkeletonBar width="120px" height="12px" />
            <SkeletonBar width="200px" height="16px" />
            <SkeletonBar width="140px" height="11px" />
          </div>
          <div className="flex gap-2 shrink-0">
            <SkeletonBar width="60px" height="22px" className="rounded-tag" />
            <SkeletonBar width="60px" height="22px" className="rounded-tag" />
          </div>
      ))}
    </div>
  )
}

export function SkeletonChart() {
  const heights = [40, 65, 30, 80, 55, 45, 70]
  return (
    <div className="asset-tag p-5 space-y-4">
      <SkeletonBar width="160px" height="16px" />
      <div className="flex items-end gap-2 h-40">
        {heights.map((h, i) => (
          <SkeletonBar
            key={i}
            width="100%"
            height={h + '%'}
            className="rounded-t-sm"
          />
        ))}
      </div>
  )
}

export default function Skeleton({ variant, ...props }) {
  switch (variant) {
    case 'card':
      return <SkeletonCard {...props} />
    case 'table':
      return <SkeletonTable {...props} />
    case 'chart':
      return <SkeletonChart />
    case 'bar':
      return <SkeletonBar {...props} />
    default:
      return <SkeletonCard {...props} />
  }
}
