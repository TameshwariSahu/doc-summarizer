const express = require('express');
const router = express.Router();
const { summarizeFile, summarizeText } = require('../controllers/summarizeCtrl');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/upload', auth, upload.single('file'), summarizeFile);
router.post('/text', auth, summarizeText);

module.exports = router;