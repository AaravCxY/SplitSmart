const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { updateExpenseSchema } = require('../validators/expenseValidators');

router.use(authenticate);

// All user expenses across groups
router.get('/', expenseController.getAllUserExpenses);

// Single expense operations
router.get('/:expenseId', expenseController.getExpenseById);
router.patch('/:expenseId', validateRequest(updateExpenseSchema), expenseController.updateExpense);
router.delete('/:expenseId', expenseController.deleteExpense);

module.exports = router;
