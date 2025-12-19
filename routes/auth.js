const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { rateLimitMiddleware } = require('../middleware/rateLimiter');
const requireAuth = require('../middleware/auth');

const LOGIN_RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_LOGIN_MAX) || 5;
const loginLimiter = rateLimitMiddleware(LOGIN_RATE_LIMIT_MAX);

router.post('/login', loginLimiter, authController.login);
router.post('/change-password', requireAuth, authController.changePassword);
router.get('/status', authController.status);
router.post('/logout', authController.logout);

router.post('/driver/login', loginLimiter, authController.driverLogin);
router.get('/driver/status', authController.driverStatus);

module.exports = router;
