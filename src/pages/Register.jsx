import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp, hasPendingAdminRequest } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'technician' })
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

    const { data, error } = await signUp(form.email, form.password, form.fullName, form.role)

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)

    if (data.session) {
      // Navigate to dashboard — if they selected admin, they'll be prompted
      // to submit their admin approval request with a fresh session.
      navigate(form.role === 'admin' ? '/dashboard?adminRequest=1' : '/dashboard')
    } else {
      // Email confirmation required
      setNotice(
        form.role === 'admin'
          ? 'Account created! After confirming your email and signing in, visit the Dashboard to submit your administrator approval request.'
          : 'Account created. Check your email to confirm, then sign in.'
      )
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center px-4">
      <div className="asset-tag p-8 motion-in hover-lift" style={{ animationDelay: '60ms' }}>
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
              <option value="technician">Technician</option>
              <option value="admin">Administrator (requires approval)</option>
            </select>
            {form.role === 'admin' && (
              <p className="mt-1 text-xs text-safety">
                Administrator registrations require approval from an existing admin.
                After creating your account, submit your approval request from the Dashboard.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {notice && <p className="text-sm text-teal">{notice}</p>}

          <button
            type="submit"
            disabled={submitting || hasPendingAdminRequest}
            className="w-full rounded-tag bg-safety py-2.5 text-sm font-semibold text-graphite-950 hover:brightness-95 transition disabled:opacity-60"
          >
            {submitting
              ? 'Creating account…'
              : hasPendingAdminRequest
                ? 'Approval pending…'
                : 'Create account'}
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
