# News-from-AI Frontend Implementation Plan

## Overview
This document outlines the detailed implementation plan for the news-from-ai feature frontend. The feature will integrate with the existing news feature architecture to allow users to request AI-generated news articles with configurable quantities (5, 10, or 15 items).

## Architecture Strategy

### 1. Integration Approach
- **Extend existing news feature** rather than creating a separate feature
- **Reuse existing news context** for state management consistency
- **Add new API service method** for AI news generation
- **Create dedicated components** for AI news request interface
- **Leverage existing React Query patterns** for data fetching

### 2. Feature Structure
The implementation will follow our feature-based architecture by extending the existing `/src/features/news/` structure:

```
src/features/news/
├── components/
│   ├── ai-news/                    # NEW: AI news specific components
│   │   ├── AiNewsButton.tsx        # Main trigger button
│   │   ├── AiNewsDialog.tsx        # Modal for AI news request
│   │   ├── AiNewsForm.tsx          # Form with quantity selector
│   │   └── AiNewsLoadingState.tsx  # Loading animation component
│   └── ... (existing components)
├── data/
│   ├── news.schema.ts              # EXTEND: Add AI news schemas
│   └── news.service.ts             # EXTEND: Add AI news service
├── hooks/
│   ├── mutations/
│   │   ├── useGenerateAiNews.mutation.ts  # NEW: AI news generation
│   │   └── ... (existing mutations)
│   └── useNewsContext.tsx          # EXTEND: Add AI news operations
```

## Implementation Details

### 1. Schema Extensions (`data/news.schema.ts`)

Add new schemas for AI news generation:

```typescript
// Add to existing news.schema.ts
export interface GenerateAiNewsRequest {
  quantity: 5 | 10 | 15;
  category?: NewsCategory;
}

export interface GenerateAiNewsResponse {
  generated_count: number;
  items: NewsItem[];
  message: string;
}
```

### 2. Service Extensions (`data/news.service.ts`)

Add new service method:

```typescript
// Add to existing newsService object
async generateAiNews(data: GenerateAiNewsRequest): Promise<GenerateAiNewsResponse> {
  const response = await apiClient.post<GenerateAiNewsResponse>('/api/news/ai-generate', data);
  return response;
}
```

### 3. New Mutation Hook (`hooks/mutations/useGenerateAiNews.mutation.ts`)

Create dedicated mutation for AI news generation:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsService } from '../../data/news.service';
import type { GenerateAiNewsRequest } from '../../data/news.schema';

export const useGenerateAiNewsMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: GenerateAiNewsRequest) => newsService.generateAiNews(data),
    onSuccess: (data) => {
      // Invalidate all news queries to refresh with new AI-generated news
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(`Successfully generated ${data.generated_count} AI news articles`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate AI news');
    },
  });

  return {
    generateAiNews: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};
```

### 4. Context Extensions (`hooks/useNewsContext.tsx`)

Extend the existing news context to include AI news operations:

```typescript
// Extend NewsContextType interface
interface NewsContextType {
  // ... existing properties

  // New AI news operations
  generateAiNews: (quantity: 5 | 10 | 15, category?: NewsCategory) => void;
  isGeneratingAiNews: boolean;
  aiNewsError: Error | null;
}

// In NewsProvider component, add:
const { generateAiNews, isLoading: isGeneratingAiNews, error: aiNewsError } = useGenerateAiNewsMutation();

const handleGenerateAiNews = useCallback((quantity: 5 | 10 | 15, category?: NewsCategory) => {
  generateAiNews({ quantity, category });
}, [generateAiNews]);

// Add to context value:
const value: NewsContextType = {
  // ... existing properties
  generateAiNews: handleGenerateAiNews,
  isGeneratingAiNews,
  aiNewsError,
};
```

### 5. UI Components

#### AiNewsButton.tsx
```typescript
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AiNewsDialog } from "./AiNewsDialog";

export const AiNewsButton = () => {
  return (
    <AiNewsDialog>
      <Button
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
        size="sm"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate AI News
      </Button>
    </AiNewsDialog>
  );
};
```

#### AiNewsDialog.tsx
```typescript
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AiNewsForm } from "./AiNewsForm";
import { useNewsContext } from "../../hooks/useNewsContext";

interface AiNewsDialogProps {
  children: React.ReactNode;
}

export const AiNewsDialog = ({ children }: AiNewsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { isGeneratingAiNews } = useNewsContext();

  const handleSuccess = () => {
    setOpen(false);
  };

  const handleCancel = () => {
    if (!isGeneratingAiNews) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Generate AI News
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Generate fresh AI news articles using advanced AI. Choose how many articles you'd like to create.
          </DialogDescription>
        </DialogHeader>
        <AiNewsForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
};
```

#### AiNewsForm.tsx
```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiNewsLoadingState } from "./AiNewsLoadingState";
import { useNewsContext } from "../../hooks/useNewsContext";
import { NewsCategory } from "../../data/news.schema";

interface AiNewsFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AiNewsForm = ({ onSuccess, onCancel }: AiNewsFormProps) => {
  const [quantity, setQuantity] = useState<5 | 10 | 15>(5);
  const [category, setCategory] = useState<NewsCategory | undefined>();
  const { generateAiNews, isGeneratingAiNews } = useNewsContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateAiNews(quantity, category);
  };

  if (isGeneratingAiNews) {
    return <AiNewsLoadingState quantity={quantity} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Number of Articles</Label>
        <RadioGroup
          value={String(quantity)}
          onValueChange={(value) => setQuantity(Number(value) as 5 | 10 | 15)}
          className="grid grid-cols-3 gap-4"
        >
          {[5, 10, 15].map((num) => (
            <div key={num} className="flex items-center space-x-2">
              <RadioGroupItem value={String(num)} id={`quantity-${num}`} />
              <Label
                htmlFor={`quantity-${num}`}
                className="text-sm font-normal cursor-pointer"
              >
                {num} articles
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Category (Optional)</Label>
        <Select value={category} onValueChange={(value) => setCategory(value as NewsCategory)}>
          <SelectTrigger>
            <SelectValue placeholder="Any category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={undefined}>Any category</SelectItem>
            {Object.values(NewsCategory).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate News
        </Button>
      </div>
    </form>
  );
};
```

#### AiNewsLoadingState.tsx
```typescript
import { Sparkles, Loader2 } from "lucide-react";

interface AiNewsLoadingStateProps {
  quantity: number;
}

export const AiNewsLoadingState = ({ quantity }: AiNewsLoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="relative">
        <Sparkles className="w-12 h-12 text-purple-600 animate-pulse" />
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin absolute -bottom-1 -right-1" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium text-gray-900">
          Generating AI News
        </h3>
        <p className="text-sm text-gray-500">
          Creating {quantity} fresh news articles for you...
        </p>
        <p className="text-xs text-gray-400">
          This may take a few moments
        </p>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
      </div>
    </div>
  );
};
```

### 6. Integration with NewsBoard

Update `NewsBoard.tsx` to include the AI News button:

```typescript
// In NewsBoard.tsx, update the button section:
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <NewsFilters />
  <div className="flex gap-2">
    <CreateNewsButton />
    <AiNewsButton />
  </div>
</div>
```

## State Management Strategy

### 1. Context Integration
- **Extend existing NewsContext** rather than creating separate context
- **Reuse existing news queries** for displaying generated news
- **Add AI-specific operations** to context interface
- **Maintain consistent loading states** across all news operations

### 2. Query Invalidation
- **Invalidate all news queries** after successful AI generation
- **Trigger automatic refresh** of news board/list
- **Maintain scroll position** if possible during refresh

### 3. Error Handling
- **Use existing toast notification system** for success/error feedback
- **Provide specific error messages** for different failure scenarios
- **Handle network timeouts** gracefully with retry options

## User Experience Flow

### 1. Happy Path
1. User clicks "Generate AI News" button
2. Modal opens with quantity selector (defaulted to 5)
3. User optionally selects category filter
4. User clicks "Generate News" button
5. Loading state shows with progress indicator
6. Success notification appears
7. Modal closes automatically
8. News board refreshes with new AI-generated articles

### 2. Error Scenarios
- **API timeout**: Show retry option with exponential backoff
- **Network error**: Clear error message with manual retry
- **Backend error**: Display specific error from backend
- **Validation error**: Inline form validation feedback

### 3. Loading Experience
- **Immediate feedback** when button clicked
- **Engaging loading animation** with AI-themed icons
- **Progress indication** with estimated time
- **Disable form inputs** during generation
- **Prevent modal dismissal** during loading

## Technical Considerations

### 1. Performance
- **Lazy load AI components** to reduce initial bundle size
- **Optimize re-renders** with proper memoization
- **Cache query invalidation** strategy
- **Progressive loading** for large news sets

### 2. Accessibility
- **Proper ARIA labels** for screen readers
- **Keyboard navigation** support
- **Focus management** in modal dialogs
- **Loading state announcements** for screen readers

### 3. Responsive Design
- **Mobile-first approach** for AI news components
- **Touch-friendly interface** for mobile devices
- **Responsive modal sizing** across breakpoints
- **Optimized loading states** for mobile

### 4. Integration Points
- **Seamless integration** with existing news filters
- **Consistent styling** with current news components
- **Shared error handling** patterns
- **Unified notification system**

## Testing Strategy

### 1. Component Testing
- **Unit tests** for all new components
- **Integration tests** for context interactions
- **Mock API responses** for mutation testing
- **Error boundary testing** for failure scenarios

### 2. User Flow Testing
- **End-to-end tests** for complete AI news generation flow
- **Accessibility testing** with screen readers
- **Mobile responsiveness** testing
- **Performance testing** under load

## Migration & Rollout

### 1. Feature Flag Strategy
- **Environment-based feature toggles** for gradual rollout
- **User-based beta testing** for select users
- **A/B testing** for different UI variations
- **Graceful degradation** if backend unavailable

### 2. Backward Compatibility
- **No breaking changes** to existing news functionality
- **Additive API changes** only
- **Progressive enhancement** approach
- **Fallback behaviors** for unsupported features

## Dependencies

### 1. New Dependencies
- No new external dependencies required
- Leverage existing UI components and patterns
- Use current React Query and context patterns

### 2. Backend Dependencies
- **New API endpoint**: `POST /api/news/ai-generate`
- **Extended news DTOs** for AI generation requests/responses
- **Perplexity API integration** in backend

## File Change Summary

### New Files to Create:
- `src/features/news/components/ai-news/AiNewsButton.tsx`
- `src/features/news/components/ai-news/AiNewsDialog.tsx`
- `src/features/news/components/ai-news/AiNewsForm.tsx`
- `src/features/news/components/ai-news/AiNewsLoadingState.tsx`
- `src/features/news/hooks/mutations/useGenerateAiNews.mutation.ts`

### Files to Modify:
- `src/features/news/data/news.schema.ts` (add AI schemas)
- `src/features/news/data/news.service.ts` (add AI service method)
- `src/features/news/hooks/useNewsContext.tsx` (extend context)
- `src/features/news/components/NewsBoard.tsx` (add AI button)

### Import Changes:
- Add exports for new AI components to feature index files
- Update component imports in NewsBoard

This implementation plan provides a comprehensive, scalable approach to integrating AI news generation while maintaining consistency with existing patterns and ensuring excellent user experience.