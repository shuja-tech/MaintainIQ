import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'user' })
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (submitting) return

    setError(null)
    setSubmitting(true)

    // Prevent rapid re-submits that can trigger Supabase auth email rate limits.
    // (e.g., user double-clicks the button or hits Enter repeatedly.)
    const { data, error } = await signUp(form.email, form.password, form.fullName, form.role)

    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    if (data.session) {
      navigate('/dashboard')
    } else {
      setNotice('Account created. Check your email to confirm, then sign in.')
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center px-4">
      <div className="asset-tag p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-safety">Create account</p>
        <h1 className="mt-1 text-2xl font-semibold">Join your maintenance team</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1">Full name</label>
            <input
              required
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              className="w-full rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
              placeholder="Jordan Malik"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
              placeholder="you@organization.com"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              className="w-full rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm outline-none focus:border-safety"
            >
              <option value="admin">Administrator</option>
              <option value="technician">Technician</option>
              <option value="user">User</option>
            </select>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {notice && <p className="text-sm text-teal">{notice}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-tag bg-safety py-2.5 text-sm font-semibold text-graphite-950 hover:brightness-95 transition disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Already registered?{' '}
          <Link to="/login" className="text-safety hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
