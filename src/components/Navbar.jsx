import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SearchModal from './SearchModal'

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-tag text-sm font-medium transition-colors ${
    isActive ? 'bg-graphite-700 text-safety' : 'text-muted hover:text-paper hover:bg-graphite-700/60'
  }`

export default function Navbar() {
  const { session, profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

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
          {session && (
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-tag border border-graphite-600 px-3 py-1.5 text-xs text-muted hover:border-safety hover:text-safety transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search...
              <kbd className="rounded border border-graphite-600 px-1 font-mono text-[10px]">Ctrl+K</kbd>
            </button>
          )}

          {session ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm leading-tight">{profile?.full_name || 'Loading...'}</p>
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

        {session && (
          <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1 rounded-tag border border-graphite-600 px-2.5 py-1 text-[11px] text-muted hover:border-safety hover:text-safety transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/assets" className={linkClass}>Assets</NavLink>
            <NavLink to="/issues" className={linkClass}>Issues</NavLink>
          </nav>
        )}

        <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </header>
  )
}