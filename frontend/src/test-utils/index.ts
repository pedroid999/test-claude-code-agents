// Export all testing utilities for easy importing in test files

// Re-export React Testing Library with custom render functions
export * from './render'

// Export mock factories
export * from './factories'

// Export mock utilities and helpers
export * from './mocks'

// Export commonly used testing utilities from vitest
export { 
  describe, 
  it, 
  expect, 
  vi, 
  beforeEach, 
  afterEach, 
  beforeAll, 
  afterAll,
  test,
} from 'vitest'

// Export user-event for interaction testing
export { default as userEvent } from '@testing-library/user-event'