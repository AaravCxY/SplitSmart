const User = require('../models/User');
const Group = require('../models/Group');

/**
 * Get profile of logged-in user
 * GET /api/users/me
 */
async function getProfile(req, res, next) {
  try {
    const groupCount = await Group.countDocuments({ members: req.user._id });
    const userSafe = req.user.toJSON();
    return res.status(200).json({
      success: true,
      user: {
        ...userSafe,
        groupCount
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update profile of logged-in user (name only)
 * PATCH /api/users/me
 */
async function updateProfile(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long.'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toJSON()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile
};
