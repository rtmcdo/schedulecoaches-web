import { HttpRequest } from '@azure/functions';

/**
 * CORS middleware for schedulecoaches API
 *
 * Allows requests from:
 * - localhost:5173 (Vite dev server)
 * - schedulecoaches.com (production)
 * - Azure Static Web Apps preview URLs
 */

// Base CORS headers (without Access-Control-Allow-Origin)
// The origin header is added dynamically by getCorsHeaders() based on allow-list
const baseCorsHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, stripe-signature',
    'Access-Control-Max-Age': '86400' // 24 hours
};

/**
 * Get allowed origins from environment or use defaults
 */
function getAllowedOrigins(): string[] {
    const envOrigins = process.env.ALLOWED_ORIGINS || '';

    if (envOrigins) {
        return envOrigins.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);
    }

    // Default allowed origins
    return [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://schedulecoaches.com',
        'https://www.schedulecoaches.com',
        'https://*.azurestaticapps.net' // Allow all Azure Static Web Apps preview URLs
    ];
}

/**
 * Check if request origin is allowed
 */
export function isAllowedOrigin(request: HttpRequest): boolean {
    const origin = request.headers.get('origin');

    if (!origin) return true; // No origin header (same-origin or non-browser request)

    const allowedOrigins = getAllowedOrigins();

    // Check exact match or wildcard pattern
    return allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
            // Convert wildcard to regex pattern
            const pattern = allowed.replace(/\./g, '\\.').replace(/\*/g, '.*');
            return new RegExp(`^${pattern}$`).test(origin);
        }
        return allowed === origin;
    });
}

/**
 * Get CORS headers for response
 * If origin is allowed, return it specifically
 * If origin is NOT allowed, do NOT include Access-Control-Allow-Origin header
 */
export function getCorsHeaders(request: HttpRequest): Record<string, string> {
    const origin = request.headers.get('origin');

    if (origin && isAllowedOrigin(request)) {
        return {
            ...baseCorsHeaders,
            'Access-Control-Allow-Origin': origin
        };
    }

    // For requests without origin header (same-origin or non-browser)
    // or disallowed origins, return base headers without Access-Control-Allow-Origin
    return baseCorsHeaders;
}

/**
 * Handle OPTIONS preflight request
 */
export function handlePreflightRequest(request: HttpRequest) {
    return {
        status: 204,
        headers: getCorsHeaders(request)
    };
}
