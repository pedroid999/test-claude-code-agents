# Delete News Feature - Frontend Implementation Plan

## Overview
This document provides a detailed implementation plan for adding delete functionality to the news feature, including individual item deletion and bulk delete-all functionality.

---

## 1. Service Layer Implementation

### 1.1 Update News Schema (`frontend/src/features/news/data/news.schema.ts`)

**Location:** Add to existing schema file

**What to Add:**
```typescript
// Add after GenerateAiNewsResponse interface
export interface DeleteAllNewsResponse {
  deleted_count: number;
  message: string;
}
```

**Why:** This type ensures type safety for the bulk delete response from the backend.

---

### 1.2 Update News Service (`frontend/src/features/news/data/news.service.ts`)

**Location:** Add to existing `newsService` object

**What to Add:**
```typescript
export const newsService = {
  // ... existing methods ...

  async deleteNews(newsId: string): Promise<void> {
    await apiClient.delete<void>(`/api/news/${newsId}`);
  },

  async deleteAllUserNews(): Promise<DeleteAllNewsResponse> {
    const response = await apiClient.delete<DeleteAllNewsResponse>('/api/news/user/all');
    return response;
  },
};
```

**Type Safety Notes:**
- `deleteNews` returns `Promise<void>` since DELETE typically returns 204 No Content
- `deleteAllUserNews` returns the typed response with count information
- Both use the existing `apiClient.delete` method which already handles:
  - Error handling (401 redirects, error response formatting)
  - Authorization headers (Bearer token injection)
  - Type safety with generics

**Error Handling:**
The `apiClient` already handles errors centrally, including:
- 401 Unauthorized → automatic redirect to login
- Network errors → formatted ApiError with details
- Response errors → error.detail from backend

---

## 2. React Query Mutations

### 2.1 Create Delete News Mutation Hook

**File:** `frontend/src/features/news/hooks/mutations/useDeleteNews.mutation.ts`

**Content:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsService } from '../../data/news.service';

export const useDeleteNewsMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newsId: string) => newsService.deleteNews(newsId),
    onSuccess: () => {
      // Invalidate all news queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success('News item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete news item');
    },
  });

  return {
    deleteNews: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};
```

**Key Design Decisions:**
1. **Cache Invalidation:** Uses `queryKey: ['news']` to invalidate ALL news queries (user news, stats, etc.)
2. **Toast Notifications:** Provides immediate user feedback for success/error
3. **Standard Return Format:** Follows project convention of `{action, isLoading, error, isSuccess}`
4. **No Optimistic Updates:** For individual deletions, we wait for confirmation to ensure data consistency

---

### 2.2 Create Delete All News Mutation Hook

**File:** `frontend/src/features/news/hooks/mutations/useDeleteAllNews.mutation.ts`

**Content:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsService } from '../../data/news.service';

export const useDeleteAllNewsMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => newsService.deleteAllUserNews(),
    onSuccess: (data) => {
      // Invalidate all news queries
      queryClient.invalidateQueries({ queryKey: ['news'] });

      // Show success message with count
      toast.success(`Successfully deleted ${data.deleted_count} news items`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete all news items');
    },
  });

  return {
    deleteAllNews: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};
```

**Key Design Decisions:**
1. **Comprehensive Invalidation:** Clears entire news cache to ensure fresh data
2. **Informative Success Message:** Shows count of deleted items for transparency
3. **No Parameters:** The backend determines "all" based on authenticated user
4. **Same Return Pattern:** Consistent with other mutations

---

## 3. Context Integration

### 3.1 Update News Context (`frontend/src/features/news/hooks/useNewsContext.tsx`)

**What to Add:**

1. **Import the new mutations:**
```typescript
import { useDeleteNewsMutation } from './mutations/useDeleteNews.mutation';
import { useDeleteAllNewsMutation } from './mutations/useDeleteAllNews.mutation';
```

2. **Add to context interface:**
```typescript
interface NewsContextType {
  // ... existing properties ...

  // Delete operations
  deleteNews: (newsId: string) => void;
  deleteAllNews: () => void;

  // Delete state
  deleteState: {
    isLoading: boolean;
    error: Error | null;
  };
}
```

3. **Inside NewsProvider component:**
```typescript
export const NewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ... existing state and hooks ...

  // Delete mutations
  const {
    deleteNews,
    isLoading: isDeleting,
    error: deleteError
  } = useDeleteNewsMutation();

  const {
    deleteAllNews,
    isLoading: isDeletingAll,
    error: deleteAllError
  } = useDeleteAllNewsMutation();

  // Memoize delete handlers
  const handleDeleteNews = useCallback((newsId: string) => {
    deleteNews(newsId);
  }, [deleteNews]);

  const handleDeleteAllNews = useCallback(() => {
    deleteAllNews();
  }, [deleteAllNews]);

  // Update context value
  const value: NewsContextType = {
    // ... existing properties ...
    deleteNews: handleDeleteNews,
    deleteAllNews: handleDeleteAllNews,
    deleteState: {
      isLoading: isDeleting || isDeletingAll,
      error: deleteError || deleteAllError,
    },
  };

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
};
```

**Why This Approach:**
- **Single Source of Truth:** Centralizes delete operations in context
- **Memoization:** Prevents unnecessary re-renders
- **Combined Loading State:** Components can check if ANY delete is in progress
- **Error Aggregation:** Either delete error surfaces through context

---

## 4. UI Component Implementation

### 4.1 Update NewsCard Component

**File:** `frontend/src/features/news/components/NewsCard.tsx`

**What to Change:**

1. **Add import:**
```typescript
import { Heart, ExternalLink, Trash2 } from 'lucide-react';
```

2. **Get delete function from context:**
```typescript
export const NewsCard = ({ item, isDragging = false }: NewsCardProps) => {
  const { toggleFavorite, deleteNews, deleteState } = useNewsContext();
  // ... existing code ...
```

3. **Add delete handler:**
```typescript
const handleDeleteClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  deleteNews(item.id);
};
```

4. **Update the button section in CardHeader (around line 65):**
```typescript
<div className="flex items-center gap-1">
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7"
    onClick={handleFavoriteClick}
  >
    <Heart
      className={cn(
        'h-4 w-4',
        item.is_favorite && 'fill-red-500 text-red-500'
      )}
    />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7"
    onClick={handleLinkClick}
  >
    <ExternalLink className="h-4 w-4" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 hover:text-destructive"
    onClick={handleDeleteClick}
    disabled={deleteState.isLoading}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

**Design Decisions:**
- **Icon Choice:** Trash2 from Lucide React (consistent with project)
- **Positioning:** Third icon in the action group, after Heart and ExternalLink
- **No Confirmation:** For individual deletions, action is immediate with undo feedback via toast
- **Hover State:** `hover:text-destructive` uses theme color for delete indication
- **Disabled State:** Prevents clicking during deletion operation
- **Event Propagation:** `stopPropagation()` prevents card drag interaction

**UX Considerations:**
- Users can quickly delete items without modal friction
- Toast provides immediate feedback and implicit undo confirmation
- Disabled state during loading prevents double-submissions
- Destructive color on hover signals dangerous action

---

### 4.2 Create Delete All Confirmation Dialog

**File:** `frontend/src/features/news/components/DeleteAllNewsDialog.tsx`

**Full Content:**
```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { useNewsContext } from '../hooks/useNewsContext';

export const DeleteAllNewsDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { deleteAllNews, deleteState, stats } = useNewsContext();

  const handleDeleteAll = () => {
    deleteAllNews();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={stats.total === 0}
        >
          <Trash2 className="h-4 w-4" />
          Delete All
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete All News Items</DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <p className="font-medium text-foreground">
              Are you sure you want to delete all your news items?
            </p>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">This will permanently delete:</p>
              <ul className="text-sm space-y-1 pl-4">
                <li>• {stats.total} total news items</li>
                <li>• {stats.pending} pending items</li>
                <li>• {stats.reading} reading items</li>
                <li>• {stats.read} completed items</li>
                <li>• {stats.favorites} favorited items</li>
              </ul>
            </div>

            <p className="text-sm text-destructive font-medium">
              This action cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAll}
            disabled={deleteState.isLoading}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {deleteState.isLoading ? 'Deleting...' : 'Delete All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

**Key Design Decisions:**

1. **Controlled Dialog:** Uses local state to manage open/close
2. **Detailed Information:** Shows breakdown by status and favorites count
3. **Visual Hierarchy:**
   - Primary message in medium font weight
   - Stats in a muted background box for emphasis
   - Warning in destructive color
4. **Disabled States:**
   - Trigger button disabled when no news items exist
   - Delete button disabled during operation
5. **Loading Feedback:** Button text changes to "Deleting..." during operation
6. **Auto-close:** Dialog closes on successful deletion (combined with toast from mutation)

**Accessibility Features:**
- Semantic dialog structure
- Clear action buttons
- Descriptive labels
- Keyboard navigation support (built into Radix UI Dialog)
- Screen reader friendly content

---

### 4.3 Update NewsBoard Component

**File:** `frontend/src/features/news/components/NewsBoard.tsx`

**What to Change:**

1. **Add import:**
```typescript
import { DeleteAllNewsDialog } from './DeleteAllNewsDialog';
```

2. **Update the button area (around line 99 for mobile, 116 for desktop):**

**Mobile view (around line 99):**
```typescript
<div className="flex gap-2">
  <CreateNewsButton />
  <AiNewsButton />
  <DeleteAllNewsDialog />
</div>
```

**Desktop view (around line 116):**
```typescript
<div className="flex gap-2">
  <CreateNewsButton />
  <AiNewsButton />
  <DeleteAllNewsDialog />
</div>
```

**Why This Placement:**
- Grouped with other action buttons (Create, AI Generate)
- Visible but not prominently placed (reduce accidental clicks)
- Consistent across mobile and desktop views
- Right-aligned with other actions

---

## 5. State Management Strategy

### 5.1 Cache Invalidation Approach

**Strategy:** Aggressive invalidation with `queryKey: ['news']`

**What Gets Invalidated:**
- User news query (`useUserNewsQuery`)
- News stats query (if separate)
- Any other news-related queries

**Why This Approach:**
- **Simplicity:** One invalidation call refreshes everything
- **Consistency:** Ensures all parts of UI reflect current state
- **Stats Accuracy:** Stats automatically recalculate after deletion
- **Group Accuracy:** Kanban board columns update correctly

**Alternative Considered (Rejected):**
- **Optimistic Updates:** Too complex for delete operations due to:
  - Multiple query dependencies (stats, grouped data)
  - Risk of inconsistent state if deletion fails
  - Complicated rollback logic

---

### 5.2 Loading States

**Individual Delete:**
- Button disabled: `disabled={deleteState.isLoading}`
- No spinner needed (quick operation)
- Toast provides feedback

**Bulk Delete:**
- Button text changes: "Delete All" → "Deleting..."
- Button disabled during operation
- Dialog auto-closes on success
- Toast shows count of deleted items

---

### 5.3 Error Handling

**Three Layers of Error Handling:**

1. **API Client Layer (`apiClient.ts`):**
   - Catches network errors
   - Formats error responses
   - Handles 401 redirects

2. **Mutation Layer (hooks):**
   - Catches mutation errors
   - Displays toast notifications
   - Provides error to context

3. **Context Layer:**
   - Aggregates errors from multiple mutations
   - Makes errors available to components
   - Components can optionally display error state

**Error Display Strategy:**
- **Primary:** Toast notifications (non-blocking, temporary)
- **Secondary:** Context provides error for components that need it
- **Fallback:** API client handles catastrophic failures (401)

---

## 6. Best Practices & Patterns

### 6.1 React Query Patterns

**Query Keys:**
```typescript
['news'] // Base key - invalidates all news queries
['news', 'user'] // Specific user news
['news', 'user', filters] // Filtered user news
```

**Invalidation Pattern:**
```typescript
queryClient.invalidateQueries({ queryKey: ['news'] });
// Invalidates ALL queries starting with ['news']
```

**Mutation Pattern:**
```typescript
const mutation = useMutation({
  mutationFn: async (param) => service.method(param),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['news'] });
    toast.success('Operation successful');
  },
  onError: (error: Error) => {
    toast.error(error.message || 'Operation failed');
  },
});
```

---

### 6.2 Component Composition

**Separation of Concerns:**
1. **Service Layer:** Pure async functions, no React
2. **Mutation Hooks:** React Query logic, return standard interface
3. **Context:** Aggregates mutations, provides unified API
4. **Components:** Consume context, handle UI only

**Props vs Context:**
- **Props:** For reusable components with varying behavior
- **Context:** For feature-specific state and operations
- **This Feature:** Uses context (news operations are feature-specific)

---

### 6.3 TypeScript Best Practices

**Service Types:**
```typescript
// Explicit return types for clarity
async deleteNews(newsId: string): Promise<void>
async deleteAllUserNews(): Promise<DeleteAllNewsResponse>
```

**Mutation Hook Returns:**
```typescript
// Consistent interface across all mutations
return {
  action: mutation.mutate,
  isLoading: mutation.isPending,
  error: mutation.error,
  isSuccess: mutation.isSuccess,
};
```

**Context Types:**
```typescript
// Clear distinction between state and actions
interface NewsContextType {
  // State (read-only)
  news: NewsItem[];
  isLoading: boolean;

  // Actions (write operations)
  deleteNews: (newsId: string) => void;
  deleteAllNews: () => void;
}
```

---

## 7. Accessibility Considerations

### 7.1 Keyboard Navigation

**NewsCard Trash Button:**
- Tabbable with standard button semantics
- Space/Enter to activate
- Focus visible (built into Button component)

**Delete All Dialog:**
- Trigger button tabbable
- Dialog traps focus when open
- Escape key closes dialog
- Tab cycles through dialog actions

---

### 7.2 Screen Readers

**Button Labels:**
```typescript
<Button aria-label="Delete news item">
  <Trash2 className="h-4 w-4" />
</Button>
```

**Dialog Content:**
- Title clearly describes action
- Description provides context
- Warning emphasized appropriately

---

### 7.3 Visual Indicators

**Destructive Actions:**
- Red color on hover (`hover:text-destructive`)
- Trash icon universally understood
- "Delete All" button uses destructive variant

**Loading States:**
- Button text changes
- Disabled state prevents interaction
- Spinner could be added if operations are slow

---

## 8. Potential Issues & Solutions

### 8.1 Race Conditions

**Issue:** User deletes item, then immediately tries to interact with it

**Solution:**
- Disable all interactive elements during `deleteState.isLoading`
- Toast notification provides immediate feedback
- React Query mutation ensures sequential processing

---

### 8.2 Slow Deletions

**Issue:** Bulk delete might take time with many items

**Current Approach:**
- Loading state in button: "Deleting..."
- Toast on completion

**Future Enhancement (if needed):**
```typescript
// Add progress tracking
const [progress, setProgress] = useState(0);

// In mutation:
onMutate: () => {
  // Show progress dialog
},
onSuccess: (data) => {
  toast.success(`Deleted ${data.deleted_count} items`);
}
```

---

### 8.3 Undo Functionality

**Current:** No undo (permanent deletion)

**Future Enhancement Path:**
1. Backend implements soft delete with `deleted_at` timestamp
2. Frontend adds "Undo" action to toast
3. Timer triggers permanent deletion after 10 seconds

**Implementation:**
```typescript
// In mutation onSuccess:
toast.success('Item deleted', {
  action: {
    label: 'Undo',
    onClick: () => {
      restoreNews(newsId);
    },
  },
});
```

---

### 8.4 Optimistic Updates Consideration

**Why Not Used:**
1. **Complexity:** Stats and grouped data require complex updates
2. **Risk:** Rollback on error is complicated
3. **UX:** Delete is fast enough without optimization
4. **Consistency:** Refetching ensures accurate state

**When to Reconsider:**
- If API becomes noticeably slow (>1 second)
- If users report feeling of lag
- If implementing undo (pairs well with optimistic updates)

---

## 9. Testing Considerations

### 9.1 Mutation Hook Tests

**What to Test:**
```typescript
describe('useDeleteNewsMutation', () => {
  it('should call delete service with correct newsId');
  it('should invalidate news queries on success');
  it('should show success toast on success');
  it('should show error toast on failure');
  it('should handle loading state correctly');
});
```

---

### 9.2 Component Tests

**NewsCard:**
```typescript
describe('NewsCard delete button', () => {
  it('should render trash button');
  it('should call deleteNews on click');
  it('should stop event propagation');
  it('should be disabled during deletion');
});
```

**DeleteAllNewsDialog:**
```typescript
describe('DeleteAllNewsDialog', () => {
  it('should show correct stats in confirmation');
  it('should disable trigger when no news items');
  it('should close dialog after deletion');
  it('should show loading state during deletion');
});
```

---

### 9.3 Integration Tests

**Complete Flow:**
1. User clicks trash button on news card
2. Mutation triggers service call
3. Backend responds with success
4. Cache invalidates
5. UI updates with fresh data
6. Toast notification appears

---

## 10. Performance Considerations

### 10.1 Re-render Optimization

**Context Memoization:**
```typescript
const handleDeleteNews = useCallback((newsId: string) => {
  deleteNews(newsId);
}, [deleteNews]);
```

**Why:** Prevents unnecessary re-renders of consuming components

---

### 10.2 Query Invalidation Scope

**Current:** `invalidateQueries({ queryKey: ['news'] })`

**Impact:**
- Refetches ALL news queries
- Ensures consistency across UI
- Acceptable performance cost (queries are fast)

**Alternative (if performance issues arise):**
```typescript
// More targeted invalidation
queryClient.invalidateQueries({ queryKey: ['news', 'user'] });
queryClient.invalidateQueries({ queryKey: ['news', 'stats'] });
```

---

### 10.3 Large Datasets

**Consideration:** Deleting from a list with thousands of items

**Current Implementation:**
- Backend handles pagination
- Frontend displays limited items per page
- Invalidation refetches current page only

**No Changes Needed:** React Query handles this efficiently

---

## 11. Implementation Checklist

### Phase 1: Service & Mutations
- [ ] Add `DeleteAllNewsResponse` interface to schema
- [ ] Add `deleteNews` method to service
- [ ] Add `deleteAllUserNews` method to service
- [ ] Create `useDeleteNewsMutation` hook
- [ ] Create `useDeleteAllNewsMutation` hook

### Phase 2: Context Integration
- [ ] Import new mutation hooks in context
- [ ] Add delete operations to context interface
- [ ] Implement delete handlers in context provider
- [ ] Add delete state to context value

### Phase 3: UI Components
- [ ] Add Trash2 button to NewsCard
- [ ] Add delete handler to NewsCard
- [ ] Create DeleteAllNewsDialog component
- [ ] Add DeleteAllNewsDialog to NewsBoard (mobile)
- [ ] Add DeleteAllNewsDialog to NewsBoard (desktop)

### Phase 4: Testing & Polish
- [ ] Test individual delete flow
- [ ] Test bulk delete flow
- [ ] Verify loading states
- [ ] Verify error handling
- [ ] Check accessibility (keyboard navigation)
- [ ] Verify toast notifications
- [ ] Test with various data states (empty, single, many items)

---

## 12. Color Theme Compliance

All colors used in this implementation follow the theme defined in `frontend/src/index.css`:

**Destructive Actions:**
- `--destructive` for delete buttons
- `hover:text-destructive` for hover states

**Button Variants:**
- `variant="outline"` for Delete All trigger
- `variant="destructive"` for confirmation button
- `variant="ghost"` for NewsCard icons

**Background Colors:**
- `bg-muted` for information box in dialog
- Theme colors automatically applied via Tailwind classes

**Text Colors:**
- `text-foreground` for primary text
- `text-muted-foreground` for secondary text
- `text-destructive` for warnings

---

## 13. Key Implementation Notes

### IMPORTANT: Outdated Knowledge Warnings

1. **React Query v5:** This project uses React Query v5 where:
   - `isLoading` is now `isPending` in mutations
   - Must map to `isLoading` in return interface for consistency

2. **API Client:** The `apiClient.delete` method exists and works like other methods:
   - Returns `Promise<T>` with typed response
   - For 204 responses, use `Promise<void>`
   - Error handling is centralized, don't duplicate

3. **Sonner Toasts:** Already configured in project:
   - Import: `import { toast } from 'sonner';`
   - Methods: `toast.success()`, `toast.error()`
   - No additional setup needed

4. **Dialog Component:** Uses Radix UI primitives:
   - Already installed and configured
   - Import from `@/components/ui/dialog`
   - Fully accessible out of the box

5. **Context Pattern:** News feature already uses context:
   - Follow existing pattern for consistency
   - All operations go through context
   - Components consume via `useNewsContext()`

6. **Query Invalidation:** Use broad invalidation:
   - `['news']` invalidates all related queries
   - Don't manually update cache
   - Let React Query refetch

---

## 14. File Structure Summary

```
frontend/src/features/news/
├── data/
│   ├── news.schema.ts (UPDATE: add DeleteAllNewsResponse)
│   └── news.service.ts (UPDATE: add deleteNews, deleteAllUserNews)
├── hooks/
│   ├── mutations/
│   │   ├── useDeleteNews.mutation.ts (NEW)
│   │   └── useDeleteAllNews.mutation.ts (NEW)
│   └── useNewsContext.tsx (UPDATE: integrate delete mutations)
└── components/
    ├── NewsCard.tsx (UPDATE: add trash button)
    ├── NewsBoard.tsx (UPDATE: add DeleteAllNewsDialog)
    └── DeleteAllNewsDialog.tsx (NEW)
```

**Files to CREATE:** 3
**Files to UPDATE:** 4
**Total Changes:** 7 files

---

## 15. Conclusion

This implementation plan provides a complete, production-ready approach to adding delete functionality to the news feature. It follows all established patterns in the codebase, ensures type safety, handles errors gracefully, and provides excellent user experience.

The plan prioritizes:
- **Consistency** with existing code patterns
- **Type Safety** through TypeScript and Zod
- **User Experience** with clear feedback and loading states
- **Accessibility** following WCAG guidelines
- **Maintainability** with clear separation of concerns

Follow this plan sequentially, testing each phase before moving to the next. The modular approach allows for easy debugging and iteration if issues arise.
