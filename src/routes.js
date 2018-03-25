const router = require('express').Router();
const handlers = require('./handlers');

router.post('/create', async (req, res) => {
  try {
    const result = await handlers.createRequest(req.body);
    res.json(result);
  } catch (e) {
    res.json(e);
  }
});
router.post('/play/next', async (req, res) => {
  try {
    const result = await handlers.playNext(req.body);
    res.json(result);
  } catch (e) {
    res.json(e);
  }
});
router.post('/status', async (req, res) => {
  try {
    const result = handlers.setStatus(req.body);
    res.statusCode(200);
  } catch (e) {
    res.json(e);
  }
});
router.post('/limit', (req, res) => {
  try {
    const result = handlers.setLimit(req.body);
    res.statusCode(200);
  } catch (e) {
    res.json(e);
  }
});

router.get('/next/:channel', async (req, res) => {
  try {
    const result = await handlers.getNext(req.params);
    res.json(result);
  } catch (e) {
    res.json(e);
  }
});
router.get('/current/:channel', async (req, res) => {
  try {
    const result = await handlers.getCurrent(req.params);
    res.json(result);
  } catch (e) {
    res.json(e);
  }
});

router.get('/auth/spotify', async (req, res) => {
  try {
    const result = await handlers.spotifyAuth();
    if (result.access_token !== null) {
      res.json({ message: 'authed' });
    }
    res.json({ message: 'error' });
  } catch (e) {
    res.json(e);
  }
});

module.exports = router;
