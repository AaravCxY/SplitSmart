const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

/**
 * Helper to verify user is a member of the group
 */
async function verifyGroupMembership(groupId, userId) {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    const error = new Error('Invalid group ID');
    error.statusCode = 400;
    throw error;
  }

  const group = await Group.findById(groupId).populate('members', 'name email').populate('creator', 'name email');
  if (!group) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }

  const isMember = group.members.some(
    (m) => String(m._id || m) === String(userId)
  );

  if (!isMember) {
    const error = new Error('Forbidden: You are not a member of this group');
    error.statusCode = 403;
    throw error;
  }

  return group;
}

/**
 * Create a new group
 * POST /api/groups
 */
async function createGroup(req, res, next) {
  try {
    const { name, description, type, currency, initialMemberEmails } = req.body;
    const currentUserId = req.user._id;

    // Start with creator as member
    const memberIdSet = new Set([String(currentUserId)]);
    const notFoundEmails = [];

    if (Array.isArray(initialMemberEmails) && initialMemberEmails.length > 0) {
      const cleanEmails = initialMemberEmails.map((e) => e.toLowerCase().trim());
      const foundUsers = await User.find({ email: { $in: cleanEmails } });
      const foundEmailSet = new Set(foundUsers.map((u) => u.email));

      foundUsers.forEach((u) => memberIdSet.add(String(u._id)));
      cleanEmails.forEach((e) => {
        if (!foundEmailSet.has(e)) {
          notFoundEmails.push(e);
        }
      });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      type: type || 'Other',
      currency: (currency || 'INR').toUpperCase(),
      creator: currentUserId,
      members: Array.from(memberIdSet)
    });

    const populated = await Group.findById(group._id)
      .populate('members', 'name email')
      .populate('creator', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group: populated,
      ...(notFoundEmails.length > 0
        ? { notice: `Note: The following emails are not registered yet and were not added: ${notFoundEmails.join(', ')}` }
        : {})
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all groups for the current user
 * GET /api/groups
 */
async function getGroups(req, res, next) {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email')
      .populate('creator', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    // Attach total group spending and expense count to each group summary
    const groupIds = groups.map((g) => g._id);
    const spendingAgg = await Expense.aggregate([
      { $match: { group: { $in: groupIds } } },
      { $group: { _id: '$group', totalAmountMinor: { $sum: '$amountMinor' }, count: { $sum: 1 } } }
    ]);

    const spendingMap = new Map();
    spendingAgg.forEach((item) => {
      spendingMap.set(String(item._id), {
        totalSpendingMinor: item.totalAmountMinor,
        expenseCount: item.count
      });
    });

    const enrichedGroups = groups.map((g) => {
      const stats = spendingMap.get(String(g._id)) || { totalSpendingMinor: 0, expenseCount: 0 };
      return {
        ...g,
        totalSpendingMinor: stats.totalSpendingMinor,
        expenseCount: stats.expenseCount
      };
    });

    return res.status(200).json({
      success: true,
      groups: enrichedGroups
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get group details by ID
 * GET /api/groups/:groupId
 */
async function getGroupById(req, res, next) {
  try {
    const group = await verifyGroupMembership(req.params.groupId, req.user._id);

    // Compute total spending for this group
    const expensesAgg = await Expense.aggregate([
      { $match: { group: group._id } },
      { $group: { _id: null, totalMinor: { $sum: '$amountMinor' }, count: { $sum: 1 } } }
    ]);

    const totalSpendingMinor = expensesAgg[0]?.totalMinor || 0;
    const expenseCount = expensesAgg[0]?.count || 0;

    return res.status(200).json({
      success: true,
      group: {
        ...group.toObject(),
        totalSpendingMinor,
        expenseCount
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update group settings
 * PATCH /api/groups/:groupId
 */
async function updateGroup(req, res, next) {
  try {
    const group = await verifyGroupMembership(req.params.groupId, req.user._id);

    // Only group creator can edit settings
    if (String(group.creator._id || group.creator) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can modify group settings.'
      });
    }

    const { name, description, type } = req.body;
    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (type) group.type = type;

    await group.save();
    const updated = await Group.findById(group._id)
      .populate('members', 'name email')
      .populate('creator', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      group: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add a member to group by email
 * POST /api/groups/:groupId/members
 */
async function addMember(req, res, next) {
  try {
    const group = await verifyGroupMembership(req.params.groupId, req.user._id);
    const { email } = req.body;
    const targetEmail = email.toLowerCase().trim();

    const targetUser = await User.findOne({ email: targetEmail });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `No user with email "${targetEmail}" is registered on SplitSmart. Please ask them to sign up first.`
      });
    }

    const alreadyMember = group.members.some(
      (m) => String(m._id || m) === String(targetUser._id)
    );

    if (alreadyMember) {
      return res.status(409).json({
        success: false,
        message: `${targetUser.name} (${targetEmail}) is already a member of this group.`
      });
    }

    group.members.push(targetUser._id);
    await group.save();

    const updated = await Group.findById(group._id)
      .populate('members', 'name email')
      .populate('creator', 'name email');

    return res.status(200).json({
      success: true,
      message: `Added ${targetUser.name} to the group.`,
      group: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete empty group (only permitted if zero expenses and settlements)
 * DELETE /api/groups/:groupId
 */
async function deleteGroup(req, res, next) {
  try {
    const group = await verifyGroupMembership(req.params.groupId, req.user._id);

    if (String(group.creator._id || group.creator) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator can delete this group.'
      });
    }

    const [expenseCount, settlementCount] = await Promise.all([
      Expense.countDocuments({ group: group._id }),
      Settlement.countDocuments({ group: group._id })
    ]);

    if (expenseCount > 0 || settlementCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete group with existing financial records (expenses or settlements). Financial audit history must be preserved.'
      });
    }

    await Group.findByIdAndDelete(group._id);

    return res.status(200).json({
      success: true,
      message: 'Group deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  addMember,
  deleteGroup,
  verifyGroupMembership
};
