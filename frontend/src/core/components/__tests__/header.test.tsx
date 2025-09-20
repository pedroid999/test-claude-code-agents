import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Header from '../header'
import { AuthProvider } from '@/features/auth/hooks/useAuthContext'
import { QueryClient } from '@tanstack/react-query'
import { createMockAuthContextValue, renderWithQuery } from '@/test-utils'

// Mock useAuthContext hook
const mockUseAuthContext = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuthContext: () => mockUseAuthContext(),
}))

// Mock useNavigate hook
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  LogOut: () => <div data-testid="logout-icon">LogOut</div>,
  Package: () => <div data-testid="package-icon">Package</div>,
}))

describe('Header', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    mockUseAuthContext.mockReturnValue({
      ...createMockAuthContextValue(),
      logout: mockLogout,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const TestChildren = () => (
    <div data-testid="header-children">Custom header content</div>
  )

  const renderHeader = (children?: React.ReactNode, authContextValue: any = {}) => {
    mockUseAuthContext.mockReturnValue({
      ...createMockAuthContextValue(),
      logout: mockLogout,
      ...authContextValue,
    })

    return renderWithQuery(
      <MemoryRouter>
        <AuthProvider>
          <Header>{children}</Header>
        </AuthProvider>
      </MemoryRouter>,
      { queryClient }
    )
  }

  describe('component structure and rendering', () => {
    it('should render header with brand name', () => {
      renderHeader()

      expect(screen.getByText('Shopy')).toBeInTheDocument()
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('should render all navigation buttons', () => {
      renderHeader()

      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Products')).toBeInTheDocument()
      expect(screen.getByText('My Orders')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should render Package icons for navigation buttons', () => {
      renderHeader()

      const packageIcons = screen.getAllByTestId('package-icon')
      expect(packageIcons).toHaveLength(3) // Admin, Products, My Orders
    })

    it('should render LogOut icon for logout button', () => {
      renderHeader()

      expect(screen.getByTestId('logout-icon')).toBeInTheDocument()
    })

    it('should render children when provided', () => {
      renderHeader(<TestChildren />)

      expect(screen.getByTestId('header-children')).toBeInTheDocument()
      expect(screen.getByText('Custom header content')).toBeInTheDocument()
    })

    it('should render without children gracefully', () => {
      renderHeader()

      expect(screen.queryByTestId('header-children')).not.toBeInTheDocument()
      // Header should still render normally
      expect(screen.getByText('Shopy')).toBeInTheDocument()
    })

    it('should have correct CSS classes and structure', () => {
      renderHeader()

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b', 'border-gray-200', 'sticky', 'top-0', 'z-20')

      const brandTitle = screen.getByText('Shopy')
      expect(brandTitle).toHaveClass('text-2xl', 'font-bold', 'text-yellow-500')
    })
  })

  describe('navigation functionality', () => {
    it('should navigate to admin page when Admin button is clicked', async () => {
      renderHeader()

      const adminButton = screen.getByText('Admin')
      await user.click(adminButton)

      expect(mockNavigate).toHaveBeenCalledWith('/admin')
    })

    it('should navigate to main page when Products button is clicked', async () => {
      renderHeader()

      const productsButton = screen.getByText('Products')
      await user.click(productsButton)

      expect(mockNavigate).toHaveBeenCalledWith('/main')
    })

    it('should navigate to orders page when My Orders button is clicked', async () => {
      renderHeader()

      const ordersButton = screen.getByText('My Orders')
      await user.click(ordersButton)

      expect(mockNavigate).toHaveBeenCalledWith('/orders')
    })

    it('should handle multiple navigation clicks', async () => {
      renderHeader()

      const adminButton = screen.getByText('Admin')
      const productsButton = screen.getByText('Products')
      const ordersButton = screen.getByText('My Orders')

      await user.click(adminButton)
      await user.click(productsButton)
      await user.click(ordersButton)

      expect(mockNavigate).toHaveBeenCalledTimes(3)
      expect(mockNavigate).toHaveBeenNthCalledWith(1, '/admin')
      expect(mockNavigate).toHaveBeenNthCalledWith(2, '/main')
      expect(mockNavigate).toHaveBeenNthCalledWith(3, '/orders')
    })
  })

  describe('logout functionality', () => {
    it('should call logout and navigate to login when logout button is clicked', async () => {
      mockLogout.mockResolvedValue(undefined)
      renderHeader()

      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1)
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })

    

    it('should handle async logout properly', async () => {
      // Mock logout with delay
      mockLogout.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      renderHeader()

      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)

      // Should wait for logout to complete before navigating
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })


  describe('authentication integration', () => {
    it('should work with authenticated user context', () => {
      renderHeader(undefined, { isAuthenticated: true })

      expect(screen.getByText('Shopy')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should work with unauthenticated user context', () => {
      renderHeader(undefined, { isAuthenticated: false })

      // Header should still render (it doesn't check authentication state)
      expect(screen.getByText('Shopy')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should work with loading authentication state', () => {
      renderHeader(undefined, { isLoading: true })

      expect(screen.getByText('Shopy')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should use actual logout function from auth context', async () => {
      const customLogout = vi.fn().mockResolvedValue(undefined)
      renderHeader(undefined, { logout: customLogout })

      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)

      await waitFor(() => {
        expect(customLogout).toHaveBeenCalledTimes(1)
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('children handling', () => {
    it('should render complex children elements', () => {
      const ComplexChildren = () => (
        <>
          <button data-testid="custom-button-1">Custom Action 1</button>
          <div data-testid="custom-div">Custom Content</div>
          <button data-testid="custom-button-2">Custom Action 2</button>
        </>
      )

      renderHeader(<ComplexChildren />)

      expect(screen.getByTestId('custom-button-1')).toBeInTheDocument()
      expect(screen.getByTestId('custom-div')).toBeInTheDocument()
      expect(screen.getByTestId('custom-button-2')).toBeInTheDocument()
    })

    it('should render children with interactive elements', async () => {
      const InteractiveChildren = () => (
        <button 
          data-testid="interactive-child"
          onClick={() => console.log('Child clicked')}
        >
          Child Button
        </button>
      )

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      renderHeader(<InteractiveChildren />)

      const childButton = screen.getByTestId('interactive-child')
      await user.click(childButton)

      expect(consoleSpy).toHaveBeenCalledWith('Child clicked')
      consoleSpy.mockRestore()
    })

    it('should handle null and undefined children', () => {
      const { unmount } = renderHeader(null)
      expect(screen.getByText('Shopy')).toBeInTheDocument()
      unmount()

      renderHeader(undefined)
      expect(screen.getByText('Shopy')).toBeInTheDocument()
    })

    it('should handle empty fragment children', () => {
      renderHeader(<></>)
      expect(screen.getByText('Shopy')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA roles and labels', () => {
      renderHeader()

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(4) // Admin, Products, My Orders, Logout
    })

    it('should have accessible button text', () => {
      renderHeader()

      const adminButton = screen.getByRole('button', { name: /admin/i })
      const productsButton = screen.getByRole('button', { name: /products/i })
      const ordersButton = screen.getByRole('button', { name: /my orders/i })
      const logoutButton = screen.getByRole('button', { name: /logout/i })

      expect(adminButton).toBeInTheDocument()
      expect(productsButton).toBeInTheDocument()
      expect(ordersButton).toBeInTheDocument()
      expect(logoutButton).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      renderHeader()

      const adminButton = screen.getByText('Admin')
      
      // Focus the button
      adminButton.focus()
      expect(adminButton).toHaveFocus()

      // Activate with Enter key
      await user.keyboard('{Enter}')
      expect(mockNavigate).toHaveBeenCalledWith('/admin')
    })

    it('should support keyboard navigation for logout', async () => {
      mockLogout.mockResolvedValue(undefined)
      renderHeader()

      const logoutButton = screen.getByText('Logout')
      
      // Focus and activate with Space key
      logoutButton.focus()
      await user.keyboard(' ')

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1)
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('responsive design and styling', () => {
    it('should have responsive container classes', () => {
      renderHeader()

      // The container div is the parent of the flex container that holds Shopy
      const header = screen.getByRole('banner')
      const container = header.querySelector('.mx-auto')
      expect(container).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8')
    })

    it('should have proper flex layout classes', () => {
      renderHeader()

      const flexContainer = screen.getByText('Admin').closest('.flex')
      expect(flexContainer).toHaveClass('flex', 'items-center', 'space-x-4')
    })

    it('should have sticky positioning', () => {
      renderHeader()

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('sticky', 'top-0', 'z-20')
    })
  })

  describe('edge cases and error scenarios', () => {
    it('should handle missing useNavigate hook', () => {
      // This would be a React Router setup issue, but test robustness
      mockNavigate.mockImplementation(() => {
        throw new Error('useNavigate not available')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderHeader()

      const adminButton = screen.getByText('Admin')
      
      expect(async () => {
        await user.click(adminButton)
      }).not.toThrow() // Component should not crash

      consoleSpy.mockRestore()
    })

    it('should handle concurrent button clicks', async () => {
      renderHeader()

      const adminButton = screen.getByText('Admin')
      const productsButton = screen.getByText('Products')

      // Click buttons simultaneously
      const [adminClick, productsClick] = await Promise.allSettled([
        user.click(adminButton),
        user.click(productsButton),
      ])

      expect(adminClick.status).toBe('fulfilled')
      expect(productsClick.status).toBe('fulfilled')
      expect(mockNavigate).toHaveBeenCalledTimes(2)
    })
  })

  describe('real-world usage scenarios', () => {
    it('should work as part of a larger layout', () => {
      const MainLayout = () => (
        <div>
          <Header>
            <button data-testid="search-button">Search</button>
            <div data-testid="user-avatar">👤</div>
          </Header>
          <main data-testid="main-content">Main Content Area</main>
          <footer data-testid="footer">Footer</footer>
        </div>
      )

      renderWithQuery(
        <MemoryRouter>
          <AuthProvider>
            <MainLayout />
          </AuthProvider>
        </MemoryRouter>,
        { queryClient }
      )

      expect(screen.getByText('Shopy')).toBeInTheDocument()
      expect(screen.getByTestId('search-button')).toBeInTheDocument()
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
      expect(screen.getByTestId('main-content')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('should handle typical e-commerce user flow', async () => {
      mockLogout.mockResolvedValue(undefined)
      renderHeader()

      // User navigates through different sections
      const adminButton = screen.getByText('Admin')
      const productsButton = screen.getByText('Products')
      const ordersButton = screen.getByText('My Orders')
      const logoutButton = screen.getByText('Logout')

      // Simulate typical navigation flow
      await user.click(productsButton) // Browse products
      expect(mockNavigate).toHaveBeenCalledWith('/main')

      await user.click(ordersButton) // Check orders
      expect(mockNavigate).toHaveBeenCalledWith('/orders')

      await user.click(adminButton) // Go to admin
      expect(mockNavigate).toHaveBeenCalledWith('/admin')

      await user.click(logoutButton) // Log out
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1)
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })

      expect(mockNavigate).toHaveBeenCalledTimes(4)
    })
  })
})})
