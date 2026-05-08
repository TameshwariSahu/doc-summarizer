const express = require('express');
const router = express.Router();
const { getHistory, getSummary, deleteSummary } = require('../controllers/historyCtrl');
const auth = require('../middleware/auth');

router.get('/', auth, getHistory);
router.get('/:id', auth, getSummary);
router.delete('/:id', auth, deleteSummary);

module.exports = router;