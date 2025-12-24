const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { rateLimitMiddleware } = require('../middleware/rateLimiter');
const requireAuth = require('../middleware/auth');

const submitLimiter = rateLimitMiddleware(10);

router.post('/lost-items', submitLimiter, reportController.createLostItem);
router.post('/feedback', submitLimiter, reportController.createFeedback);

router.get('/admin/lost-items', requireAuth, reportController.getLostItems);
router.get('/admin/feedback', requireAuth, reportController.getFeedback);
router.patch('/admin/lost-items/:id', requireAuth, reportController.updateLostItemStatus);
router.delete('/admin/lost-items/:id', requireAuth, reportController.deleteLostItem);
router.delete('/admin/feedback/:id', requireAuth, reportController.deleteFeedback);

router.get('/auth/driver/lost-items', reportController.getDriverLostItems);
router.post('/auth/driver/lost-items/:id/resolve', submitLimiter, reportController.resolveDriverLostItem);

module.exports = router;
