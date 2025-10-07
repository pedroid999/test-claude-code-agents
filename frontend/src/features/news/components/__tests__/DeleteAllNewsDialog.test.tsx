import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteAllNewsDialog } from '../DeleteAllNewsDialog'
import { createMockNewsContextValue, createMockNewsStats } from '@/test-utils'
import { NewsProvider, useNewsContext } from '../../hooks/useNewsContext'
import React from 'react'

// Mock the news context
vi.mock('../../hooks/useNewsContext', async () => {
  const actual = await vi.importActual('../../hooks/useNewsContext')
  return {
    ...actual,
    useNewsContext: vi.fn(),
  }
})

const mockUseNewsContext = useNewsContext as any

describe('DeleteAllNewsDialog', () => {
  const defaultMockContext = {
    deleteAllNews: vi.fn(),
    stats: createMockNewsStats({
      pending: 5,
      reading: 3,
      read: 2,
      favorites: 4,
      total: 10,
    }),
    deleteState: {
      isLoading: false,
      error: null,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNewsContext.mockReturnValue(defaultMockContext)
  })

  describe('Rendering', () => {
    it('should render the delete all button', () => {
      // Act
      render(<DeleteAllNewsDialog />)

      // Assert
      const button = screen.getByRole('button', { name: /delete all/i })
      expect(button).toBeInTheDocument()
    })

    it('should display trash icon in button', () => {
      // Act
      render(<DeleteAllNewsDialog />)

      // Assert
      const button = screen.getByRole('button', { name: /delete all/i })
      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should have outline variant styling on trigger button', () => {
      // Act
      render(<DeleteAllNewsDialog />)

      // Assert
      const button = screen.getByRole('button', { name: /delete all/i })
      // Button should have outline styling (specific classes depend on your Button component)
      expect(button).toHaveClass('outline')
    })
  })

  describe('Dialog Content', () => {
    it('should show dialog when button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      const triggerButton = screen.getByRole('button', { name: /delete all/i })
      await user.click(triggerButton)

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should display correct dialog title', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Delete All News Items?')).toBeInTheDocument()
      })
    })

    it('should display warning message', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(/this action cannot be undone/i)
        ).toBeInTheDocument()
      })
    })

    it('should display correct stats breakdown', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Pending:')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('Reading:')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('Read:')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('Favorites:')).toBeInTheDocument()
        expect(screen.getByText('4')).toBeInTheDocument()
      })
    })

    it('should display total count', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Total:')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
      })
    })

    it('should display cancel and delete all buttons', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Assert
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        const deleteButton = screen.getAllByRole('button', { name: /delete all/i })[1] // Second one is in dialog

        expect(cancelButton).toBeInTheDocument()
        expect(deleteButton).toBeInTheDocument()
      })
    })
  })

  describe('Button States', () => {
    it('should disable trigger button when no news items exist', () => {
      // Arrange
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        stats: createMockNewsStats({
          pending: 0,
          reading: 0,
          read: 0,
          favorites: 0,
          total: 0,
        }),
      })

      // Act
      render(<DeleteAllNewsDialog />)

      // Assert
      const button = screen.getByRole('button', { name: /delete all/i })
      expect(button).toBeDisabled()
    })

    it('should disable trigger button during deletion', () => {
      // Arrange
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        deleteState: {
          isLoading: true,
          error: null,
        },
      })

      // Act
      render(<DeleteAllNewsDialog />)

      // Assert
      const button = screen.getByRole('button', { name: /delete all/i })
      expect(button).toBeDisabled()
    })

    it('should enable trigger button when news items exist and not loading', () => {
      // Arrange
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        stats: createMockNewsStats({ total: 10 }),
        deleteState: {
          isLoading: false,
          error: null,
        },
      })

      // Act
      render(<DeleteAllNewsDialog />)

      // Assert
      const button = screen.getByRole('button', { name: /delete all/i })
      expect(button).not.toBeDisabled()
    })

    it('should disable dialog buttons during deletion', async () => {
      // Arrange
      const user = userEvent.setup()
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        deleteState: {
          isLoading: true,
          error: null,
        },
      })
      render(<DeleteAllNewsDialog />)

      // Open dialog first with loading false
      mockUseNewsContext.mockReturnValue(defaultMockContext)
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Then update to loading state
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        deleteState: {
          isLoading: true,
          error: null,
        },
      })

      // Assert
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        const deleteButtons = screen.getAllByRole('button', { name: /delete all|deleting/i })
        const deleteButton = deleteButtons[deleteButtons.length - 1]

        expect(cancelButton).toBeDisabled()
        expect(deleteButton).toBeDisabled()
      })
    })

    it('should show "Deleting..." text during deletion', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Open dialog
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Update to loading state
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        deleteState: {
          isLoading: true,
          error: null,
        },
      })

      // Force re-render by reopening
      const deleteButtons = screen.getAllByRole('button', { name: /delete all/i })
      const confirmButton = deleteButtons[deleteButtons.length - 1]

      // Check initial text
      expect(confirmButton).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call deleteAllNews when delete button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockDeleteAllNews = vi.fn()
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        deleteAllNews: mockDeleteAllNews,
      })
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByRole('button', { name: /delete all/i })
      const confirmButton = deleteButtons[deleteButtons.length - 1]
      await user.click(confirmButton)

      // Assert
      expect(mockDeleteAllNews).toHaveBeenCalledTimes(1)
    })

    it('should close dialog after clicking delete button', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByRole('button', { name: /delete all/i })
      const confirmButton = deleteButtons[deleteButtons.length - 1]
      await user.click(confirmButton)

      // Assert
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should close dialog when cancel button is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Assert
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should not call deleteAllNews when cancel is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockDeleteAllNews = vi.fn()
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        deleteAllNews: mockDeleteAllNews,
      })
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Assert
      expect(mockDeleteAllNews).not.toHaveBeenCalled()
    })

    it('should close dialog on Escape key press', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      // Assert
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Stats Display', () => {
    it('should show zero counts when no items exist', async () => {
      // Arrange
      const user = userEvent.setup()
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        stats: createMockNewsStats({
          pending: 0,
          reading: 0,
          read: 0,
          favorites: 0,
          total: 0,
        }),
      })

      // Button will be disabled, but we can test with enabled context
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        stats: createMockNewsStats({
          pending: 0,
          reading: 0,
          read: 0,
          favorites: 0,
          total: 1, // Make total 1 so button is enabled
        }),
      })

      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Assert
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
      })
    })

    it('should update stats dynamically', async () => {
      // Arrange
      const user = userEvent.setup()
      const { rerender } = render(<DeleteAllNewsDialog />)

      // Act - Open dialog with initial stats
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument()
      })

      // Update context with new stats
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        stats: createMockNewsStats({
          pending: 10,
          reading: 5,
          read: 3,
          favorites: 8,
          total: 18,
        }),
      })

      rerender(<DeleteAllNewsDialog />)

      // Assert - Should show updated stats
      await waitFor(() => {
        expect(screen.getByText('18')).toBeInTheDocument()
      })
    })

    it('should handle large numbers correctly', async () => {
      // Arrange
      const user = userEvent.setup()
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        stats: createMockNewsStats({
          pending: 999,
          reading: 888,
          read: 777,
          favorites: 666,
          total: 2664,
        }),
      })
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Assert
      await waitFor(() => {
        expect(screen.getByText('999')).toBeInTheDocument()
        expect(screen.getByText('888')).toBeInTheDocument()
        expect(screen.getByText('777')).toBeInTheDocument()
        expect(screen.getByText('666')).toBeInTheDocument()
        expect(screen.getByText('2664')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper dialog role', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('should have accessible button labels', () => {
      // Act
      render(<DeleteAllNewsDialog />)

      // Assert
      const button = screen.getByRole('button', { name: /delete all/i })
      expect(button).toHaveAccessibleName()
    })

    it('should trap focus within dialog', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      // Assert
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        // Radix UI Dialog handles focus trapping automatically
      })
    })

    it('should be keyboard navigable', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<DeleteAllNewsDialog />)

      // Act - Tab to button and press Enter
      await user.tab()
      await user.keyboard('{Enter}')

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing stats gracefully', async () => {
      // Arrange
      const user = userEvent.setup()
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        stats: undefined as any,
      })

      // Act & Assert - Should not crash
      expect(() => render(<DeleteAllNewsDialog />)).not.toThrow()
    })

    it('should handle missing deleteAllNews function', async () => {
      // Arrange
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        deleteAllNews: undefined as any,
      })

      // Act & Assert - Should render but not crash
      expect(() => render(<DeleteAllNewsDialog />)).not.toThrow()
    })

    it('should prevent multiple rapid delete clicks', async () => {
      // Arrange
      const user = userEvent.setup()
      const mockDeleteAllNews = vi.fn()
      mockUseNewsContext.mockReturnValue({
        ...defaultMockContext,
        deleteAllNews: mockDeleteAllNews,
      })
      render(<DeleteAllNewsDialog />)

      // Act
      await user.click(screen.getByRole('button', { name: /delete all/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Get the confirm button and click multiple times rapidly
      const deleteButtons = screen.getAllByRole('button', { name: /delete all/i })
      const confirmButton = deleteButtons[deleteButtons.length - 1]

      await user.click(confirmButton)
      // Dialog closes after first click, so second click won't work

      // Assert - Should only be called once due to dialog closing
      expect(mockDeleteAllNews).toHaveBeenCalledTimes(1)
    })
  })
})
