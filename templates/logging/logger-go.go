// Package logger provides structured JSON logging for Go applications.
//
// Features:
// - JSON structured output for production
// - Pretty-printed output for development
// - Automatic trace/span ID correlation
// - Request ID tracking
// - Context-aware logging
//
// Usage:
//
//	import "yourproject/logger"
//
//	log := logger.New()
//	log.Info("User logged in", "user_id", "123")
//	log.Error("Database error", "error", err, "query", "SELECT...")
//
//	// Request-scoped logging
//	reqLog := log.WithRequestID(requestID)
//	reqLog.Info("Processing request")
//
// Environment Variables:
//
//	LOG_LEVEL - Logging level (default: info)
//	ENVIRONMENT - Environment (development enables pretty printing)
//	SERVICE_NAME - Service name for logs (default: app)
//
// Installation:
//
//	go get log/slog
package logger

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"os"
	"runtime"
	"time"

	"go.opentelemetry.io/otel/trace"
)

// Level constants for convenience
const (
	LevelDebug = slog.LevelDebug
	LevelInfo  = slog.LevelInfo
	LevelWarn  = slog.LevelWarn
	LevelError = slog.LevelError
)

// Logger wraps slog.Logger with additional functionality
type Logger struct {
	*slog.Logger
	serviceName string
	environment string
}

// Config holds logger configuration
type Config struct {
	Level       slog.Level
	ServiceName string
	Environment string
	Output      io.Writer
	AddSource   bool
}

// DefaultConfig returns the default configuration from environment variables
func DefaultConfig() Config {
	level := slog.LevelInfo
	if l := os.Getenv("LOG_LEVEL"); l != "" {
		switch l {
		case "debug", "DEBUG":
			level = slog.LevelDebug
		case "warn", "WARN":
			level = slog.LevelWarn
		case "error", "ERROR":
			level = slog.LevelError
		}
	}

	return Config{
		Level:       level,
		ServiceName: getEnv("SERVICE_NAME", getEnv("OTEL_SERVICE_NAME", "app")),
		Environment: getEnv("ENVIRONMENT", "development"),
		Output:      os.Stdout,
		AddSource:   false,
	}
}

// New creates a new logger with the default configuration
func New() *Logger {
	return NewWithConfig(DefaultConfig())
}

// NewWithConfig creates a new logger with custom configuration
func NewWithConfig(cfg Config) *Logger {
	opts := &slog.HandlerOptions{
		Level:     cfg.Level,
		AddSource: cfg.AddSource,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			// Rename time to timestamp
			if a.Key == slog.TimeKey {
				a.Key = "timestamp"
				a.Value = slog.StringValue(a.Value.Time().Format(time.RFC3339Nano))
			}
			// Rename msg to message
			if a.Key == slog.MessageKey {
				a.Key = "message"
			}
			return a
		},
	}

	var handler slog.Handler
	if cfg.Environment == "development" {
		// Use text handler for development (more readable)
		handler = slog.NewTextHandler(cfg.Output, opts)
	} else {
		// Use JSON handler for production
		handler = slog.NewJSONHandler(cfg.Output, opts)
	}

	// Wrap handler to add service context
	handler = &contextHandler{
		Handler:     handler,
		serviceName: cfg.ServiceName,
		environment: cfg.Environment,
	}

	return &Logger{
		Logger:      slog.New(handler),
		serviceName: cfg.ServiceName,
		environment: cfg.Environment,
	}
}

// contextHandler wraps a handler to add trace context and service info
type contextHandler struct {
	slog.Handler
	serviceName string
	environment string
}

func (h *contextHandler) Handle(ctx context.Context, r slog.Record) error {
	// Add service context
	r.AddAttrs(
		slog.String("service", h.serviceName),
		slog.String("environment", h.environment),
	)

	// Add trace context if available
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		r.AddAttrs(
			slog.String("trace_id", span.SpanContext().TraceID().String()),
			slog.String("span_id", span.SpanContext().SpanID().String()),
		)
	}

	return h.Handler.Handle(ctx, r)
}

// WithContext returns a logger that includes trace context from the given context
func (l *Logger) WithContext(ctx context.Context) *Logger {
	span := trace.SpanFromContext(ctx)
	if !span.SpanContext().IsValid() {
		return l
	}

	return &Logger{
		Logger: l.Logger.With(
			"trace_id", span.SpanContext().TraceID().String(),
			"span_id", span.SpanContext().SpanID().String(),
		),
		serviceName: l.serviceName,
		environment: l.environment,
	}
}

// WithRequestID returns a logger with a request ID
func (l *Logger) WithRequestID(requestID string) *Logger {
	return &Logger{
		Logger:      l.Logger.With("request_id", requestID),
		serviceName: l.serviceName,
		environment: l.environment,
	}
}

// WithUserID returns a logger with a user ID
func (l *Logger) WithUserID(userID string) *Logger {
	return &Logger{
		Logger:      l.Logger.With("user_id", userID),
		serviceName: l.serviceName,
		environment: l.environment,
	}
}

// With returns a logger with additional attributes
func (l *Logger) With(args ...any) *Logger {
	return &Logger{
		Logger:      l.Logger.With(args...),
		serviceName: l.serviceName,
		environment: l.environment,
	}
}

// Error logs an error with additional context
func (l *Logger) Error(msg string, args ...any) {
	l.Logger.Error(msg, args...)
}

// ErrorContext logs an error with context and additional attributes
func (l *Logger) ErrorContext(ctx context.Context, msg string, args ...any) {
	l.WithContext(ctx).Logger.ErrorContext(ctx, msg, args...)
}

// LogError is a helper to log errors with consistent formatting
func (l *Logger) LogError(ctx context.Context, err error, msg string, args ...any) {
	args = append(args, "error", err.Error())
	if l.Logger.Enabled(ctx, LevelDebug) {
		// Include stack trace in debug mode
		buf := make([]byte, 4096)
		n := runtime.Stack(buf, false)
		args = append(args, "stack", string(buf[:n]))
	}
	l.ErrorContext(ctx, msg, args...)
}

// Timed logs the duration of an operation
//
// Usage:
//
//	defer log.Timed(ctx, "database_query")()
//
//	// Or with result logging
//	done := log.Timed(ctx, "api_call")
//	result, err := makeAPICall()
//	done("status", "success", "items", len(result))
func (l *Logger) Timed(ctx context.Context, operation string) func(args ...any) {
	start := time.Now()
	return func(args ...any) {
		duration := time.Since(start)
		finalArgs := append([]any{
			"operation", operation,
			"duration_ms", duration.Milliseconds(),
		}, args...)
		l.InfoContext(ctx, operation+" completed", finalArgs...)
	}
}

// HTTPMiddleware returns HTTP middleware for request logging
//
// Usage:
//
//	log := logger.New()
//	http.Handle("/", log.HTTPMiddleware(handler))
func (l *Logger) HTTPMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Get or generate request ID
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = generateID()
		}

		// Create request-scoped logger
		reqLog := l.WithRequestID(requestID).WithContext(r.Context())

		// Wrap response writer to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Set request ID header
		w.Header().Set("X-Request-ID", requestID)

		// Log request start
		reqLog.Info("Request started",
			"method", r.Method,
			"path", r.URL.Path,
			"remote_addr", r.RemoteAddr,
			"user_agent", r.UserAgent(),
		)

		// Handle request
		next.ServeHTTP(wrapped, r)

		// Log request completion
		duration := time.Since(start)
		level := LevelInfo
		if wrapped.statusCode >= 500 {
			level = LevelError
		} else if wrapped.statusCode >= 400 {
			level = LevelWarn
		}

		reqLog.Logger.Log(r.Context(), level, "Request completed",
			"status_code", wrapped.statusCode,
			"duration_ms", duration.Milliseconds(),
			"bytes_written", wrapped.bytesWritten,
		)
	})
}

// responseWriter wraps http.ResponseWriter to capture status code and bytes written
type responseWriter struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int
}

func (w *responseWriter) WriteHeader(statusCode int) {
	w.statusCode = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *responseWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	w.bytesWritten += n
	return n, err
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func generateID() string {
	// Simple ID generation - consider using UUID in production
	return time.Now().Format("20060102150405") + randomString(8)
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
