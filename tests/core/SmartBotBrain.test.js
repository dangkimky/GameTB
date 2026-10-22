import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { BotBrain } from '../../src/core/BotBrain.js';
import { PHASES } from '../../src/core/GameState.js';

test('Nâng cấp Trí tuệ Nhân tạo Bot AI Xóm Trọ (Smart Bot Brain)', async (t) => {
  await t.test('TEST-BOT.02: Bot AI tự động Dung Hợp Huyền Thoại khi đủ nguyên liệu', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Bình', characterId: 'NV-02', isBot: true }
      ]
    });

    // Cung cấp nguyên liệu DH-02 (CT-02 + CT-12) trên tay của Bot
    state.players['p2'].hand = [
      { instanceId: 'c1', cardId: 'CT-02', name: 'Chó Cỏ' },
      { instanceId: 'c2', cardId: 'CT-12', name: 'Cậu Vàng' }
    ];
    state.players['p2'].monsterSlots = [null, null];
    state.currentTurnIndex = 1; // Lượt của p2
    state.currentPhase = PHASES.MAIN;

    const res = BotBrain.executeTurn(state, 'p2');

    // Kiểm tra trên sân bot đã xuất hiện thẻ Dung Hợp DH-02
    const summonedFusion = state.players['p2'].monsterSlots.find(m => m && m.cardId === 'DH-02');
    assert.ok(summonedFusion, 'Bot phải tự động dung hợp triệu hồi DH-02 thành công');
    assert.equal(summonedFusion.cardId, 'DH-02');
    assert.ok(summonedFusion.isFusion);
  });

  await t.test('TEST-BOT.03: Bot AI tự động Hiến Tế quái yếu để gọi Trùm Khu Phố', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Bình', characterId: 'NV-02', isBot: true }
      ]
    });

    // Đặt 1 quái yếu trên sân của Bot
    state.players['p2'].monsterSlots[0] = {
      instanceId: 'weak-m',
      cardId: 'CT-01',
      name: 'Camera Cơm',
      basePower: 1,
      power: 1
    };
    // Cho Boss TR-02 (Đại Ca Bán Hoa Quả - không dính công thức DH-06) trên tay của Bot
    state.players['p2'].hand = [
      { instanceId: 'boss-tr02', cardId: 'TR-02', name: 'Đại Ca Bán Hoa Quả' }
    ];
    state.currentTurnIndex = 1;
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;
    state.normalSummonUsed = false;

    BotBrain.executeTurn(state, 'p2');

    // Slot 0 của bot phải là TR-02 và quái yếu vào mộ
    assert.equal(state.players['p2'].monsterSlots[0].cardId, 'TR-02');
    assert.ok(state.graveyard.some(c => c.instanceId === 'weak-m'));
  });

  await t.test('TEST-BOT.04: Bot AI tự động gắn Đạo Cụ tăng sức mạnh lên Chiến Thần', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Bình', characterId: 'NV-02', isBot: true }
      ]
    });

    // CT-01 thuộc hệ Hóng Hớt (không phải Quậy Phá nên không tự dung hợp với Đạo cụ thành DH-03)
    state.players['p2'].monsterSlots[0] = {
      instanceId: 'bot-m1',
      cardId: 'CT-01',
      name: 'Camera Cơm',
      basePower: 1,
      power: 1,
      equippedItems: []
    };
    state.players['p2'].hand = [
      { instanceId: 'eq-dep', cardId: 'DC-01', name: 'Dép Tổ Ong' }
    ];
    state.currentTurnIndex = 1;
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    BotBrain.executeTurn(state, 'p2');

    const m = state.players['p2'].monsterSlots[0];
    assert.ok(m.equippedItems.some(i => i.cardId === 'DC-01'), 'Dép Tổ Ong phải được gắn lên Camera Cơm của Bot');
  });

  await t.test('TEST-BOT.05: Bot AI kích hoạt bài Drama khi có trên tay', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Bình', characterId: 'NV-02', isBot: true }
      ]
    });

    state.players['p2'].hand = [
      { instanceId: 'dr-cupdien', cardId: 'DR-03', name: 'Cúp Điện Toàn Khu Phố' }
    ];
    state.currentTurnIndex = 1;
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    BotBrain.executeTurn(state, 'p2');

    // Lá Drama phải được sử dụng và chuyển vào Bãi Rác
    assert.ok(state.graveyard.some(c => c.cardId === 'DR-03'), 'DR-03 phải được dùng và vào Bãi Rác');
  });

  await t.test('TEST-BOT.06: Bot AI tấn công trực diện khi đối thủ trống sân', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Bình', characterId: 'NV-02', isBot: true }
      ]
    });

    state.players['p1'].hp = 10;
    state.players['p1'].monsterSlots = [null, null]; // Sân trống

    state.players['p2'].monsterSlots[0] = {
      instanceId: 'bot-attacker',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 2,
      power: 2,
      equippedItems: []
    };
    state.currentTurnIndex = 1;
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    BotBrain.executeTurn(state, 'p2');

    // An phải bị trừ HP từ đòn đánh trực diện của Bot
    assert.ok(state.players['p1'].hp < 10, 'Đối thủ phải bị mất HP khi bot đánh trực diện');
  });
});
