const express = require('express');
const multer = require('multer');
const router = express.Router();
const { summarizeFile, summarizeText } = require('../controllers/summarizeCtrl');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const uploadSingleFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size 10MB se zyada nahi ho sakta!' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }

    return res.status(400).json({ message: err.message || 'Invalid file upload!' });
  });
};

router.post('/upload', auth, uploadSingleFile, summarizeFile);
router.post('/text', auth, summarizeText);

module.exports = router;