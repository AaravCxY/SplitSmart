const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_splitsmart_2026_production_grade';

/**
 * Generates a signed JWT token for the user
 */
function generateToken(userId) {
  return jwt.sign({ id: String(userId) }, JWT_SECRET, {
    expiresIn: '7d'
  });
}

/**
 * Cookie options tailored for development vs production
 */
function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

/**
 * Sets auth cookie on express response
 */
function setAuthCookie(res, token) {
  res.cookie('token', token, getCookieOptions());
}

/**
 * Clears auth cookie on logout
 */
function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  });
}

/**
 * Authentication middleware to verify JWT
 */
async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.token;

    // Also support Authorization header for flexibility
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account associated with token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.'
    });
  }
}

module.exports = {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  authenticate,
  getCookieOptions
};
