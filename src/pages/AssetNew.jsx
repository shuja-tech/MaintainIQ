import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function generateAssetCode() {
  const rand = Math.floor(Math.random() * 900000) + 100000
  return `AST-${rand}`
}

const CATEGORIES = ['Electronics', 'HVAC', 'Furniture', 'Plumbing', 'Electrical', 'Vehicle', 'Safety Equipment', 'General']

export default function AssetNew() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    category: 'Electronics',
    location: '',
    model: '',
    condition: 'Good',
    lastServiceDate: '',
    nextServiceDate: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    let attempt = 0
    let inserted = null
    let lastError = null

    // Retry a few times in the rare case of an asset_code collision.
    while (attempt < 4 && !inserted) {
      const asset_code = generateAssetCode()
      const { data, error } = await supabase
        .from('assets')
        .insert({
          asset_code,
          name: form.name,
          category: form.category,
          location: form.location,
          model: form.model || null,
          condition: form.condition,
          last_service_date: form.lastServiceDate || null,
          next_service_date: form.nextServiceDate || null,
          created_by: profile?.id,
        })
        .select()
        .single()

      if (data) inserted = data
      else lastError = error
      attempt += 1
    }

    if (!inserted) {
      setError(lastError?.message || 'Could not register asset. Please try again.')
      setSubmitting(false)
      return
    }

    await supabase.from('asset_history').insert({
      asset_id: inserted.id,
      actor: profile?.full_name || 'Administrator',
      action: 'Asset registered',
      details: `${inserted.name} added to the system with code ${inserted.asset_code}.`,
    })

    navigate(`/assets/${inserted.asset_code}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Register a new asset</h1>
      <p className="mt-1 text-sm text-muted">A unique asset code and QR link are generated automatically.</p>

      <form onSubmit={handleSubmit} className="asset-tag mt-6 space-y-4 p-6">
        <Field label="Asset name">
          <input required value={form.name} onChange={(e) => update('name', e.target.value)}
            className="input" placeholder="Classroom Projector 01" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select value={form.category} onChange={(e) => update('category', e.target.value)} className="input">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Condition">
            <select value={form.condition} onChange={(e) => update('condition', e.target.value)} className="input">
              {['Excellent', 'Good', 'Fair', 'Poor', 'Unsafe'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Location">
          <input required value={form.location} onChange={(e) => update('location', e.target.value)}
            className="input" placeholder="Building A, Room 204" />
        </Field>

        <Field label="Model / details (optional)">
          <input value={form.model} onChange={(e) => update('model', e.target.value)}
            className="input" placeholder="Epson EB-X600" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Last service date">
            <input type="date" value={form.lastServiceDate} onChange={(e) => update('lastServiceDate', e.target.value)} className="input" />
          </Field>
          <Field label="Next service date">
            <input type="date" value={form.nextServiceDate} onChange={(e) => update('nextServiceDate', e.target.value)} className="input" />
          </Field>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-tag bg-safety py-2.5 text-sm font-semibold text-graphite-950 hover:brightness-95 transition disabled:opacity-60"
        >
          {submitting ? 'Registering…' : 'Register asset'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono uppercase text-muted mb-1">{label}</span>
      {children}
    </label>
  )
}
