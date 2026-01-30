"""
OpenTelemetry Python Initialization

Provides distributed tracing, metrics, and logging for Python applications.
Must be imported FIRST, before any other imports.

Usage:
    # At the very top of your entry file (e.g., main.py)
    import otel  # noqa: F401 - side effects only

Environment Variables:
    OTEL_SERVICE_NAME - Name of your service (required)
    OTEL_EXPORTER_OTLP_ENDPOINT - OTLP endpoint (default: http://localhost:4318)
    OTEL_EXPORTER_OTLP_HEADERS - Headers for OTLP endpoint (optional, JSON format)
    OTEL_LOG_LEVEL - Logging level (default: INFO)
    ENVIRONMENT - Environment name (default: development)

Installation:
    pip install opentelemetry-sdk opentelemetry-exporter-otlp \
        opentelemetry-instrumentation opentelemetry-instrumentation-requests \
        opentelemetry-instrumentation-urllib3 opentelemetry-instrumentation-fastapi \
        opentelemetry-instrumentation-flask opentelemetry-instrumentation-sqlalchemy
"""

import atexit
import json
import logging
import os
from contextlib import contextmanager
from functools import wraps
from typing import Any, Callable, Dict, Generator, Optional, TypeVar

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.urllib3 import URLLib3Instrumentor
from opentelemetry.metrics import Counter, Histogram, Meter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.trace import Span, SpanKind, Status, StatusCode, Tracer

# Configure logging
log_level = os.getenv("OTEL_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level, logging.INFO))
logger = logging.getLogger(__name__)

# Service metadata
SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "unknown-service")
SERVICE_VERSION = os.getenv("SERVICE_VERSION", "0.0.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# OTLP endpoint configuration
OTLP_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
OTLP_HEADERS = json.loads(os.getenv("OTEL_EXPORTER_OTLP_HEADERS", "{}"))

# Create resource with service information
resource = Resource.create(
    {
        ResourceAttributes.SERVICE_NAME: SERVICE_NAME,
        ResourceAttributes.SERVICE_VERSION: SERVICE_VERSION,
        ResourceAttributes.DEPLOYMENT_ENVIRONMENT: ENVIRONMENT,
    }
)

# Configure trace provider
trace_exporter = OTLPSpanExporter(
    endpoint=f"{OTLP_ENDPOINT}/v1/traces",
    headers=OTLP_HEADERS,
)

tracer_provider = TracerProvider(resource=resource)
tracer_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
trace.set_tracer_provider(tracer_provider)

# Configure metrics provider
metric_exporter = OTLPMetricExporter(
    endpoint=f"{OTLP_ENDPOINT}/v1/metrics",
    headers=OTLP_HEADERS,
)

metric_reader = PeriodicExportingMetricReader(
    exporter=metric_exporter,
    export_interval_millis=60000,  # Export metrics every 60 seconds
)

meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)

# Auto-instrument common libraries
try:
    RequestsInstrumentor().instrument()
except Exception as e:
    logger.debug(f"Failed to instrument requests: {e}")

try:
    URLLib3Instrumentor().instrument()
except Exception as e:
    logger.debug(f"Failed to instrument urllib3: {e}")

# Get tracer and meter instances
tracer: Tracer = trace.get_tracer(SERVICE_NAME, SERVICE_VERSION)
meter: Meter = metrics.get_meter(SERVICE_NAME, SERVICE_VERSION)


def shutdown():
    """Gracefully shutdown OpenTelemetry providers."""
    try:
        tracer_provider.shutdown()
        meter_provider.shutdown()
        logger.info("OpenTelemetry SDK shut down successfully")
    except Exception as e:
        logger.error(f"Error shutting down OpenTelemetry SDK: {e}")


atexit.register(shutdown)

# Type variable for generic function return types
T = TypeVar("T")


@contextmanager
def span(
    name: str,
    attributes: Optional[Dict[str, Any]] = None,
    kind: SpanKind = SpanKind.INTERNAL,
) -> Generator[Span, None, None]:
    """
    Context manager for creating a custom span.

    Example:
        with span("process_order", {"order.id": order_id}) as s:
            s.add_event("order_validated")
            process_order(order_id)
    """
    with tracer.start_as_current_span(name, kind=kind) as s:
        try:
            if attributes:
                s.set_attributes(attributes)
            yield s
            s.set_status(Status(StatusCode.OK))
        except Exception as e:
            s.set_status(Status(StatusCode.ERROR, str(e)))
            s.record_exception(e)
            raise


def traced(
    name: Optional[str] = None,
    attributes: Optional[Dict[str, Any]] = None,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator for automatically tracing a function.

    Example:
        @traced("process_payment")
        def process_payment(order_id: str, amount: float):
            ...

        @traced()  # Uses function name as span name
        async def fetch_user(user_id: str):
            ...
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        span_name = name or func.__name__

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> T:
            with span(span_name, attributes):
                return func(*args, **kwargs)

        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            with span(span_name, attributes):
                return await func(*args, **kwargs)  # type: ignore

        import asyncio

        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper

    return decorator


def create_counter(name: str, description: str, unit: str = "1") -> Counter:
    """
    Create a counter metric.

    Example:
        order_counter = create_counter("orders.created", "Number of orders created")
        order_counter.add(1, {"region": "us-east"})
    """
    return meter.create_counter(name, description=description, unit=unit)


def create_histogram(name: str, description: str, unit: str = "ms") -> Histogram:
    """
    Create a histogram metric.

    Example:
        latency_histogram = create_histogram(
            "http.request.duration",
            "HTTP request duration",
            unit="ms"
        )
        latency_histogram.record(150, {"endpoint": "/api/users"})
    """
    return meter.create_histogram(name, description=description, unit=unit)


def get_trace_context() -> Optional[Dict[str, str]]:
    """
    Get current trace context for logging correlation.

    Example:
        ctx = get_trace_context()
        if ctx:
            logger.info("Processing request", extra=ctx)
    """
    current_span = trace.get_current_span()
    if not current_span or not current_span.is_recording():
        return None

    context = current_span.get_span_context()
    return {
        "trace_id": format(context.trace_id, "032x"),
        "span_id": format(context.span_id, "016x"),
    }


def instrument_fastapi(app: Any) -> None:
    """
    Instrument a FastAPI application.

    Example:
        from fastapi import FastAPI
        app = FastAPI()
        instrument_fastapi(app)
    """
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        FastAPIInstrumentor.instrument_app(
            app,
            excluded_urls="health,ready,live,metrics",
        )
    except ImportError:
        logger.warning("FastAPI instrumentation not available. Install opentelemetry-instrumentation-fastapi")


def instrument_flask(app: Any) -> None:
    """
    Instrument a Flask application.

    Example:
        from flask import Flask
        app = Flask(__name__)
        instrument_flask(app)
    """
    try:
        from opentelemetry.instrumentation.flask import FlaskInstrumentor

        FlaskInstrumentor().instrument_app(
            app,
            excluded_urls="health,ready,live,metrics",
        )
    except ImportError:
        logger.warning("Flask instrumentation not available. Install opentelemetry-instrumentation-flask")


def instrument_sqlalchemy(engine: Any) -> None:
    """
    Instrument a SQLAlchemy engine.

    Example:
        from sqlalchemy import create_engine
        engine = create_engine("postgresql://...")
        instrument_sqlalchemy(engine)
    """
    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

        SQLAlchemyInstrumentor().instrument(engine=engine)
    except ImportError:
        logger.warning("SQLAlchemy instrumentation not available. Install opentelemetry-instrumentation-sqlalchemy")
