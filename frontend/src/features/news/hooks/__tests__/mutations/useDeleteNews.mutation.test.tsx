import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { useDeleteNewsMutation } from '../../mutations/useDeleteNews.mutation'

// Mock the news service at the top
vi.mock('@/features/news/data/news.service')

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { createMockAxiosError } from '@/test-utils/mocks'
import { newsService } from '@/features/news/data/news.service'
import { toast } from 'sonner'

// Import after mocking
const mockNewsService = newsService as any

describe('useDeleteNewsMutation', () => {
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
      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      expect(result.current).toEqual({
        deleteNews: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null,
        isSuccess: false,
      })
    })

    it('should initialize with correct default states', () => {
      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      expect(result.current.deleteNews).toBeInstanceOf(Function)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.isSuccess).toBe(false)
    })
  })

  describe('Successful Deletion', () => {
    it('should successfully call delete service with correct newsId', async () => {
      // Arrange
      const newsId = 'news-123'
      mockNewsService.deleteNews.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(mockNewsService.deleteNews).toHaveBeenCalledWith(newsId)
        expect(mockNewsService.deleteNews).toHaveBeenCalledTimes(1)
      })
    })

    it('should show success toast on successful deletion', async () => {
      // Arrange
      const newsId = 'news-123'
      mockNewsService.deleteNews.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('News item deleted successfully')
      })
    })

    it('should invalidate news queries on success', async () => {
      // Arrange
      const newsId = 'news-123'
      mockNewsService.deleteNews.mockResolvedValue(undefined)
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['news'] })
      })
    })

    it('should set loading state correctly during mutation', async () => {
      // Arrange
      const newsId = 'news-123'
      mockNewsService.deleteNews.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      )

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

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
      const newsId = 'news-123'
      mockNewsService.deleteNews.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(result.current.error).toBe(null)
      })
    })

    it('should handle deletion without return value (void)', async () => {
      // Arrange
      const newsId = 'news-123'
      mockNewsService.deleteNews.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 not found error', async () => {
      // Arrange
      const newsId = 'news-123'
      const notFoundError = createMockAxiosError('News item not found', 404, {
        detail: 'News item with id news-123 not found',
      })
      mockNewsService.deleteNews.mockRejectedValue(notFoundError)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isSuccess).toBe(false)
      })
    })

    it('should handle 403 forbidden error', async () => {
      // Arrange
      const newsId = 'news-123'
      const forbiddenError = createMockAxiosError('Forbidden', 403, {
        detail: 'You do not have permission to delete this news item',
      })
      mockNewsService.deleteNews.mockRejectedValue(forbiddenError)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(toast.error).toHaveBeenCalled()
      })
    })

    it('should show error toast with message on failure', async () => {
      // Arrange
      const newsId = 'news-123'
      const errorMessage = 'Failed to delete news item'
      const error = new Error(errorMessage)
      mockNewsService.deleteNews.mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage)
      })
    })

    it('should show default error toast when error has no message', async () => {
      // Arrange
      const newsId = 'news-123'
      const error = { message: undefined } as any
      mockNewsService.deleteNews.mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete news item')
      })
    })

    it('should handle network errors', async () => {
      // Arrange
      const newsId = 'news-123'
      const networkError = createMockAxiosError('Network Error', 0)
      mockNewsService.deleteNews.mockRejectedValue(networkError)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle 500 server errors', async () => {
      // Arrange
      const newsId = 'news-123'
      const serverError = createMockAxiosError('Internal Server Error', 500)
      mockNewsService.deleteNews.mockRejectedValue(serverError)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(serverError)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should handle timeout errors', async () => {
      // Arrange
      const newsId = 'news-123'
      const timeoutError = createMockAxiosError('timeout of 5000ms exceeded', 0)
      timeoutError.code = 'ECONNABORTED'
      mockNewsService.deleteNews.mockRejectedValue(timeoutError)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error).toEqual(timeoutError)
      })
    })
  })

  describe('Multiple Deletions', () => {
    it('should handle multiple sequential delete attempts', async () => {
      // Arrange
      const newsId1 = 'news-1'
      const newsId2 = 'news-2'
      mockNewsService.deleteNews.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act - First deletion
      result.current.deleteNews(newsId1)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Act - Second deletion
      result.current.deleteNews(newsId2)
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Assert
      expect(mockNewsService.deleteNews).toHaveBeenCalledTimes(2)
      expect(mockNewsService.deleteNews).toHaveBeenNthCalledWith(1, newsId1)
      expect(mockNewsService.deleteNews).toHaveBeenNthCalledWith(2, newsId2)
      expect(toast.success).toHaveBeenCalledTimes(2)
    })

    it('should handle rapid successive delete calls', async () => {
      // Arrange
      mockNewsService.deleteNews.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act - Multiple rapid calls
      result.current.deleteNews('news-1')
      result.current.deleteNews('news-2')
      result.current.deleteNews('news-3')

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockNewsService.deleteNews).toHaveBeenCalledTimes(3)
    })

    it('should handle mix of successful and failed deletions', async () => {
      // Arrange
      mockNewsService.deleteNews
        .mockResolvedValueOnce(undefined) // Success
        .mockRejectedValueOnce(new Error('Failed')) // Error
        .mockResolvedValueOnce(undefined) // Success

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act - First deletion (success)
      result.current.deleteNews('news-1')
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Act - Second deletion (error)
      result.current.deleteNews('news-2')
      await waitFor(() => expect(result.current.error).toBeTruthy())

      // Act - Third deletion (success)
      result.current.deleteNews('news-3')
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Assert
      expect(mockNewsService.deleteNews).toHaveBeenCalledTimes(3)
      expect(toast.success).toHaveBeenCalledTimes(2)
      expect(toast.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('State Transitions', () => {
    it('should handle mutation lifecycle correctly', async () => {
      // Arrange
      const newsId = 'news-123'
      mockNewsService.deleteNews.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Initial state
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.isSuccess).toBe(false)

      // Act
      result.current.deleteNews(newsId)

      // Assert - Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Final state should be success (no error)
      expect(result.current.error).toBe(null)
      expect(result.current.isSuccess).toBe(true)
      expect(mockNewsService.deleteNews).toHaveBeenCalledWith(newsId)
    })

    it('should transition from loading to error state correctly', async () => {
      // Arrange
      const newsId = 'news-123'
      const mockError = createMockAxiosError('Delete failed', 500)
      mockNewsService.deleteNews.mockRejectedValue(mockError)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Initial state
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)

      // Act
      result.current.deleteNews(newsId)

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
      mockNewsService.deleteNews
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act - First deletion (fails)
      result.current.deleteNews('news-1')
      await waitFor(() => expect(result.current.error).toBeTruthy())

      // Act - Second deletion (succeeds)
      result.current.deleteNews('news-2')
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Assert - Error should be cleared
      expect(result.current.error).toBe(null)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string newsId', async () => {
      // Arrange
      mockNewsService.deleteNews.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews('')

      // Assert
      await waitFor(() => {
        expect(mockNewsService.deleteNews).toHaveBeenCalledWith('')
      })
    })

    it('should handle undefined newsId gracefully', async () => {
      // Arrange
      mockNewsService.deleteNews.mockRejectedValue(new Error('NewsId required'))

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(undefined as any)

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(mockNewsService.deleteNews).toHaveBeenCalledWith(undefined)
    })

    it('should handle service method not available', async () => {
      // Arrange
      mockNewsService.deleteNews.mockImplementation(() => {
        throw new Error('Delete service unavailable')
      })

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews('news-123')

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error.message).toBe('Delete service unavailable')
      })
    })

    it('should handle special characters in newsId', async () => {
      // Arrange
      const specialId = 'news-!@#$%^&*()'
      mockNewsService.deleteNews.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(specialId)

      // Assert
      await waitFor(() => {
        expect(mockNewsService.deleteNews).toHaveBeenCalledWith(specialId)
      })
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate news queries with correct query key', async () => {
      // Arrange
      const newsId = 'news-123'
      mockNewsService.deleteNews.mockResolvedValue(undefined)
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['news'] })
      })
    })

    it('should only invalidate queries after successful deletion', async () => {
      // Arrange
      const newsId = 'news-123'
      mockNewsService.deleteNews.mockRejectedValue(new Error('Failed'))
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteNewsMutation(), {
        wrapper: createWrapper,
      })

      // Act
      result.current.deleteNews(newsId)

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(invalidateQueriesSpy).not.toHaveBeenCalled()
    })
  })
})
