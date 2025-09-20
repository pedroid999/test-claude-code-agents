"""Main entry point for the FastAPI application."""

from src.app import create_app
from dotenv import load_dotenv
load_dotenv()

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)