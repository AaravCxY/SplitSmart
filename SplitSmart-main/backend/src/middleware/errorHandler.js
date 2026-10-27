/**
 * Centralized API Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format for resource: ${err.path}`;
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account or record with this ${field} already exists.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
  }

  // Log server errors for backend inspection
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[Unhandled Server Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {})
  });
}

// 404 Not Found route handler
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
