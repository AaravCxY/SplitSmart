const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const { calculateGroupBalances } = require('../services/balanceService');
const { getGroupSettlementPlan } = require('../services/settlementService');

/**
 * Get comprehensive dashboard statistics for the logged-in user
 * GET /api/dashboard
 */
async function getDashboardSummary(req, res, next) {
  try {
    const userId = String(req.user._id);

    // 1. Find all groups user belongs to
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email')
      .populate('creator', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    const groupIds = groups.map((g) => g._id);

    let totalOwedMinor = 0;       // what the user owes others across groups
    let totalReceivableMinor = 0; // what others owe the user across groups
    let pendingSettlementsCount = 0;
    const groupSummaries = [];

    // Compute balances for each group
    for (const group of groups) {
      try {
        const balances = await calculateGroupBalances(group._id);
        const myBalance = balances.find((b) => String(b.userId) === userId);

        let groupOwed = 0;
        let groupReceivable = 0;

        if (myBalance) {
          if (myBalance.netBalanceMinor < 0) {
            groupOwed = Math.abs(myBalance.netBalanceMinor);
            totalOwedMinor += groupOwed;
          } else if (myBalance.netBalanceMinor > 0) {
            groupReceivable = myBalance.netBalanceMinor;
            totalReceivableMinor += groupReceivable;
          }
        }

        const plan = await getGroupSettlementPlan(group._id);
        const mySuggested = plan.filter(
          (p) => String(p.payerId) === userId || String(p.recipientId) === userId
        );
        pendingSettlementsCount += mySuggested.length;

        groupSummaries.push({
          groupId: group._id,
          name: group.name,
          type: group.type,
          currency: group.currency,
          memberCount: group.members.length,
          myNetBalanceMinor: myBalance?.netBalanceMinor || 0,
          myOwedMinor: groupOwed,
          myReceivableMinor: groupReceivable,
          suggestedSettlementsCount: mySuggested.length
        });
      } catch (err) {
        console.error(`Error calculating summary for group ${group._id}:`, err);
      }
    }

    // 2. Recent expenses involving user
    const recentExpenses = await Expense.find({ group: { $in: groupIds } })
      .populate('group', 'name currency')
      .populate('paidBy', 'name email')
      .sort({ expenseDate: -1, createdAt: -1 })
      .limit(6)
      .lean();

    // 3. Recent settlements involving user
    const recentSettlements = await Settlement.find({
      group: { $in: groupIds },
      $or: [{ payer: req.user._id }, { recipient: req.user._id }]
    })
      .populate('group', 'name currency')
      .populate('payer', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // 4. Spending by category for expenses where user was payer or participant
    const categorySpending = await Expense.aggregate([
      { $match: { group: { $in: groupIds } } },
      {
        $group: {
          _id: '$category',
          totalAmountMinor: { $sum: '$amountMinor' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmountMinor: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        totalOwedMinor,
        totalReceivableMinor,
        netBalanceMinor: totalReceivableMinor - totalOwedMinor,
        activeGroupsCount: groups.length,
        pendingSettlementsCount,
        groups: groupSummaries,
        recentExpenses,
        recentSettlements,
        categorySpending: categorySpending.map((c) => ({
          category: c._id || 'Other',
          totalMinor: c.totalAmountMinor,
          count: c.count
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardSummary
};
