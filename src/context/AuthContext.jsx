import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasPendingAdminRequest, setHasPendingAdminRequest] = useState(false)

  useEffect(() => {
    if (!supabase) {
      // Supabase not configured in this environment (e.g., missing Vercel env vars)
      setLoading(false)
      setSession(null)
      setProfile(null)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        loadProfile(data.session.user.id)
        checkPendingAdminRequest(data.session.user.id)
      } else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        loadProfile(newSession.user.id)
        checkPendingAdminRequest(newSession.user.id)
      } else {
        setProfile(null)
        setHasPendingAdminRequest(false)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    if (!supabase) return
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function checkPendingAdminRequest(userId) {
    if (!supabase) return
    const { data } = await supabase
      .from('admin_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle()
    setHasPendingAdminRequest(!!data)
  }

  async function signIn(email, password) {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)') }
    }
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email, password, fullName, role) {
    if (!supabase) {
      return { data: null, error: new Error('Supabase not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)') }
    }
    // SAFETY: Always send 'technician' as the DB role — never trust the client's role.
    // Even if the user selected "Administrator", they get role='technician'.
    // Admin role is only granted via admin_requests approval.
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'technician' } },
    })
  }

  async function signOut() {
    if (!supabase) return
    setHasPendingAdminRequest(false)
    await supabase.auth.signOut()
  }

  /** Create an admin approval request after signup */
  async function createAdminRequest(userId, fullName, email) {
    if (!supabase) {
      return { error: new Error('Supabase not configured (missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)') }
    }
    const { error } = await supabase.from('admin_requests').insert({
      user_id: userId,
      full_name: fullName,
      email,
      status: 'pending',
    })
    if (!error) setHasPendingAdminRequest(true)
    return { error }
  }

  /** Get all pending admin requests (admin-only) */
  async function getPendingAdminRequests() {
    if (!supabase) return []
    const { data } = await supabase
      .from('admin_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return data || []
  }

  /** Approve a pending admin request (admin-only) */
  async function approveAdminRequest(requestId) {
    if (!supabase) return { error: new Error('Supabase not configured') }

    // Fetch the request to get the user_id
    const { data: request, error: fetchError } = await supabase
      .from('admin_requests')
      .select('user_id')
      .eq('id', requestId)
      .single()
    if (fetchError) return { error: fetchError }

    // Update the request status
    const { error: updateError } = await supabase
      .from('admin_requests')
      .update({
        status: 'approved',
        reviewed_by: session?.user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
    if (updateError) return { error: updateError }

    // Upgrade the user's role to admin
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', request.user_id)
    if (profileError) return { error: profileError }

    return { error: null }
  }

  /** Reject a pending admin request (admin-only) */
  async function rejectAdminRequest(requestId) {
    if (!supabase) return { error: new Error('Supabase not configured') }

    const { error } = await supabase
      .from('admin_requests')
      .update({
        status: 'rejected',
        reviewed_by: session?.user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    return { error }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    isTechnician: profile?.role === 'technician',
    hasPendingAdminRequest,
    loading,
    signIn,
    signUp,
    signOut,
    createAdminRequest,
    getPendingAdminRequests,
    approveAdminRequest,
    rejectAdminRequest,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
