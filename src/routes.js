/*

  routes:
    POST /:user/request/create
    GET /:user/request/next
    GET /:user/request/current
    GET /:user/play/next
    POST /:user/request/on
    POST /:user/request/off

*/

const router = require('express').Router();
const handlers = require('./handlers');

router.post('/create', async(req, res) => {
  try {
    const result = await handlers.createRequest(req.body);
    res.json(result);
  } catch (e) {
    res.json(e)
  }
});
router.post('/next', (req, res) => res.json({ status: 200, message: 'test' }));
router.post('/toggle', (req, res) => res.json({ status: 200, message: 'test' }));
router.post('/limit', (req, res) => res.json({ status: 200, message: 'test' }));

router.get('/next', (req, res) => res.json({ status: 200, message: 'next' }));
router.get('/current', (req, res) => {
  const result = handlers.test();
  res.json(result);
});

module.exports = router;
