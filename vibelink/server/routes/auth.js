import express from 'express';
const router = express.Router();

router.get('/x', (req, res) => {
  res.json({ message: 'auth.x placeholder' });
});

router.get('/x/callback', (req, res) => {
  res.json({ message: 'auth.x.callback placeholder' });
});

export default router;