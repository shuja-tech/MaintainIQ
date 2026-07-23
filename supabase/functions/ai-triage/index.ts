// Supabase Edge Function: ai-triage
// Deploy with:  supabase functions deploy ai-triage
// Set secret with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// This function receives a natural-language complaint plus safe asset
// context, calls the Anthropic API, and returns strictly-validated JSON.
// The API key never touches the browser.
//
// Rate limiting: max 10 requests per IP per 60-second window.
// For production with multiple Edge Function instances, consider Supabase's
// built-in rate limiting or an external KV store.

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

// ---- Simple in-memory rate limiter ----
const RATE_LIMIT_WINDOW_MS = 60_000 // 60 seconds
const RATE_LIMIT_MAX = 10           // max requests per window

interface RateEntry {
  count: number
  resetAt: number
}

const rateMap = new Map<string, RateEntry>()

function getClientIp(req: Request): string {
  // Supabase passes the real IP via x-forwarded-for or x-real-ip
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = rateMap.get(ip)

  if (!entry || now >= entry.resetAt) {
    // Start a new window
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfter: 0 }
  }

  entry.count += 1
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true, retryAfter: 0 }
}

// Clean up stale entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateMap) {
    if (now >= entry.resetAt) rateMap.delete(key)
  }
}, 300_000)

// ---- End rate limiter ----

function safeFallback(complaint: string) {
  return {
    title: 'Maintenance issue reported',
    category: 'General',
    priority: 'Medium',
    possible_causes: ['Unable to auto-diagnose. A technician should inspect the asset in person.'],
    initial_checks: ['Confirm the asset is safe to approach.', 'Do not operate the asset if a hazard is suspected.'],
    recurring_pattern_warning: null,
    source: 'fallback',
    raw_complaint: complaint,
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ---- Rate limit check ----
  const ip = getClientIp(req)
  const { allowed, retryAfter } = checkRateLimit(ip)

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      },
    )
  }
  // ---- End rate limit check ----

  try {
    const { complaint, asset } = await req.json()

    if (!complaint || typeof complaint !== 'string' || complaint.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'A complaint description is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

    // Graceful fallback: still return a usable, safe structured object
    // instead of erroring out if no key has been configured yet.
    if (!apiKey) {
      return new Response(JSON.stringify(safeFallback(complaint)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = `You are the AI Issue Triage engine inside MaintainIQ, a maintenance-management platform.
Convert a natural-language maintenance complaint into structured JSON only.
Never include markdown fences or commentary, respond with raw JSON matching exactly this shape:
{
  "title": string,
  "category": string,
  "priority": "Low" | "Medium" | "High" | "Critical",
  "possible_causes": string[],
  "initial_checks": string[],
  "recurring_pattern_warning": string | null
}
Rules:
- initial_checks must never include unsafe electrical, mechanical, fire, or medical instructions — only safe, non-technical checks a non-specialist can do (e.g. "turn off power at the switch if safe to do so", "keep people away from the area").
- If the complaint suggests a safety hazard (sparks, smoke, gas smell, structural damage, exposed wiring), priority must be "Critical" and initial_checks must recommend contacting a qualified technician immediately.
- Be concise and professional.`

    const userPrompt = `Asset context:
Name: ${asset?.name ?? 'Unknown'}
Category: ${asset?.category ?? 'Unknown'}
Location: ${asset?.location ?? 'Unknown'}
Condition: ${asset?.condition ?? 'Unknown'}
Recent history: ${asset?.recentHistory ?? 'None provided'}

User complaint:
"""${complaint}"""

Respond with the JSON object only.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      return new Response(JSON.stringify(safeFallback(complaint)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const rawText = (data.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim()

    let parsed
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify(safeFallback(complaint)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate shape before trusting it
    if (
      typeof parsed.title !== 'string' ||
      !ALLOWED_PRIORITIES.includes(parsed.priority) ||
      !Array.isArray(parsed.possible_causes) ||
      !Array.isArray(parsed.initial_checks)
    ) {
      return new Response(JSON.stringify(safeFallback(complaint)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    parsed.source = 'ai'
    parsed.raw_complaint = complaint

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Triage service failed.', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
