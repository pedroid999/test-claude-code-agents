# Delete News Feature - Validation Plan

## Overview
This document outlines the comprehensive validation approach for the delete news feature using Playwright browser automation through the MCP tool.

## Prerequisites

### Backend Requirements
- MongoDB running (Docker: `docker compose up -d`)
- Backend server running: `cd backend && poetry run uvicorn src.main:app --reload`
- Test user account created with sample news data

### Frontend Requirements
- Frontend dev server running: `cd frontend && npm run dev`
- Typically runs on `http://localhost:5173`

## Validation Phases

### Phase 1: Environment Setup
1. Start backend and frontend servers
2. Create test user account
3. Seed database with test news data (various statuses, favorites)
4. Verify baseline functionality (login, view news)

### Phase 2: Individual Delete Validation
Using Playwright MCP to automate:
1. Navigate to news board as authenticated user
2. Verify trash button appears on news cards
3. Click trash button on a news item
4. Verify success toast appears
5. Verify item removed from UI
6. Verify stats updated correctly
7. Test error scenarios (unauthorized, not found)

### Phase 3: Bulk Delete Validation
Using Playwright MCP to automate:
1. Navigate to news board with multiple items
2. Verify "Delete All" button exists and enabled
3. Click "Delete All" button
4. Verify modal opens with correct stats
5. Verify confirmation button and cancel button
6. Test cancel flow (no deletion)
7. Test confirmation flow (all items deleted)
8. Verify success toast with count
9. Verify empty state appears

### Phase 4: Accessibility Validation
Using Playwright MCP to automate:
1. Keyboard navigation through all delete controls
2. Tab order verification
3. Escape key to close modal
4. Enter/Space to activate buttons
5. ARIA attributes verification
6. Focus management in modal

### Phase 5: Error Handling Validation
Simulated scenarios:
1. Network interruption during delete
2. Session expiration (401 error)
3. Authorization failure (403 error)
4. Item not found (404 error)
5. Server error (500 error)

### Phase 6: Performance Validation
1. Individual delete response time measurement
2. Bulk delete with large dataset (100+ items)
3. UI responsiveness during operations
4. Cache invalidation efficiency

## Test Data Requirements

### Baseline Data Set
- **User**: test_user@example.com / Test@123
- **News Items**: Minimum 20 items
  - 5 Pending status
  - 7 Reading status
  - 8 Read status
  - 6 Favorite items (across different statuses)
  - 3 Public items
  - 17 Private items

### Categories Distribution
- Technology: 7 items
- Business: 5 items
- Sports: 4 items
- Entertainment: 4 items

## Playwright Test Scripts

### Test 1: Individual Delete - Happy Path
```
1. Navigate to http://localhost:5173
2. Login with test credentials
3. Navigate to /news
4. Wait for news cards to load
5. Identify first news card
6. Click trash button (selector: button[aria-label="Delete news item"])
7. Wait for toast notification
8. Verify toast contains "News item deleted successfully"
9. Verify news card removed from DOM
10. Verify stats counter decreased by 1
```

### Test 2: Bulk Delete - Happy Path
```
1. Navigate to http://localhost:5173
2. Login with test credentials
3. Navigate to /news
4. Wait for news cards to load
5. Click "Delete All" button
6. Wait for modal to appear
7. Verify modal title: "Delete All News Items"
8. Verify stats displayed (total, breakdown)
9. Click "Delete All" button in modal (destructive)
10. Wait for toast notification
11. Verify toast contains deleted count
12. Verify all news cards removed
13. Verify empty state appears
14. Verify stats reset to 0
```

### Test 3: Bulk Delete - Cancel Flow
```
1. Navigate to http://localhost:5173
2. Login with test credentials
3. Navigate to /news
4. Wait for news cards to load
5. Note initial item count
6. Click "Delete All" button
7. Wait for modal to appear
8. Click "Cancel" button
9. Verify modal closes
10. Verify all items still present
11. Verify stats unchanged
```

### Test 4: Accessibility - Keyboard Navigation
```
1. Navigate to http://localhost:5173
2. Login with test credentials
3. Navigate to /news
4. Press Tab repeatedly to reach first news card trash button
5. Verify focus visible
6. Press Enter to activate
7. Verify deletion occurs
8. Tab to "Delete All" button
9. Press Enter to open modal
10. Verify focus trapped in modal
11. Press Escape to close modal
12. Verify focus returns to trigger button
```

### Test 5: Error Handling - 404 Not Found
```
1. Navigate to http://localhost:5173
2. Login with test credentials
3. Navigate to /news
4. Delete an item
5. Attempt to delete the same item again (simulate by direct API call)
6. Verify error toast appears
7. Verify message: "News item not found"
8. Verify UI remains consistent
```

## Success Criteria

### Critical (Must Pass)
- ✅ Individual delete removes item and updates stats
- ✅ Bulk delete removes all items and shows count
- ✅ Cancel modal closes without deletion
- ✅ Success toasts appear for all operations
- ✅ Error toasts appear for all error scenarios
- ✅ Keyboard navigation works completely
- ✅ No unauthorized deletions possible
- ✅ UI updates immediately without refresh

### Important (Should Pass)
- ✅ Loading states prevent duplicate actions
- ✅ Modal traps focus correctly
- ✅ Escape key closes modal
- ✅ Stats accuracy maintained
- ✅ Empty state appears when all deleted
- ✅ Response times acceptable (< 2s)

### Nice-to-Have (Recommended)
- ✅ Smooth animations during deletion
- ✅ Visual hover states on trash buttons
- ✅ Clear disabled states
- ✅ Progress indication for large datasets

## Validation Execution

### Manual Steps (Before Playwright)
1. Start MongoDB: `docker compose up -d`
2. Start backend: `cd backend && poetry run uvicorn src.main:app --reload`
3. Wait for backend to be ready (check http://localhost:8000/docs)
4. Start frontend: `cd frontend && npm run dev`
5. Wait for frontend to be ready (check http://localhost:5173)

### Automated Steps (Using Playwright MCP)
1. Create new browser instance
2. Navigate to application URL
3. Perform login flow
4. Execute test scenarios 1-5
5. Capture screenshots at key points
6. Document any failures or issues
7. Close browser instance

## Reporting

### Test Report Structure
```markdown
# Delete News Feature - Validation Report

## Test Execution Summary
- **Date**: YYYY-MM-DD
- **Environment**: Local Development
- **Browser**: Chromium (Playwright)
- **Total Tests**: X
- **Passed**: X
- **Failed**: X
- **Skipped**: X

## Test Results

### AC-1: Individual Delete
- [✅/❌] AC-1.1: Trash Button Visibility
- [✅/❌] AC-1.2: Individual Delete Execution
- [✅/❌] AC-1.3: Individual Delete Authorization
- [✅/❌] AC-1.4: Individual Delete Not Found
- [✅/❌] AC-1.5: Individual Delete Loading State

### AC-2: Bulk Delete
- [✅/❌] AC-2.1: Delete All Button Visibility
- [✅/❌] AC-2.2: Delete All Button - Disabled State
- [✅/❌] AC-2.3: Delete All Confirmation Modal Display
- [✅/❌] AC-2.4: Delete All Modal - Stats Accuracy
- [✅/❌] AC-2.5: Delete All Execution
- [✅/❌] AC-2.6: Delete All - Cancel Operation
- [✅/❌] AC-2.7: Delete All Loading State

### AC-3: Error Handling
- [✅/❌] AC-3.1: Network Error Handling
- [✅/❌] AC-3.2: Server Error Handling
- [✅/❌] AC-3.3: Rate Limit Handling
- [✅/❌] AC-3.4: Authentication Error Handling

### AC-4: User Experience
- [✅/❌] AC-4.1: Immediate UI Feedback
- [✅/❌] AC-4.2: Toast Notifications
- [✅/❌] AC-4.3: Confirmation for Destructive Actions
- [✅/❌] AC-4.4: Visual Distinction for Destructive Actions

### AC-5: Accessibility
- [✅/❌] AC-5.1: Keyboard Navigation
- [✅/❌] AC-5.2: Screen Reader Support
- [✅/❌] AC-5.3: Focus Management
- [✅/❌] AC-5.4: Color Contrast and Visual Indicators

## Issues Found

### Critical Issues
1. [Issue description]
   - **Impact**: High/Medium/Low
   - **Steps to Reproduce**: ...
   - **Expected**: ...
   - **Actual**: ...
   - **Screenshot**: [path]

### Non-Critical Issues
1. [Issue description]

## Recommendations
1. [Recommendation based on findings]

## Screenshots
- [Key screenshots attached]

## Conclusion
[Overall assessment of feature readiness]
```

## Notes

- All Playwright MCP interactions will be automated
- Screenshots captured at critical validation points
- Network conditions simulated for error testing
- Performance metrics collected during tests
- Accessibility checked using browser dev tools and Playwright assertions

