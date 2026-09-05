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
}

export class GameNetworkManager {
  private wss: WebSocketServer;
  private sessions: Map<WebSocket, PlayerSession> = new Map();

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      // Parse query params for token
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');

      let user = { id: 'anon_' + Math.random().toString(36).substring(2, 7), username: 'Wanderer' };
      if (token) {
        const verified = verifyToken(token);
        if (verified) {
          user = verified;
        }
      }

      const session: PlayerSession = {
        ws,
        userId: user.id,
        username: user.username,
        x: 0,
        y: 0,
        health: 100,
        maxHealth: 100,
        animState: 'idle'
      };

      this.sessions.set(ws, session);
      console.log(`[WS] Player connected: ${session.username} (${this.sessions.size} online)`);

      // Send welcome / ack
      ws.send(JSON.stringify({
        type: 'INIT_ACK',
        userId: session.userId,
        username: session.username
      }));

      ws.on('message', (messageRaw: string) => {
        try {
          const msg = JSON.parse(messageRaw.toString());
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
    switch (msg.type) {
      case 'JOIN_SECTOR':
        session.sectorName = msg.sectorName;
        session.characterId = msg.characterId;
        session.x = msg.x || 0;
        session.y = msg.y || 0;
        session.health = msg.health || 100;
        session.maxHealth = msg.maxHealth || 100;
        
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
        session.x = msg.x;
        session.y = msg.y;
        session.animState = msg.animState || 'idle';
        this.broadcastSector(session.sectorName, {
          type: 'PLAYER_UPDATE',
          userId: session.userId,
          x: session.x,
          y: session.y,
          animState: session.animState,
          direction: msg.direction
        }, ws);
        break;

      case 'PLAYER_ATTACK':
        this.broadcastSector(session.sectorName, {
          type: 'PLAYER_ATTACK_EVENT',
          userId: session.userId,
          attackType: msg.attackType,
          targetX: msg.targetX,
          targetY: msg.targetY
        }, ws);
        break;

      case 'CHAT_MESSAGE':
        this.broadcastSector(session.sectorName, {
          type: 'CHAT_BROADCAST',
          username: session.username,
          text: msg.text,
          timestamp: new Date().toLocaleTimeString()
        });
        break;
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
