const { memoryCache } = require('../utils/cache');

const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX) || 100;

function checkRateLimit(ip, limit = RATE_LIMIT_MAX_REQUESTS) {
    const now = Date.now();
    const key = `rate_${ip}`;
    let record = memoryCache.rateLimits.get(key);

    if (!record || (now - record.windowStart) > RATE_LIMIT_WINDOW) {
        record = { count: 1, windowStart: now };
        memoryCache.rateLimits.set(key, record);
        return { allowed: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
        return { allowed: false, remaining: 0, retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - record.windowStart)) / 1000) };
    }

    record.count++;
    return { allowed: true, remaining: limit - record.count };
}

setInterval(() => {
    memoryCache.rateLimits.forEach((value, key) => {
        if (Date.now() - value.windowStart > RATE_LIMIT_WINDOW * 2) {
            memoryCache.rateLimits.delete(key);
        }
    });
}, 5 * 60 * 1000);

const rateLimitMiddleware = (limit = RATE_LIMIT_MAX_REQUESTS) => (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const result = checkRateLimit(ip, limit);

    res.set('X-RateLimit-Limit', limit);
    res.set('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
            error: 'Too many requests',
            retryAfter: result.retryAfter
        });
    }
    next();
};

module.exports = { rateLimitMiddleware, checkRateLimit };
