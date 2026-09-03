import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import session from 'express-session';
import passport from 'passport';

import sessionRoutes from './routes/session.js';
import authRoutes from './routes/auth.js';
import { initSessionSocket } from './socket/sessionSocket.js';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_URL,
}));
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

app.use('/api/session', sessionRoutes);
app.use('/auth', authRoutes);

initSessionSocket(io);

server.listen(PORT, () => {
  console.log(`VibeLink server running on port ${PORT}`);
});