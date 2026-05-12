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

/**
 * @swagger
 * /api/summarize/upload:
 *   post:
 *     summary: Upload PDF/DOCX and summarize
 *     tags: [Summarize]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               format:
 *                 type: string
 *                 enum: [bullets, paragraph]
 *     responses:
 *       200:
 *         description: Summary ready
 *       400:
 *         description: Invalid file
 */
router.post('/upload', auth, upload.single('file'), summarizeFile);

/**
 * @swagger
 * /api/summarize/text:
 *   post:
 *     summary: Summarize plain text
 *     tags: [Summarize]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *               format:
 *                 type: string
 *                 enum: [bullets, paragraph]
 *     responses:
 *       200:
 *         description: Summary ready
 */
router.post('/text', auth, summarizeText);

router.post('/upload', auth, uploadSingleFile, asyncHandler(summarizeFile));
router.post('/text', auth, asyncHandler(summarizeText));

module.exports = router;