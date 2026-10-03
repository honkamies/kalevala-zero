import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { verifyToken } from '../auth';

interface PlayerSession {
  ws: WebSocket;
  userId: string;
  username: string;
  characterId?: string;
  sectorName?: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  animState: string;
  isAlive: boolean;
  msgWindowStart: number;
  msgCount: number;
  lastMoveBroadcast: number;
}

const MAX_PAYLOAD_BYTES = 4 * 1024;
const MAX_MSGS_PER_SECOND = 60;
const MAX_CHAT_LENGTH = 200;
const MAX_COORD = 100000;
const MOVE_BROADCAST_INTERVAL_MS = 50;
const HEARTBEAT_INTERVAL_MS = 30000;
const ALLOWED_ANIM_STATES = new Set(['idle', 'walk', 'run', 'attack', 'hurt', 'dead', 'dash', 'cast']);

const isFiniteCoord = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= MAX_COORD;
const clampStat = (n: unknown, fallback: number): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(Math.max(n, 1), 1e6) : fallback;
const cleanString = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined;

export class GameNetworkManager {
  private wss: WebSocketServer;
  private sessions: Map<WebSocket, PlayerSession> = new Map();

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_PAYLOAD_BYTES });

    // Heartbeat: drop connections that stop answering pings so sessions never leak
    const heartbeat = setInterval(() => {
      this.sessions.forEach((s, sock) => {
        if (!s.isAlive) {
          sock.terminate();
          return;
        }
        s.isAlive = false;
        sock.ping();
      });
    }, HEARTBEAT_INTERVAL_MS);
    heartbeat.unref();
    this.wss.on('close', () => clearInterval(heartbeat));


    this.wss.on('connection', (ws: WebSocket, req) => {
      // Parse query params for token
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');

      const verified = token ? verifyToken(token) : null;
      if (!verified) {
        ws.close(4401, 'Authentication required');
        return;
      }
      const user = verified;

      const session: PlayerSession = {
        ws,
        userId: user.id,
        username: user.username,
        x: 0,
        y: 0,
        health: 100,
        maxHealth: 100,
        animState: 'idle',
        isAlive: true,
        msgWindowStart: Date.now(),
        msgCount: 0,
        lastMoveBroadcast: 0
      };

      this.sessions.set(ws, session);
      console.log(`[WS] Player connected: ${session.username} (${this.sessions.size} online)`);

      // Send welcome / ack
      ws.send(JSON.stringify({
        type: 'INIT_ACK',
        userId: session.userId,
        username: session.username
      }));

      ws.on('pong', () => { session.isAlive = true; });
      ws.on('error', (err) => console.error('[WS Socket Error]:', err.message));

      ws.on('message', (messageRaw: any) => {
        // Per-socket rate limit
        const now = Date.now();
        if (now - session.msgWindowStart >= 1000) {
          session.msgWindowStart = now;
          session.msgCount = 0;
        }
        if (++session.msgCount > MAX_MSGS_PER_SECOND) {
          if (session.msgCount === MAX_MSGS_PER_SECOND + 1) {
            console.warn(`[WS] Rate limit exceeded: ${session.username}`);
          }
          if (session.msgCount > MAX_MSGS_PER_SECOND * 5) ws.close(4429, 'Rate limit exceeded');
          return;
        }
        try {
          const msg = JSON.parse(messageRaw.toString());
          if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;
          this.handleMessage(ws, session, msg);
        } catch (err) {
          console.error('[WS Message Error]:', err);
        }
      });

      ws.on('close', () => {
        this.broadcastSector(session.sectorName, {
          type: 'PLAYER_LEFT',
          userId: session.userId
        }, ws);
        this.sessions.delete(ws);
        console.log(`[WS] Player disconnected: ${session.username}`);
      });
    });
  }

  private handleMessage(ws: WebSocket, session: PlayerSession, msg: any) {
    if (msg.type !== 'JOIN_SECTOR' && !session.sectorName) return;
    switch (msg.type) {
      case 'JOIN_SECTOR':
        {
          const sectorName = cleanString(msg.sectorName, 64);
          if (!sectorName) return;
          // Leave previous sector cleanly if switching
          if (session.sectorName && session.sectorName !== sectorName) {
            this.broadcastSector(session.sectorName, { type: 'PLAYER_LEFT', userId: session.userId }, ws);
          }
          session.sectorName = sectorName;
        }
        session.characterId = cleanString(msg.characterId, 64);
        session.x = isFiniteCoord(msg.x) ? msg.x : 0;
        session.y = isFiniteCoord(msg.y) ? msg.y : 0;
        session.maxHealth = clampStat(msg.maxHealth, 100);
        session.health = Math.min(clampStat(msg.health, session.maxHealth), session.maxHealth);
        
        // Notify others in this sector
        this.broadcastSector(session.sectorName, {
          type: 'PLAYER_JOINED',
          player: {
            userId: session.userId,
            username: session.username,
            x: session.x,
            y: session.y,
            health: session.health,
            maxHealth: session.maxHealth,
            appearance: msg.appearance
          }
        }, ws);

        // Send existing players in sector to joining player
        const otherPlayers: any[] = [];
        this.sessions.forEach((s, otherWs) => {
          if (otherWs !== ws && s.sectorName === session.sectorName) {
            otherPlayers.push({
              userId: s.userId,
              username: s.username,
              x: s.x,
              y: s.y,
              health: s.health,
              maxHealth: s.maxHealth
            });
          }
        });
        ws.send(JSON.stringify({ type: 'SECTOR_PLAYERS', players: otherPlayers }));
        break;

      case 'PLAYER_MOVE':
        if (!isFiniteCoord(msg.x) || !isFiniteCoord(msg.y)) return;
        session.x = msg.x;
        session.y = msg.y;
        session.animState = ALLOWED_ANIM_STATES.has(msg.animState) ? msg.animState : 'idle';
        {
          // Throttle position fan-out; latest state is still stored on the session
          const now = Date.now();
          if (now - session.lastMoveBroadcast < MOVE_BROADCAST_INTERVAL_MS) break;
          session.lastMoveBroadcast = now;
        }
        this.broadcastSector(session.sectorName, {
          type: 'PLAYER_UPDATE',
          userId: session.userId,
          x: session.x,
          y: session.y,
          animState: session.animState,
          direction: typeof msg.direction === 'number' || typeof msg.direction === 'string' ? msg.direction : undefined
        }, ws);
        break;

      case 'PLAYER_ATTACK':
        this.broadcastSector(session.sectorName, {
          type: 'PLAYER_ATTACK_EVENT',
          userId: session.userId,
          attackType: cleanString(msg.attackType, 32),
          targetX: isFiniteCoord(msg.targetX) ? msg.targetX : undefined,
          targetY: isFiniteCoord(msg.targetY) ? msg.targetY : undefined
        }, ws);
        break;

      case 'CHAT_MESSAGE': {
        const text = cleanString(typeof msg.text === 'string' ? msg.text.trim() : undefined, MAX_CHAT_LENGTH);
        if (!text) return;
        this.broadcastSector(session.sectorName, {
          type: 'CHAT_BROADCAST',
          username: session.username,
          text,
          timestamp: new Date().toLocaleTimeString()
        });
        break;
      }
    }
  }

  private broadcastSector(sectorName: string | undefined, payload: any, senderWs?: WebSocket) {
    if (!sectorName) return;
    const data = JSON.stringify(payload);
    this.sessions.forEach((s, ws) => {
      if (s.sectorName === sectorName && ws !== senderWs && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }
}
