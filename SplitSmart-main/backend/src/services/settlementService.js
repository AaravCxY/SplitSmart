const { calculateGroupBalances, computeBalancesFromRecords } = require('./balanceService');

/**
 * Settlement Engine (Greedy Settlement Algorithm)
 * 
 * Purpose:
 * Minimizes the number of transactions required to settle all debts in a group,
 * without altering the net financial position of any participant.
 * 
 * Algorithm:
 * 1. Takes the list of member balances in integer minor units.
 * 2. Filters into Debtors (net < 0) and Creditors (net > 0).
 * 3. Sorts both lists in descending order of magnitude.
 * 4. Greedily transfers min(debtor.amountOwed, creditor.amountReceivable).
 * 5. Decrements balances and repeats until all balances are settled (0).
 * 
 * Time Complexity:
 * O(N log N) for initial sorting of N members, followed by at most (N - 1) transfers O(N).
 * Total complexity: O(N log N).
 * 
 * Note on Optimal Settlements:
 * A greedy matching algorithm produces a valid, low-transaction settlement plan (at most N-1 transfers).
 * While finding the absolute minimum number of transactions across arbitrary subsets is equivalent 
 * to the NP-hard Subset Sum problem, this greedy heuristic is optimal or near-optimal for practical group sizes 
 * and is standard in financial split applications.
 * 
 * @param {Array<Object>} balances - Array of member balances from balanceService
 * @returns {Array<Object>} suggestedPayments
 */
function generateSettlementPlanFromBalances(balances) {
  if (!Array.isArray(balances) || balances.length === 0) {
    return [];
  }

  // Create mutable working copies in integer minor units
  const debtors = [];
  const creditors = [];

  let totalDebts = 0;
  let totalCredits = 0;

  balances.forEach((member) => {
    if (member.netBalanceMinor < 0) {
      const owed = Math.abs(member.netBalanceMinor);
      debtors.push({
        userId: String(member.userId),
        name: member.name,
        email: member.email,
        amountOwedMinor: owed
      });
      totalDebts += owed;
    } else if (member.netBalanceMinor > 0) {
      const receivable = member.netBalanceMinor;
      creditors.push({
        userId: String(member.userId),
        name: member.name,
        email: member.email,
        amountReceivableMinor: receivable
      });
      totalCredits += receivable;
    }
  });

  // Financial sanity check
  if (totalDebts !== totalCredits) {
    throw new Error(
      `Cannot generate settlement plan: Total debts (${totalDebts}) do not match total credits (${totalCredits}).`
    );
  }

  // Sort descending by amount
  debtors.sort((a, b) => b.amountOwedMinor - a.amountOwedMinor);
  creditors.sort((a, b) => b.amountReceivableMinor - a.amountReceivableMinor);

  const suggestedTransfers = [];
  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    const transferAmountMinor = Math.min(debtor.amountOwedMinor, creditor.amountReceivableMinor);

    if (transferAmountMinor > 0) {
      suggestedTransfers.push({
        payerId: debtor.userId,
        payerName: debtor.name,
        payerEmail: debtor.email,
        recipientId: creditor.userId,
        recipientName: creditor.name,
        recipientEmail: creditor.email,
        amountMinor: transferAmountMinor,
        status: 'suggested'
      });

      debtor.amountOwedMinor -= transferAmountMinor;
      creditor.amountReceivableMinor -= transferAmountMinor;
    }

    if (debtor.amountOwedMinor === 0) {
      dIndex++;
    }
    if (creditor.amountReceivableMinor === 0) {
      cIndex++;
    }
  }

  return suggestedTransfers;
}

/**
 * Retrieves the settlement plan for a group from the database.
 * 
 * @param {string} groupId
 * @returns {Promise<Array<Object>>}
 */
async function getGroupSettlementPlan(groupId) {
  const balances = await calculateGroupBalances(groupId);
  return generateSettlementPlanFromBalances(balances);
}

module.exports = {
  generateSettlementPlanFromBalances,
  getGroupSettlementPlan
};
