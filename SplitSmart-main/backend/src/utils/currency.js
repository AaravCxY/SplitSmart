/**
 * Currency and Integer Minor Units Utility
 * 
 * In SplitSmart, all financial amounts are strictly calculated and persisted 
 * in integer minor currency units (e.g., paise for INR, cents for USD/EUR).
 * This eliminates IEEE 754 floating-point inaccuracies.
 */

/**
 * Converts a major currency value (e.g. 900.50) to integer minor units (90050).
 * Rounds safely to the nearest integer.
 */
function toMinorUnits(amountMajor) {
  if (typeof amountMajor !== 'number' || isNaN(amountMajor)) {
    throw new Error('Invalid major currency amount');
  }
  return Math.round(amountMajor * 100);
}

/**
 * Converts minor currency units (e.g. 90050) to major float (900.50).
 */
function toMajorUnits(amountMinor) {
  if (typeof amountMinor !== 'number' || !Number.isInteger(amountMinor)) {
    throw new Error('Amount in minor units must be an integer');
  }
  return amountMinor / 100;
}

/**
 * Deterministically splits an integer total amount among a list of participant IDs.
 * Any rounding remainder is distributed 1 minor unit at a time to participants 
 * ordered lexicographically by participant ID to ensure 100% reproducible results.
 * 
 * Example: 10000 paise among 3 people -> 3334, 3333, 3333 = 10000
 * 
 * @param {number} totalMinor - Total amount in minor units (integer > 0)
 * @param {string[]} participantIds - Array of unique participant user IDs
 * @returns {Array<{ participant: string, shareMinor: number }>}
 */
function calculateEqualSplit(totalMinor, participantIds) {
  if (!Number.isInteger(totalMinor) || totalMinor <= 0) {
    throw new Error('Total amount must be a positive integer in minor units');
  }
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw new Error('At least one participant is required for equal split');
  }

  // Deduplicate and sort deterministically
  const uniqueParticipants = Array.from(new Set(participantIds.map(String))).sort();
  const count = uniqueParticipants.length;

  const baseShare = Math.floor(totalMinor / count);
  let remainder = totalMinor % count;

  return uniqueParticipants.map((participantId) => {
    let share = baseShare;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    return {
      participant: participantId,
      shareMinor: share
    };
  });
}

/**
 * Validates and normalizes exact amount shares.
 * Ensures every share is a positive integer and the sum matches totalMinor.
 * 
 * @param {number} totalMinor - Total amount in minor units
 * @param {Array<{ participant: string, shareMinor: number }>} shares
 * @returns {Array<{ participant: string, shareMinor: number }>}
 */
function validateExactSplit(totalMinor, shares) {
  if (!Number.isInteger(totalMinor) || totalMinor <= 0) {
    throw new Error('Total amount must be a positive integer in minor units');
  }
  if (!Array.isArray(shares) || shares.length === 0) {
    throw new Error('Participant shares are required');
  }

  const seenParticipants = new Set();
  let calculatedSum = 0;

  const normalizedShares = shares.map((item) => {
    const participantId = String(item.participant);
    if (seenParticipants.has(participantId)) {
      throw new Error(`Duplicate participant in split: ${participantId}`);
    }
    seenParticipants.add(participantId);

    const shareMinor = Math.round(Number(item.shareMinor));
    if (!Number.isInteger(shareMinor) || shareMinor <= 0) {
      throw new Error(`Invalid share for participant ${participantId}: must be positive integer minor units`);
    }

    calculatedSum += shareMinor;
    return {
      participant: participantId,
      shareMinor
    };
  });

  if (calculatedSum !== totalMinor) {
    throw new Error(
      `Exact shares sum (${calculatedSum} minor units) does not match total amount (${totalMinor} minor units)`
    );
  }

  return normalizedShares;
}

/**
 * Calculates shares based on percentages, ensuring percentages sum to 100%,
 * and distributing minor unit rounding remainders deterministically.
 * 
 * @param {number} totalMinor - Total amount in minor units
 * @param {Array<{ participant: string, percentage: number }>} percentages
 * @returns {Array<{ participant: string, shareMinor: number, percentage: number }>}
 */
function calculatePercentageSplit(totalMinor, percentages) {
  if (!Number.isInteger(totalMinor) || totalMinor <= 0) {
    throw new Error('Total amount must be a positive integer in minor units');
  }
  if (!Array.isArray(percentages) || percentages.length === 0) {
    throw new Error('Participant percentages are required');
  }

  const seenParticipants = new Set();
  let totalPercent = 0;

  percentages.forEach((item) => {
    const participantId = String(item.participant);
    if (seenParticipants.has(participantId)) {
      throw new Error(`Duplicate participant in percentage split: ${participantId}`);
    }
    seenParticipants.add(participantId);

    const pct = Number(item.percentage);
    if (isNaN(pct) || pct <= 0) {
      throw new Error(`Invalid percentage for participant ${participantId}: must be positive`);
    }
    totalPercent += pct;
  });

  // Verify percentage sum equals 100 within 0.01 tolerance
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Percentages must sum to exactly 100%. Current sum: ${totalPercent}%`);
  }

  // Sort participants stably
  const sorted = [...percentages].sort((a, b) => String(a.participant).localeCompare(String(b.participant)));

  let allocatedSum = 0;
  const result = sorted.map((item) => {
    const rawShare = (totalMinor * Number(item.percentage)) / 100;
    const shareMinor = Math.floor(rawShare);
    allocatedSum += shareMinor;
    return {
      participant: String(item.participant),
      percentage: Number(item.percentage),
      rawShare,
      shareMinor
    };
  });

  let remainder = totalMinor - allocatedSum;
  // Distribute remainder units by highest fractional share, then by participant ID
  if (remainder > 0) {
    const withFraction = result.map((item, index) => ({
      index,
      fraction: item.rawShare - item.shareMinor,
      participant: item.participant
    })).sort((a, b) => {
      if (b.fraction !== a.fraction) return b.fraction - a.fraction;
      return a.participant.localeCompare(b.participant);
    });

    for (let i = 0; i < remainder; i++) {
      const targetIndex = withFraction[i % withFraction.length].index;
      result[targetIndex].shareMinor += 1;
    }
  }

  return result.map(({ participant, shareMinor, percentage }) => ({
    participant,
    shareMinor,
    percentage
  }));
}

module.exports = {
  toMinorUnits,
  toMajorUnits,
  calculateEqualSplit,
  validateExactSplit,
  calculatePercentageSplit
};
