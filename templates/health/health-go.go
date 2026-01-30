// Package health provides Kubernetes-compatible health check endpoints for Go applications.
//
// Provides:
// - /health/live - Liveness probe (is the app alive?)
// - /health/ready - Readiness probe (is the app ready to serve traffic?)
// - /health/startup - Startup probe (has the app finished starting?)
//
// Features:
// - Dependency health checks (database, cache, external services)
// - Graceful degradation
// - Configurable timeouts
// - Detailed health information (optional)
//
// Usage:
//
//	h := health.New()
//
//	// Register checks
//	h.RegisterCheck("database", health.CheckFunc(func(ctx context.Context) health.Result {
//	    if err := db.Ping(ctx); err != nil {
//	        return health.Result{Status: health.Unhealthy, Message: err.Error()}
//	    }
//	    return health.Result{Status: health.Healthy}
//	}))
//
//	// Mount handlers
//	http.Handle("/health/", h.Handler())
//
//	// Mark as started after initialization
//	h.MarkStarted()
package health

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)

// Status represents the health status
type Status string

const (
	Healthy   Status = "healthy"
	Unhealthy Status = "unhealthy"
	Degraded  Status = "degraded"
)

// Result represents the result of a health check
type Result struct {
	Status    Status                 `json:"status"`
	Message   string                 `json:"message,omitempty"`
	LatencyMs int64                  `json:"latency_ms,omitempty"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// Response represents the overall health response
type Response struct {
	Status    Status             `json:"status"`
	Timestamp string             `json:"timestamp"`
	Version   string             `json:"version,omitempty"`
	Uptime    int64              `json:"uptime"`
	Checks    map[string]*Result `json:"checks,omitempty"`
}

// Checker is the interface for health checks
type Checker interface {
	Check(ctx context.Context) Result
}

// CheckFunc is a function adapter for Checker
type CheckFunc func(ctx context.Context) Result

func (f CheckFunc) Check(ctx context.Context) Result {
	return f(ctx)
}

// Config holds health check configuration
type Config struct {
	Version        string
	CheckTimeout   time.Duration
	IncludeDetails bool
}

// DefaultConfig returns the default configuration
func DefaultConfig() Config {
	timeout := 5 * time.Second
	if t := os.Getenv("HEALTH_CHECK_TIMEOUT"); t != "" {
		if ms, err := strconv.Atoi(t); err == nil {
			timeout = time.Duration(ms) * time.Millisecond
		}
	}

	includeDetails := true
	if d := os.Getenv("HEALTH_INCLUDE_DETAILS"); d == "false" {
		includeDetails = false
	}

	version := os.Getenv("SERVICE_VERSION")
	if version == "" {
		version = "0.0.0"
	}

	return Config{
		Version:        version,
		CheckTimeout:   timeout,
		IncludeDetails: includeDetails,
	}
}

// Health manages health checks
type Health struct {
	config    Config
	checks    map[string]Checker
	mu        sync.RWMutex
	isStarted bool
	startTime time.Time
}

// New creates a new Health instance with default config
func New() *Health {
	return NewWithConfig(DefaultConfig())
}

// NewWithConfig creates a new Health instance with custom config
func NewWithConfig(cfg Config) *Health {
	return &Health{
		config:    cfg,
		checks:    make(map[string]Checker),
		startTime: time.Now(),
	}
}

// RegisterCheck registers a health check
func (h *Health) RegisterCheck(name string, checker Checker) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.checks[name] = checker
}

// UnregisterCheck removes a health check
func (h *Health) UnregisterCheck(name string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.checks, name)
}

// MarkStarted marks the application as started
func (h *Health) MarkStarted() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.isStarted = true
}

// MarkNotStarted marks the application as not started
func (h *Health) MarkNotStarted() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.isStarted = false
}

// IsStarted returns whether the application is started
func (h *Health) IsStarted() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.isStarted
}

// runCheck runs a single check with timeout
func (h *Health) runCheck(ctx context.Context, name string, checker Checker) *Result {
	ctx, cancel := context.WithTimeout(ctx, h.config.CheckTimeout)
	defer cancel()

	start := time.Now()
	resultCh := make(chan Result, 1)

	go func() {
		resultCh <- checker.Check(ctx)
	}()

	select {
	case result := <-resultCh:
		if result.LatencyMs == 0 {
			result.LatencyMs = time.Since(start).Milliseconds()
		}
		return &result
	case <-ctx.Done():
		return &Result{
			Status:    Unhealthy,
			Message:   "Health check timeout",
			LatencyMs: time.Since(start).Milliseconds(),
		}
	}
}

// runAllChecks runs all registered checks
func (h *Health) runAllChecks(ctx context.Context) map[string]*Result {
	h.mu.RLock()
	checks := make(map[string]Checker, len(h.checks))
	for k, v := range h.checks {
		checks[k] = v
	}
	h.mu.RUnlock()

	results := make(map[string]*Result, len(checks))
	var wg sync.WaitGroup
	var resultMu sync.Mutex

	for name, checker := range checks {
		wg.Add(1)
		go func(name string, checker Checker) {
			defer wg.Done()
			result := h.runCheck(ctx, name, checker)
			resultMu.Lock()
			results[name] = result
			resultMu.Unlock()
		}(name, checker)
	}

	wg.Wait()
	return results
}

// getOverallStatus determines the overall status from results
func getOverallStatus(results map[string]*Result) Status {
	hasUnhealthy := false
	hasDegraded := false

	for _, result := range results {
		switch result.Status {
		case Unhealthy:
			hasUnhealthy = true
		case Degraded:
			hasDegraded = true
		}
	}

	if hasUnhealthy {
		return Unhealthy
	}
	if hasDegraded {
		return Degraded
	}
	return Healthy
}

// createResponse creates a health response
func (h *Health) createResponse(status Status, checks map[string]*Result) Response {
	resp := Response{
		Status:    status,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   h.config.Version,
		Uptime:    int64(time.Since(h.startTime).Seconds()),
	}

	if h.config.IncludeDetails && len(checks) > 0 {
		resp.Checks = checks
	}

	return resp
}

// writeResponse writes a JSON response
func writeResponse(w http.ResponseWriter, status int, resp Response) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

// Handler returns an http.Handler for health endpoints
func (h *Health) Handler() http.Handler {
	mux := http.NewServeMux()

	// Liveness probe
	mux.HandleFunc("/health/live", func(w http.ResponseWriter, r *http.Request) {
		resp := h.createResponse(Healthy, nil)
		writeResponse(w, http.StatusOK, resp)
	})

	// Readiness probe
	mux.HandleFunc("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		results := h.runAllChecks(r.Context())
		status := getOverallStatus(results)
		resp := h.createResponse(status, results)

		httpStatus := http.StatusOK
		if status == Unhealthy {
			httpStatus = http.StatusServiceUnavailable
		}
		writeResponse(w, httpStatus, resp)
	})

	// Startup probe
	mux.HandleFunc("/health/startup", func(w http.ResponseWriter, r *http.Request) {
		if h.IsStarted() {
			resp := h.createResponse(Healthy, nil)
			writeResponse(w, http.StatusOK, resp)
			return
		}

		resp := h.createResponse(Unhealthy, map[string]*Result{
			"startup": {
				Status:  Unhealthy,
				Message: "Application is still starting",
			},
		})
		writeResponse(w, http.StatusServiceUnavailable, resp)
	})

	// Combined health endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if !h.IsStarted() {
			resp := h.createResponse(Unhealthy, map[string]*Result{
				"startup": {Status: Unhealthy, Message: "Starting"},
			})
			writeResponse(w, http.StatusServiceUnavailable, resp)
			return
		}

		results := h.runAllChecks(r.Context())
		status := getOverallStatus(results)
		resp := h.createResponse(status, results)

		httpStatus := http.StatusOK
		if status == Unhealthy {
			httpStatus = http.StatusServiceUnavailable
		}
		writeResponse(w, httpStatus, resp)
	})

	return mux
}

// Common health check implementations

// DatabaseChecker creates a database health check
func DatabaseChecker(pingFn func(ctx context.Context) error) Checker {
	return CheckFunc(func(ctx context.Context) Result {
		start := time.Now()
		if err := pingFn(ctx); err != nil {
			return Result{
				Status:    Unhealthy,
				Message:   err.Error(),
				LatencyMs: time.Since(start).Milliseconds(),
			}
		}
		return Result{
			Status:    Healthy,
			LatencyMs: time.Since(start).Milliseconds(),
		}
	})
}

// CacheChecker creates a Redis/cache health check
func CacheChecker(pingFn func(ctx context.Context) (string, error)) Checker {
	return CheckFunc(func(ctx context.Context) Result {
		start := time.Now()
		result, err := pingFn(ctx)
		if err != nil {
			return Result{
				Status:    Unhealthy,
				Message:   err.Error(),
				LatencyMs: time.Since(start).Milliseconds(),
			}
		}

		status := Healthy
		if result != "PONG" {
			status = Degraded
		}
		return Result{
			Status:    status,
			LatencyMs: time.Since(start).Milliseconds(),
		}
	})
}

// HTTPChecker creates an HTTP endpoint health check
func HTTPChecker(url string, client *http.Client) Checker {
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}

	return CheckFunc(func(ctx context.Context) Result {
		start := time.Now()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return Result{
				Status:    Unhealthy,
				Message:   err.Error(),
				LatencyMs: time.Since(start).Milliseconds(),
			}
		}

		resp, err := client.Do(req)
		if err != nil {
			return Result{
				Status:    Unhealthy,
				Message:   err.Error(),
				LatencyMs: time.Since(start).Milliseconds(),
			}
		}
		defer resp.Body.Close()

		status := Healthy
		if resp.StatusCode >= 400 {
			status = Degraded
		}
		if resp.StatusCode >= 500 {
			status = Unhealthy
		}

		return Result{
			Status:    status,
			LatencyMs: time.Since(start).Milliseconds(),
			Details: map[string]interface{}{
				"status_code": resp.StatusCode,
			},
		}
	})
}

// MemoryChecker creates a memory usage health check
func MemoryChecker(thresholdPercent float64) Checker {
	return CheckFunc(func(ctx context.Context) Result {
		// Note: This is a simplified version. For production,
		// use runtime.MemStats or a proper memory monitoring package
		var m runtime.MemStats
		runtime.ReadMemStats(&m)

		// Approximate heap usage percentage
		heapPercent := float64(m.HeapAlloc) / float64(m.HeapSys) * 100

		status := Healthy
		if heapPercent >= thresholdPercent {
			status = Degraded
		}

		return Result{
			Status: status,
			Details: map[string]interface{}{
				"heap_alloc_mb": m.HeapAlloc / 1024 / 1024,
				"heap_sys_mb":   m.HeapSys / 1024 / 1024,
				"heap_percent":  int(heapPercent),
			},
		}
	})
}

// Need to import runtime for MemoryChecker
import "runtime"
