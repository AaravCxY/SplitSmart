const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// All user settlements across groups
router.get('/', settlementController.getAllUserSettlements);

module.exports = router;
