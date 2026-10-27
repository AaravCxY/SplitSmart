const { computeBalancesFromRecords } = require('../src/services/balanceService');

describe('Balance Calculation Engine', () => {
  const alice = { _id: 'u_alice', name: 'Alice' };
  const bob = { _id: 'u_bob', name: 'Bob' };
  const carol = { _id: 'u_carol', name: 'Carol' };
  const members = [alice, bob, carol];

  test('1 & 2: One person pays for three participants (including payer)', () => {
    // Alice pays 900 (90000 minor) for Alice, Bob, Carol (30000 each)
    const expenses = [
      {
        paidBy: 'u_alice',
        amountMinor: 90000,
        participants: [
          { user: 'u_alice', shareMinor: 30000 },
          { user: 'u_bob', shareMinor: 30000 },
          { user: 'u_carol', shareMinor: 30000 }
        ]
      }
    ];

    const balances = computeBalancesFromRecords({ members, expenses, settlements: [] });

    const aliceBal = balances.find((b) => b.userId === 'u_alice');
    const bobBal = balances.find((b) => b.userId === 'u_bob');
    const carolBal = balances.find((b) => b.userId === 'u_carol');

    // Alice paid 90000, share 30000 -> net +60000 (owed 60000)
    expect(aliceBal.netBalanceMinor).toBe(60000);
    expect(aliceBal.amountReceivableMinor).toBe(60000);
    expect(aliceBal.amountOwedMinor).toBe(0);

    // Bob paid 0, share 30000 -> net -30000 (owes 30000)
    expect(bobBal.netBalanceMinor).toBe(-30000);
    expect(bobBal.amountOwedMinor).toBe(30000);

    // Carol paid 0, share 30000 -> net -30000 (owes 30000)
    expect(carolBal.netBalanceMinor).toBe(-30000);
    expect(carolBal.amountOwedMinor).toBe(30000);

    // Sum of net balances must be zero
    const sum = balances.reduce((acc, b) => acc + b.netBalanceMinor, 0);
    expect(sum).toBe(0);
  });

  test('3: An expense includes only selected participants (excludes one member)', () => {
    // Bob pays 30000 for Bob and Carol only (15000 each). Alice not included.
    const expenses = [
      {
        paidBy: 'u_bob',
        amountMinor: 30000,
        participants: [
          { user: 'u_bob', shareMinor: 15000 },
          { user: 'u_carol', shareMinor: 15000 }
        ]
      }
    ];

    const balances = computeBalancesFromRecords({ members, expenses, settlements: [] });

    const aliceBal = balances.find((b) => b.userId === 'u_alice');
    const bobBal = balances.find((b) => b.userId === 'u_bob');
    const carolBal = balances.find((b) => b.userId === 'u_carol');

    expect(aliceBal.netBalanceMinor).toBe(0);
    expect(bobBal.netBalanceMinor).toBe(15000);
    expect(carolBal.netBalanceMinor).toBe(-15000);
  });

  test('4: Unequal exact splits', () => {
    // Alice pays 10000: Alice 2000, Bob 5000, Carol 3000
    const expenses = [
      {
        paidBy: 'u_alice',
        amountMinor: 10000,
        participants: [
          { user: 'u_alice', shareMinor: 2000 },
          { user: 'u_bob', shareMinor: 5000 },
          { user: 'u_carol', shareMinor: 3000 }
        ]
      }
    ];

    const balances = computeBalancesFromRecords({ members, expenses, settlements: [] });

    expect(balances.find((b) => b.userId === 'u_alice').netBalanceMinor).toBe(8000);
    expect(balances.find((b) => b.userId === 'u_bob').netBalanceMinor).toBe(-5000);
    expect(balances.find((b) => b.userId === 'u_carol').netBalanceMinor).toBe(-3000);
  });

  test('5: Multiple expenses with different payers (Demo scenario)', () => {
    // 1. Alice pays 900 for Alice (300), Bob (300), Carol (300)
    // 2. Bob pays 300 for Bob (150), Carol (150)
    // 3. Carol pays 150 for Carol (75), Alice (75)
    const expenses = [
      {
        paidBy: 'u_alice',
        amountMinor: 90000,
        participants: [
          { user: 'u_alice', shareMinor: 30000 },
          { user: 'u_bob', shareMinor: 30000 },
          { user: 'u_carol', shareMinor: 30000 }
        ]
      },
      {
        paidBy: 'u_bob',
        amountMinor: 30000,
        participants: [
          { user: 'u_bob', shareMinor: 15000 },
          { user: 'u_carol', shareMinor: 15000 }
        ]
      },
      {
        paidBy: 'u_carol',
        amountMinor: 15000,
        participants: [
          { user: 'u_carol', shareMinor: 7500 },
          { user: 'u_alice', shareMinor: 7500 }
        ]
      }
    ];

    const balances = computeBalancesFromRecords({ members, expenses, settlements: [] });

    const aliceBal = balances.find((b) => b.userId === 'u_alice');
    const bobBal = balances.find((b) => b.userId === 'u_bob');
    const carolBal = balances.find((b) => b.userId === 'u_carol');

    // Alice: paid 90000, shares: 30000 + 7500 = 37500. Net = 90000 - 37500 = +52500 (+₹525)
    expect(aliceBal.totalPaidMinor).toBe(90000);
    expect(aliceBal.totalShareMinor).toBe(37500);
    expect(aliceBal.netBalanceMinor).toBe(52500);

    // Bob: paid 30000, shares: 30000 + 15000 = 45000. Net = 30000 - 45000 = -15000 (-₹150)
    expect(bobBal.totalPaidMinor).toBe(30000);
    expect(bobBal.totalShareMinor).toBe(45000);
    expect(bobBal.netBalanceMinor).toBe(-15000);

    // Carol: paid 15000, shares: 30000 + 15000 + 7500 = 52500. Net = 15000 - 52500 = -37500 (-₹375)
    expect(carolBal.totalPaidMinor).toBe(15000);
    expect(carolBal.totalShareMinor).toBe(52500);
    expect(carolBal.netBalanceMinor).toBe(-37500);

    // Total conservation: 52500 - 15000 - 37500 = 0
    const sum = balances.reduce((acc, b) => acc + b.netBalanceMinor, 0);
    expect(sum).toBe(0);
  });

  test('6: A completed settlement changes balances correctly', () => {
    // Start with Alice owed 60000, Bob owing 30000, Carol owing 30000
    const expenses = [
      {
        paidBy: 'u_alice',
        amountMinor: 60000,
        participants: [
          { user: 'u_bob', shareMinor: 30000 },
          { user: 'u_carol', shareMinor: 30000 }
        ]
      }
    ];

    // Bob pays Alice 30000 settlement
    const settlements = [
      {
        payer: 'u_bob',
        recipient: 'u_alice',
        amountMinor: 30000,
        status: 'completed'
      }
    ];

    const balances = computeBalancesFromRecords({ members, expenses, settlements });

    const bobBal = balances.find((b) => b.userId === 'u_bob');
    const aliceBal = balances.find((b) => b.userId === 'u_alice');
    const carolBal = balances.find((b) => b.userId === 'u_carol');

    // Bob is now settled (0)
    expect(bobBal.netBalanceMinor).toBe(0);
    expect(bobBal.amountOwedMinor).toBe(0);

    // Alice is now owed 30000 (was 60000, received 30000)
    expect(aliceBal.netBalanceMinor).toBe(30000);

    // Carol still owes 30000
    expect(carolBal.netBalanceMinor).toBe(-30000);

    const sum = balances.reduce((acc, b) => acc + b.netBalanceMinor, 0);
    expect(sum).toBe(0);
  });

  test('7: Pending settlements do NOT affect balances', () => {
    const expenses = [
      {
        paidBy: 'u_alice',
        amountMinor: 60000,
        participants: [
          { user: 'u_bob', shareMinor: 60000 }
        ]
      }
    ];

    const settlements = [
      {
        payer: 'u_bob',
        recipient: 'u_alice',
        amountMinor: 60000,
        status: 'pending' // pending should NOT update ledger
      }
    ];

    const balances = computeBalancesFromRecords({ members, expenses, settlements });

    expect(balances.find((b) => b.userId === 'u_bob').netBalanceMinor).toBe(-60000);
    expect(balances.find((b) => b.userId === 'u_alice').netBalanceMinor).toBe(60000);
  });
});
