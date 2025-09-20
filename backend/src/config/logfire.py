import os
from fastapi import FastAPI
import logfire

# Track configuration status internally
_logfire_configured = False

def configure_logfire_base(app: FastAPI | None = None):
    """Configure basic Logfire settings without instrumenting FastAPI"""
    global _logfire_configured
    
    try:
        token = os.getenv("LOGFIRE_TOKEN")
        environment = os.getenv("ENVIRONMENT")
        service_name = os.getenv("SERVICE_NAME")
        if token:
            # Configure logfire with the latest API
            logfire.configure(
                token=token,
                service_name=service_name or 'fast-react-boilerplate',
                environment=environment or "development",
                distributed_tracing=False,
                scrubbing=False
            )
            _logfire_configured = True
            
            # Only instrument FastAPI if app is provided
            if app is not None:
                logfire.info("Instrumenting FastAPI")
                try:
                    logfire.instrument_fastapi(app)
                except Exception as e:
                    print(f"FastAPI instrumentation error: {e}")
            
            return True
        else:
            print("WARNING: LOGFIRE_TOKEN no está configurado")
            return False
    except Exception as e:
        print(f"Error al configurar logfire: {e}")
        return False

def logfire_instrument_additional_libraries():
    """Instrument additional libraries after FastAPI is set up"""
    global _logfire_configured
    
    try:
        # Only instrument if Logfire is configured
        if not _logfire_configured:
            print("WARNING: Trying to instrument libraries before Logfire is configured")
            return False
            
        logfire.info("Instrumenting additional libraries")
        try:
            logfire.instrument_pymongo()
            logfire.instrument_mcp()
            logfire.instrument_openai()
            logfire.instrument_pydantic()
            return True
        except Exception as e:
            print(f"Library instrumentation error: {e}")
            return False
    except Exception as e:
        print(f"Error instrumenting additional libraries: {e}")
        return False

def configure_logfire(app: FastAPI | None = None):
    """Backwards compatibility function that configures everything at once"""
    if not is_configured():
        base_configured = configure_logfire_base(app)
        if base_configured:
            return logfire_instrument_additional_libraries()
        return False

def is_configured():
    """Check if logfire has been configured"""
    global _logfire_configured
    return _logfire_configured