# Frontend Implementation Plan: Share News Feature

## Executive Summary

This document provides detailed architectural recommendations and implementation plan for the Twitter sharing feature in the News feature. The implementation follows the project's feature-based architecture patterns with React Query, Zod schemas, and proper separation of concerns.

---

## Architectural Decisions

### 1. Twitter Handle Storage Strategy

**Decision: Use localStorage ONLY (not user profile)**

**Rationale:**
- The Twitter handle is UI-specific preference data, not core user profile data
- Storing in localStorage avoids unnecessary backend API calls and database modifications
- Follows the established pattern seen in `AuthContext` where session data like `session_expiration` and `user_email` are stored in localStorage
- The `appStorage` utility already provides a clean abstraction over localStorage
- If user profile storage is needed later, it can be added without breaking the localStorage approach

**Implementation Details:**
```typescript
// Storage key constant
const TWITTER_HANDLE_KEY = 'twitter_handle';

// Using appStorage utility
import { appStorage } from '@/core/data/appStorage';

// Set handle
appStorage().local.setString(TWITTER_HANDLE_KEY, '@username');

// Get handle
const handle = appStorage().local.getString(TWITTER_HANDLE_KEY);

// Remove handle
appStorage().local.remove(TWITTER_HANDLE_KEY);
```

**Benefits:**
- No backend changes required
- Instant availability (no network latency)
- Persists across sessions
- Simple to implement and test
- Follows existing auth patterns

---

### 2. Feature Organization Strategy

**Decision: Keep everything within the News feature (no separate Share feature)**

**Rationale:**
- Twitter sharing is a capability OF news items, not a standalone feature
- The share functionality is tightly coupled to NewsItem data structure
- Creating a separate feature would introduce unnecessary coupling and complexity
- Follows Single Responsibility Principle - the News feature is responsible for all news-related operations
- Easier to maintain - all news functionality in one place
- Similar to how "favorite" and "delete" are capabilities within News, not separate features

**Structure:**
```
features/news/
├── components/
│   ├── NewsCard.tsx (add share button here)
│   ├── TwitterShareButton.tsx (NEW - reusable share button)
│   └── TwitterHandleDialog.tsx (NEW - handle input dialog)
├── data/
│   ├── news.schema.ts (extend with share types)
│   └── news.service.ts (add share helper methods)
└── hooks/
    └── useTwitterShare.ts (NEW - business hook for share logic)
```

**Benefits:**
- Single source of truth for news functionality
- Simplified dependency management
- Easier testing (all news tests in one place)
- Better developer experience (one feature to navigate)
- Avoids circular dependencies

---

### 3. UI Pattern: Modal/Dialog vs Direct Window Opening

**Decision: Use Dialog for handle input, then direct window opening**

**Rationale:**
- Better UX: Users should confirm/review before opening Twitter
- Handle persistence: Dialog allows users to save their Twitter handle for future shares
- Non-intrusive: Dialog can be dismissed without leaving the page
- Follows existing pattern in the codebase (e.g., `CreateNewsDialog`, `DeleteAllNewsDialog`)
- Accessibility: Dialogs provide better keyboard navigation and screen reader support

**User Flow:**
1. User clicks Twitter share button on NewsCard
2. If no handle stored → Show `TwitterHandleDialog`:
   - Input field for Twitter handle (with validation)
   - Checkbox to "Remember my handle"
   - Preview of tweet content
   - "Share" and "Cancel" buttons
3. If handle stored → Show quick confirmation dialog:
   - Preview of tweet content
   - Twitter handle being used
   - "Share" and "Cancel" buttons
   - Link to edit handle
4. On confirm → Open Twitter in new window with pre-filled tweet
5. Show success toast notification

**Benefits:**
- Prevents accidental shares
- Gives users control over their Twitter handle
- Provides feedback before external action
- Allows handle editing without clearing all storage
- Better mobile experience

---

### 4. Hooks Architecture

**Decision: Create a business hook `useTwitterShare` (NOT a context)**

**Rationale:**
- Twitter sharing is an ACTION, not a global state concern
- Context is for CROSS-CUTTING state that multiple components need (like auth, news list)
- Sharing is a localized operation triggered from individual NewsCards
- Using a business hook keeps the architecture clean and performant
- Follows the pattern of `useMutation` hooks but adds business logic layer

**Pattern Analysis:**
- ✅ **Use Context when:** State needs to be accessed by multiple components across the tree (Auth, News list)
- ❌ **Don't use Context for:** Actions that are localized to specific components (sharing a single news item)

**Hook Structure:**
```typescript
// hooks/useTwitterShare.ts - Business Hook
export const useTwitterShare = () => {
  // Local state for dialog
  // Handle storage logic
  // Tweet URL generation
  // Analytics tracking (optional)
  return {
    shareToTwitter: (newsItem: NewsItem) => void,
    isDialogOpen: boolean,
    openDialog: () => void,
    closeDialog: () => void,
    twitterHandle: string | null,
    saveHandle: (handle: string) => void,
    removeHandle: () => void,
  }
}
```

**No Mutations or Queries Needed:**
- No backend API calls for sharing (it's a client-side redirect to Twitter)
- No data fetching needed (news data already available from NewsContext)
- Handle storage is synchronous (localStorage)
- Analytics tracking (if added later) would be fire-and-forget

**Benefits:**
- Lightweight and focused
- No unnecessary React Query complexity
- Easy to test (pure functions + localStorage mocking)
- Reusable across any component that needs Twitter sharing
- No performance overhead from context re-renders

---

### 5. Component Organization

**Decision: Create specialized, composable components**

**Components to Create:**

#### A. `TwitterShareButton.tsx` (Presentational)
```typescript
interface TwitterShareButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  size?: 'icon' | 'default';
  variant?: 'ghost' | 'outline';
  className?: string;
}
```
- Pure presentational component
- Reusable across different contexts
- Uses lucide-react `Share2` icon
- Follows existing Button patterns in NewsCard

#### B. `TwitterHandleDialog.tsx` (Smart Component)
```typescript
interface TwitterHandleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (handle: string, remember: boolean) => void;
  newsItem: NewsItem;
  initialHandle?: string;
}
```
- Manages dialog state and form validation
- Uses Zod schema for Twitter handle validation
- Provides tweet preview
- Uses shadcn/ui Dialog component
- Follows pattern of `CreateNewsDialog`

#### C. Update `NewsCard.tsx` (Integration)
- Add `TwitterShareButton` next to existing action buttons
- Integrate with `useTwitterShare` hook
- Maintain existing drag-and-drop functionality

---

## Implementation Plan

### Phase 1: Data Layer

#### 1.1 Extend `news.schema.ts`
**File:** `frontend/src/features/news/data/news.schema.ts`

**Add:**
```typescript
import { z } from 'zod';

// Twitter handle validation
export const TwitterHandleSchema = z
  .string()
  .min(1, 'Twitter handle is required')
  .regex(/^@?[A-Za-z0-9_]{1,15}$/, 'Invalid Twitter handle format')
  .transform(val => val.startsWith('@') ? val : `@${val}`);

export type TwitterHandle = z.infer<typeof TwitterHandleSchema>;

// Tweet content structure
export interface TweetContent {
  text: string;
  url: string;
  via: string;
  hashtags: string[];
}

// Share configuration
export interface ShareConfig {
  handle: string;
  rememberHandle: boolean;
}
```

**Notes:**
- Regex validates Twitter handle format (1-15 alphanumeric + underscore)
- Transform ensures handle always has @ prefix
- TweetContent interface structures the data for Twitter intent URL

#### 1.2 Add Share Helpers to `news.service.ts`
**File:** `frontend/src/features/news/data/news.service.ts`

**Add:**
```typescript
// Helper functions (not API calls)
export const shareHelpers = {
  /**
   * Generates Twitter intent URL for sharing
   */
  generateTwitterUrl(content: TweetContent): string {
    const params = new URLSearchParams({
      text: content.text,
      url: content.url,
      via: content.via.replace('@', ''),
    });

    if (content.hashtags.length > 0) {
      params.append('hashtags', content.hashtags.join(','));
    }

    return `https://twitter.com/intent/tweet?${params.toString()}`;
  },

  /**
   * Generates shareable URL for a news item
   */
  generateNewsUrl(newsId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/news/${newsId}`;
  },

  /**
   * Formats news item for tweet content
   */
  formatTweetContent(newsItem: NewsItem, handle: string): TweetContent {
    // Truncate title to fit Twitter's character limit
    const maxTitleLength = 200; // Leave room for URL and via
    const truncatedTitle = newsItem.title.length > maxTitleLength
      ? newsItem.title.substring(0, maxTitleLength - 3) + '...'
      : newsItem.title;

    return {
      text: truncatedTitle,
      url: newsItem.link, // Use original news link
      via: handle.replace('@', ''),
      hashtags: [newsItem.category, 'news'],
    };
  },
};
```

**Notes:**
- Pure utility functions, not API services
- Handles URL encoding via URLSearchParams
- Respects Twitter's character limits
- Uses the original news link (not our app URL) for direct content access

---

### Phase 2: Business Logic Layer

#### 2.1 Create `useTwitterShare.ts` Hook
**File:** `frontend/src/features/news/hooks/useTwitterShare.ts`

```typescript
import { useState, useCallback } from 'react';
import { appStorage } from '@/core/data/appStorage';
import { shareHelpers } from '../data/news.service';
import type { NewsItem, TwitterHandle } from '../data/news.schema';
import { toast } from 'sonner';

const TWITTER_HANDLE_KEY = 'twitter_handle';

interface UseTwitterShareReturn {
  // Dialog state
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;

  // Handle management
  twitterHandle: string | null;
  saveHandle: (handle: string) => void;
  removeHandle: () => void;
  hasStoredHandle: boolean;

  // Share action
  shareToTwitter: (newsItem: NewsItem) => void;
  prepareShare: (newsItem: NewsItem) => void;

  // Current share context
  pendingNewsItem: NewsItem | null;
}

export const useTwitterShare = (): UseTwitterShareReturn => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingNewsItem, setPendingNewsItem] = useState<NewsItem | null>(null);

  // Get stored handle
  const getStoredHandle = useCallback((): string | null => {
    return appStorage().local.getString(TWITTER_HANDLE_KEY);
  }, []);

  const [twitterHandle, setTwitterHandle] = useState<string | null>(getStoredHandle);

  // Save handle to localStorage
  const saveHandle = useCallback((handle: string) => {
    appStorage().local.setString(TWITTER_HANDLE_KEY, handle);
    setTwitterHandle(handle);
  }, []);

  // Remove handle from localStorage
  const removeHandle = useCallback(() => {
    appStorage().local.remove(TWITTER_HANDLE_KEY);
    setTwitterHandle(null);
  }, []);

  // Dialog controls
  const openDialog = useCallback(() => setIsDialogOpen(true), []);
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setPendingNewsItem(null);
  }, []);

  /**
   * Prepare share - opens dialog if needed, or shares directly
   */
  const prepareShare = useCallback((newsItem: NewsItem) => {
    setPendingNewsItem(newsItem);

    const storedHandle = getStoredHandle();
    if (storedHandle) {
      // Handle exists, share directly
      shareToTwitterWithHandle(newsItem, storedHandle);
    } else {
      // No handle, show dialog
      openDialog();
    }
  }, [getStoredHandle, openDialog]);

  /**
   * Execute the Twitter share
   */
  const shareToTwitterWithHandle = useCallback((newsItem: NewsItem, handle: string) => {
    try {
      const tweetContent = shareHelpers.formatTweetContent(newsItem, handle);
      const twitterUrl = shareHelpers.generateTwitterUrl(tweetContent);

      // Open Twitter in new window
      window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=600');

      // Success feedback
      toast.success('Opening Twitter to share your news!');

      // Close dialog if open
      closeDialog();
    } catch (error) {
      toast.error('Failed to open Twitter share dialog');
      console.error('Share error:', error);
    }
  }, [closeDialog]);

  /**
   * Share action (public API)
   */
  const shareToTwitter = useCallback((newsItem: NewsItem) => {
    const handle = getStoredHandle();
    if (handle) {
      shareToTwitterWithHandle(newsItem, handle);
    } else {
      prepareShare(newsItem);
    }
  }, [getStoredHandle, shareToTwitterWithHandle, prepareShare]);

  return {
    isDialogOpen,
    openDialog,
    closeDialog,
    twitterHandle,
    saveHandle,
    removeHandle,
    hasStoredHandle: !!twitterHandle,
    shareToTwitter,
    prepareShare,
    pendingNewsItem,
  };
};
```

**Key Features:**
- Manages dialog state internally
- Handles Twitter handle persistence
- Generates Twitter URL with proper encoding
- Provides success/error feedback via toast
- Opens Twitter in appropriately sized popup window
- Cleans up state after share

**Testing Strategy:**
- Mock `appStorage` for localStorage operations
- Mock `window.open` for Twitter redirect
- Test handle validation and formatting
- Test URL generation with various news items
- Test error handling scenarios

---

### Phase 3: Component Layer

#### 3.1 Create `TwitterShareButton.tsx`
**File:** `frontend/src/features/news/components/TwitterShareButton.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TwitterShareButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  size?: 'icon' | 'default' | 'sm' | 'lg';
  variant?: 'ghost' | 'outline' | 'default';
  className?: string;
  disabled?: boolean;
}

export const TwitterShareButton = ({
  onClick,
  isLoading = false,
  size = 'icon',
  variant = 'ghost',
  className,
  disabled = false,
}: TwitterShareButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    onClick();
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('h-7 w-7', className)}
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label="Share on Twitter"
      title="Share on Twitter"
    >
      <Share2 className={cn('h-4 w-4', isLoading && 'animate-pulse')} />
    </Button>
  );
};
```

**Design Notes:**
- Follows existing button pattern from `NewsCard` (Heart, ExternalLink, Trash2)
- Uses `Share2` icon from lucide-react (consistent with existing icons)
- `stopPropagation` prevents interference with card drag-and-drop
- Accessible with aria-label and title
- Supports loading state (though rarely needed here)

#### 3.2 Create `TwitterHandleDialog.tsx`
**File:** `frontend/src/features/news/components/TwitterHandleDialog.tsx`

```typescript
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TwitterHandleSchema, type NewsItem } from '../data/news.schema';
import { shareHelpers } from '../data/news.service';

const FormSchema = z.object({
  handle: TwitterHandleSchema,
  rememberHandle: z.boolean().default(true),
});

type FormData = z.infer<typeof FormSchema>;

interface TwitterHandleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (handle: string, rememberHandle: boolean) => void;
  newsItem: NewsItem | null;
  initialHandle?: string;
}

export const TwitterHandleDialog = ({
  isOpen,
  onClose,
  onConfirm,
  newsItem,
  initialHandle = '',
}: TwitterHandleDialogProps) => {
  const [tweetPreview, setTweetPreview] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      handle: initialHandle,
      rememberHandle: true,
    },
  });

  // Update tweet preview when handle or newsItem changes
  useEffect(() => {
    if (newsItem) {
      const handle = form.watch('handle') || initialHandle || 'YourHandle';
      const tweetContent = shareHelpers.formatTweetContent(newsItem, handle);
      const previewText = `${tweetContent.text}\n\nvia @${tweetContent.via}\n#${tweetContent.hashtags.join(' #')}`;
      setTweetPreview(previewText);
    }
  }, [form.watch('handle'), newsItem, initialHandle]);

  const handleSubmit = (data: FormData) => {
    onConfirm(data.handle, data.rememberHandle);
    form.reset();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!newsItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share on Twitter</DialogTitle>
          <DialogDescription>
            Enter your Twitter handle to share this news article
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter Handle</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="@yourusername"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormDescription>
                    Your handle will appear in the tweet's "via" attribution
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rememberHandle"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Remember my handle</FormLabel>
                    <FormDescription>
                      Save your Twitter handle for future shares
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Tweet Preview */}
            <div className="rounded-lg border bg-muted p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Preview</Badge>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {tweetPreview}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">
                Share on Twitter
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
```

**Design Features:**
- Uses shadcn/ui Form components with react-hook-form
- Zod validation with automatic error messages
- Live tweet preview updates as user types
- Remember handle checkbox (checked by default)
- Follows existing dialog patterns (`CreateNewsDialog`, `DeleteAllNewsDialog`)
- Accessible form structure
- Mobile-responsive design

**Validation Rules:**
- Twitter handle: 1-15 characters
- Alphanumeric + underscore only
- Automatically adds @ prefix if missing
- Real-time validation feedback

#### 3.3 Update `NewsCard.tsx`
**File:** `frontend/src/features/news/components/NewsCard.tsx`

**Changes:**

```typescript
// Add imports
import { TwitterShareButton } from './TwitterShareButton';
import { TwitterHandleDialog } from './TwitterHandleDialog';
import { useTwitterShare } from '../hooks/useTwitterShare';

// Inside NewsCard component
export const NewsCard = ({ item, isDragging = false }: NewsCardProps) => {
  const { toggleFavorite, deleteNews, deleteState } = useNewsContext();

  // Add Twitter share hook
  const {
    prepareShare,
    isDialogOpen,
    closeDialog,
    saveHandle,
    shareToTwitter,
    pendingNewsItem,
    twitterHandle,
  } = useTwitterShare();

  // ... existing code ...

  // Add share handler
  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    prepareShare(item);
  };

  // Add confirm handler for dialog
  const handleConfirmShare = (handle: string, rememberHandle: boolean) => {
    if (rememberHandle) {
      saveHandle(handle);
    }
    if (pendingNewsItem) {
      shareToTwitter(pendingNewsItem);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          'cursor-grab active:cursor-grabbing',
          (isDragging || isSortableDragging) && 'opacity-50'
        )}
      >
        <Card
          className={cn(
            'bg-white/95 backdrop-blur-sm hover:shadow-lg transition-all',
            STATUS_COLORS[item.status]
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{item.source}</p>
              </div>
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

                {/* ADD: Twitter Share Button */}
                <TwitterShareButton onClick={handleShareClick} />

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
                  aria-label="Delete news item"
                  disabled={deleteState.isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* ... rest of card content ... */}
        </Card>
      </div>

      {/* ADD: Twitter Handle Dialog */}
      <TwitterHandleDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onConfirm={handleConfirmShare}
        newsItem={pendingNewsItem}
        initialHandle={twitterHandle || ''}
      />
    </>
  );
};
```

**Integration Notes:**
- Share button positioned between Heart and ExternalLink (logical grouping)
- Dialog rendered outside the card to avoid z-index/stacking issues
- All handlers use `stopPropagation` to prevent drag interference
- Maintains existing functionality (drag-and-drop, favorite, delete)

---

### Phase 4: Testing Strategy

#### 4.1 Unit Tests

**Test File:** `frontend/src/features/news/hooks/__tests__/useTwitterShare.test.ts`

**Test Cases:**
1. Should initialize with no stored handle
2. Should load stored handle from localStorage on mount
3. Should save handle to localStorage
4. Should remove handle from localStorage
5. Should open/close dialog correctly
6. Should generate correct Twitter URL
7. Should format tweet content correctly
8. Should handle share with existing handle (no dialog)
9. Should handle share without handle (show dialog)
10. Should clean up after successful share

**Test File:** `frontend/src/features/news/data/__tests__/shareHelpers.test.ts`

**Test Cases:**
1. Should generate valid Twitter intent URL
2. Should handle special characters in tweet text
3. Should truncate long titles properly
4. Should format hashtags correctly
5. Should validate Twitter handle format
6. Should add @ prefix if missing

#### 4.2 Component Tests

**Test File:** `frontend/src/features/news/components/__tests__/TwitterShareButton.test.tsx`

**Test Cases:**
1. Should render correctly
2. Should call onClick when clicked
3. Should stop event propagation
4. Should be disabled when loading
5. Should show loading state
6. Should have proper accessibility attributes

**Test File:** `frontend/src/features/news/components/__tests__/TwitterHandleDialog.test.tsx`

**Test Cases:**
1. Should render when open
2. Should not render when closed
3. Should validate Twitter handle format
4. Should show validation errors
5. Should update preview when handle changes
6. Should call onConfirm with correct data
7. Should reset form on close
8. Should handle remember checkbox correctly

**Test File:** `frontend/src/features/news/components/__tests__/NewsCard.test.tsx` (update existing)

**Additional Test Cases:**
1. Should render Twitter share button
2. Should open dialog when share clicked
3. Should share directly if handle exists
4. Should stop propagation on share click

#### 4.3 Integration Tests

**Test Scenario:** Complete share flow
1. User clicks share button on NewsCard
2. Dialog opens (no handle stored)
3. User enters handle
4. User checks "remember" checkbox
5. User clicks "Share"
6. Twitter opens in new window
7. Success toast appears
8. Dialog closes
9. Handle is stored in localStorage
10. Next share uses stored handle (no dialog)

---

## Important Implementation Notes

### Color Palette
All colors should use the theme colors defined in `frontend/src/index.css`:
- Primary actions: `bg-primary text-primary-foreground`
- Secondary elements: `bg-secondary text-secondary-foreground`
- Muted text: `text-muted-foreground`
- Destructive actions: `text-destructive`
- Borders: `border`

Do NOT hardcode Tailwind color classes like `bg-blue-500` or `text-red-600`.

### localStorage Best Practices
1. Always use `appStorage()` utility, never direct `localStorage` access
2. Use `.setString()` for string values, `.set()` for objects
3. Handle potential errors (localStorage might be disabled)
4. Test with localStorage mocked or disabled
5. Consider localStorage size limits (5-10MB typical)

### React Query Patterns
Although this feature doesn't use React Query (no API calls), maintain consistency:
- If analytics tracking is added later, use `useMutation`
- Follow the mutation pattern: `{action, isLoading, error, isSuccess}`
- Invalidate relevant queries after mutations

### Accessibility Requirements
1. All interactive elements must have `aria-label` or accessible text
2. Dialog must trap focus while open
3. Keyboard navigation must work (Tab, Enter, Escape)
4. Form fields must have associated labels
5. Error messages must be announced to screen readers
6. Color should not be the only indicator of state

### Error Handling
1. Validate Twitter handle before opening Twitter
2. Handle popup blocker scenarios gracefully
3. Provide clear error messages via toast
4. Log errors for debugging (console.error)
5. Never crash the parent component on error

### Performance Considerations
1. Memoize `shareHelpers` functions (they're pure)
2. Avoid unnecessary re-renders in dialog
3. Lazy-load dialog component if bundle size is a concern
4. Use `stopPropagation` to prevent event bubbling
5. Debounce tweet preview updates if needed

### Mobile Considerations
1. Dialog must be mobile-responsive (full width on small screens)
2. Input fields must have appropriate mobile keyboards
3. Twitter popup should work on mobile browsers
4. Touch events should not conflict with drag-and-drop
5. Consider showing dialog full-screen on small devices

---

## Future Enhancement Opportunities

### Phase 2 Features (Post-MVP)
1. **Share Analytics**
   - Track share counts per news item
   - Backend endpoint: `POST /api/news/{id}/share-events`
   - Display share count badge on NewsCard
   - Show most-shared news in stats

2. **Multiple Platforms**
   - Extend to LinkedIn, Facebook, Email
   - Create abstracted `useShare` hook
   - Platform-specific formatting functions
   - Unified share dialog with platform selection

3. **Custom Tweet Templates**
   - Allow users to customize tweet format
   - Template variables: {title}, {source}, {category}
   - Store templates in user preferences
   - Template picker in dialog

4. **Share History**
   - Track user's share history
   - "Recently shared" section
   - Re-share capability
   - Share frequency insights

5. **URL Shortening**
   - Integrate URL shortener (bit.ly API)
   - Track click-through rates
   - Custom branded short URLs
   - Analytics on shared link performance

6. **Share Preview**
   - Show how tweet will appear on Twitter
   - Preview with user's profile picture (if logged in)
   - Character count validation
   - Link preview simulation

---

## File Checklist

### Files to CREATE:
- [ ] `frontend/src/features/news/hooks/useTwitterShare.ts`
- [ ] `frontend/src/features/news/components/TwitterShareButton.tsx`
- [ ] `frontend/src/features/news/components/TwitterHandleDialog.tsx`
- [ ] `frontend/src/features/news/hooks/__tests__/useTwitterShare.test.ts`
- [ ] `frontend/src/features/news/data/__tests__/shareHelpers.test.ts`
- [ ] `frontend/src/features/news/components/__tests__/TwitterShareButton.test.tsx`
- [ ] `frontend/src/features/news/components/__tests__/TwitterHandleDialog.test.tsx`

### Files to MODIFY:
- [ ] `frontend/src/features/news/data/news.schema.ts` (add share types)
- [ ] `frontend/src/features/news/data/news.service.ts` (add shareHelpers)
- [ ] `frontend/src/features/news/components/NewsCard.tsx` (integrate share button and dialog)
- [ ] `frontend/src/features/news/components/__tests__/NewsCard.test.tsx` (add share tests)

### Files to READ (for context):
- [x] `frontend/src/features/auth/hooks/useAuthContext.tsx` (context pattern)
- [x] `frontend/src/features/news/hooks/useNewsContext.tsx` (feature context)
- [x] `frontend/src/features/news/data/news.schema.ts` (schema patterns)
- [x] `frontend/src/features/news/data/news.service.ts` (service patterns)
- [x] `frontend/src/features/news/components/NewsCard.tsx` (component patterns)
- [x] `frontend/src/core/data/appStorage.ts` (storage utility)

---

## Dependencies Required

No new dependencies needed! All required packages are already in the project:
- `lucide-react` - Share2 icon
- `@hookform/react-hook-form` - Form handling
- `zod` - Validation
- `sonner` - Toast notifications
- `@radix-ui/*` - Dialog, Checkbox, Form components

---

## Estimated Implementation Time

- **Phase 1 (Data Layer):** 1-2 hours
- **Phase 2 (Business Logic):** 2-3 hours
- **Phase 3 (Components):** 3-4 hours
- **Phase 4 (Testing):** 3-4 hours
- **Total:** 9-13 hours

**Complexity Level:** Medium
**Risk Level:** Low (no backend changes, no complex state management)

---

## Questions Resolved

### Q1: Should Twitter handle be stored in user profile, localStorage, or both?
**A:** localStorage only. This is UI preference data, not core user data. Avoids backend complexity.

### Q2: Should we create a separate Share feature or keep everything in the News feature?
**A:** Keep in News feature. Sharing is a capability OF news items, not a standalone feature.

### Q3: Should we use a modal/dialog for Twitter handle input or direct window opening?
**A:** Use dialog for handle input, then direct window opening. Better UX and allows handle persistence.

### Q4: What hooks structure do we need (queries, mutations, context)?
**A:** Business hook only (`useTwitterShare`). No queries/mutations (no API calls). No context (localized action).

### Q5: How to organize components following the feature-based architecture?
**A:** Three components: `TwitterShareButton` (presentational), `TwitterHandleDialog` (smart), update `NewsCard` (integration).

---

## Architecture Validation

This implementation aligns with the project's established patterns:

✅ **Feature-based organization** - All Twitter share code in `features/news/`
✅ **Zod validation** - TwitterHandleSchema validates and transforms
✅ **Service layer** - shareHelpers as pure utility functions
✅ **Custom hooks** - useTwitterShare encapsulates business logic
✅ **Proper separation** - Presentational vs. smart components
✅ **Type safety** - Full TypeScript typing throughout
✅ **Accessibility** - ARIA labels, keyboard navigation, screen readers
✅ **Testing** - Unit, component, and integration test coverage
✅ **Error handling** - Toast notifications, graceful degradation
✅ **Performance** - Memoization, event propagation control
✅ **Mobile-first** - Responsive design, touch-friendly

---

## Summary

This frontend implementation provides a complete, production-ready Twitter sharing feature that seamlessly integrates with the existing News feature. The architecture is clean, testable, and maintainable, following all established patterns in the codebase.

The key innovation is using a business hook (`useTwitterShare`) rather than a context or complex mutation structure, keeping the implementation lightweight while providing excellent developer experience and user experience.

The dialog-based approach for handle input ensures users have control over their Twitter presence while maintaining the convenience of handle persistence for future shares.
