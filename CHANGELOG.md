# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
