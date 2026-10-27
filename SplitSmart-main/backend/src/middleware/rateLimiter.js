const rateLimit = require('express-rate-limit');

// Rate limiter for authentication endpoints (prevent brute-force password guessing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  },
  skip: () => process.env.NODE_ENV === 'test' // bypass in test environment
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  },
  skip: () => process.env.NODE_ENV === 'test'
});

module.exports = {
  authLimiter,
  apiLimiter
};
