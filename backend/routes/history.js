// const express = require('express');
// const router = express.Router();
// const { getHistory, getSummary, deleteSummary, getSummaryPublic } = require('../controllers/historyCtrl');
// const auth = require('../middleware/auth');
// const asyncHandler = require('../middleware/asyncHandler');

// router.get('/share/:id', asyncHandler(getSummaryPublic));
// router.get('/', auth, asyncHandler(getHistory));
// router.get('/:id', auth, asyncHandler(getSummary));
// router.delete('/:id', auth, asyncHandler(deleteSummary));


// /**
//  * @swagger
//  * /api/history:
//  *   get:
//  *     summary: Get all summaries
//  *     tags: [History]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: List of summaries
//  */
// router.get('/', auth, getHistory);

// /**
//  * @swagger
//  * /api/history/{id}:
//  *   get:
//  *     summary: Get single summary
//  *     tags: [History]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *     responses:
//  *       200:
//  *         description: Summary data
//  *       404:
//  *         description: Not found
//  *   delete:
//  *     summary: Delete summary
//  *     tags: [History]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *     responses:
//  *       200:
//  *         description: Deleted
//  */
// router.get('/:id', auth, getSummary);
// router.delete('/:id', auth, deleteSummary);

// module.exports = router;


const express = require('express');
const router = express.Router();
const { getHistory, getSummary, deleteSummary, getSummaryPublic } = require('../controllers/historyCtrl');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Public
router.get('/share/:id', asyncHandler(getSummaryPublic));

// Protected
/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Get paginated summaries
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list
 */
router.get('/', auth, asyncHandler(getHistory));

/**
 * @swagger
 * /api/history/{id}:
 *   get:
 *     summary: Get single summary
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Summary data
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete summary
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.get('/:id', auth, asyncHandler(getSummary));
router.delete('/:id', auth, asyncHandler(deleteSummary));

module.exports = router;