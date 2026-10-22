import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom } from '../../server/GameRoom.js';
import { RoomManager } from '../../server/RoomManager.js';

test('Multiplayer Networking & Phòng Chơi (Giai Đoạn 6)', async (t) => {
  await t.test('TEST-6.01 & 6.02: Tạo phòng và thêm người chơi vào phòng', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({
      hostPlayerId: 'p1',
      hostName: 'Chủ Xóm An',
      maxPlayers: 4
    });

    assert.ok(room.roomId.startsWith('XOM-'));
    assert.equal(room.maxPlayers, 4);

    // Thêm host
    room.addPlayer({ id: 'p1', name: 'Chủ Xóm An' });
    assert.equal(room.players.size, 1);

    // Người thứ 2 tham gia
    room.addPlayer({ id: 'p2', name: 'Bình' });
    assert.equal(room.players.size, 2);

    const lobby = room.getLobbyInfo();
    assert.equal(lobby.players.length, 2);
    assert.equal(lobby.players[0].isHost, true);
    assert.equal(lobby.players[1].isHost, false);
  });

  await t.test('TEST-6.04: Chọn Thẻ Đại Diện không được trùng nhau', () => {
    const room = new GameRoom({ roomId: 'XOM-TEST', hostPlayerId: 'p1', hostName: 'An' });
    room.addPlayer({ id: 'p1', name: 'An', characterId: 'NV-01' });
    room.addPlayer({ id: 'p2', name: 'Bình' });

    // P2 chọn trùng NV-01 phải quăng lỗi
    assert.throws(() => {
      room.selectCharacter('p2', 'NV-01');
    }, /đã có người khác chọn/);

    // P2 chọn thẻ khác NV-02 hợp lệ
    room.selectCharacter('p2', 'NV-02');
    assert.equal(room.players.get('p2').characterId, 'NV-02');
  });

  await t.test('TEST-6.05: Bắt đầu ván đấu khi đủ người chơi', () => {
    const room = new GameRoom({ roomId: 'XOM-TEST', hostPlayerId: 'p1', hostName: 'An' });
    room.addPlayer({ id: 'p1', name: 'An', characterId: 'NV-01' });

    // Dưới 2 người không được start
    assert.throws(() => {
      room.startGame();
    }, /Cần ít nhất 2 người chơi/);

    room.addPlayer({ id: 'p2', name: 'Bình', characterId: 'NV-02' });
    const state = room.startGame();

    assert.equal(room.status, 'IN_GAME');
    assert.ok(state);
    assert.equal(Object.keys(state.players).length, 2);
    assert.equal(state.players['p1'].hp, 10);
    assert.equal(state.players['p2'].hp, 10);
    room.stopTurnTimer();
  });

  await t.test('TEST-6.06 & 6.07: Cơ chế che giấu thông tin mật (Anti-cheat Masking)', () => {
    const room = new GameRoom({ roomId: 'XOM-TEST', hostPlayerId: 'p1', hostName: 'An' });
    room.addPlayer({ id: 'p1', name: 'An', characterId: 'NV-01' });
    room.addPlayer({ id: 'p2', name: 'Bình', characterId: 'NV-02' });
    room.startGame();

    // Giả lập P2 úp 1 lá bẫy
    room.gameState.players['p2'].trapSlots[0] = {
      instanceId: 'secret-trap',
      cardId: 'NQ-01',
      name: 'Gương Phản Đòn Bí Mật',
      faceUp: false
    };

    // Lấy state gửi cho P1 (P1 là viewer)
    const maskedForP1 = room.maskStateForPlayer('p1');

    // 1. P1 thấy đầy đủ bài trên tay của chính mình
    assert.ok(maskedForP1.players['p1'].hand[0].cardId, 'P1 phải thấy cardId của chính mình');

    // 2. P1 KHÔNG THỂ THẤY bài trên tay của P2 (bị che toàn bộ cardId)
    assert.equal(maskedForP1.players['p2'].hand[0].isMasked, true, 'Bài tay P2 phải bị che');
    assert.equal(maskedForP1.players['p2'].hand[0].cardId, undefined, 'Không được lộ cardId của P2');

    // 3. P1 KHÔNG THỂ THẤY bẫy bí mật của P2
    const trapP2 = maskedForP1.players['p2'].trapSlots[0];
    assert.equal(trapP2.isMasked, true);
    assert.equal(trapP2.name, undefined, 'Không được lộ tên bẫy bí mật của P2');

    // 4. Khi lấy state cho chính P2: P2 thấy đầy đủ bài và bẫy của mình
    const maskedForP2 = room.maskStateForPlayer('p2');
    assert.equal(maskedForP2.players['p2'].trapSlots[0].cardId, 'NQ-01');
    assert.equal(maskedForP2.players['p2'].trapSlots[0].name, 'Gương Phản Đòn Bí Mật');
    room.stopTurnTimer();
  });

  await t.test('TEST-6.10: Xóa phòng và dọn dẹp bộ đếm giờ (Cleanup)', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ hostPlayerId: 'p1', hostName: 'An' });
    const roomId = room.roomId;

    assert.ok(manager.getRoom(roomId));
    manager.deleteRoom(roomId);
    assert.equal(manager.getRoom(roomId), undefined);
  });
});
