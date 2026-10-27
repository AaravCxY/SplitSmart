const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { updateProfileSchema } = require('../validators/authValidators');

router.use(authenticate);

router.get('/me', userController.getProfile);
router.patch('/me', validateRequest(updateProfileSchema), userController.updateProfile);

module.exports = router;
