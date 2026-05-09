const express = require('express');
const router = express.Router();
const { getHistory, getSummary, deleteSummary } = require('../controllers/historyCtrl');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.get('/', auth, asyncHandler(getHistory));
router.get('/:id', auth, asyncHandler(getSummary));
router.delete('/:id', auth, asyncHandler(deleteSummary));

module.exports = router;