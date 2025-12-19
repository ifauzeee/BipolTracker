const express = require('express');
const router = express.Router();
const infoController = require('../controllers/infoController');
const requireAuth = require('../middleware/auth');

router.get('/info', infoController.getInfo);
router.get('/config', infoController.getConfig);

router.get('/admin/info', requireAuth, infoController.adminGetInfo);
router.post('/info', requireAuth, infoController.createInfo);
router.delete('/info/:id', requireAuth, infoController.deleteInfo);

module.exports = router;
