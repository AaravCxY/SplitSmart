const mongoose = require('mongoose');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { verifyGroupMembership } = require('./groupController');
const { calculateGroupBalances } = require('../services/balanceService');
const { getGroupSettlementPlan } = require('../services/settlementService');
const { toMinorUnits } = require('../utils/currency');

/**
 * Helper to resolve amountMinor from settlement body
 */
function resolveSettlementAmountMinor(body) {
  if (body.amountMinor !== undefined && Number.isInteger(Number(body.amountMinor))) {
    return Number(body.amountMinor);
  }
  if (body.amount !== undefined && !isNaN(Number(body.amount))) {
    return toMinorUnits(Number(body.amount));
  }
  throw new Error('Valid settlement amount is required');
}

/**
 * Get balances for all members in a group
 * GET /api/groups/:groupId/balances
 */
async function getGroupBalancesHandler(req, res, next) {
  try {
    const { groupId } = req.params;
    await verifyGroupMembership(groupId, req.user._id);

    const balances = await calculateGroupBalances(groupId);
    return res.status(200).json({
      success: true,
      balances
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get optimized settlement plan for a group
 * GET /api/groups/:groupId/settlement-plan
 */
async function getSettlementPlanHandler(req, res, next) {
  try {
    const { groupId } = req.params;
    await verifyGroupMembership(groupId, req.user._id);

    const settlementPlan = await getGroupSettlementPlan(groupId);
    return res.status(200).json({
      success: true,
      settlementPlan
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Record a completed settlement (repayment made between group members)
 * POST /api/groups/:groupId/settlements
 */
async function createSettlement(req, res, next) {
  try {
    const { groupId } = req.params;
    const group = await verifyGroupMembership(groupId, req.user._id);

    const { payerId, recipientId, note, idempotencyKey } = req.body;
    const amountMinor = resolveSettlementAmountMinor(req.body);

    if (String(payerId) === String(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'Payer and recipient must be different group members.'
      });
    }

    const memberIdStrings = group.members.map((m) => String(m._id || m));
    if (!memberIdStrings.includes(String(payerId)) || !memberIdStrings.includes(String(recipientId))) {
      return res.status(400).json({
        success: false,
        message: 'Both payer and recipient must be valid members of this group.'
      });
    }

    // Check duplicate idempotent submission
    if (idempotencyKey) {
      const existing = await Settlement.findOne({ idempotencyKey })
        .populate('payer', 'name email')
        .populate('recipient', 'name email');
      if (existing) {
        const balances = await calculateGroupBalances(groupId);
        return res.status(200).json({
          success: true,
          message: 'Settlement already recorded (idempotent request)',
          settlement: existing,
          balances
        });
      }
    }

    // Validate settlement against current balances
    const currentBalances = await calculateGroupBalances(groupId);
    const payerBalance = currentBalances.find((b) => String(b.userId) === String(payerId));
    const recipientBalance = currentBalances.find((b) => String(b.userId) === String(recipientId));

    if (!payerBalance || payerBalance.netBalanceMinor >= 0) {
      return res.status(400).json({
        success: false,
        message: 'The selected payer does not currently owe any money in this group.'
      });
    }

    if (!recipientBalance || recipientBalance.netBalanceMinor <= 0) {
      return res.status(400).json({
        success: false,
        message: 'The selected recipient is not currently owed any money in this group.'
      });
    }

    const payerTotalDebt = Math.abs(payerBalance.netBalanceMinor);
    if (amountMinor > payerTotalDebt) {
      return res.status(400).json({
        success: false,
        message: `Settlement amount (${amountMinor} minor units) exceeds the payer's total outstanding debt (${payerTotalDebt} minor units).`
      });
    }

    const settlement = await Settlement.create({
      group: group._id,
      payer: payerId,
      recipient: recipientId,
      amountMinor,
      currency: group.currency,
      status: 'completed',
      note: note?.trim() || '',
      idempotencyKey: idempotencyKey || undefined,
      createdBy: req.user._id,
      completedAt: new Date()
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('payer', 'name email')
      .populate('recipient', 'name email')
      .populate('createdBy', 'name email');

    // Recalculate balances after settlement
    const updatedBalances = await calculateGroupBalances(groupId);

    return res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully',
      settlement: populated,
      balances: updatedBalances
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all completed settlements for a group
 * GET /api/groups/:groupId/settlements
 */
async function getGroupSettlements(req, res, next) {
  try {
    const { groupId } = req.params;
    await verifyGroupMembership(groupId, req.user._id);

    const settlements = await Settlement.find({ group: groupId })
      .populate('payer', 'name email')
      .populate('recipient', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: settlements.length,
      settlements
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all settlements involving the current user across all groups
 * GET /api/settlements
 */
async function getAllUserSettlements(req, res, next) {
  try {
    const currentUserId = req.user._id;
    const settlements = await Settlement.find({
      $or: [{ payer: currentUserId }, { recipient: currentUserId }]
    })
      .populate('group', 'name currency')
      .populate('payer', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: settlements.length,
      settlements
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getGroupBalancesHandler,
  getSettlementPlanHandler,
  createSettlement,
  getGroupSettlements,
  getAllUserSettlements
};
