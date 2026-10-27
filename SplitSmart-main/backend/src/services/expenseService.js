const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const {
  calculateEqualSplit,
  validateExactSplit,
  calculatePercentageSplit
} = require('../utils/currency');

/**
 * Validates and calculates participant shares based on splitMethod.
 * 
 * @param {Object} params
 * @param {number} params.amountMinor
 * @param {string} params.splitMethod
 * @param {Array} params.participants - Raw participants from request
 * @param {Array<string>} params.groupMemberIds - List of valid member ID strings
 * @returns {Array<{ user: string, shareMinor: number }>}
 */
function processExpenseSplit({ amountMinor, splitMethod, participants, groupMemberIds }) {
  try {
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      const err = new Error('Expense amount must be a positive integer in minor units');
      err.statusCode = 400;
      throw err;
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      const err = new Error('At least one participant is required');
      err.statusCode = 400;
      throw err;
    }

    const memberSet = new Set(groupMemberIds.map(String));

    if (splitMethod === 'EQUAL') {
      // Array of participant user IDs
      const userIds = participants.map((p) => String(p.user || p));
      for (const uid of userIds) {
        if (!memberSet.has(uid)) {
          const err = new Error(`Participant ${uid} is not a member of this group`);
          err.statusCode = 400;
          throw err;
        }
      }
      const shares = calculateEqualSplit(amountMinor, userIds);
      return shares.map((s) => ({
        user: s.participant,
        shareMinor: s.shareMinor
      }));
    }

    if (splitMethod === 'EXACT') {
      // Array of { user, shareMinor }
      const sharesInput = participants.map((p) => ({
        participant: String(p.user || p.participant),
        shareMinor: p.shareMinor
      }));
      for (const item of sharesInput) {
        if (!memberSet.has(item.participant)) {
          const err = new Error(`Participant ${item.participant} is not a member of this group`);
          err.statusCode = 400;
          throw err;
        }
      }
      const validated = validateExactSplit(amountMinor, sharesInput);
      return validated.map((s) => ({
        user: s.participant,
        shareMinor: s.shareMinor
      }));
    }

    if (splitMethod === 'PERCENTAGE') {
      // Array of { user, percentage }
      const pctInput = participants.map((p) => ({
        participant: String(p.user || p.participant),
        percentage: p.percentage
      }));
      for (const item of pctInput) {
        if (!memberSet.has(item.participant)) {
          const err = new Error(`Participant ${item.participant} is not a member of this group`);
          err.statusCode = 400;
          throw err;
        }
      }
      const calculated = calculatePercentageSplit(amountMinor, pctInput);
      return calculated.map((s) => ({
        user: s.participant,
        shareMinor: s.shareMinor
      }));
    }

    const err = new Error(`Unsupported split method: ${splitMethod}`);
    err.statusCode = 400;
    throw err;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 400;
    }
    throw err;
  }
}

/**
 * Verifies if any settlements exist for the group that prevent mutating historical expenses.
 * 
 * @param {string} groupId
 */
async function assertNoExistingSettlements(groupId) {
  const settlementCount = await Settlement.countDocuments({
    group: groupId,
    status: 'completed'
  });
  if (settlementCount > 0) {
    const error = new Error(
      'Cannot modify or delete expenses after settlements have been recorded in this group. ' +
      'Modifying historical expenses would invalidate existing debt settlement receipts.'
    );
    error.statusCode = 409;
    throw error;
  }
}

module.exports = {
  processExpenseSplit,
  assertNoExistingSettlements
};
