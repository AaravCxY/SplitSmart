const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

/**
 * Pure function to compute member balances from raw data records.
 * Keeps calculation decoupled from database fetching for easy testing.
 * 
 * Financial Formula & Sign Convention:
 * - Net balance = (totalPaid - totalShare) + (settlementsPaid - settlementsReceived)
 * - Positive net balance: group owes the user money (Creditor).
 * - Negative net balance: user owes the group money (Debtor).
 * - Zero net balance: user is fully settled.
 * 
 * Mathematical Invariant:
 * The sum of all group member net balances must always equal zero.
 * 
 * @param {Object} params
 * @param {Array<{ _id: string, name: string, email: string }>} params.members
 * @param {Array<Object>} params.expenses
 * @param {Array<Object>} params.settlements
 * @returns {Array<Object>}
 */
function computeBalancesFromRecords({ members, expenses = [], settlements = [] }) {
  if (!Array.isArray(members) || members.length === 0) {
    return [];
  }

  // Initialize ledger map for every member
  const memberMap = new Map();
  members.forEach((m) => {
    const id = String(m._id || m.id || m);
    memberMap.set(id, {
      userId: id,
      name: m.name || 'Unknown Member',
      email: m.email || '',
      totalPaidMinor: 0,
      totalShareMinor: 0,
      settlementsPaidMinor: 0,
      settlementsReceivedMinor: 0,
      netBalanceMinor: 0,
      amountOwedMinor: 0,
      amountReceivableMinor: 0
    });
  });

  // Process expenses
  expenses.forEach((expense) => {
    const payerId = String(expense.paidBy?._id || expense.paidBy);
    const amount = Number(expense.amountMinor);

    if (memberMap.has(payerId)) {
      memberMap.get(payerId).totalPaidMinor += amount;
    }

    if (Array.isArray(expense.participants)) {
      expense.participants.forEach((part) => {
        const participantId = String(part.user?._id || part.user || part.participant);
        const share = Number(part.shareMinor);
        if (memberMap.has(participantId)) {
          memberMap.get(participantId).totalShareMinor += share;
        }
      });
    }
  });

  // Process completed settlements
  settlements.forEach((settlement) => {
    if (settlement.status !== 'completed') return;

    const payerId = String(settlement.payer?._id || settlement.payer);
    const recipientId = String(settlement.recipient?._id || settlement.recipient);
    const amount = Number(settlement.amountMinor);

    if (memberMap.has(payerId)) {
      memberMap.get(payerId).settlementsPaidMinor += amount;
    }
    if (memberMap.has(recipientId)) {
      memberMap.get(recipientId).settlementsReceivedMinor += amount;
    }
  });

  // Compute net balances and verify conservation of money
  let totalNetCheck = 0;
  const balances = [];

  memberMap.forEach((data) => {
    // Net balance = (paid - share) + (settlementsPaid - settlementsReceived)
    data.netBalanceMinor =
      data.totalPaidMinor -
      data.totalShareMinor +
      data.settlementsPaidMinor -
      data.settlementsReceivedMinor;

    totalNetCheck += data.netBalanceMinor;

    if (data.netBalanceMinor > 0) {
      data.amountReceivableMinor = data.netBalanceMinor;
      data.amountOwedMinor = 0;
    } else if (data.netBalanceMinor < 0) {
      data.amountReceivableMinor = 0;
      data.amountOwedMinor = Math.abs(data.netBalanceMinor);
    } else {
      data.amountReceivableMinor = 0;
      data.amountOwedMinor = 0;
    }

    balances.push(data);
  });

  // Verify financial conservation invariant
  if (totalNetCheck !== 0) {
    throw new Error(
      `Financial integrity violation: Group balances sum to ${totalNetCheck} instead of 0.`
    );
  }

  return balances;
}

/**
 * Calculates group balances by querying the database.
 * 
 * @param {string} groupId
 * @returns {Promise<Array<Object>>}
 */
async function calculateGroupBalances(groupId) {
  const group = await Group.findById(groupId).populate('members', 'name email');
  if (!group) {
    const err = new Error('Group not found');
    err.statusCode = 404;
    throw err;
  }

  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: groupId }).lean(),
    Settlement.find({ group: groupId, status: 'completed' }).lean()
  ]);

  return computeBalancesFromRecords({
    members: group.members,
    expenses,
    settlements
  });
}

module.exports = {
  computeBalancesFromRecords,
  calculateGroupBalances
};
