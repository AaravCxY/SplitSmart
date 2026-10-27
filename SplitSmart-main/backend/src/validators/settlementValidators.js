const { z } = require('zod');

const createSettlementSchema = z.object({
  payerId: z.string().min(1, 'Payer user ID is required'),
  recipientId: z.string().min(1, 'Recipient user ID is required'),
  amount: z.number().positive().optional(),
  amountMinor: z.number().int().positive().optional(),
  currency: z.string().trim().toUpperCase().default('INR'),
  note: z.string().trim().max(300).optional().default(''),
  idempotencyKey: z.string().trim().optional()
}).refine((data) => data.payerId !== data.recipientId, {
  message: 'Payer and recipient cannot be the same user',
  path: ['recipientId']
}).refine((data) => data.amountMinor !== undefined || data.amount !== undefined, {
  message: 'Settlement amount is required',
  path: ['amount']
});

module.exports = {
  createSettlementSchema
};
