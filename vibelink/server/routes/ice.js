import express from 'express';

const router = express.Router();

// GET /api/ice-servers
// Fetches TURN credentials from Metered using the server-side API key and
// returns the ICE server array to the client. The secret API key stays on the
// server and is never exposed to the browser.
router.get('/', async (req, res) => {
  const apiKey = process.env.METERED_SECRET_KEY;
  const domain = process.env.METERED_DOMAIN;

  if (!apiKey || !domain) {
    console.warn('METERED_SECRET_KEY / METERED_DOMAIN not set; returning STUN only');
    return res.json([{ urls: 'stun:stun.l.google.com:19302' }]);
  }

  try {
    const response = await fetch(
      `https://${domain}/api/v1/turn/credentials?apiKey=${apiKey}`
    );
    if (!response.ok) {
      throw new Error(`Metered API responded ${response.status}`);
    }
    const iceServers = await response.json();
    res.json(iceServers);
  } catch (err) {
    console.error('Failed to fetch ICE servers from Metered:', err.message);
    // Fall back to STUN so the client still gets a valid (if limited) config
    res.json([{ urls: 'stun:stun.l.google.com:19302' }]);
  }
});

export default router;
