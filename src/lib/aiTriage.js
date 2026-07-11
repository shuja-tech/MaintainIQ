import { supabase } from './supabaseClient'

/**
 * Calls the ai-triage Supabase Edge Function.
 * Returns a structured object and never throws to the caller —
 * on timeout / failure it resolves with a safe fallback so the
 * issue-reporting flow can always continue.
 */
export async function runAiTriage(complaint, asset, { timeoutMs = 12000 } = {}) {
  const fallback = {
    title: 'Maintenance issue reported',
    category: 'General',
    priority: 'Medium',
    possible_causes: ['AI triage was unavailable. A technician will assess this in person.'],
    initial_checks: ['Keep people away from the asset if a hazard is suspected.'],
    recurring_pattern_warning: null,
    source: 'fallback',
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const { data, error } = await supabase.functions.invoke('ai-triage', {
      body: {
        complaint,
        asset: {
          name: asset?.name,
          category: asset?.category,
          location: asset?.location,
          condition: asset?.condition,
          recentHistory: asset?.recentHistory,
        },
      },
    })

    clearTimeout(timer)

    if (error || !data || data.error) {
      return { ...fallback, source: 'fallback' }
    }
    return data
  } catch (err) {
    clearTimeout(timer)
    return { ...fallback, source: 'fallback' }
  }
}
