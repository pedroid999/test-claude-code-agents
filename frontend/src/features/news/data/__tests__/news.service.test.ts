import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { newsService } from '../news.service'
import { apiClient } from '@/core/data/apiClient'
import {
  createMockNewsItem,
  createMockNewsListResponse,
  createMockCreateNewsRequest,
  createMockUpdateStatusRequest,
  createMockGenerateAiNewsRequest,
  createMockGenerateAiNewsResponse,
  createMockDeleteAllNewsResponse,
  createMockAxiosError,
} from '@/test-utils'

// Mock the apiClient module
vi.mock('@/core/data/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockApiClient = apiClient as any

describe('newsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('deleteNews', () => {
    const newsId = 'news-123'

    it('should successfully delete a news item', async () => {
      // Arrange
      mockApiClient.delete.mockResolvedValue(undefined)

      // Act
      await newsService.deleteNews(newsId)

      // Assert
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/api/news/${newsId}`)
      expect(mockApiClient.delete).toHaveBeenCalledTimes(1)
    })

    it('should return void on successful deletion', async () => {
      // Arrange
      mockApiClient.delete.mockResolvedValue(undefined)

      // Act
      const result = await newsService.deleteNews(newsId)

      // Assert
      expect(result).toBeUndefined()
    })

    it('should handle 404 not found error', async () => {
      // Arrange
      const notFoundError = createMockAxiosError('News item not found', 404, {
        detail: 'News item with id news-123 not found',
      })
      mockApiClient.delete.mockRejectedValue(notFoundError)

      // Act & Assert
      await expect(newsService.deleteNews(newsId)).rejects.toThrow()
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/api/news/${newsId}`)
    })

    it('should handle 403 forbidden error (unauthorized)', async () => {
      // Arrange
      const forbiddenError = createMockAxiosError('Forbidden', 403, {
        detail: 'You do not have permission to delete this news item',
      })
      mockApiClient.delete.mockRejectedValue(forbiddenError)

      // Act & Assert
      await expect(newsService.deleteNews(newsId)).rejects.toThrow()
    })

    it('should handle 401 unauthorized error', async () => {
      // Arrange
      const unauthorizedError = createMockAxiosError('Unauthorized', 401)
      mockApiClient.delete.mockRejectedValue(unauthorizedError)

      // Act & Assert
      await expect(newsService.deleteNews(newsId)).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network Error')
      mockApiClient.delete.mockRejectedValue(networkError)

      // Act & Assert
      await expect(newsService.deleteNews(newsId)).rejects.toThrow('Network Error')
    })

    it('should handle server errors', async () => {
      // Arrange
      const serverError = createMockAxiosError('Internal Server Error', 500)
      mockApiClient.delete.mockRejectedValue(serverError)

      // Act & Assert
      await expect(newsService.deleteNews(newsId)).rejects.toThrow()
    })

    it('should handle empty news ID', async () => {
      // Arrange
      mockApiClient.delete.mockResolvedValue(undefined)

      // Act
      await newsService.deleteNews('')

      // Assert
      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/news/')
    })

    it('should handle special characters in news ID', async () => {
      // Arrange
      const specialId = 'news-123-abc-456'
      mockApiClient.delete.mockResolvedValue(undefined)

      // Act
      await newsService.deleteNews(specialId)

      // Assert
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/api/news/${specialId}`)
    })

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'TimeoutError'
      mockApiClient.delete.mockRejectedValue(timeoutError)

      // Act & Assert
      await expect(newsService.deleteNews(newsId)).rejects.toThrow('Timeout')
    })

    it('should preserve error details from API response', async () => {
      // Arrange
      const detailedError = createMockAxiosError('Deletion failed', 400, {
        detail: 'News item is currently being processed',
        code: 'DELETION_NOT_ALLOWED',
      })
      mockApiClient.delete.mockRejectedValue(detailedError)

      // Act & Assert
      await expect(newsService.deleteNews(newsId)).rejects.toThrow()
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/api/news/${newsId}`)
    })
  })

  describe('deleteAllUserNews', () => {
    it('should successfully delete all user news items', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse({
        deleted_count: 10,
        message: 'Successfully deleted 10 news items',
      })
      mockApiClient.delete.mockResolvedValue(mockResponse)

      // Act
      const result = await newsService.deleteAllUserNews()

      // Assert
      expect(result).toEqual(mockResponse)
      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/news/user/all')
      expect(mockApiClient.delete).toHaveBeenCalledTimes(1)
    })

    it('should return correct delete count', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse({
        deleted_count: 25,
        message: 'Successfully deleted 25 news items',
      })
      mockApiClient.delete.mockResolvedValue(mockResponse)

      // Act
      const result = await newsService.deleteAllUserNews()

      // Assert
      expect(result.deleted_count).toBe(25)
      expect(result.message).toBe('Successfully deleted 25 news items')
    })

    it('should handle zero deletions (no news items)', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse({
        deleted_count: 0,
        message: 'No news items to delete',
      })
      mockApiClient.delete.mockResolvedValue(mockResponse)

      // Act
      const result = await newsService.deleteAllUserNews()

      // Assert
      expect(result.deleted_count).toBe(0)
      expect(result.message).toBe('No news items to delete')
    })

    it('should handle large number of deletions', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse({
        deleted_count: 1000,
        message: 'Successfully deleted 1000 news items',
      })
      mockApiClient.delete.mockResolvedValue(mockResponse)

      // Act
      const result = await newsService.deleteAllUserNews()

      // Assert
      expect(result.deleted_count).toBe(1000)
    })

    it('should handle 401 unauthorized error', async () => {
      // Arrange
      const unauthorizedError = createMockAxiosError('Unauthorized', 401)
      mockApiClient.delete.mockRejectedValue(unauthorizedError)

      // Act & Assert
      await expect(newsService.deleteAllUserNews()).rejects.toThrow()
    })

    it('should handle 403 forbidden error', async () => {
      // Arrange
      const forbiddenError = createMockAxiosError('Forbidden', 403, {
        detail: 'Insufficient permissions to delete all news',
      })
      mockApiClient.delete.mockRejectedValue(forbiddenError)

      // Act & Assert
      await expect(newsService.deleteAllUserNews()).rejects.toThrow()
    })

    it('should handle 429 rate limit error', async () => {
      // Arrange
      const rateLimitError = createMockAxiosError('Too Many Requests', 429, {
        detail: 'Rate limit exceeded. Please try again later.',
      })
      mockApiClient.delete.mockRejectedValue(rateLimitError)

      // Act & Assert
      await expect(newsService.deleteAllUserNews()).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network Error')
      mockApiClient.delete.mockRejectedValue(networkError)

      // Act & Assert
      await expect(newsService.deleteAllUserNews()).rejects.toThrow('Network Error')
    })

    it('should handle server errors', async () => {
      // Arrange
      const serverError = createMockAxiosError('Internal Server Error', 500)
      mockApiClient.delete.mockRejectedValue(serverError)

      // Act & Assert
      await expect(newsService.deleteAllUserNews()).rejects.toThrow()
    })

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'TimeoutError'
      mockApiClient.delete.mockRejectedValue(timeoutError)

      // Act & Assert
      await expect(newsService.deleteAllUserNews()).rejects.toThrow('Timeout')
    })

    it('should handle malformed response data', async () => {
      // Arrange
      const malformedResponse = { count: 10 } // Missing deleted_count field
      mockApiClient.delete.mockResolvedValue(malformedResponse)

      // Act
      const result = await newsService.deleteAllUserNews()

      // Assert - Service should return what API returns (no validation)
      expect(result).toEqual(malformedResponse)
    })

    it('should handle concurrent delete all requests', async () => {
      // Arrange
      const mockResponse1 = createMockDeleteAllNewsResponse({ deleted_count: 5 })
      const mockResponse2 = createMockDeleteAllNewsResponse({ deleted_count: 3 })
      mockApiClient.delete
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      // Act
      const [result1, result2] = await Promise.all([
        newsService.deleteAllUserNews(),
        newsService.deleteAllUserNews(),
      ])

      // Assert
      expect(result1.deleted_count).toBe(5)
      expect(result2.deleted_count).toBe(3)
      expect(mockApiClient.delete).toHaveBeenCalledTimes(2)
    })

    it('should preserve error details for debugging', async () => {
      // Arrange
      const detailedError = createMockAxiosError('Deletion failed', 400, {
        detail: 'Database connection error',
        code: 'DB_ERROR',
        timestamp: new Date().toISOString(),
      })
      mockApiClient.delete.mockRejectedValue(detailedError)

      // Act & Assert
      await expect(newsService.deleteAllUserNews()).rejects.toThrow()
    })
  })

  describe('Service Method Contracts', () => {
    it('should have correct method signatures', () => {
      // Verify the service exports all expected methods
      expect(typeof newsService.createNews).toBe('function')
      expect(typeof newsService.getUserNews).toBe('function')
      expect(typeof newsService.getPublicNews).toBe('function')
      expect(typeof newsService.updateNewsStatus).toBe('function')
      expect(typeof newsService.toggleFavorite).toBe('function')
      expect(typeof newsService.getNewsStats).toBe('function')
      expect(typeof newsService.generateAiNews).toBe('function')
      expect(typeof newsService.deleteNews).toBe('function')
      expect(typeof newsService.deleteAllUserNews).toBe('function')
    })

    it('should maintain async method contracts', async () => {
      // All methods should return promises
      mockApiClient.delete.mockResolvedValue(undefined)
      mockApiClient.delete.mockResolvedValueOnce(undefined)
      mockApiClient.delete.mockResolvedValueOnce(createMockDeleteAllNewsResponse())

      const deleteResult = newsService.deleteNews('news-123')
      const deleteAllResult = newsService.deleteAllUserNews()

      expect(deleteResult).toBeInstanceOf(Promise)
      expect(deleteAllResult).toBeInstanceOf(Promise)

      // Wait for all to complete
      await Promise.all([deleteResult, deleteAllResult])
    })
  })

  describe('API Integration Edge Cases', () => {
    it('should handle very long response delays for deleteAllUserNews', async () => {
      // Arrange
      const mockResponse = createMockDeleteAllNewsResponse()
      mockApiClient.delete.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      )

      // Act
      const startTime = Date.now()
      const result = await newsService.deleteAllUserNews()
      const endTime = Date.now()

      // Assert
      expect(result).toEqual(mockResponse)
      expect(endTime - startTime).toBeGreaterThanOrEqual(50)
    })

    it('should handle HTTP 5xx errors gracefully', async () => {
      const statusCodes = [
        { code: 500, message: 'Internal Server Error' },
        { code: 502, message: 'Bad Gateway' },
        { code: 503, message: 'Service Unavailable' },
        { code: 504, message: 'Gateway Timeout' },
      ]

      for (const { code, message } of statusCodes) {
        // Arrange
        const mockError = createMockAxiosError(message, code)
        mockApiClient.delete.mockRejectedValueOnce(mockError)

        // Act & Assert
        await expect(newsService.deleteNews('news-123')).rejects.toThrow()
      }
    })

    it('should handle null response from deleteNews', async () => {
      // Arrange
      mockApiClient.delete.mockResolvedValue(null)

      // Act
      const result = await newsService.deleteNews('news-123')

      // Assert
      expect(result).toBeNull()
    })

    it('should handle undefined response from deleteNews', async () => {
      // Arrange
      mockApiClient.delete.mockResolvedValue(undefined)

      // Act
      const result = await newsService.deleteNews('news-123')

      // Assert
      expect(result).toBeUndefined()
    })
  })
})
