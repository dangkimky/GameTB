/**
 * GameClient — Kết nối WebSocket thời gian thực giữa Client và Server
 */

export class GameClient {
  constructor(serverUrl = null) {
    this.serverUrl = serverUrl || (typeof window !== 'undefined'
      ? `ws://${window.location.host}`
      : 'ws://localhost:3333');
    this.ws = null;
    this.playerId = null;
    this.roomId = null;
    this.callbacks = {
      onLobbyUpdate: () => {},
      onStateUpdate: () => {},
      onChat: () => {},
      onError: () => {},
      onRoomList: () => {},
      onRoomLeft: () => {}
    };
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('✅ Đã kết nối tới Game Server');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleServerMessage(event.data);
        };

        this.ws.onerror = (err) => {
          console.error('Lỗi kết nối WebSocket:', err);
          this.callbacks.onError(err);
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('❌ Đã ngắt kết nối WebSocket');
        };
      } catch (e) {
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
    this.send('GET_ROOMS', {});
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
