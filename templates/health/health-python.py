"""
Health Check Endpoints for Python

Provides Kubernetes-compatible health check endpoints:
- /health/live - Liveness probe (is the app alive?)
- /health/ready - Readiness probe (is the app ready to serve traffic?)
- /health/startup - Startup probe (has the app finished starting?)

Features:
- Dependency health checks (database, cache, external services)
- Graceful degradation
- Configurable timeouts
- Detailed health information (optional)

Usage with FastAPI:
    from health import health_router, register_check, mark_started

    app = FastAPI()
    app.include_router(health_router)

    # Register custom checks
    @register_check("database")
    async def database_check():
        await db.execute("SELECT 1")
        return HealthCheckResult(status="healthy")

    # Mark as started after initialization
    mark_started()

Usage with Flask:
    from health import create_flask_blueprint, register_check, mark_started

    app = Flask(__name__)
    app.register_blueprint(create_flask_blueprint())
"""

import asyncio
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from functools import wraps
from typing import Any, Awaitable, Callable, Dict, Optional, Union

# Configuration
CHECK_TIMEOUT = int(os.getenv("HEALTH_CHECK_TIMEOUT", "5000")) / 1000  # Convert to seconds
INCLUDE_DETAILS = os.getenv("HEALTH_INCLUDE_DETAILS", "true").lower() == "true"
SERVICE_VERSION = os.getenv("SERVICE_VERSION", os.getenv("npm_package_version", "0.0.0"))


class HealthStatus(str, Enum):
    """Health status enumeration."""

    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


@dataclass
class HealthCheckResult:
    """Result of a single health check."""

    status: HealthStatus
    message: Optional[str] = None
    latency_ms: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


@dataclass
class HealthResponse:
    """Overall health response."""

    status: HealthStatus
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    version: str = SERVICE_VERSION
    uptime: int = 0
    checks: Optional[Dict[str, HealthCheckResult]] = None


# Global state
_is_started = False
_start_time = time.time()
_checks: Dict[str, Callable[[], Awaitable[HealthCheckResult]]] = {}


def register_check(
    name: str,
) -> Callable[[Callable[[], Awaitable[HealthCheckResult]]], Callable[[], Awaitable[HealthCheckResult]]]:
    """
    Decorator to register a health check function.

    Usage:
        @register_check("database")
        async def database_check():
            await db.execute("SELECT 1")
            return HealthCheckResult(status=HealthStatus.HEALTHY)
    """

    def decorator(
        func: Callable[[], Awaitable[HealthCheckResult]],
    ) -> Callable[[], Awaitable[HealthCheckResult]]:
        _checks[name] = func
        return func

    return decorator


def register_check_fn(name: str, check: Callable[[], Awaitable[HealthCheckResult]]) -> None:
    """Register a health check function directly."""
    _checks[name] = check


def unregister_check(name: str) -> None:
    """Unregister a health check."""
    _checks.pop(name, None)


def mark_started() -> None:
    """Mark the application as started."""
    global _is_started
    _is_started = True


def mark_not_started() -> None:
    """Mark the application as not started (for graceful shutdown)."""
    global _is_started
    _is_started = False


def is_started() -> bool:
    """Check if the application is started."""
    return _is_started


async def run_check(name: str, check: Callable[[], Awaitable[HealthCheckResult]]) -> HealthCheckResult:
    """Run a health check with timeout."""
    start = time.time()
    try:
        result = await asyncio.wait_for(check(), timeout=CHECK_TIMEOUT)
        if result.latency_ms is None:
            result.latency_ms = (time.time() - start) * 1000
        return result
    except asyncio.TimeoutError:
        return HealthCheckResult(
            status=HealthStatus.UNHEALTHY,
            message="Health check timeout",
            latency_ms=(time.time() - start) * 1000,
        )
    except Exception as e:
        return HealthCheckResult(
            status=HealthStatus.UNHEALTHY,
            message=str(e),
            latency_ms=(time.time() - start) * 1000,
        )


async def run_all_checks() -> Dict[str, HealthCheckResult]:
    """Run all registered health checks."""
    results = {}
    tasks = {name: run_check(name, check) for name, check in _checks.items()}

    for name, task in tasks.items():
        results[name] = await task

    return results


def get_overall_status(results: Dict[str, HealthCheckResult]) -> HealthStatus:
    """Determine overall status from check results."""
    statuses = [r.status for r in results.values()]

    if HealthStatus.UNHEALTHY in statuses:
        return HealthStatus.UNHEALTHY
    if HealthStatus.DEGRADED in statuses:
        return HealthStatus.DEGRADED
    return HealthStatus.HEALTHY


def create_response(
    status: HealthStatus,
    checks: Optional[Dict[str, HealthCheckResult]] = None,
) -> Dict[str, Any]:
    """Create health response dictionary."""
    response = {
        "status": status.value,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": SERVICE_VERSION,
        "uptime": int(time.time() - _start_time),
    }

    if INCLUDE_DETAILS and checks:
        response["checks"] = {
            name: {
                "status": result.status.value,
                "message": result.message,
                "latency_ms": result.latency_ms,
                "details": result.details,
            }
            for name, result in checks.items()
        }

    return response


# FastAPI router
try:
    from fastapi import APIRouter, Response

    health_router = APIRouter(prefix="/health", tags=["health"])

    @health_router.get("/live")
    async def liveness():
        """Liveness probe - Is the application alive?"""
        return create_response(HealthStatus.HEALTHY)

    @health_router.get("/ready")
    async def readiness(response: Response):
        """Readiness probe - Is the application ready to serve traffic?"""
        results = await run_all_checks()
        status = get_overall_status(results)

        if status == HealthStatus.UNHEALTHY:
            response.status_code = 503

        return create_response(status, results)

    @health_router.get("/startup")
    async def startup(response: Response):
        """Startup probe - Has the application finished starting?"""
        if _is_started:
            return create_response(HealthStatus.HEALTHY)

        response.status_code = 503
        return create_response(
            HealthStatus.UNHEALTHY,
            {"startup": HealthCheckResult(status=HealthStatus.UNHEALTHY, message="Application is still starting")},
        )

    @health_router.get("")
    async def health(response: Response):
        """Combined health endpoint."""
        if not _is_started:
            response.status_code = 503
            return create_response(
                HealthStatus.UNHEALTHY,
                {"startup": HealthCheckResult(status=HealthStatus.UNHEALTHY, message="Starting")},
            )

        results = await run_all_checks()
        status = get_overall_status(results)

        if status == HealthStatus.UNHEALTHY:
            response.status_code = 503

        return create_response(status, results)

except ImportError:
    health_router = None


# Flask blueprint
def create_flask_blueprint():
    """Create Flask blueprint for health endpoints."""
    from flask import Blueprint, jsonify

    bp = Blueprint("health", __name__, url_prefix="/health")

    @bp.route("/live")
    def liveness():
        return jsonify(create_response(HealthStatus.HEALTHY))

    @bp.route("/ready")
    def readiness():
        # Run async checks in sync context
        loop = asyncio.new_event_loop()
        results = loop.run_until_complete(run_all_checks())
        loop.close()

        status = get_overall_status(results)
        response = jsonify(create_response(status, results))

        if status == HealthStatus.UNHEALTHY:
            response.status_code = 503

        return response

    @bp.route("/startup")
    def startup():
        if _is_started:
            return jsonify(create_response(HealthStatus.HEALTHY))

        response = jsonify(
            create_response(
                HealthStatus.UNHEALTHY,
                {"startup": HealthCheckResult(status=HealthStatus.UNHEALTHY, message="Starting")},
            )
        )
        response.status_code = 503
        return response

    @bp.route("")
    def health():
        if not _is_started:
            response = jsonify(
                create_response(
                    HealthStatus.UNHEALTHY,
                    {"startup": HealthCheckResult(status=HealthStatus.UNHEALTHY, message="Starting")},
                )
            )
            response.status_code = 503
            return response

        loop = asyncio.new_event_loop()
        results = loop.run_until_complete(run_all_checks())
        loop.close()

        status = get_overall_status(results)
        response = jsonify(create_response(status, results))

        if status == HealthStatus.UNHEALTHY:
            response.status_code = 503

        return response

    return bp


# Common health check implementations


def create_database_check(
    query_fn: Callable[[], Awaitable[Any]],
) -> Callable[[], Awaitable[HealthCheckResult]]:
    """
    Create a database health check.

    Usage:
        register_check_fn("database", create_database_check(
            lambda: db.execute("SELECT 1")
        ))
    """

    async def check() -> HealthCheckResult:
        start = time.time()
        await query_fn()
        return HealthCheckResult(
            status=HealthStatus.HEALTHY,
            latency_ms=(time.time() - start) * 1000,
        )

    return check


def create_cache_check(
    ping_fn: Callable[[], Awaitable[str]],
) -> Callable[[], Awaitable[HealthCheckResult]]:
    """
    Create a Redis/cache health check.

    Usage:
        register_check_fn("cache", create_cache_check(
            lambda: redis.ping()
        ))
    """

    async def check() -> HealthCheckResult:
        start = time.time()
        result = await ping_fn()
        return HealthCheckResult(
            status=HealthStatus.HEALTHY if result == "PONG" else HealthStatus.DEGRADED,
            latency_ms=(time.time() - start) * 1000,
        )

    return check


def create_external_service_check(url: str) -> Callable[[], Awaitable[HealthCheckResult]]:
    """
    Create an external service health check.

    Usage:
        register_check_fn("payment-api", create_external_service_check(
            "https://api.payment.com/health"
        ))
    """
    import aiohttp

    async def check() -> HealthCheckResult:
        start = time.time()
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=CHECK_TIMEOUT)) as resp:
                return HealthCheckResult(
                    status=HealthStatus.HEALTHY if resp.ok else HealthStatus.DEGRADED,
                    latency_ms=(time.time() - start) * 1000,
                    details={"status_code": resp.status},
                )

    return check


def create_memory_check(threshold_percent: float = 90.0) -> Callable[[], Awaitable[HealthCheckResult]]:
    """
    Create a memory usage health check.

    Usage:
        register_check_fn("memory", create_memory_check(threshold_percent=85))
    """
    import psutil

    async def check() -> HealthCheckResult:
        memory = psutil.virtual_memory()
        return HealthCheckResult(
            status=HealthStatus.HEALTHY if memory.percent < threshold_percent else HealthStatus.DEGRADED,
            details={
                "used_mb": memory.used // (1024 * 1024),
                "total_mb": memory.total // (1024 * 1024),
                "percent": memory.percent,
            },
        )

    return check
