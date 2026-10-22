/**
 * GameClient — Kết nối WebSocket thời gian thực giữa Client và Server
 */

export class GameClient {
  constructor(serverUrl = null) {
    this.serverUrl = this.normalizeServerUrl(serverUrl);
    this.ws = null;
    this.playerId = null;
    this.roomId = null;
    this.isConnecting = false;
    this.callbacks = {
      onLobbyUpdate: () => {},
      onStateUpdate: () => {},
      onChat: () => {},
      onError: () => {},
      onRoomList: () => {},
      onRoomLeft: () => {}
    };
  }

  normalizeServerUrl(url) {
    const isHttps = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:';
    if (!url) {
      if (typeof window !== 'undefined' && window.location && window.location.host && !window.location.protocol.startsWith('file')) {
        return `${isHttps ? 'wss:' : 'ws:'}//${window.location.host}`;
      }
      return 'ws://localhost:3333';
    }

    let clean = String(url).trim();
    if (isHttps) {
      // Trên môi trường HTTPS (Render, Cloud), bắt buộc phải dùng wss:// để không bị chặn Mixed Content
      if (clean.startsWith('ws://')) {
        clean = clean.replace('ws://', 'wss://');
      } else if (clean.startsWith('http://')) {
        clean = clean.replace('http://', 'wss://');
      } else if (clean.startsWith('https://')) {
        clean = clean.replace('https://', 'wss://');
      } else if (!clean.startsWith('wss://')) {
        clean = 'wss://' + clean;
      }
    } else {
      if (clean.startsWith('http://')) {
        clean = clean.replace('http://', 'ws://');
      } else if (clean.startsWith('https://')) {
        clean = clean.replace('https://', 'wss://');
      } else if (!clean.startsWith('ws://') && !clean.startsWith('wss://')) {
        clean = 'ws://' + clean;
      }
    }
    return clean;
  }

  async fetchRoomListHttp() {
    try {
      let httpUrl = '/api/rooms';
      if (this.serverUrl.startsWith('ws://') || this.serverUrl.startsWith('wss://')) {
        const urlObj = new URL(this.serverUrl.replace('wss://', 'https://').replace('ws://', 'http://'));
        httpUrl = `${urlObj.origin}/api/rooms`;
      }
      const res = await fetch(httpUrl, { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.rooms)) {
          this.callbacks.onRoomList(data.rooms);
          return data.rooms;
        }
      }
    } catch (e) {
      // Fallback silent
    }
    return null;
  }

  connect() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.isConnecting = false;
          console.log('✅ Đã kết nối tới Game Server (' + this.serverUrl + ')');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleServerMessage(event.data);
        };

        this.ws.onerror = (err) => {
          this.isConnecting = false;
          console.error('Lỗi kết nối WebSocket:', err);
          // Thử tải danh sách phòng qua HTTP ngay khi WebSocket gặp sự cố
          this.fetchRoomListHttp();
          this.callbacks.onError(err);
          reject(err);
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          console.log('❌ Đã ngắt kết nối WebSocket');
        };
      } catch (e) {
        this.isConnecting = false;
        this.fetchRoomListHttp();
        reject(e);
      }
    });
  }

  handleServerMessage(rawData) {
    try {
      const msg = JSON.parse(rawData);

      switch (msg.type) {
        case 'ROOM_CREATED':
        case 'ROOM_JOINED':
          this.roomId = msg.payload.roomId;
          this.playerId = msg.payload.playerId;
          this.callbacks.onLobbyUpdate(msg.payload.lobby);
          break;

        case 'LOBBY_UPDATED':
          this.callbacks.onLobbyUpdate(msg.payload);
          break;

        case 'ROOM_LIST':
          this.callbacks.onRoomList(msg.payload || []);
          break;

        case 'ROOM_LEFT':
          this.roomId = null;
          this.callbacks.onRoomLeft();
          break;

        case 'GAME_STATE_UPDATE':
          this.callbacks.onStateUpdate(msg.state);
          break;

        case 'CHAT_BROADCAST':
          this.callbacks.onChat(msg.payload);
          break;

        case 'ERROR':
        case 'ACTION_ERROR':
          this.callbacks.onError(msg.message);
          break;
      }
    } catch (e) {
      console.error('Lỗi khi đọc bản tin server:', e);
    }
  }

  createRoom({ hostName, maxPlayers = 4, characterId = 'NV-01', isTeamMode = false, fillBots = true, isPublic = true, roomName = null }) {
    this.send('CREATE_ROOM', { hostName, maxPlayers, characterId, isTeamMode, fillBots, isPublic, roomName });
  }

  joinRoom({ roomId, playerName, characterId = null }) {
    this.send('JOIN_ROOM', { roomId, playerName, characterId });
  }

  getRoomList() {
    if (this.ws && this.ws.readyState === 1) { // OPEN
      this.send('GET_ROOMS', {});
    } else {
      // Khi WebSocket chưa sẵn sàng, gọi ngay qua HTTP REST API để tải danh sách tức thì
      this.fetchRoomListHttp();
    }
  }

  leaveRoom() {
    this.send('LEAVE_ROOM', {});
  }

  selectCharacter(characterId) {
    this.send('SELECT_CHARACTER', { characterId });
  }

  setReady(isReady) {
    this.send('SET_READY', { isReady });
  }

  startGame() {
    this.send('START_GAME', {});
  }

  sendAction(actionType, params = {}) {
    this.send('GAME_ACTION', { actionType, params });
  }

  sendChat(text) {
    this.send('CHAT_MESSAGE', { text });
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === 1) { // OPEN
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = callback;
    }
  }
}
