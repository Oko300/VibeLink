# VibeLink
Live screen-sharing for vibe coders. Drop a link. Let your community watch the AI build with you in real time.

## Stack
- Frontend: React + Vite (Vercel)
- Backend: Node.js + Express (Railway/Render)
- Screen Share: browser getDisplayMedia()
- WebRTC: LiveKit free tier
- Chat: Socket.io
- Auth: X (Twitter) OAuth 2.0
- Identity: JWT in localStorage
- Database: None (all ephemeral)

## Dev
# Terminal 1
cd server && npm run dev
# Terminal 2
cd client && npm run dev