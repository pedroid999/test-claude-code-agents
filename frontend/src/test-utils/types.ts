// Type declarations for test utilities

import type { RenderResult } from '@testing-library/react'
import type { QueryClient } from '@tanstack/react-query'

// Extended render result that includes the query client
export interface CustomRenderResult extends RenderResult {
  queryClient: QueryClient
}

// Test context types
export interface TestContextValue {
  queryClient: QueryClient
  cleanup: () => void
}

// Mock function types
export type MockedFunction<T extends (...args: any[]) => any> = T & {
  mock: {
    calls: Parameters<T>[]
    results: { type: 'return' | 'throw'; value: ReturnType<T> }[]
    instances: any[]
    contexts: any[]
    lastCall?: Parameters<T>
  }
}

// Test utilities configuration
export interface TestConfig {
  timeout?: number
  retries?: number
  cleanup?: boolean
}

// Common test scenarios
export interface TestScenario<T = any> {
  name: string
  input: T
  expected: any
  description?: string
}

// Mock API response types
export interface MockApiConfig {
  delay?: number
  shouldFail?: boolean
  errorMessage?: string
  errorStatus?: number
}

// Test data factory types
export type Factory<T> = (overrides?: Partial<T>) => T
export type ListFactory<T> = (count: number, overrides?: Partial<T>) => T[]

// Test provider wrapper types
export interface TestWrapperProps {
  children: React.ReactNode
  withAuth?: boolean
  withRouter?: boolean
  withQuery?: boolean
  initialRoute?: string
}

// Global test environment
declare global {
  namespace Vi {
    interface JestMatchers<R = unknown> {
      toBeInTheDocument(): R
      toHaveTextContent(text: string | RegExp): R
      toHaveValue(value: string | number): R
      toBeVisible(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toHaveClass(className: string): R
      toHaveFocus(): R
    }
  }
}