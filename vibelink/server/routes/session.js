import express from 'express';
import { generateId } from '../utils/generateId.js';
import { sessionStore } from '../utils/sessionStore.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/create', (req, res) => {
  const sessionId = generateId();
  const builderToken = jwt.sign(
    { sessionId, role: 'builder', iat: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  sessionStore.create(sessionId, { builderId: sessionId });
  console.log("Session created:", sessionId);
  res.json({ sessionId, builderToken, sessionUrl: '/s/' + sessionId });
});

router.get('/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionStore.get(sessionId);
  if (session && sessionStore.isActive(sessionId)) {
    res.json({ active: true, sessionId, viewerCount: session.viewers.length });
  } else {
    res.status(404).json({ active: false, error: 'Session not found' });
  }
});

router.delete('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  sessionStore.delete(sessionId);
  res.json({ message: 'Session ended' });
});

export default router;