const router = require('express').Router();
router.get('/health', (req, res) => res.json({ status: 'ok', application: 'supermercado-inteligente', database: 'not_checked', timestamp: new Date().toISOString() }));
module.exports = router;
