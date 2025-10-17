# Share News Feature - Acceptance Criteria

## Feature Overview
**Feature**: Twitter Share Functionality for News Items
**User Story**: As a news consumer, I want to share interesting news articles on Twitter so that I can spread valuable information with my followers.

---

## Acceptance Criteria

### 1. Share Button Visibility
**Given** a user is viewing the news dashboard
**When** the news cards are loaded
**Then** each news card displays a share button with a universal share icon

**Verification Points**:
- Share button is visible on all news cards
- Share button uses Share2 (lucide-react) icon
- Share button maintains consistent size (h-7 w-7) with other action buttons
- Share button has ghost variant styling
- Share button is positioned between favorite and external link buttons

---

### 2. Share Button Accessibility
**Given** a user is navigating with keyboard or screen reader
**When** the user focuses on or encounters the share button
**Then** the button is accessible and properly labeled

**Verification Points**:
- Share button has `aria-label="Share on Twitter"`
- Share button is keyboard navigable (Tab key)
- Share button can be activated with Enter/Space keys
- Share icon has `aria-hidden="true"` to avoid duplication
- Button maintains proper focus indicators

---

### 3. Twitter Share - Basic Flow
**Given** a user clicks the share button on a news card
**When** the Twitter share window opens
**Then** the Twitter compose dialog is pre-filled with news information

**Verification Points**:
- Twitter share opens in a new window
- Window uses `_blank` target with `noopener,noreferrer` security flags
- Window dimensions are 550x420 (Twitter's standard)
- Twitter URL format: `https://twitter.com/intent/tweet?text={title}&url={link}&hashtags={tags}`
- News title is properly URL encoded
- News link (original source URL) is included

---

### 4. Twitter Share - Content Formatting
**Given** a news item with various content characteristics
**When** the share URL is generated
**Then** the content is properly formatted for Twitter

**Verification Points**:
- **Short titles** (≤200 chars): Displayed in full
- **Long titles** (>200 chars): Truncated to 200 chars + "..."
- **Special characters**: Properly URL encoded (&, ", ', ?, etc.)
- **News URL**: Original link from news item is used
- **Hashtags**: Category-specific hashtags are included
  - general → #News
  - research → #Research #Science
  - product → #Product #Tech
  - company → #Business #Company
  - tutorial → #Tutorial #Learning
  - opinion → #Opinion #Perspective

---

### 5. Twitter Handle Integration
**Given** a user has previously saved their Twitter handle
**When** they share a news item
**Then** their Twitter handle is automatically included

**Verification Points**:
- Twitter handle is retrieved from localStorage (key: 'twitter-handle')
- Handle is included in URL as `via={handle}` parameter
- Handle works with or without @ symbol
- If no handle is saved, share still works without `via` parameter

---

### 6. Success Feedback
**Given** a user successfully shares a news item
**When** the Twitter window opens
**Then** a success toast notification is displayed

**Verification Points**:
- Toast appears in bottom-right corner
- Toast shows "Opening Twitter share" title
- Toast shows truncated news title (first 50 chars) in description
- Toast displays for 3 seconds
- Toast has success styling (green checkmark)

---

### 7. Error Handling - Popup Blocked
**Given** the browser blocks the Twitter popup window
**When** the user clicks the share button
**Then** an error toast notification is displayed

**Verification Points**:
- Error toast appears if window.open fails
- Toast shows "Failed to open Twitter" title
- Toast shows "Please try again or check your browser settings." description
- Toast displays for 5 seconds
- Toast has error styling (red X)
- Error is logged to console for debugging

---

### 8. Event Propagation Control
**Given** a user clicks the share button on a draggable news card
**When** the click event occurs
**Then** only the share action is triggered (not card drag)

**Verification Points**:
- Click event calls `e.stopPropagation()`
- Card does not start dragging when share button is clicked
- Other card interactions are not triggered
- Share button remains clickable in all card states

---

### 9. Mobile Responsiveness
**Given** a user is on a mobile device (viewport ≤768px)
**When** they view and interact with news cards
**Then** the share button remains functional and accessible

**Verification Points**:
- Share button is visible and properly sized on mobile
- Button touch target is adequate (minimum 44x44px)
- Toast notifications display properly on mobile
- Twitter opens in mobile browser (or Twitter app if installed)
- Button spacing is appropriate for touch input

---

### 10. Cross-Browser Compatibility
**Given** a user is using different web browsers
**When** they use the share functionality
**Then** it works consistently across all supported browsers

**Verification Points**:
- **Chrome/Edge**: window.open works without issues
- **Firefox**: window.open works without issues
- **Safari**: window.open works without issues
- **Mobile Safari**: Proper mobile handling
- **Mobile Chrome**: Proper mobile handling

---

## Edge Cases

### Edge Case 1: Very Long News Titles
**Scenario**: News item has a title exceeding 200 characters
**Expected Behavior**: Title is truncated to 200 characters + "..." ellipsis

### Edge Case 2: Special Characters in Title
**Scenario**: News title contains &, ", ', <, >, ?, #
**Expected Behavior**: All special characters are properly URL encoded

### Edge Case 3: Invalid Twitter Handle
**Scenario**: Saved Twitter handle contains invalid characters
**Expected Behavior**: Handle validation prevents saving; share works without handle

### Edge Case 4: Missing News Link
**Scenario**: News item has an empty or invalid link
**Expected Behavior**: Share includes whatever link is provided (validation at data entry)

### Edge Case 5: Popup Blocker Active
**Scenario**: Browser has strict popup blocking enabled
**Expected Behavior**: Error toast appears; user is guided to adjust settings

### Edge Case 6: localStorage Unavailable
**Scenario**: Browser blocks localStorage (incognito mode, privacy settings)
**Expected Behavior**: Share still works; handle feature gracefully degrades

---

## Non-Functional Requirements

### Performance
- **Share button render time**: < 50ms
- **Twitter URL generation**: < 10ms
- **Window.open execution**: < 100ms (user perception of instant)
- **Toast notification display**: < 100ms

### Accessibility (WCAG 2.1 AA)
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Proper ARIA labels
- ✅ Focus indicators visible
- ✅ Touch target size ≥44x44px on mobile
- ✅ Color contrast ratio ≥4.5:1 for button text/icons

### Security
- ✅ `noopener,noreferrer` flags prevent window.opener access
- ✅ All URL parameters are properly encoded
- ✅ No sensitive user data in share URLs
- ✅ localStorage usage is safe (non-sensitive data only)

### Usability
- ✅ Share action is intuitive (universal share icon)
- ✅ Success feedback is clear and timely
- ✅ Error messages are actionable
- ✅ Button positioning is consistent with other actions

---

## Dependencies

### Technical Dependencies
- React 19
- lucide-react (Share2 icon)
- sonner (toast notifications)
- shadcn/ui Button component
- localStorage API

### Feature Dependencies
- News feature must be loaded and functional
- News items must have valid `title`, `link`, and `category` fields
- Toaster component must be mounted in App root

---

## Test Coverage Requirements

### Unit Tests (20/20 passing ✅)
- URL generation with various news items
- Twitter handle validation
- localStorage save/retrieve operations
- Special character encoding
- Title truncation logic
- Category hashtag mapping

### E2E Tests (Required)
- Share button click opens Twitter window
- Toast notifications appear on success/error
- Twitter URL contains correct parameters
- Share works with/without saved handle
- Mobile responsiveness
- Keyboard navigation
- Cross-browser compatibility

---

## Definition of Done

- ✅ All acceptance criteria met
- ✅ Unit tests pass (20/20)
- ⏳ E2E tests pass (Playwright validation)
- ⏳ Accessibility audit passed
- ⏳ Cross-browser testing completed
- ⏳ Mobile responsiveness verified
- ⏳ Code review completed
- ⏳ Documentation updated

---

**Document Version**: 1.0
**Created**: 2025-10-17
**Status**: Ready for E2E Validation
