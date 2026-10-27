const { generateSettlementPlanFromBalances } = require('../src/services/settlementService');

describe('Settlement Optimization Engine', () => {
  test('1: One debtor and one creditor', () => {
    // Alice is owed 5000, Bob owes 5000
    const balances = [
      { userId: 'u_alice', name: 'Alice', email: 'alice@example.com', netBalanceMinor: 5000 },
      { userId: 'u_bob', name: 'Bob', email: 'bob@example.com', netBalanceMinor: -5000 }
    ];

    const plan = generateSettlementPlanFromBalances(balances);

    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      payerId: 'u_bob',
      recipientId: 'u_alice',
      amountMinor: 5000,
      status: 'suggested'
    });
  });

  test('2: Multiple debtors and one creditor', () => {
    // Alice is owed 6000. Bob owes 4000. Carol owes 2000.
    const balances = [
      { userId: 'u_alice', name: 'Alice', email: 'a@ex.com', netBalanceMinor: 6000 },
      { userId: 'u_bob', name: 'Bob', email: 'b@ex.com', netBalanceMinor: -4000 },
      { userId: 'u_carol', name: 'Carol', email: 'c@ex.com', netBalanceMinor: -2000 }
    ];

    const plan = generateSettlementPlanFromBalances(balances);

    // Should produce 2 payments:
    // Bob pays Alice 4000
    // Carol pays Alice 2000
    expect(plan).toHaveLength(2);
    expect(plan[0].payerId).toBe('u_bob');
    expect(plan[0].recipientId).toBe('u_alice');
    expect(plan[0].amountMinor).toBe(4000);

    expect(plan[1].payerId).toBe('u_carol');
    expect(plan[1].recipientId).toBe('u_alice');
    expect(plan[1].amountMinor).toBe(2000);
  });

  test('3: One debtor and multiple creditors', () => {
    // Bob owes 9000. Alice is owed 5000. Carol is owed 4000.
    const balances = [
      { userId: 'u_bob', name: 'Bob', email: 'b@ex.com', netBalanceMinor: -9000 },
      { userId: 'u_alice', name: 'Alice', email: 'a@ex.com', netBalanceMinor: 5000 },
      { userId: 'u_carol', name: 'Carol', email: 'c@ex.com', netBalanceMinor: 4000 }
    ];

    const plan = generateSettlementPlanFromBalances(balances);

    expect(plan).toHaveLength(2);
    expect(plan[0].payerId).toBe('u_bob');
    expect(plan[0].recipientId).toBe('u_alice');
    expect(plan[0].amountMinor).toBe(5000);

    expect(plan[1].payerId).toBe('u_bob');
    expect(plan[1].recipientId).toBe('u_carol');
    expect(plan[1].amountMinor).toBe(4000);
  });

  test('4: Already settled group (all balances zero)', () => {
    const balances = [
      { userId: 'u_alice', name: 'Alice', email: 'a@ex.com', netBalanceMinor: 0 },
      { userId: 'u_bob', name: 'Bob', email: 'b@ex.com', netBalanceMinor: 0 }
    ];

    const plan = generateSettlementPlanFromBalances(balances);
    expect(plan).toEqual([]);
  });

  test('5: Inconsistent balance totals (debts != credits) throws error', () => {
    const invalidBalances = [
      { userId: 'u_alice', name: 'Alice', email: 'a@ex.com', netBalanceMinor: 5000 },
      { userId: 'u_bob', name: 'Bob', email: 'b@ex.com', netBalanceMinor: -4000 } // missing 1000!
    ];

    expect(() => generateSettlementPlanFromBalances(invalidBalances)).toThrow(
      /Total debts .* do not match total credits/
    );
  });

  test('6: No duplicate or zero-value transfers generated', () => {
    const balances = [
      { userId: 'u1', name: 'User 1', email: '1@ex.com', netBalanceMinor: 1000 },
      { userId: 'u2', name: 'User 2', email: '2@ex.com', netBalanceMinor: 2000 },
      { userId: 'u3', name: 'User 3', email: '3@ex.com', netBalanceMinor: -1500 },
      { userId: 'u4', name: 'User 4', email: '4@ex.com', netBalanceMinor: -1500 }
    ];

    const plan = generateSettlementPlanFromBalances(balances);

    plan.forEach((t) => {
      expect(t.amountMinor).toBeGreaterThan(0);
      expect(t.payerId).not.toBe(t.recipientId);
    });

    // Verify all debts and credits fully resolved
    const totalTransferred = plan.reduce((sum, t) => sum + t.amountMinor, 0);
    expect(totalTransferred).toBe(3000);
  });
});
