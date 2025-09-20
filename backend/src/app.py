"""FastAPI application using hexagonal architecture."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.infrastructure.web.routers.users import router as users_router
from src.infrastructure.web.routers.news import router as news_router
from src.config.logfire import configure_logfire
from dotenv import load_dotenv
load_dotenv()

def create_app() -> FastAPI:
    """Create FastAPI application with hexagonal architecture."""
    app = FastAPI(
        title="E-commerce API with Hexagonal Architecture",
        description="A FastAPI application implementing hexagonal architecture patterns",
        version="2.0.0"
    )

    configure_logfire(app)

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(news_router)  # News router already has /api/news prefix
    
    @app.get("/")
    async def root():
        return {"message": "E-commerce API with Hexagonal Architecture"}
    
    @app.get("/api/v1/health")
    async def health_check():
        return {"status": "healthy", "architecture": "hexagonal"}
    
    return app