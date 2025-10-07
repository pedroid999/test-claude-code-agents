import { vi } from 'vitest'
import type {
  AuthRequest,
  AuthResponse,
  CurrentUser,
  AuthUser
} from '@/features/auth/data/auth.schema'
import type {
  NewsItem,
  CreateNewsRequest,
  UpdateNewsStatusRequest,
  NewsFilters,
  NewsListResponse,
  NewsStats,
  GenerateAiNewsRequest,
  GenerateAiNewsResponse,
  DeleteAllNewsResponse,
  NewsCategory,
  NewsStatus,
} from '@/features/news/data/news.schema'

// Factory for creating test auth requests
export const createMockAuthRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest => ({
  email: 'test@example.com',
  password: 'password123',
  ...overrides,
})

// Factory for creating test auth responses
export const createMockAuthResponse = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
  access_token: 'mock.jwt.token',
  token_type: 'bearer',
  ...overrides,
})

// Factory for creating test current users
export const createMockCurrentUser = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

// Factory for creating test auth users
export const createMockAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  email: 'test@example.com',
  ...overrides,
})

// JWT Token factories
export const createMockJWT = (payload: Record<string, any> = {}) => {
  const defaultPayload = {
    sub: 'test@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  }
  
  // This is a mock JWT - in real tests, jwt-decode is mocked
  return `mock.${btoa(JSON.stringify(defaultPayload))}.token`
}

// Factory for expired JWT tokens
export const createExpiredMockJWT = (payload: Record<string, any> = {}) => {
  return createMockJWT({
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    ...payload,
  })
}

// Local storage state factories
export const createMockLocalStorageState = (overrides: Record<string, string> = {}) => ({
  access_token: 'mock.jwt.token',
  refresh_token: 'mock.refresh.token',
  user_email: 'test@example.com',
  session_expiration: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  ...overrides,
})

// Factory for creating test users in different states
export const createMockUserStates = {
  authenticated: () => createMockCurrentUser({ is_active: true }),
  inactive: () => createMockCurrentUser({ is_active: false }),
  new: () => createMockCurrentUser({ 
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString() 
  }),
}

// API Response factories
export const createMockApiResponse = <T>(data: T, overrides: any = {}) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
  ...overrides,
})

export const createMockApiError = (message = 'API Error', status = 500, overrides: any = {}) => ({
  response: {
    data: { message },
    status,
    statusText: status === 400 ? 'Bad Request' : 'Internal Server Error',
    headers: {},
    config: {},
  },
  message,
  ...overrides,
})

// React Query factories
export const createMockQueryResult = <T>(data: T, overrides: any = {}) => ({
  data,
  isLoading: false,
  isError: false,
  isSuccess: true,
  error: null,
  refetch: vi.fn(),
  ...overrides,
})

export const createMockMutationResult = <T = any>(overrides: any = {}) => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isLoading: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: undefined as T,
  reset: vi.fn(),
  ...overrides,
})

// Date factories for consistent test dates
export const createMockDates = {
  now: () => new Date('2024-01-01T12:00:00Z'),
  future: (hours = 1) => new Date(Date.now() + hours * 3600000),
  past: (hours = 1) => new Date(Date.now() - hours * 3600000),
  isoString: () => new Date('2024-01-01T12:00:00Z').toISOString(),
}

// Form data factories
export const createMockFormData = {
  login: (overrides: Partial<AuthRequest> = {}) => createMockAuthRequest(overrides),
  register: (overrides: Partial<AuthRequest> = {}) => createMockAuthRequest(overrides),
}

// Test helper to create multiple items
export const createMockList = <T>(factory: () => T, count: number): T[] => 
  Array.from({ length: count }, factory)

// Auth context state factory
export const createMockAuthContextValue = (overrides: any = {}) => ({
  isAuthenticated: false,
  userEmail: null,
  isLoading: false,
  loginWithJWT: vi.fn(),
  registerUser: vi.fn(),
  auth: null,
  login: vi.fn(),
  logout: vi.fn(),
  getJwt: vi.fn(() => null),
  ...overrides,
})

// ============================================================
// News Feature Factories
// ============================================================

// Factory for creating test news items
export const createMockNewsItem = (overrides: Partial<NewsItem> = {}): NewsItem => ({
  id: 'news-123',
  source: 'Tech News',
  title: 'Breaking: New Technology Released',
  summary: 'This is an exciting new development in the tech world.',
  link: 'https://example.com/news/123',
  image_url: 'https://example.com/images/news-123.jpg',
  status: 'pending',
  category: 'general',
  is_favorite: false,
  user_id: 'user-123',
  is_public: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

// Factory for creating test news lists
export const createMockNewsListResponse = (
  overrides: Partial<NewsListResponse> = {}
): NewsListResponse => ({
  items: [createMockNewsItem()],
  total: 1,
  offset: 0,
  limit: 10,
  ...overrides,
})

// Factory for creating test news stats
export const createMockNewsStats = (overrides: Partial<NewsStats> = {}): NewsStats => ({
  pending_count: 5,
  reading_count: 3,
  read_count: 2,
  favorite_count: 4,
  total_count: 10,
  ...overrides,
})

// Factory for creating test create news requests
export const createMockCreateNewsRequest = (
  overrides: Partial<CreateNewsRequest> = {}
): CreateNewsRequest => ({
  source: 'Test Source',
  title: 'Test News Title',
  summary: 'Test news summary',
  link: 'https://example.com/test',
  image_url: 'https://example.com/test.jpg',
  category: 'general',
  is_public: false,
  ...overrides,
})

// Factory for creating test update status requests
export const createMockUpdateStatusRequest = (
  overrides: Partial<UpdateNewsStatusRequest> = {}
): UpdateNewsStatusRequest => ({
  status: 'reading',
  ...overrides,
})

// Factory for creating test news filters
export const createMockNewsFilters = (overrides: Partial<NewsFilters> = {}): NewsFilters => ({
  status: undefined,
  category: undefined,
  is_favorite: undefined,
  limit: 10,
  offset: 0,
  ...overrides,
})

// Factory for creating test generate AI news requests
export const createMockGenerateAiNewsRequest = (
  overrides: Partial<GenerateAiNewsRequest> = {}
): GenerateAiNewsRequest => ({
  count: 5,
  categories: ['general', 'research'],
  is_public: false,
  ...overrides,
})

// Factory for creating test generate AI news responses
export const createMockGenerateAiNewsResponse = (
  overrides: Partial<GenerateAiNewsResponse> = {}
): GenerateAiNewsResponse => ({
  news_items: [createMockNewsItem()],
  total_generated: 1,
  message: 'Successfully generated 1 news items',
  ...overrides,
})

// Factory for creating test delete all news responses
export const createMockDeleteAllNewsResponse = (
  overrides: Partial<DeleteAllNewsResponse> = {}
): DeleteAllNewsResponse => ({
  deleted_count: 10,
  message: 'Successfully deleted 10 news items',
  ...overrides,
})

// Factory for creating multiple news items with different statuses
export const createMockNewsItemsByStatus = () => ({
  pending: [
    createMockNewsItem({ id: 'news-1', status: 'pending', title: 'Pending News 1' }),
    createMockNewsItem({ id: 'news-2', status: 'pending', title: 'Pending News 2' }),
  ],
  reading: [
    createMockNewsItem({ id: 'news-3', status: 'reading', title: 'Reading News 1' }),
  ],
  read: [
    createMockNewsItem({ id: 'news-4', status: 'read', title: 'Read News 1' }),
  ],
})

// Factory for creating news items with different categories
export const createMockNewsItemsByCategory = () => ({
  general: createMockNewsItem({ id: 'news-1', category: 'general' }),
  research: createMockNewsItem({ id: 'news-2', category: 'research' }),
  product: createMockNewsItem({ id: 'news-3', category: 'product' }),
  company: createMockNewsItem({ id: 'news-4', category: 'company' }),
  tutorial: createMockNewsItem({ id: 'news-5', category: 'tutorial' }),
  opinion: createMockNewsItem({ id: 'news-6', category: 'opinion' }),
})

// Factory for creating favorite news items
export const createMockFavoriteNewsItems = (count: number = 3) =>
  Array.from({ length: count }, (_, i) =>
    createMockNewsItem({
      id: `news-fav-${i + 1}`,
      is_favorite: true,
      title: `Favorite News ${i + 1}`,
    })
  )

// News context state factory
export const createMockNewsContextValue = (overrides: any = {}) => ({
  news: [createMockNewsItem()],
  isLoading: false,
  error: null,
  filters: {},
  selectedView: 'board' as const,
  stats: createMockNewsStats(),
  setFilters: vi.fn(),
  setSelectedView: vi.fn(),
  updateNewsStatus: vi.fn(),
  toggleFavorite: vi.fn(),
  generateAiNews: vi.fn(),
  deleteNews: vi.fn(),
  deleteAllNews: vi.fn(),
  aiGeneration: {
    isLoading: false,
    error: null,
    isSuccess: false,
  },
  deleteState: {
    isLoading: false,
    error: null,
  },
  newsByStatus: {
    pending: [],
    reading: [],
    read: [],
  },
  ...overrides,
})