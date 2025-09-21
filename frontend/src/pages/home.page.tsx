import { ProtectedRoute } from '@/core/components/ProtectedRoute'
import { NewsProvider } from '@/features/news/hooks/useNewsContext'
import { NewsBoard } from '@/features/news/components/NewsBoard'
import Header from '@/core/components/header'
const HomePage = () => {
  return (
    <ProtectedRoute>
      <NewsProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
          <Header>
            <div />
          </Header>
          <div className="container mx-auto px-4 py-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                News Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your reading list with our Kanban-style board
              </p>
            </header>

            <NewsBoard />
          </div>
        </div>
      </NewsProvider>
    </ProtectedRoute>
  )
}

export default HomePage