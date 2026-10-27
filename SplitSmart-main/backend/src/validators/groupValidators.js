const { z } = require('zod');

const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'Group name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().default(''),
  type: z.enum(['Trip', 'Home', 'Event', 'Other']).default('Other'),
  currency: z.string().trim().toUpperCase().min(1).max(5).default('INR'),
  initialMemberEmails: z.array(z.string().trim().email().toLowerCase()).optional().default([])
});

const updateGroupSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  type: z.enum(['Trip', 'Home', 'Event', 'Other']).optional()
});

const addMemberSchema = z.object({
  email: z.string().trim().email('Valid user email required').toLowerCase()
});

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema
};
