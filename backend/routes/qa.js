const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { getFaq, askQuestion } = require('../controllers/qaCtrl');

router.get('/faq/:contentHash', auth, asyncHandler(getFaq));
router.post('/ask', auth, asyncHandler(askQuestion));

module.exports = router;
