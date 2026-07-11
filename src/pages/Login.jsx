import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center px-4">
      <div className="asset-tag p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-safety">Staff access</p>
        <h1 className="mt-1 text-2xl font-semibold">Sign in to MaintainIQ</h1>
        <p className="mt-1 text-sm text-muted">Administrators and technicians only. Reporters don't need an account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
              placeholder="you@organization.com"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-tag bg-safety py-2.5 text-sm font-semibold text-graphite-950 hover:brightness-95 transition disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          New team member?{' '}
          <Link to="/register" className="text-safety hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
