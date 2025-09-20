import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { AuthProvider } from '@/features/auth/hooks/useAuthContext'
import { QueryClient } from '@tanstack/react-query'
import { createMockAuthContextValue, renderWithQuery } from '@/test-utils'

// Mock useAuthContext hook
const mockUseAuthContext = vi.fn()

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuthContext: () => mockUseAuthContext(),
}))

// Mock React Router Navigate component
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
      mockNavigate(to, { replace })
      return <div data-testid="navigate-component">Navigating to {to}</div>
    },
  }
})

describe('ProtectedRoute', () => {
  let queryClient: QueryClient
  
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const TestComponent = () => (
    <div data-testid="protected-content">This is protected content</div>
  )

  const renderProtectedRoute = (authContextValue: any = {}) => {
    mockUseAuthContext.mockReturnValue({
      ...createMockAuthContextValue(),
      ...authContextValue,
    })

    return renderWithQuery(
      <MemoryRouter>
        <AuthProvider>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>,
      { queryClient }
    )
  }

  describe('when user is authenticated', () => {
    it('should render protected children content', () => {
      renderProtectedRoute({ isAuthenticated: true })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.getByText('This is protected content')).toBeInTheDocument()
    })

    it('should not redirect when authenticated', () => {
      renderProtectedRoute({ isAuthenticated: true })

      expect(mockNavigate).not.toHaveBeenCalled()
      expect(screen.queryByTestId('navigate-component')).not.toBeInTheDocument()
      expect(window.location.href).toBe('')
    })

    it('should render complex children components', () => {
      const ComplexChild = () => (
        <div>
          <h1 data-testid="complex-title">Dashboard</h1>
          <p data-testid="complex-content">Welcome to the protected area</p>
          <button data-testid="complex-button">Action Button</button>
        </div>
      )

      mockUseAuthContext.mockReturnValue(
        createMockAuthContextValue({ isAuthenticated: true })
      )

      renderWithQuery(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <ComplexChild />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>,
        { queryClient }
      )

      expect(screen.getByTestId('complex-title')).toBeInTheDocument()
      expect(screen.getByTestId('complex-content')).toBeInTheDocument()
      expect(screen.getByTestId('complex-button')).toBeInTheDocument()
    })
  })

  describe('when user is not authenticated', () => {
    it('should redirect to login page using Navigate component', () => {
      renderProtectedRoute({ isAuthenticated: false })

      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(screen.getByText('Navigating to /login')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })

    it('should also trigger useEffect redirect to login', async () => {
      renderProtectedRoute({ isAuthenticated: false })

      // Wait for useEffect to execute
      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })
    })

    it('should not render protected children when unauthenticated', () => {
      renderProtectedRoute({ isAuthenticated: false })

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.queryByText('This is protected content')).not.toBeInTheDocument()
    })

    it('should handle dual redirect logic (both useEffect and Navigate)', async () => {
      renderProtectedRoute({ isAuthenticated: false })

      // Both redirect mechanisms should be triggered
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
      
      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })
    })
  })

  describe('authentication state changes', () => {
    it('should handle authentication state changing from false to true', async () => {
      // Start unauthenticated
      const { rerender } = renderProtectedRoute({ isAuthenticated: false })

      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()

      // Update to authenticated
      mockUseAuthContext.mockReturnValue(
        createMockAuthContextValue({ isAuthenticated: true })
      )

      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      )

      expect(screen.queryByTestId('navigate-component')).not.toBeInTheDocument()
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should handle authentication state changing from true to false', async () => {
      // Start authenticated
      const { rerender } = renderProtectedRoute({ isAuthenticated: true })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.queryByTestId('navigate-component')).not.toBeInTheDocument()

      // Update to unauthenticated
      mockUseAuthContext.mockReturnValue(
        createMockAuthContextValue({ isAuthenticated: false })
      )

      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })
    })
  })

  describe('loading states', () => {
    it('should handle auth loading state appropriately', () => {
      renderProtectedRoute({ 
        isAuthenticated: false, 
        isLoading: true 
      })

      // Even with loading state, unauthenticated users should be redirected
      // Note: Current implementation doesn't handle loading state, which is a potential issue
      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
    })

    it('should render content when authenticated regardless of loading state', () => {
      renderProtectedRoute({ 
        isAuthenticated: true, 
        isLoading: true 
      })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.queryByTestId('navigate-component')).not.toBeInTheDocument()
    })
  })

  describe('edge cases and error scenarios', () => {
    it('should handle undefined isAuthenticated gracefully', () => {
      renderProtectedRoute({ isAuthenticated: undefined })

      // Undefined should be treated as falsy, triggering redirect
      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should handle null isAuthenticated gracefully', () => {
      renderProtectedRoute({ isAuthenticated: null })

      // Null should be treated as falsy, triggering redirect
      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should handle empty children', () => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContextValue({ isAuthenticated: true })
      )

      renderWithQuery(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              {/* Empty children */}
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>,
        { queryClient }
      )

      // Should not crash with empty children
      expect(screen.queryByTestId('navigate-component')).not.toBeInTheDocument()
    })

    it('should handle multiple children', () => {
      mockUseAuthContext.mockReturnValue(
        createMockAuthContextValue({ isAuthenticated: true })
      )

      renderWithQuery(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <div data-testid="child-1">Child 1</div>
              <div data-testid="child-2">Child 2</div>
              <div data-testid="child-3">Child 3</div>
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>,
        { queryClient }
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })

    it('should handle useAuthContext throwing an error', () => {
      // Mock useAuthContext to throw an error
      mockUseAuthContext.mockImplementation(() => {
        throw new Error('useAuth must be used within an AuthProvider')
      })

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderWithQuery(
          <MemoryRouter>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </MemoryRouter>,
          { queryClient }
        )
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('useEffect behavior', () => {
    it('should call useEffect when isAuthenticated changes', async () => {
      const { rerender } = renderProtectedRoute({ isAuthenticated: false })

      // Initial redirect should happen
      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })

      // Reset window location
      window.location.href = ''

      // Change to authenticated - useEffect should not redirect
      mockUseAuthContext.mockReturnValue(
        createMockAuthContextValue({ isAuthenticated: true })
      )

      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      )

      // Wait to ensure no redirect happens when authenticated
      await waitFor(() => {
        expect(window.location.href).toBe('')
      })
    })

    it('should handle rapid authentication state changes', async () => {
      const { rerender } = renderProtectedRoute({ isAuthenticated: false })

      // Quickly change states
      mockUseAuthContext.mockReturnValue(
        createMockAuthContextValue({ isAuthenticated: true })
      )

      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      )

      mockUseAuthContext.mockReturnValue(
        createMockAuthContextValue({ isAuthenticated: false })
      )

      rerender(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>
      )

      // Final state should be unauthenticated redirect
      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })
    })
  })

  describe('React Router integration', () => {
    it('should work with different router contexts', () => {
      // Test with MemoryRouter at different initial locations
      mockUseAuthContext.mockReturnValue(
        createMockAuthContextValue({ isAuthenticated: false })
      )

      renderWithQuery(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>,
        { queryClient }
      )

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })

    it('should preserve replace prop in Navigate component', () => {
      renderProtectedRoute({ isAuthenticated: false })

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  describe('architectural concerns', () => {
    it('should demonstrate dual redirect issue (architectural smell)', async () => {
      renderProtectedRoute({ isAuthenticated: false })

      // Both redirect mechanisms are active (this is the architectural issue mentioned)
      // 1. Navigate component redirect
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
      
      // 2. useEffect window.location.href redirect  
      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })

      // This demonstrates the dual redirect logic mentioned in the requirements
      // One redirect should be sufficient, but both are currently implemented
    })

    it('should show that Navigate component alone would be sufficient', () => {
      renderProtectedRoute({ isAuthenticated: false })

      // The Navigate component already handles the redirect
      expect(screen.getByTestId('navigate-component')).toBeInTheDocument()
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
      
      // The useEffect redirect is redundant in this architecture
    })
  })
})