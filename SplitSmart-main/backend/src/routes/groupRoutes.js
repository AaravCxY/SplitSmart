const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const expenseController = require('../controllers/expenseController');
const settlementController = require('../controllers/settlementController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema
} = require('../validators/groupValidators');
const { createExpenseSchema } = require('../validators/expenseValidators');
const { createSettlementSchema } = require('../validators/settlementValidators');

router.use(authenticate);

// Group management
router.post('/', validateRequest(createGroupSchema), groupController.createGroup);
router.get('/', groupController.getGroups);
router.get('/:groupId', groupController.getGroupById);
router.patch('/:groupId', validateRequest(updateGroupSchema), groupController.updateGroup);
router.delete('/:groupId', groupController.deleteGroup);
router.post('/:groupId/members', validateRequest(addMemberSchema), groupController.addMember);

// Group Expenses
router.post('/:groupId/expenses', validateRequest(createExpenseSchema), expenseController.createExpense);
router.get('/:groupId/expenses', expenseController.getGroupExpenses);

// Group Balances and Settlements
router.get('/:groupId/balances', settlementController.getGroupBalancesHandler);
router.get('/:groupId/settlement-plan', settlementController.getSettlementPlanHandler);
router.get('/:groupId/settlements', settlementController.getGroupSettlements);
router.post('/:groupId/settlements', validateRequest(createSettlementSchema), settlementController.createSettlement);

module.exports = router;
