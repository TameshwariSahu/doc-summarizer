const express = require('express');
const multer = require('multer');
const router = express.Router();
const { summarizeFile, summarizeText } = require('../controllers/summarizeCtrl');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

const uploadSingleFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(400, 'File size 10MB se zyada nahi ho sakta!'));
      }
      return next(new AppError(400, `Upload error: ${err.message}`));
    }

    return next(new AppError(400, err.message || 'Invalid file upload!'));
  });
};

router.post('/upload', auth, uploadSingleFile, asyncHandler(summarizeFile));
router.post('/text', auth, asyncHandler(summarizeText));

module.exports = router;