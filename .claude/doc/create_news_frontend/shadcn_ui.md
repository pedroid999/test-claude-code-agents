# Create News Form - shadcn/ui Implementation Plan

## Overview

This document provides specific recommendations for implementing a create news form using shadcn/ui components, based on analysis of the existing codebase patterns and available components.

## Component Analysis Summary

### Available shadcn/ui Components
✅ **Already Available:**
- `Dialog` - Modal container ✓
- `Input` - Text fields ✓
- `Label` - Form labels ✓
- `Button` - Submit/cancel actions ✓
- `Select` - Category dropdown ✓
- `Switch` - Public/private toggle ✓
- `Alert` - Error display ✓
- `Card` - Form container ✓

❌ **Missing Components:**
- `Textarea` - Required for summary field (needs to be added)

## 1. Dialog Implementation

### Best Practices for Modal Dialog

Based on the shadcn Dialog component analysis:

```tsx
// Recommended Dialog Structure
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button className="primary">
      <Plus className="w-4 h-4 mr-2" />
      Create News
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Create News Article</DialogTitle>
      <DialogDescription>
        Add a new news article to your collection
      </DialogDescription>
    </DialogHeader>
    <CreateNewsForm onSuccess={() => setOpen(false)} />
  </DialogContent>
</Dialog>
```

### Key Implementation Points:

1. **Size Configuration**: Use `sm:max-w-[500px]` for optimal form width
2. **Overflow Handling**: Add `max-h-[90vh] overflow-y-auto` for long forms
3. **State Management**: Use controlled open state with `onOpenChange`
4. **Accessibility**: DialogTitle and DialogDescription are mandatory for screen readers

## 2. Form Components Configuration

### Input Components

Following the RegisterForm pattern, each input should have:

```tsx
// Standard Input Pattern
<div className="space-y-2">
  <Label
    htmlFor="field-id"
    className={cn(
      "text-sm font-medium",
      touched.fieldName && errors.fieldName ? "text-destructive" : "text-gray-700"
    )}
  >
    Field Label
  </Label>
  <div className="relative">
    <Icon className={cn(
      "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
      touched.fieldName && errors.fieldName ? "text-destructive" : "text-gray-400"
    )} />
    <Input
      id="field-id"
      type="text"
      placeholder="Enter value"
      className={cn(
        "pl-10 h-12 transition-all duration-200",
        touched.fieldName && errors.fieldName
          ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
          : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
      )}
      value={fieldValue}
      onChange={(e) => {
        setFieldValue(e.target.value);
        if (touched.fieldName) {
          validateField('fieldName', e.target.value);
        }
      }}
      onBlur={() => handleBlur('fieldName')}
      aria-invalid={touched.fieldName && !!errors.fieldName}
      aria-describedby={errors.fieldName ? "field-error" : undefined}
    />
  </div>
  {touched.fieldName && errors.fieldName && (
    <div id="field-error" className="flex items-center space-x-1 text-sm text-destructive">
      <AlertCircle className="h-3 w-3" />
      <span>{errors.fieldName}</span>
    </div>
  )}
</div>
```

### Specific Field Configurations

#### 1. Source Field
```tsx
// Icon: Building2 from lucide-react
// Type: text
// Validation: Required, 2-100 characters
// Placeholder: "e.g., TechCrunch, BBC News"
```

#### 2. Title Field
```tsx
// Icon: FileText from lucide-react
// Type: text
// Validation: Required, 5-200 characters
// Placeholder: "Enter article title"
```

#### 3. Summary Field (Textarea)
```tsx
// First, add textarea component:
// npx shadcn@latest add textarea

<div className="space-y-2">
  <Label htmlFor="summary" className="text-sm font-medium">
    Summary
  </Label>
  <Textarea
    id="summary"
    placeholder="Provide a brief summary of the article..."
    className={cn(
      "min-h-[100px] resize-none transition-all duration-200",
      touched.summary && errors.summary
        ? "border-destructive focus:ring-destructive/20"
        : "focus:ring-2 focus:ring-primary/20"
    )}
    value={summary}
    onChange={(e) => {
      setSummary(e.target.value);
      if (touched.summary) {
        validateField('summary', e.target.value);
      }
    }}
    onBlur={() => handleBlur('summary')}
    maxLength={500}
  />
  <div className="flex justify-between items-center">
    {touched.summary && errors.summary ? (
      <div className="flex items-center space-x-1 text-sm text-destructive">
        <AlertCircle className="h-3 w-3" />
        <span>{errors.summary}</span>
      </div>
    ) : (
      <div />
    )}
    <span className={cn(
      "text-xs",
      summary.length > 450 ? "text-destructive" : "text-muted-foreground"
    )}>
      {summary.length}/500
    </span>
  </div>
</div>
```

#### 4. Link Field
```tsx
// Icon: Link from lucide-react
// Type: url
// Validation: Required, valid URL format
// Placeholder: "https://example.com/article"
```

#### 5. Image URL Field (Optional)
```tsx
// Icon: Image from lucide-react
// Type: url
// Validation: Optional, valid URL format if provided
// Placeholder: "https://example.com/image.jpg (optional)"
```

#### 6. Category Field (Select)
```tsx
<div className="space-y-2">
  <Label htmlFor="category" className="text-sm font-medium">
    Category
  </Label>
  <Select value={category} onValueChange={setCategory}>
    <SelectTrigger className={cn(
      "h-12 transition-all duration-200",
      touched.category && errors.category
        ? "border-destructive focus:ring-destructive/20"
        : "focus:ring-2 focus:ring-primary/20"
    )}>
      <SelectValue placeholder="Select a category" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>News Categories</SelectLabel>
        {Object.entries(NewsCategory).map(([key, value]) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                CATEGORY_COLORS[value].split(' ')[0]
              )} />
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </div>
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
</div>
```

#### 7. Public Switch
```tsx
<div className="flex items-center justify-between p-4 border rounded-lg">
  <div className="space-y-0.5">
    <Label className="text-sm font-medium">
      Make Public
    </Label>
    <p className="text-xs text-muted-foreground">
      Allow other users to see this news article
    </p>
  </div>
  <Switch
    id="is-public"
    checked={isPublic}
    onCheckedChange={setIsPublic}
  />
</div>
```

## 3. Validation UI Implementation

### Error Display Strategy

Based on RegisterForm patterns:

1. **Field-Level Errors**: Show below each field with icon
2. **Touched State**: Only show errors after user interaction
3. **Real-Time Validation**: Update on blur and subsequent changes
4. **Global Errors**: Use Alert component for server errors

```tsx
// Global Error Alert (for form submission errors)
{serverError && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{serverError}</AlertDescription>
  </Alert>
)}
```

### Validation Functions

```tsx
const validateField = (field: string, value: string) => {
  const newErrors = { ...errors };

  switch(field) {
    case 'source':
      if (!value.trim()) {
        newErrors.source = "Source is required";
      } else if (value.length < 2) {
        newErrors.source = "Source must be at least 2 characters";
      } else if (value.length > 100) {
        newErrors.source = "Source must be less than 100 characters";
      } else {
        delete newErrors.source;
      }
      break;

    case 'title':
      if (!value.trim()) {
        newErrors.title = "Title is required";
      } else if (value.length < 5) {
        newErrors.title = "Title must be at least 5 characters";
      } else if (value.length > 200) {
        newErrors.title = "Title must be less than 200 characters";
      } else {
        delete newErrors.title;
      }
      break;

    case 'summary':
      if (!value.trim()) {
        newErrors.summary = "Summary is required";
      } else if (value.length < 10) {
        newErrors.summary = "Summary must be at least 10 characters";
      } else if (value.length > 500) {
        newErrors.summary = "Summary must be less than 500 characters";
      } else {
        delete newErrors.summary;
      }
      break;

    case 'link':
      if (!value.trim()) {
        newErrors.link = "Link is required";
      } else if (!/^https?:\/\/.+\..+/.test(value)) {
        newErrors.link = "Please enter a valid URL";
      } else {
        delete newErrors.link;
      }
      break;

    case 'image_url':
      if (value && !/^https?:\/\/.+\..+/.test(value)) {
        newErrors.image_url = "Please enter a valid URL";
      } else {
        delete newErrors.image_url;
      }
      break;

    case 'category':
      if (!value) {
        newErrors.category = "Please select a category";
      } else if (!Object.values(NewsCategory).includes(value as NewsCategory)) {
        newErrors.category = "Please select a valid category";
      } else {
        delete newErrors.category;
      }
      break;
  }

  setErrors(newErrors);
  return newErrors;
};
```

## 4. Component Layout Recommendations

### Optimal Form Layout

```tsx
<DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle>Create News Article</DialogTitle>
    <DialogDescription>
      Add a new news article to your collection
    </DialogDescription>
  </DialogHeader>

  {/* Global Error Alert */}
  {serverError && (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{serverError}</AlertDescription>
    </Alert>
  )}

  <form onSubmit={handleSubmit} className="space-y-6">
    {/* Row 1: Source and Category */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SourceField />
      <CategoryField />
    </div>

    {/* Row 2: Title (full width) */}
    <TitleField />

    {/* Row 3: Summary (full width) */}
    <SummaryField />

    {/* Row 4: Link and Image URL */}
    <div className="grid grid-cols-1 gap-4">
      <LinkField />
      <ImageUrlField />
    </div>

    {/* Row 5: Public Switch */}
    <PublicSwitchField />

    <DialogFooter className="flex gap-2 pt-4">
      <DialogClose asChild>
        <Button variant="outline" disabled={isPending}>
          Cancel
        </Button>
      </DialogClose>
      <Button
        type="submit"
        disabled={isPending || hasValidationErrors}
        className="min-w-[120px]"
      >
        {isPending ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Creating...
          </div>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Create News
          </>
        )}
      </Button>
    </DialogFooter>
  </form>
</DialogContent>
```

### Spacing and Visual Hierarchy

1. **Form Spacing**: Use `space-y-6` for main form sections
2. **Field Spacing**: Use `space-y-2` within each field group
3. **Grid Layout**: Use `grid-cols-1 sm:grid-cols-2` for responsive layout
4. **Button Heights**: Use `h-12` for consistency with RegisterForm
5. **Dialog Footer**: Use `pt-4` to separate from form content

## 5. Color Scheme Implementation

### Using CSS Variables from index.css

```tsx
// Primary colors (already defined)
// --primary: oklch(0.646 0.222 263.116)
// --primary-foreground: oklch(0.985 0 0)
// --destructive: oklch(0.577 0.245 27.325)
// --muted-foreground: oklch(0.556 0 0)
// --border: oklch(0.922 0 0)

// Category colors (from news.schema.ts)
const CATEGORY_COLORS: Record<NewsCategory, string> = {
  [NewsCategory.GENERAL]: 'bg-gray-100 text-gray-800',
  [NewsCategory.RESEARCH]: 'bg-purple-100 text-purple-800',
  [NewsCategory.PRODUCT]: 'bg-blue-100 text-blue-800',
  [NewsCategory.COMPANY]: 'bg-green-100 text-green-800',
  [NewsCategory.TUTORIAL]: 'bg-yellow-100 text-yellow-800',
  [NewsCategory.OPINION]: 'bg-pink-100 text-pink-800',
};
```

### Component-Specific Styling

1. **Success States**: Use `text-primary` and `border-primary`
2. **Error States**: Use `text-destructive` and `border-destructive`
3. **Muted Text**: Use `text-muted-foreground`
4. **Focus States**: Use `focus:ring-primary/20`

## 6. Required Dependencies and Setup

### Add Missing Components

```bash
# Add textarea component (required for summary field)
npx shadcn@latest add textarea
```

### Icons Required (from lucide-react)

```tsx
import {
  Plus,           // Create button
  Building2,      // Source field
  FileText,       // Title field
  Link,           // Link field
  Image,          // Image URL field
  AlertCircle,    // Error indicators
  X               // Dialog close (already in Dialog component)
} from "lucide-react";
```

## 7. Integration with NewsBoard

### Button Placement

```tsx
// In NewsBoard.tsx header section
<div className="flex justify-between items-center mb-6">
  <div className="flex items-center gap-4">
    <NewsStats />
  </div>
  <div className="flex items-center gap-2">
    <NewsFilters />
    <CreateNewsDialog />
  </div>
</div>
```

### Button Styling

```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  <Plus className="w-4 h-4 mr-2" />
  Create News
</Button>
```

## 8. Accessibility Features

### ARIA Implementation

1. **Form Labels**: All inputs have proper `htmlFor` associations
2. **Error Descriptions**: Use `aria-describedby` for error messages
3. **Invalid States**: Use `aria-invalid` for validation errors
4. **Dialog Focus**: Automatic focus management
5. **Screen Reader Support**: Error announcements and field descriptions

### Keyboard Navigation

1. **Tab Order**: Logical progression through form fields
2. **Enter Key**: Submit form when all validations pass
3. **Escape Key**: Close dialog (built into Dialog component)
4. **Arrow Keys**: Navigate select options

## 9. Performance Considerations

### Optimization Strategies

1. **Validation Debouncing**: Debounce real-time validation by 300ms
2. **Component Memoization**: Memoize field components if they become complex
3. **Lazy Loading**: Dialog content loads only when opened
4. **State Updates**: Batch state updates where possible

```tsx
// Debounced validation example
const debouncedValidate = useCallback(
  debounce((field: string, value: string) => {
    validateField(field, value);
  }, 300),
  []
);
```

## 10. Testing Recommendations

### Component Testing

1. **Field Validation**: Test each validation rule
2. **Form Submission**: Test success/error flows
3. **Dialog Behavior**: Test open/close states
4. **Accessibility**: Test with screen readers
5. **Responsive Design**: Test on different screen sizes

### Integration Testing

1. **NewsBoard Integration**: Test button placement and dialog trigger
2. **Mutation Hook**: Test integration with useCreateNewsMutation
3. **Cache Invalidation**: Test news list refresh after creation
4. **Error Handling**: Test server error scenarios

## Summary

This implementation plan provides a complete, accessible, and visually consistent create news form that follows the established patterns in the codebase. The form uses shadcn/ui components effectively while maintaining the design system's integrity and providing excellent user experience.

Key implementation priorities:
1. Add textarea component first
2. Implement form structure and validation
3. Create dialog container and integration
4. Test thoroughly for accessibility and responsiveness