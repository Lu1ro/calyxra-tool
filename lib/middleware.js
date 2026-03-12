// lib/middleware.js
// API middleware utilities — auth, rate limiting, error handling, input validation

import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// ─── In-memory rate limiter ───────────────────────────────────────────────
const rateLimitStore = new Map();

function cleanupRateLimits() {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
        if (now - entry.windowStart > 60000) {
            rateLimitStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimits, 300000);
}

/**
 * Rate limit by IP address
 * @param {string} ip - Client IP
 * @param {number} maxRequests - Max requests per window (default 60)
 * @param {number} windowMs - Window size in ms (default 60000 = 1 minute)
 * @returns {{ allowed: boolean, remaining: number, retryAfter?: number }}
 */
function checkRateLimit(ip, maxRequests = 60, windowMs = 60000) {
    const now = Date.now();
    const key = ip || 'unknown';

    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, windowStart: now });
        return { allowed: true, remaining: maxRequests - 1 };
    }

    const entry = rateLimitStore.get(key);

    if (now - entry.windowStart > windowMs) {
        // Reset window
        entry.count = 1;
        entry.windowStart = now;
        return { allowed: true, remaining: maxRequests - 1 };
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
        return { allowed: false, remaining: 0, retryAfter };
    }

    return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Get client IP from request
 */
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || 'unknown';
}

// ─── Middleware Wrappers ──────────────────────────────────────────────────

/**
 * Wrap API handler with authentication check
 * Injects `req.session` with the current user session
 */
export function withAuth(handler) {
    return async (req, res) => {
        try {
            const session = await getServerSession(req, res, authOptions);
            if (!session) {
                return res.status(401).json({ error: 'Unauthorized — please sign in' });
            }
            req.session = session;
            return handler(req, res);
        } catch (error) {
            console.error('[Middleware] Auth error:', error.message);
            return res.status(500).json({ error: 'Authentication error' });
        }
    };
}

/**
 * Wrap API handler with rate limiting
 * @param {Function} handler - Next.js API handler
 * @param {number} maxRequests - Max requests per minute (default 60)
 */
export function withRateLimit(handler, maxRequests = 60) {
    return async (req, res) => {
        const ip = getClientIp(req);
        const { allowed, remaining, retryAfter } = checkRateLimit(ip, maxRequests);

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);

        if (!allowed) {
            res.setHeader('Retry-After', retryAfter);
            return res.status(429).json({
                error: 'Too many requests — please slow down',
                retryAfter,
            });
        }

        return handler(req, res);
    };
}

/**
 * Wrap API handler with try/catch error handling
 * Catches unhandled errors and returns proper JSON responses
 */
export function withErrorHandler(handler) {
    return async (req, res) => {
        try {
            return await handler(req, res);
        } catch (error) {
            console.error(`[API Error] ${req.method} ${req.url}:`, error.message);
            console.error(error.stack);

            // Don't expose internal errors to client
            const statusCode = error.statusCode || 500;
            const message = statusCode === 500
                ? 'Internal server error'
                : error.message;

            return res.status(statusCode).json({ error: message });
        }
    };
}

/**
 * Validate required methods
 * @param {string[]} methods - Allowed HTTP methods (e.g., ['GET', 'POST'])
 */
export function withMethods(handler, methods = ['GET']) {
    return async (req, res) => {
        if (!methods.includes(req.method)) {
            res.setHeader('Allow', methods.join(', '));
            return res.status(405).json({ error: `Method ${req.method} not allowed` });
        }
        return handler(req, res);
    };
}

/**
 * Sanitize a string input — strips HTML tags and trims
 */
export function sanitize(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate an object against a simple schema
 * Schema format: { fieldName: { type: 'string', required: true, maxLength: 100 } }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInput(data, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];

        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} is required`);
            continue;
        }

        if (value !== undefined && value !== null && value !== '') {
            if (rules.type === 'string' && typeof value !== 'string') {
                errors.push(`${field} must be a string`);
            }
            if (rules.type === 'number' && typeof value !== 'number') {
                errors.push(`${field} must be a number`);
            }
            if (rules.type === 'email' && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errors.push(`${field} must be a valid email`);
            }
            if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
                errors.push(`${field} must be at most ${rules.maxLength} characters`);
            }
            if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
                errors.push(`${field} must be at least ${rules.minLength} characters`);
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Compose multiple middleware wrappers
 * Usage: compose(withAuth, withRateLimit(30), withErrorHandler)(handler)
 */
export function compose(...middlewares) {
    return (handler) => {
        return middlewares.reduceRight((acc, middleware) => {
            // If middleware is a function that takes a handler, apply it
            return typeof middleware === 'function' ? middleware(acc) : acc;
        }, handler);
    };
}
