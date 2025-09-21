# Create News Frontend Feature - Implementation Plan

## Overview

This document provides a detailed implementation plan for adding create news functionality to the frontend, following the existing feature-based architecture patterns established in the codebase.

## Analysis of Existing Patterns

### Form Component Pattern (RegisterForm)
The existing `RegisterForm` component demonstrates several key patterns that should be replicated:

1. **State Management**: Individual useState hooks for each form field
2. **Validation Strategy**:
   - Real-time validation using custom validation functions
   - Touched state tracking to show errors only after user interaction
   - Comprehensive error handling with specific field-level errors
3. **UI Pattern**: Card-based layout with proper spacing and accessibility
4. **Loading States**: Button disabled during submission with loading indicator
5. **Error Display**: Icons and proper ARIA attributes for accessibility

### News Architecture Pattern
The news feature follows a well-structured pattern:
- Context provider (`useNewsContext`) for feature-level state
- Mutation hooks for data modifications
- Service layer for API communication
- Schema definitions with enums and interfaces

## Implementation Recommendations

### 1. Form Component Design

#### Component Structure
```
src/features/news/components/
├── CreateNewsDialog.tsx          # Main dialog container
├── CreateNewsForm.tsx            # Form component with validation
└── CreateNewsButton.tsx          # Trigger button component
```

#### Form Fields Based on CreateNewsRequest Schema
```typescript
interface CreateNewsRequest {
  source: string;        // Required - Text input
  title: string;         // Required - Text input
  summary: string;       // Required - Textarea (need to add this component)
  link: string;          // Required - URL input with validation
  image_url?: string;    // Optional - URL input
  category: NewsCategory; // Required - Select dropdown
  is_public: boolean;    // Required - Switch/Checkbox
}
```

### 2. UI Integration Strategy

#### Recommended Approach: Dialog Modal
Based on the existing UI patterns and available shadcn components, a dialog modal is the best choice:

**Advantages:**
- Maintains focus on current board view
- Consistent with modern UX patterns
- Available shadcn Dialog component
- Easy to dismiss without losing context

**Integration Points:**
- Add "Create News" button to NewsBoard header area
- Position near NewsStats or NewsFilters components
- Use primary button styling to indicate main action

#### NewsBoard Integration
```tsx
// Add to NewsBoard.tsx header section
<div className="flex justify-between items-center mb-6">
  <NewsStats />
  <CreateNewsButton />
</div>
<NewsFilters />
```

### 3. Validation Strategy

#### Client-Side Validation Requirements
Following the RegisterForm pattern, implement:

1. **Field-Level Validation Functions**:
   - `validateSource()`: Required, min 2 characters
   - `validateTitle()`: Required, min 5 characters, max 200 characters
   - `validateSummary()`: Required, min 10 characters, max 500 characters
   - `validateLink()`: Required, valid URL format
   - `validateImageUrl()`: Optional, valid URL format if provided
   - `validateCategory()`: Required, must be valid NewsCategory enum

2. **Real-Time Validation**:
   - Validate on blur for each field
   - Show errors only after field is touched
   - Update validation on subsequent changes

3. **Form-Level Validation**:
   - Validate all fields before submission
   - Prevent submission if any validation errors exist

#### Zod Schema Integration
Create a client-side Zod schema for form validation:

```typescript
// src/features/news/data/schemas/createNewsForm.schema.ts
import { z } from 'zod';
import { NewsCategory } from '../news.schema';

export const createNewsFormSchema = z.object({
  source: z.string()
    .min(2, 'Source must be at least 2 characters')
    .max(100, 'Source must be less than 100 characters'),
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  summary: z.string()
    .min(10, 'Summary must be at least 10 characters')
    .max(500, 'Summary must be less than 500 characters'),
  link: z.string()
    .url('Please enter a valid URL'),
  image_url: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  category: z.nativeEnum(NewsCategory, {
    errorMap: () => ({ message: 'Please select a valid category' })
  }),
  is_public: z.boolean()
});

export type CreateNewsFormData = z.infer<typeof createNewsFormSchema>;
```

### 4. Component Architecture

#### 4.1 Required Components

**CreateNewsButton.tsx**
```tsx
// Trigger button with proper styling and icon
// Uses primary button styling
// Positioned in NewsBoard header
```

**CreateNewsDialog.tsx**
```tsx
// Dialog container component
// Manages dialog open/close state
// Contains CreateNewsForm
// Handles form submission success/error
```

**CreateNewsForm.tsx**
```tsx
// Main form component with all fields
// Implements validation logic
// Uses existing shadcn components
// Follows RegisterForm patterns
```

#### 4.2 Missing UI Components to Add

**Textarea Component**
The summary field requires a textarea component that doesn't currently exist:

```bash
# Add shadcn textarea component
npx shadcn@latest add textarea
```

#### 4.3 Form Field Components

1. **Source Field**: Text input with validation
2. **Title Field**: Text input with validation
3. **Summary Field**: Textarea with character count
4. **Link Field**: URL input with validation
5. **Image URL Field**: Optional URL input
6. **Category Field**: Select dropdown with NewsCategory options
7. **Public Switch**: Switch component for is_public field

### 5. State Management Integration

#### NewsContext Integration
The create news functionality should integrate with the existing NewsContext:

1. **No New Context State Needed**: The existing `useCreateNewsMutation` hook handles the mutation
2. **Cache Invalidation**: The mutation already invalidates news queries
3. **Toast Notifications**: Already implemented in the mutation hook
4. **Error Handling**: Mutation hook provides error state

#### Form State Management
Follow the RegisterForm pattern:
```tsx
// Individual state for each field
const [source, setSource] = useState("");
const [title, setTitle] = useState("");
const [summary, setSummary] = useState("");
const [link, setLink] = useState("");
const [imageUrl, setImageUrl] = useState("");
const [category, setCategory] = useState<NewsCategory | "">("");
const [isPublic, setIsPublic] = useState(false);

// Validation state
const [errors, setErrors] = useState<{...}>({});
const [touched, setTouched] = useState<{...}>({});
```

### 6. Implementation Files

#### New Files to Create
1. `src/features/news/components/CreateNewsButton.tsx`
2. `src/features/news/components/CreateNewsDialog.tsx`
3. `src/features/news/components/CreateNewsForm.tsx`
4. `src/features/news/data/schemas/createNewsForm.schema.ts`

#### Files to Modify
1. `src/features/news/components/NewsBoard.tsx` - Add CreateNewsButton
2. Add textarea component to ui components

### 7. User Experience Flow

1. **Trigger**: User clicks "Create News" button in NewsBoard header
2. **Dialog Opens**: Modal dialog appears with empty form
3. **Form Interaction**: User fills out form with real-time validation
4. **Validation**: Client-side validation prevents invalid submissions
5. **Submission**: Form submits using existing useCreateNewsMutation
6. **Success**: Dialog closes, toast notification, board refreshes
7. **Error**: Error displayed in form, user can retry

### 8. Accessibility Considerations

Following RegisterForm patterns:
- Proper ARIA labels and descriptions
- Error announcements for screen readers
- Keyboard navigation support
- Focus management in dialog
- Form validation error association

### 9. Styling and Design

#### Color Scheme
Use the CSS variables defined in `src/index.css`:
- Primary actions: `var(--primary)`
- Error states: `var(--destructive)`
- Muted text: `var(--muted-foreground)`
- Borders: `var(--border)`

#### Category Colors
Leverage existing `CATEGORY_COLORS` from news.schema.ts for category selection UI.

### 10. Testing Considerations

#### Form Validation Testing
- Test each validation rule
- Test real-time validation behavior
- Test form submission with valid/invalid data
- Test error state handling

#### Integration Testing
- Test dialog open/close behavior
- Test successful form submission flow
- Test error handling and display
- Test integration with NewsBoard refresh

## Implementation Priority

1. **Phase 1**: Add textarea component and create basic form structure
2. **Phase 2**: Implement validation logic and error handling
3. **Phase 3**: Create dialog and button components
4. **Phase 4**: Integrate with NewsBoard and test end-to-end flow

## Technical Notes

### Important Dependencies
- `@hookform/resolvers` - Not currently used, validation implemented manually
- `zod` - For schema validation
- `sonner` - For toast notifications (already integrated)
- `lucide-react` - For form icons

### Performance Considerations
- Form validation should be debounced for real-time validation
- Dialog should use lazy loading if form becomes complex
- Consider memoization for category options

### Future Enhancements
- Draft saving functionality
- Rich text editor for summary
- Image upload and preview
- Bulk news import
- Form templates for common news types

This implementation plan follows the established patterns in the codebase while providing a robust, accessible, and user-friendly create news experience.