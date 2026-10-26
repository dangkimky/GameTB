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

  createRoom({ hostPlayerId, hostName, maxPlayers = 4, isPublic = true, isTeamMode = false, fillBots = true, roomName = null }) {
    let roomId = this.generateRoomId();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomId();
    }

    const room = new GameRoom({
      roomId,
      hostPlayerId,
      hostName,
      maxPlayers,
      isPublic,
      isTeamMode,
      fillBots,
      roomName
    });

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(String(roomId).trim().toUpperCase());
  }

  getPublicRooms() {
    const list = [];
    for (const room of this.rooms.values()) {
      if (room.isPublic && room.status === 'LOBBY' && room.players.size < room.maxPlayers) {
        list.push({
          roomId: room.roomId,
          roomName: room.roomName || `Phòng của ${room.getHostName()}`,
          hostName: room.getHostName(),
          currentPlayers: room.players.size,
          maxPlayers: room.maxPlayers,
          isTeamMode: room.isTeamMode,
          isPublic: room.isPublic,
          status: room.status,
          createdAt: room.createdAt || Date.now()
        });
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  deleteRoom(roomId) {
    if (!roomId) return false;
    const norm = String(roomId).trim().toUpperCase();
    const room = this.rooms.get(norm);
    if (room) {
      room.stopTurnTimer();
    }
    return this.rooms.delete(norm);
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
