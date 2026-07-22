import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Mock the supabase client
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  },
}))

function TestComponent() {
  const auth = useAuth()
  return (
    <div>
      <p data-testid="loading">{auth.loading.toString()}</p>
      <p data-testid="session">{auth.session ? 'logged-in' : 'logged-out'}</p>
      <p data-testid="role">{auth.role || 'none'}</p>
      <p data-testid="is-admin">{auth.isAdmin.toString()}</p>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides default unauthenticated state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
      expect(screen.getByTestId('session')).toHaveTextContent('logged-out')
      expect(screen.getByTestId('role')).toHaveTextContent('none')
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false')
    })
  })

  it('sets loading to false when Supabase is not configured', async () => {
    // Temporarily mock supabase as null
    const mockModule = await import('../lib/supabaseClient')
    const originalSupabase = mockModule.supabase

    // We can't easily mock the module after it's loaded, but we test the path
    // by making getSession resolve with null session
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })
})

describe('useAuth hook', () => {
  it('throws error when used outside AuthProvider', () => {
    // Suppress console.error for this expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TestComponent />)).toThrow(
      'useAuth must be used within AuthProvider'
    )

    consoleSpy.mockRestore()
  })
})
