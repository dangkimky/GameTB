import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { roomManager } from './RoomManager.js';
import { GameEngine } from '../src/core/GameEngine.js';
import { TurnManager } from '../src/core/TurnManager.js';
import { BotBrain } from '../src/core/BotBrain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3333;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 1. Tạo HTTP Server phục vụ file tĩnh & API kiểm tra trạng thái
const server = http.createServer((req, res) => {
  // CORS Headers cho mọi request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = req.url.split('?')[0];

  // Endpoint 1: Health check cho Render / Cloud 24/7
  if (reqPath === '/health' || reqPath === '/ping') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), time: Date.now() }));
    return;
  }

  // Endpoint 2: REST API lấy danh sách phòng công cộng (Fallback khi WebSocket đang kết nối hoặc đánh thức Cloud)
  if (reqPath === '/api/rooms') {
    const publicRooms = roomManager.getPublicRooms();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify({ success: true, rooms: publicRooms }));
    return;
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/public/index.html';
  }

  let filePath = path.join(ROOT_DIR, reqPath);
  if (!fs.existsSync(filePath)) {
    const publicPath = path.join(ROOT_DIR, 'public', reqPath);
    if (fs.existsSync(publicPath)) {
      filePath = publicPath;
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const indexHtml = path.join(filePath, 'index.html');
    if (fs.existsSync(indexHtml)) {
      filePath = indexHtml;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Không tìm thấy trang: ' + reqPath);
      } else {
        res.writeHead(500);
        res.end('Lỗi máy chủ nội bộ: ' + err.code);
      }
    } else {
      // Caching tối ưu cho điện thoại: File tĩnh cache 24h, HTML luôn kiểm tra phiên bản mới
      const cacheControl = (ext === '.html')
        ? 'no-cache, must-revalidate'
        : 'public, max-age=86400, stale-while-revalidate=604800';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': cacheControl
      });
      res.end(content);
    }
  });
});

/**
 * Nếu đến lượt của Bot trong phòng chơi chung, Server tự động điều khiển Bot đánh
 */
function runBotTurnsIfNeeded(room) {
  if (!room || !room.gameState || room.gameState.gameStatus === 'ENDED') return;
  let safetyCounter = 0;
  while (safetyCounter < 8 && room.gameState.gameStatus !== 'ENDED') {
    const activeId = room.gameState.turnOrder[room.gameState.currentTurnIndex];
    const activePlayer = room.gameState.players[activeId];
    if (activePlayer && activePlayer.isBot && !activePlayer.isGhost) {
      BotBrain.executeTurn(room.gameState, activeId);
      safetyCounter++;
    } else {
      break;
    }
  }
}

// 2. Tạo WebSocket Server xử lý tương tác thời gian thực
const wss = new WebSocketServer({ server });

function broadcastPublicRoomList(targetWs = null) {
  const payload = roomManager.getPublicRooms();
  const data = JSON.stringify({ type: 'ROOM_LIST', payload });
  if (targetWs && targetWs.readyState === 1) {
    targetWs.send(data);
    return;
  }
  for (const client of wss.clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  let currentRoomId = null;
  let currentSessionPlayerId = null;

  // Gửi danh sách phòng công cộng ngay khi client kết nối
  broadcastPublicRoomList(ws);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'GET_ROOMS': {
          broadcastPublicRoomList(ws);
          break;
        }

        case 'CREATE_ROOM': {
          const { hostName, maxPlayers, characterId, isTeamMode, fillBots, isPublic, roomName } = msg.payload || {};
          const playerId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const room = roomManager.createRoom({
            hostPlayerId: playerId,
            hostName: hostName || 'Chủ Phòng',
            maxPlayers: maxPlayers || 4,
            isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
            isTeamMode: Boolean(isTeamMode),
            fillBots: Boolean(fillBots),
            roomName: roomName || `Phòng của ${hostName || 'Chủ Phòng'}`
          });

          room.addPlayer({ id: playerId, name: hostName || 'Chủ Phòng', characterId: characterId || 'NV-01', ws });
          currentRoomId = room.roomId;
          currentSessionPlayerId = playerId;

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            payload: {
              roomId: room.roomId,
              playerId,
              lobby: room.getLobbyInfo()
            }
          }));
          broadcastPublicRoomList();
          break;
        }

        case 'JOIN_ROOM': {
          const { roomId, playerName, characterId } = msg.payload || {};
          const normalizedCode = String(roomId || '').trim().toUpperCase();
          const room = roomManager.getRoom(normalizedCode);
          if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', message: `Phòng ${normalizedCode} không tồn tại hoặc đã bị hủy` }));
            return;
          }

          const playerId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          try {
            room.addPlayer({ id: playerId, name: playerName || 'Hàng Xóm', characterId, ws });
            currentRoomId = room.roomId;
            currentSessionPlayerId = playerId;

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              payload: {
                roomId: room.roomId,
                playerId,
                lobby: room.getLobbyInfo()
              }
            }));

            room.broadcast({
              type: 'LOBBY_UPDATED',
              payload: room.getLobbyInfo()
            });
            broadcastPublicRoomList();
          } catch (e) {
            ws.send(JSON.stringify({ type: 'ERROR', message: e.message }));
          }
          break;
        }

        case 'LEAVE_ROOM': {
          if (currentRoomId && currentSessionPlayerId) {
            const room = roomManager.getRoom(currentRoomId);
            if (room) {
              room.removePlayer(currentSessionPlayerId);
              if (room.players.size === 0) {
                roomManager.deleteRoom(currentRoomId);
              } else {
                room.broadcast({ type: 'LOBBY_UPDATED', payload: room.getLobbyInfo() });
              }
              broadcastPublicRoomList();
            }
            ws.send(JSON.stringify({ type: 'ROOM_LEFT' }));
            currentRoomId = null;
            currentSessionPlayerId = null;
          }
          break;
        }

        case 'SELECT_CHARACTER': {
          const { characterId } = msg.payload || {};
          const room = roomManager.getRoom(currentRoomId);
          if (room && currentSessionPlayerId) {
            try {
              room.selectCharacter(currentSessionPlayerId, characterId);
              room.broadcast({ type: 'LOBBY_UPDATED', payload: room.getLobbyInfo() });
            } catch (e) {
              ws.send(JSON.stringify({ type: 'ERROR', message: e.message }));
            }
          }
          break;
        }

        case 'SET_READY': {
          const { isReady } = msg.payload || {};
          const room = roomManager.getRoom(currentRoomId);
          if (room && currentSessionPlayerId) {
            room.setReady(currentSessionPlayerId, isReady);
            room.broadcast({ type: 'LOBBY_UPDATED', payload: room.getLobbyInfo() });
          }
          break;
        }

        case 'START_GAME': {
          const room = roomManager.getRoom(currentRoomId);
          if (room && room.hostPlayerId === currentSessionPlayerId) {
            try {
              room.startGame(msg.payload || {});
              runBotTurnsIfNeeded(room);
              room.broadcastState();
              broadcastPublicRoomList();
            } catch (e) {
              ws.send(JSON.stringify({ type: 'ERROR', message: e.message }));
            }
          }
          break;
        }

        case 'GAME_ACTION': {
          const { actionType, params } = msg.payload || {};
          const room = roomManager.getRoom(currentRoomId);
          if (!room || room.status !== 'IN_GAME') return;

          try {
            if (actionType === 'NORMAL_SUMMON') {
              GameEngine.normalSummon(room.gameState, currentSessionPlayerId, params.cardInstanceId, params.slotIndex);
            } else if (actionType === 'SWARM_SUMMON') {
              GameEngine.swarmSummon(room.gameState, currentSessionPlayerId, params.cardInstanceId, params.slotIndex);
            } else if (actionType === 'TRIBUTE_SUMMON') {
              GameEngine.tributeSummon(room.gameState, currentSessionPlayerId, params.bossCardInstanceId, params.tributeSlotIndex);
            } else if (actionType === 'FUSION_SUMMON') {
              GameEngine.fusionSummon(room.gameState, currentSessionPlayerId, params.fusionCardId, params.materialInstanceIds);
            } else if (actionType === 'EQUIP_ITEM') {
              GameEngine.equipItem(room.gameState, currentSessionPlayerId, params.equipCardInstanceId, params.targetPlayerId, params.targetSlotIndex);
            } else if (actionType === 'USE_DRAMA') {
              GameEngine.useDrama(room.gameState, currentSessionPlayerId, params.dramaCardInstanceId, params.targetParams);
            } else if (actionType === 'SET_TRAP') {
              GameEngine.setTrap(room.gameState, currentSessionPlayerId, params.trapCardInstanceId, params.trapSlotIndex);
            } else if (actionType === 'ACTIVATE_TRAP') {
              GameEngine.activateTrap(room.gameState, currentSessionPlayerId, params.trapSlotIndex, params.triggerContext || {});
            } else if (actionType === 'ACTIVATE_FIELD_SKILL') {
              GameEngine.activateFieldSkill(room.gameState, currentSessionPlayerId, params.slotIndex, params.targetParams || {});
            } else if (actionType === 'ACTIVATE_CHARACTER_SKILL') {
              GameEngine.activateCharacterSkill(room.gameState, currentSessionPlayerId, params.targetParams || {});
            } else if (actionType === 'DECLARE_ATTACK') {
              GameEngine.declareAttack(room.gameState, currentSessionPlayerId, params.attackerSlotIndex, params.targetPlayerId, params.targetSlotIndex, params.options);
            } else if (actionType === 'MANUAL_DRAW') {
              if (!room.gameState.manualDrawUsedThisTurn) {
                TurnManager.drawCard(room.gameState, currentSessionPlayerId, { isNormalTurnDraw: true });
                room.gameState.manualDrawUsedThisTurn = true;
              }
            } else if (actionType === 'DISCARD_CARD') {
              const p = room.gameState.players[currentSessionPlayerId];
              if (p) {
                const idx = p.hand.findIndex(c => c.instanceId === params.cardInstanceId);
                if (idx !== -1) {
                  const [disc] = p.hand.splice(idx, 1);
                  room.gameState.graveyard.push(disc);
                }
              }
            } else if (actionType === 'END_TURN') {
              GameEngine.endTurn(room.gameState, currentSessionPlayerId, params.discardedInstanceIds || []);
              runBotTurnsIfNeeded(room);
            }

            room.broadcastState();
            room.resetTurnTimer();
          } catch (e) {
            ws.send(JSON.stringify({ type: 'ACTION_ERROR', message: e.message }));
          }
          break;
        }

        case 'CHAT_MESSAGE': {
          const { text } = msg.payload || {};
          const room = roomManager.getRoom(currentRoomId);
          if (room) {
            const player = room.players.get(currentSessionPlayerId);
            room.broadcast({
              type: 'CHAT_BROADCAST',
              payload: {
                senderId: currentSessionPlayerId,
                senderName: player?.name || 'Vô Danh',
                text,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              }
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error('Lỗi khi xử lý gói tin WebSocket:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentSessionPlayerId) {
      const room = roomManager.getRoom(currentRoomId);
      if (room) {
        room.removePlayer(currentSessionPlayerId);
        if (room.players.size === 0) {
          roomManager.deleteRoom(currentRoomId);
        } else {
          room.broadcast({ type: 'LOBBY_UPDATED', payload: room.getLobbyInfo() });
        }
        roomManager.cleanEmptyRooms();
        broadcastPublicRoomList();
      }
    }
  });
});

function getLocalIpAddresses() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  server.listen(PORT, '0.0.0.0', () => {
    const lanIps = getLocalIpAddresses();
    console.log('==============================================================');
    console.log(`🐉 SERVER ĐẠI CHIẾN THẦN THOẠI VIỆT ĐANG CHẠY!`);
    console.log(`👉 Trên máy này:      http://localhost:${PORT}`);
    lanIps.forEach(ip => {
      console.log(`👉 Cùng Wi-Fi / LAN:  http://${ip}:${PORT}`);
    });
    console.log('==============================================================');
  });
}

export { server, roomManager };
