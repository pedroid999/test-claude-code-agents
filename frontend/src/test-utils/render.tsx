import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/hooks/useAuthContext'
import type { ReactElement, ReactNode } from 'react'

// Custom QueryClient for tests with immediate cleanup
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

interface TestProvidersProps {
  children: ReactNode
  queryClient?: QueryClient
  withAuth?: boolean
  withRouter?: boolean
}

// Test providers wrapper
const TestProviders = ({ 
  children, 
  queryClient = createTestQueryClient(),
  withAuth = false,
  withRouter = false 
}: TestProvidersProps) => {
  let wrappedChildren = children

  // Always wrap with QueryClientProvider first (AuthProvider needs it)
  wrappedChildren = (
    <QueryClientProvider client={queryClient}>
      {withAuth ? <AuthProvider>{wrappedChildren}</AuthProvider> : wrappedChildren}
    </QueryClientProvider>
  )

  // Conditionally wrap with Router (outermost)
  if (withRouter) {
    wrappedChildren = <BrowserRouter>{wrappedChildren}</BrowserRouter>
  }

  return <>{wrappedChildren}</>
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  withAuth?: boolean
  withRouter?: boolean
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    queryClient,
    withAuth = false,
    withRouter = false,
    ...renderOptions
  } = options

  const testQueryClient = queryClient || createTestQueryClient()

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders 
      queryClient={testQueryClient}
      withAuth={withAuth}
      withRouter={withRouter}
    >
      {children}
    </TestProviders>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  }
}

// Render with all providers (commonly used setup)
const renderWithProviders = (ui: ReactElement, options: CustomRenderOptions = {}) => 
  customRender(ui, { withAuth: true, withRouter: true, ...options })

// Render with auth only
const renderWithAuth = (ui: ReactElement, options: CustomRenderOptions = {}) =>
  customRender(ui, { withAuth: true, ...options })

// Render with router only  
const renderWithRouter = (ui: ReactElement, options: CustomRenderOptions = {}) =>
  customRender(ui, { withRouter: true, ...options })

// Render with React Query only
const renderWithQuery = (ui: ReactElement, options: CustomRenderOptions = {}) =>
  customRender(ui, options)

// Re-export everything
export * from '@testing-library/react'
export { 
  customRender as render,
  renderWithProviders,
  renderWithAuth,
  renderWithRouter,
  renderWithQuery,
  createTestQueryClient,
  TestProviders
}