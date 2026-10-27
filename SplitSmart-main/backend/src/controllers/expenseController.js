const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { verifyGroupMembership } = require('./groupController');
const { processExpenseSplit, assertNoExistingSettlements } = require('../services/expenseService');
const { toMinorUnits } = require('../utils/currency');

/**
 * Helper to resolve amountMinor from input body
 */
function resolveAmountMinor(body) {
  if (body.amountMinor !== undefined && Number.isInteger(Number(body.amountMinor))) {
    return Number(body.amountMinor);
  }
  if (body.amount !== undefined && !isNaN(Number(body.amount))) {
    return toMinorUnits(Number(body.amount));
  }
  throw new Error('Valid expense amount is required');
}

/**
 * Create a new expense in a group
 * POST /api/groups/:groupId/expenses
 */
async function createExpense(req, res, next) {
  try {
    const { groupId } = req.params;
    const group = await verifyGroupMembership(groupId, req.user._id);

    const {
      title,
      category,
      paidBy,
      participants,
      splitMethod = 'EQUAL',
      expenseDate,
      notes
    } = req.body;

    const amountMinor = resolveAmountMinor(req.body);

    // Validate payer is a group member
    const payerId = String(paidBy || req.user._id);
    const memberIdStrings = group.members.map((m) => String(m._id || m));
    if (!memberIdStrings.includes(payerId)) {
      return res.status(400).json({
        success: false,
        message: 'The designated payer must be a member of this group.'
      });
    }

    // Process and validate split
    const validatedParticipants = processExpenseSplit({
      amountMinor,
      splitMethod,
      participants,
      groupMemberIds: memberIdStrings
    });

    const expense = await Expense.create({
      group: group._id,
      title: title.trim(),
      amountMinor,
      currency: group.currency,
      category: category || 'Other',
      paidBy: payerId,
      participants: validatedParticipants,
      splitMethod,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      notes: notes?.trim() || '',
      createdBy: req.user._id
    });

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      expense: populated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get expenses for a specific group with filtering, search, and sorting
 * GET /api/groups/:groupId/expenses
 */
async function getGroupExpenses(req, res, next) {
  try {
    const { groupId } = req.params;
    await verifyGroupMembership(groupId, req.user._id);

    const { category, payer, search, sortBy = 'date', sortOrder = 'desc', startDate, endDate } = req.query;

    const filter = { group: groupId };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (payer) {
      filter.paidBy = payer;
    }

    if (search) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    const sort = {};
    if (sortBy === 'amount') {
      sort.amountMinor = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.expenseDate = sortOrder === 'asc' ? 1 : -1;
    }

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email')
      .sort(sort)
      .lean();

    return res.status(200).json({
      success: true,
      count: expenses.length,
      expenses
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all expenses across all groups the user belongs to
 * GET /api/expenses
 */
async function getAllUserExpenses(req, res, next) {
  try {
    // Find all groups user belongs to
    const userGroups = await Group.find({ members: req.user._id }).select('_id');
    const groupIds = userGroups.map((g) => g._id);

    const { category, search, sortBy = 'date', sortOrder = 'desc', groupId } = req.query;

    const filter = {
      group: groupId ? groupId : { $in: groupIds }
    };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    const sort = {};
    if (sortBy === 'amount') {
      sort.amountMinor = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.expenseDate = sortOrder === 'asc' ? 1 : -1;
    }

    const expenses = await Expense.find(filter)
      .populate('group', 'name currency')
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email')
      .sort(sort)
      .lean();

    return res.status(200).json({
      success: true,
      count: expenses.length,
      expenses
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a single expense by ID
 * GET /api/expenses/:expenseId
 */
async function getExpenseById(req, res, next) {
  try {
    const { expenseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(expenseId)) {
      return res.status(400).json({ success: false, message: 'Invalid expense ID' });
    }

    const expense = await Expense.findById(expenseId)
      .populate('group', 'name currency members')
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // Verify user is member of expense's group
    const isMember = expense.group.members.some(
      (m) => String(m) === String(req.user._id)
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied to this expense' });
    }

    return res.status(200).json({
      success: true,
      expense
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing expense
 * PATCH /api/expenses/:expenseId
 */
async function updateExpense(req, res, next) {
  try {
    const { expenseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(expenseId)) {
      return res.status(400).json({ success: false, message: 'Invalid expense ID' });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const group = await verifyGroupMembership(expense.group, req.user._id);

    // Business Rule: Reject modification if related settlements exist
    await assertNoExistingSettlements(expense.group);

    const {
      title,
      category,
      paidBy,
      participants,
      splitMethod,
      expenseDate,
      notes
    } = req.body;

    let amountMinor = expense.amountMinor;
    if (req.body.amountMinor !== undefined || req.body.amount !== undefined) {
      amountMinor = resolveAmountMinor(req.body);
    }

    const memberIdStrings = group.members.map((m) => String(m._id || m));
    const targetPaidBy = paidBy ? String(paidBy) : String(expense.paidBy);

    if (!memberIdStrings.includes(targetPaidBy)) {
      return res.status(400).json({
        success: false,
        message: 'The designated payer must be a member of this group.'
      });
    }

    const targetSplitMethod = splitMethod || expense.splitMethod;
    const targetParticipants = participants || expense.participants;

    const validatedParticipants = processExpenseSplit({
      amountMinor,
      splitMethod: targetSplitMethod,
      participants: targetParticipants,
      groupMemberIds: memberIdStrings
    });

    if (title) expense.title = title.trim();
    expense.amountMinor = amountMinor;
    if (category) expense.category = category;
    expense.paidBy = targetPaidBy;
    expense.participants = validatedParticipants;
    expense.splitMethod = targetSplitMethod;
    if (expenseDate) expense.expenseDate = new Date(expenseDate);
    if (notes !== undefined) expense.notes = notes.trim();

    await expense.save();

    const updated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('participants.user', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      expense: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete an expense
 * DELETE /api/expenses/:expenseId
 */
async function deleteExpense(req, res, next) {
  try {
    const { expenseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(expenseId)) {
      return res.status(400).json({ success: false, message: 'Invalid expense ID' });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await verifyGroupMembership(expense.group, req.user._id);

    // Business Rule: Reject deletion if related settlements exist
    await assertNoExistingSettlements(expense.group);

    await Expense.findByIdAndDelete(expenseId);

    return res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createExpense,
  getGroupExpenses,
  getAllUserExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
};
