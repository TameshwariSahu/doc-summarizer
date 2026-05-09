const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getFaq, askQuestion } = require('../controllers/qaCtrl');

router.get('/faq/:contentHash', auth, getFaq);
router.post('/ask', auth, askQuestion);

module.exports = router;
