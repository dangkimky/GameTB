import { GameEngine } from '../src/core/GameEngine.js';
import { PHASES } from '../src/core/GameState.js';

export class GameRoom {
  constructor({ roomId, hostPlayerId, hostName, maxPlayers = 4, isTeamMode = false, fillBots = true, isPublic = true, roomName = null }) {
    this.roomId = roomId;
    this.hostPlayerId = hostPlayerId;
    this.hostName = hostName || 'Chủ Phòng';
    this.roomName = roomName || `Phòng của ${this.hostName}`;
    this.maxPlayers = Math.max(2, Math.min(6, maxPlayers));
    this.isTeamMode = Boolean(isTeamMode);
    this.fillBots = Boolean(fillBots);
    this.isPublic = isPublic !== undefined ? Boolean(isPublic) : true;
    this.createdAt = Date.now();
    this.status = 'LOBBY'; // 'LOBBY' | 'IN_GAME' | 'FINISHED'
    this.players = new Map(); // id -> { id, name, characterId, isReady, isHost, token }
    this.gameState = null;
    this.turnDeadline = null; // Mốc thời gian (ms) hết lượt — kiểm tra lười mỗi khi có request (serverless, không dùng setTimeout)
    this.turnTimeoutSeconds = 60;
    this.chat = []; // Tin nhắn gần nhất: { seq, senderId, senderName, text, time }
    this.chatSeq = 0;
  }

  /**
   * Chuyển phòng thành JSON thuần để lưu vào Netlify Database
   */
  toJSON() {
    return {
      roomId: this.roomId,
      hostPlayerId: this.hostPlayerId,
      hostName: this.hostName,
      roomName: this.roomName,
      maxPlayers: this.maxPlayers,
      isTeamMode: this.isTeamMode,
      fillBots: this.fillBots,
      isPublic: this.isPublic,
      createdAt: this.createdAt,
      status: this.status,
      players: Array.from(this.players.values()),
      gameState: this.gameState,
      turnDeadline: this.turnDeadline,
      turnTimeoutSeconds: this.turnTimeoutSeconds,
      chat: this.chat,
      chatSeq: this.chatSeq
    };
  }

  static fromJSON(data) {
    const room = new GameRoom({
      roomId: data.roomId,
      hostPlayerId: data.hostPlayerId,
      hostName: data.hostName,
      maxPlayers: data.maxPlayers,
      isTeamMode: data.isTeamMode,
      fillBots: data.fillBots,
      isPublic: data.isPublic,
      roomName: data.roomName
    });
    room.createdAt = data.createdAt || Date.now();
    room.status = data.status || 'LOBBY';
    room.players = new Map((data.players || []).map(p => [p.id, p]));
    room.gameState = data.gameState || null;
    room.turnDeadline = data.turnDeadline || null;
    room.turnTimeoutSeconds = data.turnTimeoutSeconds || 60;
    room.chat = data.chat || [];
    room.chatSeq = data.chatSeq || 0;
    return room;
  }

  addChatMessage({ senderId, senderName, text }) {
    const clean = String(text || '').trim().slice(0, 300);
    if (!clean) return null;
    const msg = {
      seq: ++this.chatSeq,
      senderId,
      senderName: senderName || 'Vô Danh',
      text: clean,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
    };
    this.chat.push(msg);
    if (this.chat.length > 30) this.chat = this.chat.slice(-30);
    return msg;
  }

  getHostName() {
    const host = this.players.get(this.hostPlayerId);
    return host ? host.name : (this.hostName || 'Chủ Phòng');
  }

  addPlayer({ id, name, characterId = null, token = null }) {
    if (this.status !== 'LOBBY') {
      throw new Error('Phòng đang trong trận đấu, không thể tham gia');
    }
    if (this.players.size >= this.maxPlayers) {
      throw new Error(`Phòng đã đầy (tối đa ${this.maxPlayers} người chơi)`);
    }

    // Thu thập danh sách Thẻ Đại Diện đã có người chọn trong phòng
    const takenCharacters = new Set();
    for (const p of this.players.values()) {
      if (p.characterId) {
        takenCharacters.add(p.characterId);
      }
    }

    // Nếu thẻ yêu cầu đã bị người khác chọn hoặc chưa chỉ định, tự động gán thẻ trống đầu tiên (NV-01 -> NV-08)
    let assignedChar = characterId;
    if (!assignedChar || takenCharacters.has(assignedChar)) {
      for (let i = 1; i <= 8; i++) {
        const candidate = `NV-0${i}`;
        if (!takenCharacters.has(candidate)) {
          assignedChar = candidate;
          break;
        }
      }
    }

    const isHost = this.players.size === 0;
    this.players.set(id, {
      id,
      name,
      characterId: assignedChar,
      isReady: isHost,
      isHost,
      token
    });

    return this.getLobbyInfo();
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostPlayerId === id && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      this.hostPlayerId = nextHost.id;
      nextHost.isHost = true;
    }
    return this.getLobbyInfo();
  }

  selectCharacter(playerId, characterId) {
    const player = this.players.get(playerId);
    if (!player) throw new Error('Người chơi không tồn tại');

    for (const [otherId, p] of this.players.entries()) {
      if (otherId !== playerId && p.characterId === characterId) {
        throw new Error(`Thẻ Đại Diện [${characterId}] đã có người khác chọn`);
      }
    }

    player.characterId = characterId;
    return this.getLobbyInfo();
  }

  setReady(playerId, isReady) {
    const player = this.players.get(playerId);
    if (!player) throw new Error('Người chơi không tồn tại');
    player.isReady = isReady;
    return this.getLobbyInfo();
  }

  getLobbyInfo() {
    return {
      roomId: this.roomId,
      roomName: this.roomName,
      hostPlayerId: this.hostPlayerId,
      hostName: this.getHostName(),
      status: this.status,
      maxPlayers: this.maxPlayers,
      isTeamMode: this.isTeamMode,
      fillBots: this.fillBots,
      isPublic: this.isPublic,
      createdAt: this.createdAt,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        characterId: p.characterId,
        isReady: p.isReady,
        isHost: p.isHost
      }))
    };
  }

  startGame(options = {}) {
    const fillBots = options.fillBots !== undefined ? Boolean(options.fillBots) : false;
    const isTeamMode = options.isTeamMode !== undefined ? Boolean(options.isTeamMode) : this.isTeamMode;

    if (!fillBots && this.players.size < 2) {
      throw new Error('Cần ít nhất 2 người chơi để bắt đầu trận đấu (hoặc bật chế độ Lấp đầy bằng Bot)');
    }

    const assignedChars = new Set();
    let charCounter = 1;

    for (const player of this.players.values()) {
      if (!player.characterId || assignedChars.has(player.characterId)) {
        while (charCounter <= 8 && assignedChars.has(`NV-0${charCounter}`)) {
          charCounter++;
        }
        player.characterId = `NV-0${Math.min(8, charCounter)}`;
      }
      assignedChars.add(player.characterId);
    }

    const playerConfigs = Array.from(this.players.values()).map((p, idx) => ({
      id: p.id,
      name: p.name,
      characterId: p.characterId,
      teamId: isTeamMode ? (idx % 2 === 0 ? 'TEAM_A' : 'TEAM_B') : null,
      isBot: false
    }));

    if (fillBots && playerConfigs.length < this.maxPlayers) {
      const botNames = [
        'Thủy Tinh (Bot)', 'Thánh Gióng (Bot)', 'Chử Đồng Tử (Bot)',
        'Mẫu Thượng Ngàn (Bot)', 'Lạc Long Quân (Bot)', 'Tổ Mẫu Âu Cơ (Bot)',
        'Cóc Kiện Trời (Bot)', 'Sơn Tinh (Bot)'
      ];
      let botIdx = 1;
      while (playerConfigs.length < this.maxPlayers) {
        while (charCounter <= 8 && assignedChars.has(`NV-0${charCounter}`)) {
          charCounter++;
        }
        const botCharId = `NV-0${((charCounter - 1) % 8) + 1}`;
        assignedChars.add(botCharId);
        const seatIdx = playerConfigs.length;
        playerConfigs.push({
          id: `bot-${botIdx}`,
          name: botNames[(botIdx - 1) % botNames.length],
          characterId: botCharId,
          teamId: isTeamMode ? (seatIdx % 2 === 0 ? 'TEAM_A' : 'TEAM_B') : null,
          isBot: true
        });
        botIdx++;
        charCounter++;
      }
    }

    this.gameState = GameEngine.initGame({ playerConfigs, isTeamMode });
    this.gameState.currentPhase = PHASES.MAIN;
    this.status = 'IN_GAME';
    this.resetTurnTimer();

    return this.gameState;
  }

  /**
   * Che giấu thông tin mật (Anti-cheat Masking):
   * Đối thủ không thể nhìn thấy bài trên tay và bài bẫy úp của người khác,
   * TRỪ KHI bài trên tay hoặc bẫy đó đã bị lật ngửa bởi kỹ năng xem bài (revealedHands / revealedTraps)!
   */
  maskStateForPlayer(viewerPlayerId) {
    if (!this.gameState) return null;

    const raw = JSON.parse(JSON.stringify(this.gameState));
    const masked = { ...raw };

    masked.players = {};
    for (const [pId, pData] of Object.entries(raw.players)) {
      if (pId === viewerPlayerId) {
        masked.players[pId] = pData;
      } else {
        const revealExpiry = raw.revealedHands && raw.revealedHands[pId];
        const isHandRevealed = Boolean(revealExpiry && (revealExpiry === true || revealExpiry > Date.now()));

        masked.players[pId] = {
          ...pData,
          hand: isHandRevealed
            ? pData.hand
            : Array.from({ length: pData.hand.length }, (_, i) => ({
                instanceId: `masked-${pId}-${i}`,
                isMasked: true
              })),
          trapSlots: pData.trapSlots.map((t, tIdx) => {
            if (!t) return null;
            const isRevealedBySkill = Boolean(raw.revealedTraps && raw.revealedTraps[`${pId}_${tIdx}`]);
            if (t.faceUp || isRevealedBySkill) return t;
            return {
              instanceId: t.instanceId,
              faceUp: false,
              isMasked: true
            };
          })
        };
      }
    }

    return masked;
  }

  stopTurnTimer() {
    this.turnDeadline = null;
  }

  resetTurnTimer(now = Date.now()) {
    this.turnDeadline = now + this.turnTimeoutSeconds * 1000;
  }

  /**
   * Tự động qua lượt nếu người chơi hiện tại đã hết giờ. Trả về true nếu trạng thái thay đổi.
   */
  checkTurnTimeout(now = Date.now()) {
    if (this.status !== 'IN_GAME' || !this.gameState || !this.turnDeadline) return false;
    if (this.gameState.gameStatus === 'ENDED') {
      this.stopTurnTimer();
      return false;
    }
    if (now < this.turnDeadline) return false;
    this.handleTurnTimeout(now);
    return true;
  }

  handleTurnTimeout(now = Date.now()) {
    if (this.status !== 'IN_GAME' || !this.gameState) return;
    const activePlayerId = this.gameState.turnOrder[this.gameState.currentTurnIndex];
    const player = this.gameState.players[activePlayerId];

    try {
      const limit = player.handLimit || 6;
      let discarded = [];
      if (player.hand.length > limit) {
        const excess = player.hand.length - limit;
        discarded = player.hand.slice(-excess).map(c => c.instanceId);
      }

      GameEngine.endTurn(this.gameState, activePlayerId, discarded);
    } catch (e) {
      console.error('Lỗi khi auto pass lượt do timeout:', e);
    }
    this.resetTurnTimer(now);
  }
}
