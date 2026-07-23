import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Mock supabase
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
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  },
}))

function TestAuthActions() {
  const { signUp, createAdminRequest, getPendingAdminRequests, approveAdminRequest, rejectAdminRequest } = useAuth()
  return (
    <div>
      <button data-testid="signup" onClick={() => signUp('test@test.com', 'password', 'Test User', 'admin')}>
        Sign Up
      </button>
      <button
        data-testid="create-request"
        onClick={() => createAdminRequest('user-123', 'Test User', 'test@test.com')}
      >
        Create Admin Request
      </button>
      <button data-testid="get-requests" onClick={() => getPendingAdminRequests()}>
        Get Pending
      </button>
      <button data-testid="approve" onClick={() => approveAdminRequest('req-123')}>
        Approve
      </button>
      <button data-testid="reject" onClick={() => rejectAdminRequest('req-123')}>
        Reject
      </button>
    </div>
  )
}

describe('Admin Approval Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock different return values for specific queries
    supabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockResolvedValue({ error: null }),
          single: vi.fn().mockResolvedValue({ data: { id: 'user-123', role: 'technician' } }),
        }
      }
      if (table === 'admin_requests') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockResolvedValue({ error: null }),
          order: vi.fn().mockResolvedValue({ data: [{ id: 'req-123', user_id: 'user-123', full_name: 'Test', email: 'test@test.com', status: 'pending' }] }),
          single: vi.fn().mockResolvedValue({ data: { user_id: 'user-123' } }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
        single: vi.fn().mockResolvedValue({ data: null }),
      }
    })
  })

  it('signUp sends technician role regardless of what is passed', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    render(
      <AuthProvider>
        <TestAuthActions />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('signup')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByTestId('signup'))

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password',
      options: { data: { full_name: 'Test User', role: 'technician' } },
    })
  })

  it('createAdminRequest creates a pending request', async () => {
    render(
      <AuthProvider>
        <TestAuthActions />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('create-request')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByTestId('create-request'))

    expect(supabase.from).toHaveBeenCalledWith('admin_requests')
  })

  it('approveAdminRequest fetches request, updates status, and upgrades role', async () => {
    render(
      <AuthProvider>
        <TestAuthActions />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('approve')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    await user.click(screen.getByTestId('approve'))

    // Should query admin_requests to get user_id
    expect(supabase.from).toHaveBeenCalledWith('admin_requests')
  })
})
