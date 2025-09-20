# Test Infrastructure Documentation

This directory contains the comprehensive testing infrastructure for the React frontend application, configured for Vitest with React Testing Library.

## Overview

The test infrastructure provides:
- Vitest configuration with jsdom environment for React components
- Custom render functions with provider wrappers
- Mock factories for consistent test data
- Utility functions for common testing scenarios
- 80% coverage threshold for auth and core modules

## Quick Start

```typescript
// Basic test example
import { describe, it, expect } from 'vitest'
import { render, screen, userEvent } from '@/test-utils'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
```

## File Structure

```
src/test-utils/
├── README.md          # This documentation
├── index.ts           # Main exports for easy importing
├── setup.ts           # Test environment setup and global mocks
├── render.tsx         # Custom render functions with providers
├── factories.ts       # Mock data factories
├── mocks.ts          # Mock utilities and helpers
├── types.ts          # TypeScript definitions for testing
└── __tests__/
    └── setup.test.tsx # Validation tests for infrastructure
```

## Core Components

### 1. Custom Render Functions (`render.tsx`)

#### Basic Usage
```typescript
import { render, screen } from '@/test-utils'

// Simple component rendering
render(<MyComponent />)
```

#### With Providers
```typescript
import { renderWithProviders, renderWithAuth, renderWithRouter } from '@/test-utils'

// With all providers (Auth + Router + React Query)
renderWithProviders(<MyComponent />)

// With specific providers only
renderWithAuth(<MyComponent />)
renderWithRouter(<MyComponent />)
```

#### Custom Query Client
```typescript
import { render, createTestQueryClient } from '@/test-utils'

const customQueryClient = createTestQueryClient()
render(<MyComponent />, { queryClient: customQueryClient })
```

### 2. Mock Factories (`factories.ts`)

#### Auth-related Mocks
```typescript
import { 
  createMockAuthRequest,
  createMockAuthResponse,
  createMockCurrentUser 
} from '@/test-utils'

// Basic usage
const authRequest = createMockAuthRequest()
const authResponse = createMockAuthResponse()
const user = createMockCurrentUser()

// With overrides
const customUser = createMockCurrentUser({
  email: 'custom@test.com',
  is_active: false
})
```

#### JWT and Token Mocks
```typescript
import { createMockJWT, createExpiredMockJWT } from '@/test-utils'

const validToken = createMockJWT()
const expiredToken = createExpiredMockJWT()
const customToken = createMockJWT({ sub: 'custom@test.com' })
```

#### React Query Mocks
```typescript
import { 
  createMockQueryResult,
  createMockMutationResult 
} from '@/test-utils'

const queryResult = createMockQueryResult(userData)
const mutationResult = createMockMutationResult({
  isLoading: true,
  mutate: vi.fn()
})
```

### 3. Mock Utilities (`mocks.ts`)

#### API Mocking
```typescript
import { mockApiCall, createMockAxiosResponse } from '@/test-utils'

// Mock successful API call
const successPromise = mockApiCall.success(userData)

// Mock API error
const errorPromise = mockApiCall.error('Network Error', 500)

// Mock delayed response
const delayedPromise = mockApiCall.success(userData, 1000)
```

#### Storage Mocking
```typescript
import { mockAppStorage } from '@/test-utils'

// Storage is automatically mocked, but you can spy on calls
mockAppStorage.local.setString = vi.fn()
mockAppStorage.local.getString = vi.fn(() => 'mock-token')
```

#### Cleanup Utilities
```typescript
import { cleanup } from '@/test-utils'

afterEach(() => {
  cleanup.all() // Clears mocks, storage, timers
})

// Or individually
cleanup.mocks()
cleanup.localStorage()
cleanup.sessionStorage()
cleanup.timers()
```

### 4. Test Environment Setup (`setup.ts`)

The setup file automatically configures:
- Jest DOM matchers (`toBeInTheDocument`, etc.)
- localStorage/sessionStorage mocks
- JWT decode mocking
- Toast notification mocking
- ResizeObserver/IntersectionObserver mocks
- Window.matchMedia mocking

## Available Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run path/to/test.spec.tsx
```

## Coverage Configuration

The coverage is configured with 80% thresholds for:
- `src/features/auth/` - Auth feature module
- `src/core/` - Core infrastructure module
- Global coverage across all modules

Coverage reports are generated in:
- `./coverage/` - HTML reports
- Terminal output for text summary

## Best Practices

### 1. Test Organization
```typescript
describe('FeatureName', () => {
  describe('ComponentName', () => {
    beforeEach(() => {
      // Setup for component tests
    })

    it('should handle specific behavior', () => {
      // Test implementation
    })
  })

  describe('HookName', () => {
    // Hook-specific tests
  })
})
```

### 2. User-Centric Testing
```typescript
import { userEvent } from '@/test-utils'

const user = userEvent.setup()

// Test user interactions
await user.click(screen.getByRole('button'))
await user.type(screen.getByLabelText('Email'), 'test@test.com')
```

### 3. Async Testing
```typescript
import { waitFor, screen } from '@/test-utils'

// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Success!')).toBeInTheDocument()
})

// Find elements that appear asynchronously
const element = await screen.findByText('Loaded content')
```

### 4. Mock Management
```typescript
import { vi, beforeEach } from 'vitest'

// Always clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

## Common Patterns

### Testing Context Providers
```typescript
import { renderWithAuth, createMockAuthContextValue } from '@/test-utils'

const mockAuthValue = createMockAuthContextValue({
  isAuthenticated: true,
  userEmail: 'test@test.com'
})

// Mock the context hook
vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => mockAuthValue
}))
```

### Testing Forms
```typescript
import { render, screen, userEvent } from '@/test-utils'
import { createMockFormData } from '@/test-utils'

const formData = createMockFormData.login()
const user = userEvent.setup()

// Fill and submit form
await user.type(screen.getByLabelText('Email'), formData.email)
await user.type(screen.getByLabelText('Password'), formData.password)
await user.click(screen.getByRole('button', { name: /login/i }))
```

### Testing React Query
```typescript
import { renderWithProviders, createMockQueryResult } from '@/test-utils'

// Mock the query hook
const mockQueryResult = createMockQueryResult(userData, { isLoading: true })
vi.mock('@/features/auth/hooks/queries/useUserQuery', () => ({
  useUserQuery: () => mockQueryResult
}))
```

## Troubleshooting

### Common Issues

1. **"No QueryClient set" Error**
   - Use `renderWithProviders` or `renderWithAuth` instead of basic `render`
   - Ensure QueryClientProvider is wrapping components that use React Query

2. **Mock not working**
   - Check that `vi.clearAllMocks()` is called in `beforeEach`
   - Verify mock is defined before component render

3. **Async test failures**
   - Use `waitFor` for async operations
   - Increase timeout if needed: `waitFor(() => {...}, { timeout: 5000 })`

4. **Path resolution issues**
   - Verify `@/` alias is working: `import ... from '@/test-utils'`
   - Check `vitest.config.ts` has correct path aliases

### Debug Tools

```typescript
// Debug rendered components
import { screen } from '@/test-utils'

screen.debug() // Prints current DOM
screen.debug(screen.getByRole('button')) // Prints specific element
```

## Integration with IDE

The test infrastructure is optimized for VS Code with:
- IntelliSense support for all testing utilities
- Proper TypeScript definitions
- Auto-completion for mock factories
- Integrated debugging support

Run tests from VS Code with the Jest/Vitest extension for the best developer experience.