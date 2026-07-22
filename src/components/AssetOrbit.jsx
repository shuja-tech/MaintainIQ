import PropTypes from 'prop-types'
import './AssetOrbit.css'

const ICONS = [
  { label: 'Appliance', glyph: '⏻' },

  { label: 'Vehicle', glyph: '⛟' },
  { label: 'Bitcoin', glyph: '₿' },
  { label: 'Generator', glyph: '⚡' },
  { label: 'Device', glyph: '⌁' },
  { label: 'Tools', glyph: '⛭' },
]

export default function AssetOrbit({ className = '', size = 'md' }) {
  const heightClass =
    size === 'sm'
      ? 'h-28'
      : size === 'lg'
        ? 'h-52'
        : 'h-44'

  return (
    <div
      className={`relative w-full ${heightClass} ${className}`}
      aria-hidden
    >
      {/* background panel */}
      <div className="absolute inset-0 rounded-tag bg-graphite" />

      {/* subtle orbit rings */}
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-graphite-600/70" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-graphite-500/50" />

      {/* icons (static) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        {ICONS.map((icon, idx) => {
          const angle = idx * (360 / ICONS.length)
          const radius = 96 - (idx % 3) * 10
          const accentGlow =
            idx % 2 === 0
              ? '0 0 0 1px rgba(255,255,255,0.06), 0 0 22px rgba(255,201,60,0.18)'
              : '0 0 0 1px rgba(255,255,255,0.06), 0 0 22px rgba(45,212,191,0.18)'

          return (
            <div
              key={icon.label}
              className="asset-orbit-item absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ transform: `rotate(${angle}deg) translateX(${radius}px)` }}
            >
              <div
                className="asset-orbit-icon"
                title={icon.label}
                style={{ boxShadow: accentGlow }}
              >
                <span className="asset-orbit-glyph">{icon.glyph}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* center dot */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-safety/70 shadow-[0_0_18px_rgba(255,201,60,0.18)]" />
    </div>
  )
}

AssetOrbit.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
}



