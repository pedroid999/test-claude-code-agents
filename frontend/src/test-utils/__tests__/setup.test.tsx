import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render, renderWithProviders, userEvent } from '@/test-utils'
import { 
  createMockAuthRequest, 
  createMockAuthResponse, 
  createMockCurrentUser 
} from '@/test-utils/factories'

// Simple test component to validate setup
const TestComponent = () => (
  <div>
    <h1>Test Component</h1>
    <button onClick={() => console.log('clicked')}>
      Click me
    </button>
    <input 
      type="text" 
      placeholder="Enter text" 
      aria-label="test input"
    />
  </div>
)

describe('Test Infrastructure Setup', () => {
  describe('Basic Vitest Configuration', () => {
    it('should run tests with jsdom environment', () => {
      expect(typeof window).toBe('object')
      expect(typeof document).toBe('object')
      expect(document.body).toBeTruthy()
    })

    it('should have vi (vitest) available globally', () => {
      expect(vi).toBeDefined()
      expect(typeof vi.fn).toBe('function')
    })

    it('should have access to expect assertions', () => {
      expect(expect).toBeDefined()
      expect(true).toBe(true)
      expect({ test: 'value' }).toMatchObject({ test: 'value' })
    })
  })

  describe('React Testing Library Setup', () => {
    it('should render React components', () => {
      render(<TestComponent />)
      expect(screen.getByText('Test Component')).toBeInTheDocument()
    })

    it('should handle user interactions', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<TestComponent />)
      
      const button = screen.getByRole('button', { name: /click me/i })
      await user.click(button)
      
      expect(consoleSpy).toHaveBeenCalledWith('clicked')
      consoleSpy.mockRestore()
    })

    it('should handle form inputs', async () => {
      const user = userEvent.setup()
      
      render(<TestComponent />)
      
      const input = screen.getByLabelText('test input')
      await user.type(input, 'Hello World')
      
      expect(input).toHaveValue('Hello World')
    })
  })

  describe('Mock Utilities', () => {
    it('should provide localStorage mock', () => {
      localStorage.setItem('test', 'value')
      expect(localStorage.getItem('test')).toBe('value')
      
      localStorage.clear()
      expect(localStorage.getItem('test')).toBeNull()
    })

    it('should provide sessionStorage mock', () => {
      sessionStorage.setItem('session-test', 'session-value')
      expect(sessionStorage.getItem('session-test')).toBe('session-value')
      
      sessionStorage.clear()
      expect(sessionStorage.getItem('session-test')).toBeNull()
    })

    it('should mock JWT decode', async () => {
      const { jwtDecode } = await import('jwt-decode')
      const token = 'fake.jwt.token'
      const decoded = jwtDecode(token)
      
      expect(decoded).toHaveProperty('sub', 'test@example.com')
      expect(decoded).toHaveProperty('exp')
    })
  })

  describe('Factory Functions', () => {
    it('should create mock auth requests', () => {
      const authRequest = createMockAuthRequest()
      
      expect(authRequest).toHaveProperty('email', 'test@example.com')
      expect(authRequest).toHaveProperty('password', 'password123')
    })

    it('should create mock auth requests with overrides', () => {
      const authRequest = createMockAuthRequest({
        email: 'custom@test.com',
        password: 'custompass'
      })
      
      expect(authRequest.email).toBe('custom@test.com')
      expect(authRequest.password).toBe('custompass')
    })

    it('should create mock auth responses', () => {
      const authResponse = createMockAuthResponse()
      
      expect(authResponse).toHaveProperty('access_token', 'mock.jwt.token')
      expect(authResponse).toHaveProperty('token_type', 'bearer')
    })

    it('should create mock current users', () => {
      const user = createMockCurrentUser()
      
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email', 'test@example.com')
      expect(user).toHaveProperty('username', 'testuser')
      expect(user).toHaveProperty('is_active', true)
    })
  })

  describe('Custom Render Functions', () => {
    it('should render with providers', () => {
      const TestWithProviders = () => (
        <div data-testid="providers-test">With Providers</div>
      )
      
      renderWithProviders(<TestWithProviders />)
      
      expect(screen.getByTestId('providers-test')).toBeInTheDocument()
    })
  })

  describe('Path Aliases', () => {
    it('should resolve @ alias correctly', async () => {
      // This test verifies that the @ alias is working by importing from test-utils
      const { createMockAuthRequest } = await import('@/test-utils')
      const mockRequest = createMockAuthRequest()
      
      expect(mockRequest).toHaveProperty('email')
    })
  })
})

// Additional validation test for async operations
describe('Async Testing', () => {
  it('should handle async operations with waitFor', async () => {
    const AsyncComponent = () => {
      const [text, setText] = React.useState('Loading...')
      
      React.useEffect(() => {
        setTimeout(() => setText('Loaded!'), 100)
      }, [])
      
      return <div>{text}</div>
    }
    
    render(<AsyncComponent />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Loaded!')).toBeInTheDocument()
    }, { timeout: 200 })
  })
})

// Add React import for JSX
import React from 'react'