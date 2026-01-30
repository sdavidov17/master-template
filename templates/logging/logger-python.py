"""
Structured JSON Logging for Python

Provides structured logging with OpenTelemetry trace correlation,
consistent JSON format, and configurable log levels.

Features:
- JSON structured output for production
- Pretty-printed output for development
- Automatic trace/span ID correlation
- Request ID tracking
- Safe error serialization
- Context-aware logging

Usage:
    from logger import logger, get_request_logger

    logger.info("User logged in", user_id="123")
    logger.error("Database error", error=err, query="SELECT...")

    # Request-scoped logging
    request_logger = get_request_logger(request_id="abc-123")
    request_logger.info("Processing request")

Environment Variables:
    LOG_LEVEL - Logging level (default: INFO)
    ENVIRONMENT - Environment (development enables pretty printing)
    SERVICE_NAME - Service name for logs (default: app)

Installation:
    pip install structlog python-json-logger
"""

import json
import logging
import os
import sys
import time
import traceback
from contextlib import contextmanager
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, Dict, Generator, Optional, TypeVar
from uuid import uuid4

import structlog
from opentelemetry import trace

# Configuration from environment
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
SERVICE_NAME = os.getenv("SERVICE_NAME", os.getenv("OTEL_SERVICE_NAME", "app"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_DEVELOPMENT = ENVIRONMENT == "development"

# Type variable for generic function return types
T = TypeVar("T")


def get_trace_context() -> Dict[str, str]:
    """Get OpenTelemetry trace context for correlation."""
    span = trace.get_current_span()
    if not span or not span.is_recording():
        return {}

    ctx = span.get_span_context()
    return {
        "trace_id": format(ctx.trace_id, "032x"),
        "span_id": format(ctx.span_id, "016x"),
    }


def serialize_error(error: BaseException) -> Dict[str, Any]:
    """Safely serialize an exception for logging."""
    return {
        "type": type(error).__name__,
        "message": str(error),
        "traceback": traceback.format_exception(type(error), error, error.__traceback__),
    }


def add_trace_context(
    logger: logging.Logger, method_name: str, event_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """Structlog processor to add trace context."""
    event_dict.update(get_trace_context())
    return event_dict


def add_service_context(
    logger: logging.Logger, method_name: str, event_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """Structlog processor to add service context."""
    event_dict["service"] = SERVICE_NAME
    event_dict["environment"] = ENVIRONMENT
    return event_dict


def add_timestamp(
    logger: logging.Logger, method_name: str, event_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """Structlog processor to add ISO timestamp."""
    event_dict["timestamp"] = datetime.now(timezone.utc).isoformat()
    return event_dict


def serialize_exceptions(
    logger: logging.Logger, method_name: str, event_dict: Dict[str, Any]
) -> Dict[str, Any]:
    """Structlog processor to serialize exceptions."""
    if "error" in event_dict and isinstance(event_dict["error"], BaseException):
        event_dict["error"] = serialize_error(event_dict["error"])
    if "exception" in event_dict and isinstance(event_dict["exception"], BaseException):
        event_dict["exception"] = serialize_error(event_dict["exception"])
    return event_dict


# Configure structlog
shared_processors = [
    structlog.contextvars.merge_contextvars,
    structlog.stdlib.add_log_level,
    add_timestamp,
    add_service_context,
    add_trace_context,
    serialize_exceptions,
    structlog.processors.StackInfoRenderer(),
    structlog.processors.UnicodeDecoder(),
]

if IS_DEVELOPMENT:
    # Pretty printing for development
    processors = shared_processors + [
        structlog.dev.ConsoleRenderer(colors=True),
    ]
else:
    # JSON output for production
    processors = shared_processors + [
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ]

structlog.configure(
    processors=processors,
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, LOG_LEVEL, logging.INFO)
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

# Get the configured logger
logger = structlog.get_logger()


def get_request_logger(
    request_id: Optional[str] = None,
    user_id: Optional[str] = None,
    **extra: Any,
) -> structlog.BoundLogger:
    """
    Create a request-scoped logger with additional context.

    Args:
        request_id: Unique request identifier
        user_id: User identifier if authenticated
        **extra: Additional context to include in all logs

    Returns:
        A bound logger with the given context
    """
    context = {
        "request_id": request_id or str(uuid4()),
        **extra,
    }
    if user_id:
        context["user_id"] = user_id

    return logger.bind(**context)


@contextmanager
def log_context(**context: Any) -> Generator[None, None, None]:
    """
    Context manager to add temporary context to all logs.

    Usage:
        with log_context(order_id="123", customer="acme"):
            logger.info("Processing order")  # Includes order_id and customer
        logger.info("Done")  # Does not include order_id and customer
    """
    structlog.contextvars.bind_contextvars(**context)
    try:
        yield
    finally:
        structlog.contextvars.unbind_contextvars(*context.keys())


def timed(
    log: Optional[structlog.BoundLogger] = None,
    level: str = "info",
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to log function execution time.

    Usage:
        @timed()
        def slow_function():
            time.sleep(1)

        @timed(logger, level="debug")
        async def async_slow_function():
            await asyncio.sleep(1)
    """
    effective_log = log or logger

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> T:
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.perf_counter() - start) * 1000
                getattr(effective_log, level)(
                    f"{func.__name__} completed",
                    function=func.__name__,
                    duration_ms=round(duration_ms, 2),
                )
                return result
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                effective_log.error(
                    f"{func.__name__} failed",
                    function=func.__name__,
                    duration_ms=round(duration_ms, 2),
                    error=e,
                )
                raise

        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)  # type: ignore
                duration_ms = (time.perf_counter() - start) * 1000
                getattr(effective_log, level)(
                    f"{func.__name__} completed",
                    function=func.__name__,
                    duration_ms=round(duration_ms, 2),
                )
                return result
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                effective_log.error(
                    f"{func.__name__} failed",
                    function=func.__name__,
                    duration_ms=round(duration_ms, 2),
                    error=e,
                )
                raise

        import asyncio

        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper

    return decorator


def log_error(
    log: structlog.BoundLogger,
    error: BaseException,
    message: str,
    **context: Any,
) -> None:
    """
    Helper to log errors with consistent formatting.

    Usage:
        try:
            risky_operation()
        except Exception as e:
            log_error(logger, e, "Operation failed", operation="risky")
            raise
    """
    log.error(
        message,
        error=error,
        **context,
    )


# FastAPI middleware for request logging
def fastapi_logging_middleware():
    """
    FastAPI middleware for request logging.

    Usage:
        from fastapi import FastAPI
        from logger import fastapi_logging_middleware

        app = FastAPI()
        app.middleware("http")(fastapi_logging_middleware())
    """

    async def middleware(request: Any, call_next: Callable) -> Any:
        request_id = request.headers.get("x-request-id", str(uuid4()))
        user_id = getattr(request.state, "user_id", None)

        # Bind context for this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        if user_id:
            structlog.contextvars.bind_contextvars(user_id=user_id)

        start = time.perf_counter()
        logger.info("Request started")

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000

            log_level = (
                "error" if response.status_code >= 500 else "warn" if response.status_code >= 400 else "info"
            )
            getattr(logger, log_level)(
                "Request completed",
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
            )

            response.headers["x-request-id"] = request_id
            return response

        except Exception as e:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "Request failed",
                error=e,
                duration_ms=round(duration_ms, 2),
            )
            raise

    return middleware


# Flask request logging decorator
def flask_logging_middleware(app: Any) -> None:
    """
    Flask middleware for request logging.

    Usage:
        from flask import Flask
        from logger import flask_logging_middleware

        app = Flask(__name__)
        flask_logging_middleware(app)
    """
    from flask import g, request

    @app.before_request
    def before_request():
        g.request_id = request.headers.get("x-request-id", str(uuid4()))
        g.start_time = time.perf_counter()
        g.log = get_request_logger(
            request_id=g.request_id,
            method=request.method,
            path=request.path,
        )
        g.log.info("Request started")

    @app.after_request
    def after_request(response):
        duration_ms = (time.perf_counter() - g.start_time) * 1000
        log_level = (
            "error" if response.status_code >= 500 else "warn" if response.status_code >= 400 else "info"
        )
        getattr(g.log, log_level)(
            "Request completed",
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )
        response.headers["x-request-id"] = g.request_id
        return response
