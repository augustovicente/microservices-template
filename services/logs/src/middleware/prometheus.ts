import { NextFunction, Request, Response } from 'express';
import { collectDefaultMetrics, Counter, Registry } from 'prom-client';
collectDefaultMetrics();
const registry = new Registry();

// Define a counter metric to track successful requests per endpoint
const countPerEndpoint = new Counter({
    name: 'logs_app_count_per_endpoint',
    help: 'Number of successful requests per endpoint',
    labelNames: ['endpoint', 'method', 'status'],
});

registry.registerMetric(countPerEndpoint);

// Middleware to log requests
function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    res.on('error', () => {
        // Record error count per endpoint
        countPerEndpoint
            .labels(req.path, req.method, res.statusCode?.toString() || 'unknown')
            .inc();
    });

    // Capture response finish event to log request details and response time
    res.on('finish', () => {
        countPerEndpoint.labels(req.path, req.method, res.statusCode?.toString()).inc();
    });

    // Move to the next middleware
    next();
}

export { requestLoggerMiddleware, registry };
