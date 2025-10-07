import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { useDeleteAllNewsMutation } from '../../mutations/useDeleteAllNews.mutation'

// Mock the news service at the top
vi.mock('@/features/news/data/news.service')

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { createMockAxiosError, createMockDeleteAllNewsResponse } from '@/test-utils'
import { newsService } from '@/features/news/data/news.service'
import { toast } from 'sonner'

// Import after mocking
const mockNewsService = newsService as any

describe('useDeleteAllNewsMutation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('Hook Structure', () => {
    it('should return correct structure with expected properties', () => {
      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      expect(result.current).toEqual({
        deleteAllNews: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null,
        isSuccess: false,
      })
    })

    it('should initialize with correct default states', () => {
      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      expect(result.current.deleteAllNews).toBeInstanceOf(Function)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.isSuccess).toBe(false)
    })
  })

  describe('Successful Deletion', () => {
    it('should successfully call deleteAllUserNews service', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse({
        deleted_count: 10,
        message: 'Successfully deleted 10 news items',
      })
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(mockNewsService.deleteAllUserNews).toHaveBeenCalledTimes(1)
        expect(mockNewsService.deleteAllUserNews).toHaveBeenCalledWith()
      })
    })

    it('should show success toast with deleted count', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse({
        deleted_count: 25,
        message: 'Successfully deleted 25 news items',
      })
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Successfully deleted 25 news items')
      })
    })

    it('should handle zero deletions gracefully', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse({
        deleted_count: 0,
        message: 'No news items to delete',
      })
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Successfully deleted 0 news items')
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should handle large number of deletions', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse({
        deleted_count: 1000,
        message: 'Successfully deleted 1000 news items',
      })
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Successfully deleted 1000 news items')
      })
    })

    it('should invalidate news queries on success', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse()
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['news'] })
      })
    })

    it('should set loading state correctly during mutation', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse()
      mockNewsService.deleteAllUserNews.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      )

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert - Check loading state is true immediately after calling
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      // Wait for mutation to complete
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false)
        },
        { timeout: 200 }
      )
    })

    it('should set isSuccess to true after successful deletion', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse()
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.error).toBe(null)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      // Arrange
      const unauthorizedError = createMockAxiosError('Unauthorized', 401)
      mockNewsService.deleteAllUserNews.mockRejectedValue(unauthorizedError)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isSuccess).toBe(false)
      })
    })

    it('should handle 403 forbidden error', async () => {
      // Arrange
      const forbiddenError = createMockAxiosError('Forbidden', 403, {
        detail: 'Insufficient permissions to delete all news',
      })
      mockNewsService.deleteAllUserNews.mockRejectedValue(forbiddenError)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(toast.error).toHaveBeenCalled()
      })
    })

    it('should handle 429 rate limit error', async () => {
      // Arrange
      const rateLimitError = createMockAxiosError('Too Many Requests', 429, {
        detail: 'Rate limit exceeded',
      })
      mockNewsService.deleteAllUserNews.mockRejectedValue(rateLimitError)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(rateLimitError)
      })
    })

    it('should show error toast with message on failure', async () => {
      // Arrange
      const errorMessage = 'Failed to delete all news items'
      const error = new Error(errorMessage)
      mockNewsService.deleteAllUserNews.mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage)
      })
    })

    it('should show default error toast when error has no message', async () => {
      // Arrange
      const error = { message: undefined } as any
      mockNewsService.deleteAllUserNews.mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete news items')
      })
    })

    it('should handle network errors', async () => {
      // Arrange
      const networkError = createMockAxiosError('Network Error', 0)
      mockNewsService.deleteAllUserNews.mockRejectedValue(networkError)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle 500 server errors', async () => {
      // Arrange
      const serverError = createMockAxiosError('Internal Server Error', 500)
      mockNewsService.deleteAllUserNews.mockRejectedValue(serverError)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(serverError)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = createMockAxiosError('timeout of 5000ms exceeded', 0)
      timeoutError.code = 'ECONNABORTED'
      mockNewsService.deleteAllUserNews.mockRejectedValue(timeoutError)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(timeoutError)
      })
    })
  })

  describe('Multiple Deletions', () => {
    it('should handle multiple sequential delete all attempts', async () => {
      // Arrange
      const mockResponse1 = createMockDeleteAllNewsResponse({ deleted_count: 5 })
      const mockResponse2 = createMockDeleteAllNewsResponse({ deleted_count: 3 })
      mockNewsService.deleteAllUserNews
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act - First deletion
      result.current.deleteAllNews()
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Act - Second deletion
      result.current.deleteAllNews()
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Assert
      expect(mockNewsService.deleteAllUserNews).toHaveBeenCalledTimes(2)
      expect(toast.success).toHaveBeenCalledTimes(2)
      expect(toast.success).toHaveBeenNthCalledWith(1, 'Successfully deleted 5 news items')
      expect(toast.success).toHaveBeenNthCalledWith(2, 'Successfully deleted 3 news items')
    })

    it('should handle rapid successive calls (debounce scenario)', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse()
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act - Multiple rapid calls
      result.current.deleteAllNews()
      result.current.deleteAllNews()
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Note: React Query processes each mutation individually
      expect(mockNewsService.deleteAllUserNews).toHaveBeenCalledTimes(3)
    })

    it('should handle mix of successful and failed deletions', async () => {
      // Arrange
      mockNewsService.deleteAllUserNews
        .mockResolvedValueOnce(createMockDeleteAllNewsResponse({ deleted_count: 10 })) // Success
        .mockRejectedValueOnce(new Error('Failed')) // Error
        .mockResolvedValueOnce(createMockDeleteAllNewsResponse({ deleted_count: 5 })) // Success

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act - First deletion (success)
      result.current.deleteAllNews()
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Act - Second deletion (error)
      result.current.deleteAllNews()
      await waitFor(() => expect(result.current.error).toBeTruthy())

      // Act - Third deletion (success)
      result.current.deleteAllNews()
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Assert
      expect(mockNewsService.deleteAllUserNews).toHaveBeenCalledTimes(3)
      expect(toast.success).toHaveBeenCalledTimes(2)
      expect(toast.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('State Transitions', () => {
    it('should handle mutation lifecycle correctly', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse()
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Initial state
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.isSuccess).toBe(false)

      // Act
      result.current.deleteAllNews()

      // Assert - Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Final state should be success (no error)
      expect(result.current.error).toBe(null)
      expect(result.current.isSuccess).toBe(true)
      expect(mockNewsService.deleteAllUserNews).toHaveBeenCalled()
    })

    it('should transition from loading to error state correctly', async () => {
      // Arrange
      const mockError = createMockAxiosError('Delete all failed', 500)
      mockNewsService.deleteAllUserNews.mockRejectedValue(mockError)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Initial state
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)

      // Act
      result.current.deleteAllNews()

      // Assert - Wait for error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Final state should show error
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toEqual(mockError)
      expect(result.current.isSuccess).toBe(false)
    })

    it('should reset error state on subsequent successful deletion', async () => {
      // Arrange
      mockNewsService.deleteAllUserNews
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(createMockDeleteAllNewsResponse())

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act - First deletion (fails)
      result.current.deleteAllNews()
      await waitFor(() => expect(result.current.error).toBeTruthy())

      // Act - Second deletion (succeeds)
      result.current.deleteAllNews()
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Assert - Error should be cleared
      expect(result.current.error).toBe(null)
    })
  })

  describe('Edge Cases', () => {
    it('should handle service method not available', async () => {
      // Arrange
      mockNewsService.deleteAllUserNews.mockImplementation(() => {
        throw new Error('Delete all service unavailable')
      })

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error.message).toBe('Delete all service unavailable')
      })
    })

    it('should handle malformed response data', async () => {
      // Arrange - Response missing required fields
      const malformedResponse = { count: 10 } as any
      mockNewsService.deleteAllUserNews.mockResolvedValue(malformedResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert - Should still succeed but toast may show undefined
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should handle extremely slow responses', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse()
      mockNewsService.deleteAllUserNews.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 500))
      )

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert - Should remain in loading state
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(true)
        },
        { timeout: 100 }
      )

      // Wait for completion
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true)
        },
        { timeout: 600 }
      )
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate news queries with correct query key', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse()
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['news'] })
      })
    })

    it('should only invalidate queries after successful deletion', async () => {
      // Arrange
      mockNewsService.deleteAllUserNews.mockRejectedValue(new Error('Failed'))
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(invalidateQueriesSpy).not.toHaveBeenCalled()
    })

    it('should invalidate all news-related queries (stats, user news, etc)', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse()
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert - Broad invalidation with ['news'] prefix
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['news'] })
      })

      // This invalidates all queries starting with ['news']
      // including ['news', 'user'], ['news', 'stats'], etc.
    })
  })

  describe('Response Data', () => {
    it('should correctly handle response with count and message', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse({
        deleted_count: 15,
        message: 'Custom success message',
      })
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Successfully deleted 15 news items')
      })
    })

    it('should handle response with only deleted_count', async () => {
      // Arrange
      const mockResponse = { deleted_count: 7 } as any
      mockNewsService.deleteAllUserNews.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useDeleteAllNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteAllNews()

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })
})
