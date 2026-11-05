const router = require('express').Router();
const { renderMetrics } = require('../observability/metrics');

router.get('/health', (req, res) => res.json({
    status: 'ok',
    application: 'supermercado-inteligente',
    database: 'not_checked',
    timestamp: new Date().toISOString()
}));

router.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(renderMetrics());
});

module.exports = router;
