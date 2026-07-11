export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 py-10 justify-center text-muted font-mono text-sm">
      <span className="h-2 w-2 rounded-full bg-safety animate-ping" />
      {label}
    </div>
  )
}
