import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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
      if (data.session) loadProfile(data.session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) loadProfile(newSession.user.id)
      else {
        setProfile(null)
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

  async function signIn(email, password) {
    if (!supabase) throw new Error('Supabase not configured')
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email, password, fullName, role) {
    if (!supabase) throw new Error('Supabase not configured')
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }


  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    isTechnician: profile?.role === 'technician',
    isUser: profile?.role === 'user',
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
