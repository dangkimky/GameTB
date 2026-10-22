import { GameRoom } from './GameRoom.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> GameRoom
  }

  generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'XOM-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom({ hostPlayerId, hostName, maxPlayers = 6 }) {
    let roomId = this.generateRoomId();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomId();
    }

    const room = new GameRoom({
      roomId,
      hostPlayerId,
      hostName,
      maxPlayers
    });

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.turnTimer) {
      clearTimeout(room.turnTimer);
    }
    return this.rooms.delete(roomId);
  }

  cleanEmptyRooms() {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.size === 0) {
        this.deleteRoom(roomId);
      }
    }
  }
}

export const roomManager = new RoomManager();
