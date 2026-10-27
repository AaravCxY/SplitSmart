const {
  calculateEqualSplit,
  validateExactSplit,
  calculatePercentageSplit,
  toMinorUnits,
  toMajorUnits
} = require('../src/utils/currency');

describe('Currency and Splitting Utilities', () => {
  describe('toMinorUnits and toMajorUnits', () => {
    test('converts major currency to integer minor units correctly', () => {
      expect(toMinorUnits(100)).toBe(10000);
      expect(toMinorUnits(99.99)).toBe(9999);
      expect(toMinorUnits(0.33)).toBe(33);
    });

    test('converts minor units back to major units', () => {
      expect(toMajorUnits(10000)).toBe(100);
      expect(toMajorUnits(9999)).toBe(99.99);
      expect(toMajorUnits(33)).toBe(0.33);
    });
  });

  describe('Equal Split & Deterministic Rounding', () => {
    test('splits evenly when amount is divisible without remainder', () => {
      // 900 minor units / 3 people = 300 each
      const result = calculateEqualSplit(900, ['user1', 'user2', 'user3']);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.shareMinor)).toEqual([300, 300, 300]);
      const total = result.reduce((sum, r) => sum + r.shareMinor, 0);
      expect(total).toBe(900);
    });

    test('distributes remainder deterministically when amount leaves a remainder (₹100 among 3 people)', () => {
      // 10000 paise among 3 people = 3334, 3333, 3333
      const result = calculateEqualSplit(10000, ['alice', 'bob', 'carol']);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.shareMinor)).toEqual([3334, 3333, 3333]);
      const total = result.reduce((sum, r) => sum + r.shareMinor, 0);
      expect(total).toBe(10000);
    });

    test('remains deterministic across multiple calls with shuffled order', () => {
      const res1 = calculateEqualSplit(10001, ['charlie', 'alice', 'bob']);
      const res2 = calculateEqualSplit(10001, ['bob', 'charlie', 'alice']);
      expect(res1).toEqual(res2);
      expect(res1.reduce((sum, r) => sum + r.shareMinor, 0)).toBe(10001);
    });

    test('rejects negative or zero total amounts', () => {
      expect(() => calculateEqualSplit(0, ['user1'])).toThrow();
      expect(() => calculateEqualSplit(-100, ['user1'])).toThrow();
    });

    test('rejects empty participants list', () => {
      expect(() => calculateEqualSplit(1000, [])).toThrow();
    });
  });

  describe('Exact Split Validation', () => {
    test('validates correct exact split', () => {
      const shares = [
        { participant: 'user1', shareMinor: 400 },
        { participant: 'user2', shareMinor: 600 }
      ];
      const result = validateExactSplit(1000, shares);
      expect(result).toHaveLength(2);
      expect(result.reduce((sum, r) => sum + r.shareMinor, 0)).toBe(1000);
    });

    test('rejects exact split when sum does not match total', () => {
      const shares = [
        { participant: 'user1', shareMinor: 400 },
        { participant: 'user2', shareMinor: 500 }
      ];
      expect(() => validateExactSplit(1000, shares)).toThrow(
        /does not match total amount/
      );
    });

    test('rejects duplicate participants in exact split', () => {
      const shares = [
        { participant: 'user1', shareMinor: 500 },
        { participant: 'user1', shareMinor: 500 }
      ];
      expect(() => validateExactSplit(1000, shares)).toThrow(/Duplicate participant/);
    });
  });

  describe('Percentage Split', () => {
    test('calculates percentage shares and distributes fractional rounding', () => {
      const percentages = [
        { participant: 'user1', percentage: 50 },
        { participant: 'user2', percentage: 25 },
        { participant: 'user3', percentage: 25 }
      ];
      const result = calculatePercentageSplit(1000, percentages);
      expect(result.reduce((sum, r) => sum + r.shareMinor, 0)).toBe(1000);
      expect(result.find((r) => r.participant === 'user1').shareMinor).toBe(500);
      expect(result.find((r) => r.participant === 'user2').shareMinor).toBe(250);
      expect(result.find((r) => r.participant === 'user3').shareMinor).toBe(250);
    });

    test('rejects percentages not summing to 100%', () => {
      const percentages = [
        { participant: 'user1', percentage: 50 },
        { participant: 'user2', percentage: 40 }
      ];
      expect(() => calculatePercentageSplit(1000, percentages)).toThrow(
        /Percentages must sum to exactly 100%/
      );
    });
  });
});
