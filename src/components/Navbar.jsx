import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-tag text-sm font-medium transition-colors ${
    isActive ? 'bg-graphite-700 text-safety' : 'text-muted hover:text-paper hover:bg-graphite-700/60'
  }`

export default function Navbar() {
  const { session, profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-graphite-700 bg-graphite-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="corner-brackets flex h-8 w-8 items-center justify-center bg-graphite-700 font-mono text-safety text-sm">
            IQ
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Maintain<span className="text-safety">IQ</span>
          </span>
        </Link>

        {session && (
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/assets" className={linkClass}>Assets</NavLink>
            <NavLink to="/issues" className={linkClass}>Issues</NavLink>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm leading-tight">{profile?.full_name || 'Loading…'}</p>
                <p className="font-mono text-[11px] uppercase text-muted leading-tight">
                  {isAdmin ? 'Administrator' : 'Technician'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-tag border border-graphite-600 px-3 py-1.5 text-sm text-muted hover:border-danger hover:text-danger transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-tag bg-safety px-4 py-1.5 text-sm font-semibold text-graphite-950 hover:brightness-95 transition"
            >
              Staff sign in
            </Link>
          )}
        </div>
      </div>
      {session && (
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/assets" className={linkClass}>Assets</NavLink>
          <NavLink to="/issues" className={linkClass}>Issues</NavLink>
        </nav>
      )}
    </header>
  )
}
