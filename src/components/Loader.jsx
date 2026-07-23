export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 py-10 justify-center text-muted font-mono text-sm">
      <span className="relative h-2.5 w-2.5">
        <span className="absolute inset-0 rounded-full bg-safety/90 animate-[fadeInUp_600ms_ease-in-out_infinite]" />
        <span className="absolute -inset-2 rounded-full bg-safety/20 blur-sm animate-[floatGlow_1.6s_ease-in-out_infinite]" />
      </span>
      <span>{label}</span>
    </div>
  )
}

