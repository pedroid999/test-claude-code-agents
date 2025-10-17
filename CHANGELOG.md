# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.1.2] - 2025-10-17

### ✨ Features

- **Twitter Sharing Integration** (d0bcfef, ebb8487)
  - Added comprehensive Twitter sharing functionality for news items
  - New `TwitterShareButton` component with Share2 icon from Lucide
  - Generate Twitter intent URLs with pre-filled title, URL, and category-based hashtags
  - Optional Twitter handle support (saves to localStorage for future shares)
  - Smart title truncation (max 200 characters) to fit Twitter's limits
  - Toast notifications for share success/failure using Sonner
  - Comprehensive validation for Twitter handles (1-15 chars, alphanumeric + underscore)
  - [PR #1](https://github.com/user/repo/pull/1)

### 🐛 Bug Fixes

- **Twitter Sharing Enhancements** (ebb8487)
  - Added error handling for localStorage operations (prevents crashes in private browsing mode)
  - Implemented link validation in generateTwitterUrl (throws error for invalid/empty links)
  - Enhanced mobile accessibility with WCAG 2.1 AA compliant touch targets (44x44px)
  - Added aria-labels to all action buttons for screen reader support

### 🧪 Testing

- **Twitter Utils Test Suite**
  - Added 20 comprehensive unit tests for twitter.utils.ts
  - URL generation tests (basic, with handle, truncation, encoding)
  - Handle validation tests (valid formats, invalid chars, length limits)
  - localStorage tests (save, retrieve, error handling)
  - All tests passing with 100% coverage

### 🔧 Chore

- **Git Flow Configuration** (0562987)
  - Added prevent-direct-push hook to protect main/develop branches
  - Added validate-branch-name hook to enforce naming conventions
  - Updated Claude settings for better Git Flow integration

### 📊 Release Statistics

- **3 commits** since v1.1.1
- **1 major feature** (Twitter sharing integration)
- **1 bug fix** (QA feedback improvements)
- **1 chore** (Git Flow hooks)
- **0 breaking changes**
- **20 new tests** (100% passing)

---

## [v1.1.1] - 2025-10-08

### 🔧 Chore

- **Git Flow Configuration Updates** (2b3bc19)
  - Enhanced release.md with additional bash tool permissions (`cat`, `wc`, `tr`, `bash -c`)
  - Updated settings.json with git command permissions for better workflow automation
  - Improved Git Flow command execution capabilities
  - Better integration with release and feature workflows

### 📊 Release Statistics

- **1 commit** since v1.1.0
- **0 new features**
- **0 bug fixes**
- **1 chore** (configuration improvements)
- **0 breaking changes**

---

## [v1.1.0] - 2025-10-08

### ✨ Features

- **Delete News Functionality** (dcc94a5)
  - Implemented `delete_all_by_user_id` method in NewsRepository
  - Added API endpoint for deleting news items
  - Updated frontend components to support deleting individual news items
  - Added support for deleting all news for a user
  - Enhanced context and service layers with delete operations
  - Added new response DTOs for delete operations
  - Implemented loading states for delete actions

### ⚡️ Performance & Enhancements

- **Agent Model Updates** (5eb18ff)
  - Updated all agents to use `claude-sonnet-4-5-20250929`
  - Improved consistency across agent configurations
  - Enhanced agent capabilities with latest model version

- **Git Flow Commands** (0e4a847)
  - Updated Git Flow command models to use `claude-sonnet-4-5-20250929`
  - Enhanced feature, finish, flow-status, hotfix, and release commands
  - Improved workflow automation capabilities

### 📊 Release Statistics

- **3 commits** since v1.0.0
- **1 major feature** (delete functionality)
- **2 enhancements** (agent model updates, Git Flow improvements)
- **0 breaking changes**
- **0 bug fixes**

---

## [v1.0.0] - 2025-09-22

Initial release with core functionality:
- FastAPI backend with hexagonal architecture
- React frontend with TypeScript
- MongoDB database integration
- User authentication with OAuth2
- News management features
- Product and order management
- AI news generation
- Full testing infrastructure
