const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authCtrl');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', auth, asyncHandler(getMe));

module.exports = router;