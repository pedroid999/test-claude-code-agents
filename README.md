# React-fast-boilerplate

A full-stack application with FastAPI backend implementing hexagonal architecture and React TypeScript frontend with feature-based architecture.

## 🏗️ Architecture Overview

### Backend - Hexagonal Architecture (Ports & Adapters)

The backend follows **Hexagonal Architecture** principles with clear separation of concerns:

```
backend/
├── src/
│   ├── domain/           # Core business logic (innermost layer)
│   │   ├── entities/     # Business objects with validation
│   │   └── exceptions/   # Domain-specific exceptions
│   │
│   ├── application/      # Application layer (orchestration)
│   │   ├── ports/        # Repository interfaces (abstractions)
│   │   └── use_cases/    # Business logic orchestration
│   │
│   ├── infrastructure/   # External adapters (outermost layer)
│   │   ├── adapters/     
│   │   │   └── repositories/  # MongoDB implementations
│   │   ├── database.py   # Database connection
│   │   └── web/          # FastAPI layer
│   │       ├── routers/  # API endpoints
│   │       ├── dtos/     # Request/Response models
│   │       ├── mappers/  # DTO ↔ Entity converters
│   │       └── dependencies/  # Dependency injection
│   │
│   ├── config/           # Configuration files
│   ├── app.py           # FastAPI app factory
│   └── main.py          # Entry point
```

**Key Principles:**
- **Domain Layer**: Pure business logic, no external dependencies
- **Application Layer**: Use cases that orchestrate domain logic
- **Infrastructure Layer**: All external concerns (DB, web, etc.)
- **Dependency Rule**: Dependencies point inward (Infrastructure → Application → Domain)

### Frontend - Feature-Based Architecture

The frontend uses a **Feature-Based Architecture** for modularity and scalability:

```
frontend/
├── src/
│   ├── features/         # Feature modules
│   │   └── {feature}/    # e.g., products, users, orders
│   │       ├── components/   # Feature-specific React components
│   │       ├── data/         
│   │       │   ├── schemas/  # Zod validation schemas
│   │       │   └── services/ # API calls
│   │       └── hooks/        
│   │           ├── use{Feature}Context.tsx  # Context state management
│   │           ├── use{Feature}.tsx         # Business logic hook
│   │           ├── mutations/   # React Query mutations
│   │           └── queries/     # React Query data fetching
│   │
│   ├── core/             # Shared infrastructure
│   │   ├── data/         # API client, storage, query setup
│   │   └── hooks/        # Shared hooks
│   │
│   ├── components/       
│   │   └── ui/          # Reusable UI components (Radix/shadcn)
│   │
│   └── pages/           # Route components
```

## 🚀 Tech Stack

### Backend
- **Framework**: FastAPI with async support
- **Database**: MongoDB with Motor async driver
- **Authentication**: OAuth2 with JWT tokens
- **Validation**: Pydantic v2
- **Testing**: pytest with 80% coverage requirement
- **Observability**: Logfire with OpenTelemetry
- **AI Framework**: Pydantic AI

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS v4
- **UI Components**: Radix UI / shadcn/ui
- **State Management**: React Context + React Query (TanStack Query)
- **Routing**: React Router v7
- **Form Validation**: Zod schemas
- **Testing**: Vitest + React Testing Library

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB (local or Docker)
- Poetry (for Python dependency management)

### Backend Setup

```bash
cd backend

# Install Poetry (if not already installed)
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Activate virtual environment
poetry shell

# Create .env file with required variables
cp env.example .env

# Run development server
poetry run uvicorn src.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Run development server
npm run dev
```

### Database Setup

#### Using Docker (Recommended)

The project includes a complete MongoDB setup with Docker:

```bash
# Start MongoDB and Mongo Express (web UI)
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs mongodb

# Stop services
docker compose down
```

This will start:
- **MongoDB** on port `27017` with authentication
- **Mongo Express** (web UI) on port `8081` for database management

#### Database Configuration

1. Copy the environment template:
```bash
cd backend
cp env.example .env
```

2. The default configuration connects to Docker MongoDB:
```env
MONGODB_URL=mongodb://app_user:app_password@localhost:27017/react_fastapi_app?authSource=react_fastapi_app
DATABASE_NAME=react_fastapi_app
```

#### Alternative: Local MongoDB Installation

If you prefer to install MongoDB locally:

1. Install MongoDB and ensure it's running on port 27017
2. Update the `.env` file:
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=react_fastapi_app
```

#### Database Management

- Access **Mongo Express** at: http://localhost:8081
- Default credentials are configured in `docker-compose.yml`
- The database includes collections for `users` and `news`

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run all tests with coverage
poetry run pytest --cov=src --cov-report=term-missing

# Run specific test types
poetry run pytest -m unit          # Unit tests only
poetry run pytest -m integration   # Integration tests only
poetry run pytest -m "not slow"    # Skip slow tests

# Run specific test file
poetry run pytest tests/test_domain_entities.py
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm test

# Run tests with watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## 🏭 Development Workflow

### Claude AI Agent Pattern

The project includes specialized Claude AI agents in `.claude/agents/` that follow a consistent GOAL-OUTPUT-RULES pattern:

#### Available Agents:
- **backend-developer**: Backend implementation following hexagonal architecture
- **backend-test-engineer**: Backend testing with pytest
- **frontend-developer**: Frontend implementation with feature-based architecture
- **frontend-test-engineer**: Frontend testing with Vitest
- **shadcn-ui-architect**: UI component design with shadcn/ui
- **ui-ux-analyzer**: UI/UX review and improvements
- **qa-criteria-validator**: Acceptance criteria validation
- **pydantic-ai-architect**: Pydantic AI agent development

#### Planification Agents Structure:

In `CLAUDE.md` file check the WORKFLOW RULES and SUBAGENTS MANAGEMENT section were we let the main claude agent to know about the agents and the process to follow when planning


In each agent copy and paste this text at the end to transform them in planification agents, replacing the <agent_target>
```markdown

## Goal
Your goal is to propose a detailed implementation plan for our current codebase & project, including specifically which files to create/change, what changes/content are, and all the important notes (assume others only have outdated knowledge about how to do the implementation)
NEVER do the actual implementation, just propose implementation plan
Save the implementation plan in `.claude/doc/{feature_name}/<agent_target>.md`

## Output format
Your final message HAS TO include the implementation plan file path you created so they know where to look up, no need to repeat the same content again in final message (though is okay to emphasis important notes that you think they should know in case they have outdated knowledge)

e.g. I've created a plan at `.claude/doc/{feature_name}/<agent_target>.md`, please read that first before you proceed


## Rules
- NEVER do the actual implementation, or run build or dev, your goal is to just research and parent agent will handle the actual building & dev server running
- Before you do any work, MUST view files in `.claude/sessions/context_session_{feature_name}.md` file to get the full context
- After you finish the work, MUST create the `.claude/doc/{feature_name}/<agent_target>.md` file to make sure others can get full context of your proposed implementation
```

### Development Guidelines

#### Backend Conventions
- Use dependency injection throughout the web layer
- All use cases: constructor injection → single `execute` method
- Domain entities validate in `__post_init__` and business methods
- Repository implementations use MongoDB with Motor async driver
- DTOs use Pydantic with comprehensive validation
- Map domain exceptions to appropriate HTTP status codes

#### Frontend Conventions
- Each feature exports a context provider and custom hook
- Components import UI components from `@/components/ui/`
- Use `use{Feature}Context` or `use{Feature}` for accessing feature state
- Mutations return: `{action, isLoading, error, isSuccess}`
- Services use axios for API communication
- Type safety with TypeScript and Zod schemas

## 🔐 Security

- OAuth2 authentication with JWT tokens
- Password hashing with bcrypt
- Protected routes on both backend and frontend
- Environment-based configuration for sensitive data
- Input validation at multiple layers
- CORS configuration for production

## 📝 API Documentation

When the backend is running, access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🤝 Contributing

1. Follow the established architecture patterns
2. Ensure tests pass with required coverage
3. Use the appropriate Claude AI agents for guidance
4. Update documentation for significant changes
5. Follow the commit message conventions

## 👥 Authors

- Francisco Pastor
