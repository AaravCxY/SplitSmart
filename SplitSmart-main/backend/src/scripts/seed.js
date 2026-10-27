const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const { calculateGroupBalances } = require('../services/balanceService');
const { getGroupSettlementPlan } = require('../services/settlementService');
const { toMinorUnits, toMajorUnits } = require('../utils/currency');
const { processExpenseSplit } = require('../services/expenseService');

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Seed script cannot be run in production mode.');
    process.exit(1);
  }

  console.log('--- Starting SplitSmart Seed Script ---');
  await connectDB();

  // 1. Clean up existing demo data
  const demoEmails = ['alice@example.com', 'bob@example.com', 'carol@example.com'];
  const existingUsers = await User.find({ email: { $in: demoEmails } });
  const existingUserIds = existingUsers.map((u) => u._id);

  if (existingUserIds.length > 0) {
    const demoGroups = await Group.find({ creator: { $in: existingUserIds } });
    const demoGroupIds = demoGroups.map((g) => g._id);

    await Expense.deleteMany({ group: { $in: demoGroupIds } });
    await Settlement.deleteMany({ group: { $in: demoGroupIds } });
    await Group.deleteMany({ _id: { $in: demoGroupIds } });
    await User.deleteMany({ _id: { $in: existingUserIds } });
    console.log('Cleared existing demo records.');
  }

  // 2. Create demo users
  const password = 'Password123!';
  const alice = await User.create({ name: 'Alice Sharma', email: 'alice@example.com', password });
  const bob = await User.create({ name: 'Bob Verma', email: 'bob@example.com', password });
  const carol = await User.create({ name: 'Carol Singh', email: 'carol@example.com', password });

  console.log(`Created demo users:\n - Alice (alice@example.com)\n - Bob (bob@example.com)\n - Carol (carol@example.com)`);

  // 3. Create demo group "Goa Trip"
  const goaGroup = await Group.create({
    name: 'Goa Trip',
    description: 'Weekend beach holiday and expenses with friends',
    type: 'Trip',
    currency: 'INR',
    creator: alice._id,
    members: [alice._id, bob._id, carol._id]
  });

  console.log(`Created group: "${goaGroup.name}" (ID: ${goaGroup._id})`);

  const groupMembers = [String(alice._id), String(bob._id), String(carol._id)];

  // 4. Create required seed expenses:
  // Expense 1: Alice pays ₹900 for Alice, Bob, and Carol (equal split: ₹300 each)
  const exp1AmountMinor = toMinorUnits(900);
  const exp1Participants = processExpenseSplit({
    amountMinor: exp1AmountMinor,
    splitMethod: 'EQUAL',
    participants: [alice._id, bob._id, carol._id],
    groupMemberIds: groupMembers
  });

  const exp1 = await Expense.create({
    group: goaGroup._id,
    title: 'Beachside Villa Stay',
    amountMinor: exp1AmountMinor,
    currency: 'INR',
    category: 'Accommodation',
    paidBy: alice._id,
    participants: exp1Participants,
    splitMethod: 'EQUAL',
    expenseDate: new Date('2026-10-20T10:00:00Z'),
    notes: 'Advance booking for 2 nights',
    createdBy: alice._id
  });

  // Expense 2: Bob pays ₹300 for Bob and Carol (equal split: ₹150 each)
  const exp2AmountMinor = toMinorUnits(300);
  const exp2Participants = processExpenseSplit({
    amountMinor: exp2AmountMinor,
    splitMethod: 'EQUAL',
    participants: [bob._id, carol._id],
    groupMemberIds: groupMembers
  });

  const exp2 = await Expense.create({
    group: goaGroup._id,
    title: 'Seafood Dinner',
    amountMinor: exp2AmountMinor,
    currency: 'INR',
    category: 'Food',
    paidBy: bob._id,
    participants: exp2Participants,
    splitMethod: 'EQUAL',
    expenseDate: new Date('2026-10-20T20:30:00Z'),
    notes: 'Dinner at Britto’s',
    createdBy: bob._id
  });

  // Expense 3: Carol pays ₹150 for Carol and Alice (equal split: ₹75 each)
  const exp3AmountMinor = toMinorUnits(150);
  const exp3Participants = processExpenseSplit({
    amountMinor: exp3AmountMinor,
    splitMethod: 'EQUAL',
    participants: [carol._id, alice._id],
    groupMemberIds: groupMembers
  });

  const exp3 = await Expense.create({
    group: goaGroup._id,
    title: 'Scooter Rental Fuel',
    amountMinor: exp3AmountMinor,
    currency: 'INR',
    category: 'Transport',
    paidBy: carol._id,
    participants: exp3Participants,
    splitMethod: 'EQUAL',
    expenseDate: new Date('2026-10-21T09:00:00Z'),
    notes: 'Petrol refills for 2 scooters',
    createdBy: carol._id
  });

  console.log(`Created 3 demo expenses:\n - 1. ${exp1.title} (₹${toMajorUnits(exp1.amountMinor)})\n - 2. ${exp2.title} (₹${toMajorUnits(exp2.amountMinor)})\n - 3. ${exp3.title} (₹${toMajorUnits(exp3.amountMinor)})`);

  // 5. Inspect balances
  let balances = await calculateGroupBalances(goaGroup._id);
  console.log('\n--- Calculated Member Balances ---');
  balances.forEach((b) => {
    console.log(
      ` * ${b.name}: Net = ${b.netBalanceMinor > 0 ? '+' : ''}₹${toMajorUnits(b.netBalanceMinor)} (Paid: ₹${toMajorUnits(b.totalPaidMinor)}, Share: ₹${toMajorUnits(b.totalShareMinor)})`
    );
  });

  // 6. Generate optimized settlement plan
  const plan = await getGroupSettlementPlan(goaGroup._id);
  console.log('\n--- Suggested Settlement Plan ---');
  plan.forEach((t, i) => {
    console.log(` ${i + 1}. ${t.payerName} pays ${t.recipientName}: ₹${toMajorUnits(t.amountMinor)}`);
  });

  console.log('\nSeed script completed successfully!');
  await disconnectDB();
  process.exit(0);
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
