// Package otel provides OpenTelemetry initialization for Go applications.
//
// Provides distributed tracing, metrics, and logging for Go applications.
// Must be initialized at the very start of main().
//
// Usage:
//
//	func main() {
//	    ctx := context.Background()
//	    shutdown, err := otel.Init(ctx)
//	    if err != nil {
//	        log.Fatal(err)
//	    }
//	    defer shutdown(ctx)
//
//	    // Your application code
//	}
//
// Environment Variables:
//
//	OTEL_SERVICE_NAME - Name of your service (required)
//	OTEL_EXPORTER_OTLP_ENDPOINT - OTLP endpoint (default: http://localhost:4318)
//	OTEL_EXPORTER_OTLP_HEADERS - Headers for OTLP endpoint (optional, JSON format)
//	ENVIRONMENT - Environment name (default: development)
//
// Installation:
//
//	go get go.opentelemetry.io/otel \
//	    go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp \
//	    go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp \
//	    go.opentelemetry.io/otel/sdk/trace \
//	    go.opentelemetry.io/otel/sdk/metric \
//	    go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
package otel

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
	"go.opentelemetry.io/otel/trace"
)

var (
	tracer trace.Tracer
	meter  metric.Meter
)

// Config holds the OpenTelemetry configuration.
type Config struct {
	ServiceName    string
	ServiceVersion string
	Environment    string
	OTLPEndpoint   string
	OTLPHeaders    map[string]string
}

// DefaultConfig returns the default configuration from environment variables.
func DefaultConfig() Config {
	headers := make(map[string]string)
	if h := os.Getenv("OTEL_EXPORTER_OTLP_HEADERS"); h != "" {
		_ = json.Unmarshal([]byte(h), &headers)
	}

	return Config{
		ServiceName:    getEnv("OTEL_SERVICE_NAME", "unknown-service"),
		ServiceVersion: getEnv("SERVICE_VERSION", "0.0.0"),
		Environment:    getEnv("ENVIRONMENT", "development"),
		OTLPEndpoint:   getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
		OTLPHeaders:    headers,
	}
}

// Init initializes OpenTelemetry with the default configuration.
// Returns a shutdown function that should be called when the application exits.
func Init(ctx context.Context) (func(context.Context) error, error) {
	return InitWithConfig(ctx, DefaultConfig())
}

// InitWithConfig initializes OpenTelemetry with a custom configuration.
func InitWithConfig(ctx context.Context, cfg Config) (func(context.Context) error, error) {
	var shutdownFuncs []func(context.Context) error

	// Create resource
	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceVersion(cfg.ServiceVersion),
			semconv.DeploymentEnvironment(cfg.Environment),
		),
	)
	if err != nil {
		return nil, err
	}

	// Setup trace exporter
	traceExporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint(cfg.OTLPEndpoint),
		otlptracehttp.WithInsecure(), // Remove for production with TLS
		otlptracehttp.WithHeaders(cfg.OTLPHeaders),
	)
	if err != nil {
		return nil, err
	}

	// Setup trace provider
	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExporter,
			sdktrace.WithBatchTimeout(5*time.Second),
		),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()), // Adjust for production
	)
	shutdownFuncs = append(shutdownFuncs, tracerProvider.Shutdown)
	otel.SetTracerProvider(tracerProvider)

	// Setup metrics exporter
	metricExporter, err := otlpmetrichttp.New(ctx,
		otlpmetrichttp.WithEndpoint(cfg.OTLPEndpoint),
		otlpmetrichttp.WithInsecure(), // Remove for production with TLS
		otlpmetrichttp.WithHeaders(cfg.OTLPHeaders),
	)
	if err != nil {
		return nil, err
	}

	// Setup meter provider
	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		sdkmetric.WithReader(
			sdkmetric.NewPeriodicReader(metricExporter,
				sdkmetric.WithInterval(60*time.Second),
			),
		),
	)
	shutdownFuncs = append(shutdownFuncs, meterProvider.Shutdown)
	otel.SetMeterProvider(meterProvider)

	// Setup propagator
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Initialize tracer and meter
	tracer = tracerProvider.Tracer(cfg.ServiceName)
	meter = meterProvider.Meter(cfg.ServiceName)

	// Return shutdown function
	shutdown := func(ctx context.Context) error {
		var err error
		for _, fn := range shutdownFuncs {
			err = errors.Join(err, fn(ctx))
		}
		return err
	}

	return shutdown, nil
}

// Tracer returns the global tracer instance.
func Tracer() trace.Tracer {
	return tracer
}

// Meter returns the global meter instance.
func Meter() metric.Meter {
	return meter
}

// StartSpan starts a new span with the given name and options.
//
// Example:
//
//	ctx, span := otel.StartSpan(ctx, "processOrder",
//	    otel.WithAttributes("order.id", orderID),
//	)
//	defer span.End()
func StartSpan(ctx context.Context, name string, opts ...SpanOption) (context.Context, trace.Span) {
	options := &spanOptions{}
	for _, opt := range opts {
		opt(options)
	}

	ctx, span := tracer.Start(ctx, name, options.traceOpts...)

	if len(options.attributes) > 0 {
		span.SetAttributes(options.attributes...)
	}

	return ctx, span
}

// SpanOption is a function that configures span options.
type SpanOption func(*spanOptions)

type spanOptions struct {
	attributes []attribute.KeyValue
	traceOpts  []trace.SpanStartOption
}

// WithAttributes adds attributes to the span.
func WithAttributes(kvs ...attribute.KeyValue) SpanOption {
	return func(o *spanOptions) {
		o.attributes = append(o.attributes, kvs...)
	}
}

// WithSpanKind sets the span kind.
func WithSpanKind(kind trace.SpanKind) SpanOption {
	return func(o *spanOptions) {
		o.traceOpts = append(o.traceOpts, trace.WithSpanKind(kind))
	}
}

// RecordError records an error on the current span.
func RecordError(span trace.Span, err error) {
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
	}
}

// SetOK marks the span as successful.
func SetOK(span trace.Span) {
	span.SetStatus(codes.Ok, "")
}

// GetTraceContext returns the current trace context for logging correlation.
//
// Example:
//
//	traceID, spanID := otel.GetTraceContext(ctx)
//	log.Printf("trace_id=%s span_id=%s Processing request", traceID, spanID)
func GetTraceContext(ctx context.Context) (traceID, spanID string) {
	span := trace.SpanFromContext(ctx)
	if !span.SpanContext().IsValid() {
		return "", ""
	}
	return span.SpanContext().TraceID().String(), span.SpanContext().SpanID().String()
}

// NewCounter creates a new counter metric.
//
// Example:
//
//	orderCounter, _ := otel.NewCounter("orders.created", "Number of orders created")
//	orderCounter.Add(ctx, 1, metric.WithAttributes(attribute.String("region", "us-east")))
func NewCounter(name, description string) (metric.Int64Counter, error) {
	return meter.Int64Counter(name, metric.WithDescription(description))
}

// NewHistogram creates a new histogram metric.
//
// Example:
//
//	latency, _ := otel.NewHistogram("http.request.duration", "HTTP request duration in ms")
//	latency.Record(ctx, 150, metric.WithAttributes(attribute.String("endpoint", "/api/users")))
func NewHistogram(name, description string) (metric.Float64Histogram, error) {
	return meter.Float64Histogram(name, metric.WithDescription(description), metric.WithUnit("ms"))
}

// Helper function to get environment variable with default
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
