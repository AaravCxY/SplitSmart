const { z } = require('zod');

const participantShareSchema = z.object({
  user: z.string().min(1, 'User ID is required'),
  shareMinor: z.number().int().positive().optional(),
  percentage: z.number().positive().optional()
});

const createExpenseSchema = z.object({
  title: z.string().trim().min(2, 'Expense title must be at least 2 characters').max(120),
  amount: z.number().positive().optional(),
  amountMinor: z.number().int().positive().optional(),
  currency: z.string().trim().toUpperCase().default('INR'),
  category: z.enum([
    'Food',
    'Transport',
    'Accommodation',
    'Groceries',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Other'
  ]).default('Other'),
  paidBy: z.string().min(1, 'Payer user ID is required'),
  participants: z.array(z.any()).min(1, 'At least one participant must be included in the split'),
  splitMethod: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE']).default('EQUAL'),
  expenseDate: z.string().or(z.date()).optional(),
  notes: z.string().trim().max(500).optional().default('')
}).refine((data) => data.amountMinor !== undefined || data.amount !== undefined, {
  message: 'Expense amount or amountMinor is required',
  path: ['amount']
});

const updateExpenseSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  amount: z.number().positive().optional(),
  amountMinor: z.number().int().positive().optional(),
  category: z.enum([
    'Food',
    'Transport',
    'Accommodation',
    'Groceries',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Other'
  ]).optional(),
  paidBy: z.string().min(1).optional(),
  participants: z.array(z.any()).min(1).optional(),
  splitMethod: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE']).optional(),
  expenseDate: z.string().or(z.date()).optional(),
  notes: z.string().trim().max(500).optional()
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema
};
