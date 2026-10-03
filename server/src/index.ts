import express from 'express';
import http from 'http';
import cors from 'cors';
import { initDB } from './db';
import authRoutes from './routes/auth';
import characterRoutes from './routes/characters';
import worldRoutes from './routes/worlds';
import { GameNetworkManager } from './game/loop';
import { rateLimit } from './rateLimit';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap() {
  const app = express();

  // Middleware
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // CORS: set CORS_ORIGINS="https://a.example,https://b.example" to restrict; defaults to open for local/desktop use
  const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));

  // Request logger
  app.use((req, res, next) => {
    if (!req.url.startsWith('/health')) {
      console.log(`[HTTP] ${req.method} ${req.url}`);
    }
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'online',
      project: 'Kalevala-Zero: Cyber-Kalevala ARPG',
      version: '1.0.0',
      time: new Date().toISOString()
    });
  });

  // API Routes
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: 'Too many authentication attempts, try again later' }), authRoutes);
  app.use('/api/characters', characterRoutes);
  app.use('/api/worlds', worldRoutes);

  // Initialize DB
  await initDB();

  // Create HTTP & WebSocket Server
  const server = http.createServer(app);
  new GameNetworkManager(server);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🔥 KALEVALA-ZERO SERVER RUNNING ON PORT: ${PORT}`);
    console.log(`📡 WebSocket endpoint ready at ws://0.0.0.0:${PORT}/ws`);
    console.log(`⚔️  Kalevala Cyber-Forge Engine Initialized`);
    console.log(`====================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
