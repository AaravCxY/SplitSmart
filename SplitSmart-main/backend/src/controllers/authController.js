const User = require('../models/User');
const { generateToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password
    });

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: user.toJSON(),
      token // also return in JSON for non-cookie fallback clients
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log in an existing user
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: user.toJSON(),
      token
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log out user (clears cookie)
 * POST /api/auth/logout
 */
async function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user.toJSON()
  });
}

module.exports = {
  register,
  login,
  logout,
  getMe
};
