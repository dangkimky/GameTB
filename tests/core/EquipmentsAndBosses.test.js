import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { BattleResolver } from '../../src/core/BattleResolver.js';
import { PHASES } from '../../src/core/GameState.js';
import { ALL_96_CARDS } from '../../src/data/cards.js';

test('Bài Đạo Cụ (DC-01 -> DC-10) & Trùm Khu Phố (TR-01 -> TR-12)', async (t) => {
  await t.test('TEST-DC.01: DC-01 Dép Tổ Ong tăng +2 Độ Chiến thực tế', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    // Đặt quái CT-01 (gốc 2 power)
    state.players.p1.monsterSlots[0] = {
      instanceId: 'm1',
      cardId: 'CT-01',
      name: 'Camera Cơm',
      basePower: 2,
      equippedItems: []
    };
    state.players.p1.hand = [
      { instanceId: 'e1', cardId: 'DC-01', name: 'Dép Tổ Ong' }
    ];
    state.currentPhase = PHASES.MAIN;

    GameEngine.equipItem(state, 'p1', 'e1', 'p1', 0);
    assert.strictEqual(state.players.p1.monsterSlots[0].equippedItems.length, 1);

    const calculatedPower = BattleResolver.calculateMonsterPower(state, 'p1', 0);
    assert.strictEqual(calculatedPower, 4, '2 gốc + 2 từ DC-01 = 4');
  });

  await t.test('TEST-DC.02: DC-02 Nồi Cơm Điện giải cứu quái khỏi bị tiêu diệt 1 lần trong giao tranh', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    // P1 có quái mạnh (4 power)
    state.players.p1.monsterSlots[0] = {
      instanceId: 'atk1',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 4,
      equippedItems: []
    };
    // P2 có quái yếu (2 power) gắn Nồi Cơm Điện (DC-02)
    state.players.p2.monsterSlots[0] = {
      instanceId: 'def1',
      cardId: 'CT-01',
      name: 'Camera Cơm',
      basePower: 2,
      equippedItems: [{ instanceId: 'dc02', cardId: 'DC-02', name: 'Nồi Cơm Điện' }]
    };

    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', 0);
    assert.strictEqual(res.defenderDestroyed, false, 'Quái phòng thủ phải được cứu sống nhờ DC-02');
    assert.strictEqual(state.players.p2.monsterSlots[0].equippedItems.length, 0, 'DC-02 phải bị tiêu thụ sau khi bảo vệ');
  });

  await t.test('TEST-DC.03: DC-04 Micro Hết Pin vô hiệu hóa nội tại quái', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    // CT-06 bình thường +1 khi không có bẫy úp (3 gốc + 1 = 4)
    state.players.p1.monsterSlots[0] = {
      instanceId: 'm1',
      cardId: 'CT-06',
      name: 'Anh Trai Gym',
      basePower: 3,
      equippedItems: [{ instanceId: 'dc04', cardId: 'DC-04', name: 'Micro Hết Pin' }]
    };

    const powerWithDC04 = BattleResolver.calculateMonsterPower(state, 'p1', 0);
    assert.strictEqual(powerWithDC04, 1, '3 gốc - 2 từ DC-04 và bị khóa nội tại = 1');
  });

  await t.test('TEST-TR.01: TR-03 Trùm Phường Đội quét sạch đạo cụ đối thủ khi triệu hồi Hiến Tế', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    // P2 gắn trang bị
    state.players.p2.monsterSlots[0] = {
      instanceId: 'enemyM',
      cardId: 'CT-01',
      name: 'Camera Cơm',
      basePower: 2,
      equippedItems: [{ instanceId: 'item1', cardId: 'DC-01', name: 'Dép Tổ Ong' }]
    };
    // P1 có 1 quái trên sân làm vật hiến tế, và TR-03 trên tay
    state.players.p1.monsterSlots[0] = {
      instanceId: 'tributeM',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3,
      equippedItems: []
    };
    state.players.p1.hand = [
      { instanceId: 'tr03', cardId: 'TR-03', name: 'Trùm Phường Đội' }
    ];
    state.currentPhase = PHASES.MAIN;

    GameEngine.tributeSummon(state, 'p1', 'tr03', 0);
    assert.strictEqual(state.players.p2.monsterSlots[0].equippedItems.length, 0, 'Đạo cụ đối thủ phải bị quét sạch');
    assert.ok(state.graveyard.some(c => c.cardId === 'DC-01'), 'Đạo cụ bị dẹp phải vào Bãi Rác');
  });

  await t.test('TEST-TR.02: TR-08 Trùm Đầu Gấu bắt buộc đối thủ phải ưu tiên giao tranh với nó', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    // P1 tấn công
    state.players.p1.monsterSlots[0] = {
      instanceId: 'atk1',
      cardId: 'CT-01',
      name: 'Camera Cơm',
      basePower: 2,
      equippedItems: []
    };
    // P2 có 2 quái: slot 0 là quái thường, slot 1 là TR-08
    state.players.p2.monsterSlots[0] = {
      instanceId: 'defNormal',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3,
      equippedItems: []
    };
    state.players.p2.monsterSlots[1] = {
      instanceId: 'defTR08',
      cardId: 'TR-08',
      name: 'Trùm Đầu Gấu Xóm Chợ',
      basePower: 5,
      equippedItems: []
    };

    // P1 không chỉ định targetSlotIndex, hệ thống phải tự động điều hướng sang TR-08
    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', null);
    assert.ok(res.logs.some(l => l.includes('Trùm Đầu Gấu Xóm Chợ')), 'Phải ưu tiên giao tranh với TR-08');
  });
});
