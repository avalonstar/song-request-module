const router = require('express').Router();
router.post('/next', (req, res) => res.json({ status: 200, message: 'test' }));
router.post('/toggle', (req, res) => res.json({ status: 200, message: 'test' }));
router.post('/limit', (req, res) => res.json({ status: 200, message: 'test' }));

router.get('/next', (req, res) => res.json({ status: 200, message: 'next' }));
module.exports = router;
