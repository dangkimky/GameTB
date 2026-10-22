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

  await t.test('TEST-6.11: Tự động gán Thẻ Đại Diện khi người chơi vào phòng bị trùng thẻ', () => {
    const room = new GameRoom({ roomId: 'XOM-AUTO-CHAR', hostPlayerId: 'p1', hostName: 'Chủ Phòng' });
    // Host chọn NV-01 (Sơn Tinh)
    room.addPlayer({ id: 'p1', name: 'Chủ Phòng', characterId: 'NV-01' });

    // Người thứ 2 vào phòng cũng gửi NV-01 -> Server không văng lỗi mà tự gán thẻ trống tiếp theo (NV-02 Thủy Tinh)
    const lobbyAfterP2 = room.addPlayer({ id: 'p2', name: 'Hàng Xóm 1', characterId: 'NV-01' });
    assert.equal(room.players.get('p2').characterId, 'NV-02', 'P2 phải được tự động gán thẻ trống NV-02');
    assert.equal(lobbyAfterP2.players.length, 2);

    // Người thứ 3 vào phòng không gửi characterId -> Server tự gán NV-03
    room.addPlayer({ id: 'p3', name: 'Hàng Xóm 2' });
    assert.equal(room.players.get('p3').characterId, 'NV-03', 'P3 phải được tự động gán thẻ trống NV-03');

    // Trong phòng chờ, P2 cố tình chọn đổi sang NV-01 (đã có P1 giữ) -> Phải báo lỗi
    assert.throws(() => {
      room.selectCharacter('p2', 'NV-01');
    }, /đã có người khác chọn/);

    // P2 chọn đổi sang NV-04 còn trống -> Thành công
    room.selectCharacter('p2', 'NV-04');
    assert.equal(room.players.get('p2').characterId, 'NV-04');
  });

  await t.test('TEST-6.12: Rời phòng (Leave Room), chuyển giao Host và dọn dẹp phòng', () => {
    const manager = new RoomManager();
    const room = manager.createRoom({ hostPlayerId: 'p1', hostName: 'An' });
    room.addPlayer({ id: 'p1', name: 'An', characterId: 'NV-01' });
    room.addPlayer({ id: 'p2', name: 'Bình', characterId: 'NV-02' });

    assert.equal(room.players.size, 2);
    assert.equal(room.hostPlayerId, 'p1');

    // P1 (Host) rời phòng -> P2 trở thành Host mới
    room.removePlayer('p1');
    assert.equal(room.players.size, 1);
    assert.equal(room.hostPlayerId, 'p2');
    assert.equal(room.players.get('p2').isHost, true);

    // P2 rời phòng -> Phòng trống -> cleanEmptyRooms xóa phòng
    room.removePlayer('p2');
    assert.equal(room.players.size, 0);
    manager.cleanEmptyRooms();
    assert.equal(manager.getRoom(room.roomId), undefined);
  });

  await t.test('TEST-6.13: Chế độ phòng công cộng (Public) và riêng tư (Private)', () => {
    const manager = new RoomManager();

    // 1. Tạo phòng công cộng
    const publicRoom = manager.createRoom({
      hostPlayerId: 'p1',
      hostName: 'Host Công Cộng',
      isPublic: true,
      maxPlayers: 4
    });
    publicRoom.addPlayer({ id: 'p1', name: 'Host Công Cộng', characterId: 'NV-01' });

    // 2. Tạo phòng riêng tư
    const privateRoom = manager.createRoom({
      hostPlayerId: 'p2',
      hostName: 'Host Riêng Tư',
      isPublic: false,
      maxPlayers: 4
    });
    privateRoom.addPlayer({ id: 'p2', name: 'Host Riêng Tư', characterId: 'NV-02' });

    // Lấy danh sách phòng công cộng: Chỉ thấy publicRoom, tuyệt đối không lộ privateRoom
    const publicList = manager.getPublicRooms();
    assert.equal(publicList.length, 1);
    assert.equal(publicList[0].roomId, publicRoom.roomId);
    assert.equal(publicList[0].isPublic, true);

    // Người chơi có Mã phòng riêng tư vẫn tìm và vào được
    const foundPrivate = manager.getRoom(privateRoom.roomId);
    assert.ok(foundPrivate);
    assert.equal(foundPrivate.roomId, privateRoom.roomId);
    assert.equal(foundPrivate.isPublic, false);

    // Khi phòng công cộng bắt đầu trận đấu (status = IN_GAME), nó không còn xuất hiện trong danh sách chờ
    publicRoom.addPlayer({ id: 'guest', name: 'Khách', characterId: 'NV-03' });
    publicRoom.startGame({ fillBots: true });
    assert.equal(publicRoom.status, 'IN_GAME');
    publicRoom.stopTurnTimer();

    const updatedPublicList = manager.getPublicRooms();
    assert.equal(updatedPublicList.length, 0, 'Phòng đang trong trận đấu không được hiện trên danh sách phòng chờ');
  });

  await t.test('TEST-6.14: Chuẩn hóa URL WebSocket an toàn cho Render/Cloud (tránh lỗi Mixed Content)', async () => {
    const { GameClient } = await import('../../src/net/GameClient.js');

    // Giả lập GameClient chuẩn hóa URL an toàn
    const client1 = new GameClient('ws://localhost:3333');
    assert.equal(client1.serverUrl, 'ws://localhost:3333');

    const client2 = new GameClient('http://gametb.onrender.com');
    assert.equal(client2.serverUrl, 'ws://gametb.onrender.com');

    const client3 = new GameClient('https://gametb.onrender.com');
    assert.equal(client3.serverUrl, 'wss://gametb.onrender.com');
  });

  await t.test('TEST-6.15: Tối ưu tải ảnh thẻ bài (CardComponent) tránh request ảnh 404 gây lag mobile', async () => {
    const { CardComponent, AVAILABLE_CARD_IMAGES } = await import('../../src/ui/CardComponent.js');

    assert.ok(AVAILABLE_CARD_IMAGES.has('NV-01'));
    assert.ok(AVAILABLE_CARD_IMAGES.has('CT-01'));
    // Thẻ không có ảnh thật (ví dụ CT-11, CT-12, TR-03, NQ-01...)
    assert.equal(AVAILABLE_CARD_IMAGES.has('CT-11'), false);
    assert.equal(AVAILABLE_CARD_IMAGES.has('NQ-01'), false);

    // Khi render thẻ CT-11 (không có file ảnh thật), KHÔNG ĐƯỢC sinh thẻ <img src="assets/cards/..."> gây 404
    const htmlNoImg = CardComponent.renderCardHtml({ cardId: 'CT-11', type: 'LOW_MONSTER' });
    assert.ok(!htmlNoImg.includes('<img class="card-art-img"'), 'Thẻ không có ảnh thật không được sinh thẻ img 404');
    assert.ok(htmlNoImg.includes('card-art-fallback'), 'Thẻ phải sử dụng trực tiếp fallback SVG vector siêu nhẹ');

    // Khi render thẻ CT-01 (có file ảnh thật), sinh thẻ img với loading="lazy" và decoding="async"
    const htmlWithImg = CardComponent.renderCardHtml({ cardId: 'CT-01', type: 'LOW_MONSTER' });
    assert.ok(htmlWithImg.includes('<img class="card-art-img"'));
    assert.ok(htmlWithImg.includes('loading="lazy"'));
    assert.ok(htmlWithImg.includes('decoding="async"'));
  });
});
