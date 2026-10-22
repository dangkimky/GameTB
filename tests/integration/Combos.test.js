import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { PHASES } from '../../src/core/GameState.js';
import { TurnManager } from '../../src/core/TurnManager.js';
import { ChainResolver } from '../../src/core/ChainResolver.js';
import { FusionSystem } from '../../src/core/FusionSystem.js';

test('Integration Tests: 4 Chuỗi Combo Bẩn Bựa Kinh Điển', async (t) => {
  await t.test('TEST-1.24: Combo 1 — "Tặng Quà Tử Thần" (DC-07 Ghi Nợ + DR-02 Bom Hàng)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;

    // P1 có 1 Chiến Thần yếu trên sân và gắn Tờ Giấy Ghi Nợ (DC-07)
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'weak-m',
      cardId: 'CT-01',
      name: 'Camera Cơm',
      equippedItems: [{ instanceId: 'debt-note', cardId: 'DC-07', name: 'Giấy Ghi Nợ' }]
    };

    // P1 dùng DR-02 Shipper Bom Hàng đẩy con nợ sang sân P2
    state.players['p2'].monsterSlots[0] = state.players['p1'].monsterSlots[0];
    state.players['p1'].monsterSlots[0] = null;

    // Đến đầu lượt của P2: Tờ Giấy Ghi Nợ kích hoạt trừ 1 Điểm Nhân Phẩm của P2!
    const hpBefore = state.players['p2'].hp;
    TurnManager.processStartOfTurnEffects(state, 'p2');

    assert.equal(state.players['p2'].hp, hpBefore - 1, 'P2 phải bị trừ 1 HP vì ôm cục nợ DC-07 đầu mỗi lượt');
  });

  await t.test('TEST-1.25: Combo 2 — "Ngư Ông Đắc Lợi" (NQ-10 Thu Phí + DR-01 Hội Đồng Ép Đấu)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03' }
      ]
    });

    // P1 úp sẵn Bẫy NQ-10 (Thu Phí Qua Đường) từ lượt trước
    state.players['p1'].trapSlots[0] = {
      instanceId: 'toll-trap',
      cardId: 'NQ-10',
      name: 'Thu Phí Qua Đường',
      setTurnNumber: 1
    };

    state.turnNumber = 2; // Đã qua lượt nên được lật bẫy

    // Khi có tuyên bố tấn công diễn ra giữa P2 và P3:
    const canActivate = ChainResolver.canActivateTrap(state, 'p1', 0, {
      type: 'DECLARED_ATTACK',
      attackerId: 'p2',
      targetId: 'p3'
    });

    assert.equal(canActivate, true, 'P1 dù không tham gia đánh vẫn được lật NQ-10 để thu phí bài kẻ tấn công');
  });

  await t.test('TEST-1.26: Combo 3 — "Bẫy Tâm Lý Đời Thực" (NQ-03 Nhìn Gì Mà Nhìn & NQ-11 Cười Người)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.currentTurnIndex = 1; // Đang trong lượt của P2

    // P1 có sẵn NQ-03 và NQ-11 đã úp từ lượt 1
    state.players['p1'].trapSlots[0] = {
      instanceId: 'stare-trap',
      cardId: 'NQ-03',
      name: 'Nhìn Gì Mà Nhìn!',
      setTurnNumber: 1
    };
    state.players['p1'].trapSlots[1] = {
      instanceId: 'laugh-trap',
      cardId: 'NQ-11',
      name: 'Cười Người Hôm Trước...',
      setTurnNumber: 1
    };

    // Khi P2 nhìn chằm chằm hoặc hỏi úp bài gì:
    const canNQ03 = ChainResolver.canActivateTrap(state, 'p1', 0, {});
    assert.equal(canNQ03, true, 'NQ-03 lật được bất cứ lúc nào trong lượt người khác');

    // Khi P2 bật cười:
    const canNQ11 = ChainResolver.canActivateTrap(state, 'p1', 1, {
      type: 'LAUGH_DETECTED'
    });
    assert.equal(canNQ11, true, 'NQ-11 lật được ngay khi phát hiện tiếng cười');
  });

  await t.test('TEST-1.27: Combo 4 — "Mượn Gà Đẻ Trứng Vàng" (DR-06 Cướp Quân + Dung Hợp DH-07)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.turnNumber = 2;

    // P1 có 1 quân của mình trên sân
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'my-monster',
      cardId: 'CT-01',
      name: 'Camera của An'
    };

    // P2 có 1 quân trên sân
    state.players['p2'].monsterSlots[0] = {
      instanceId: 'enemy-monster',
      cardId: 'CT-02',
      name: 'Chó Cỏ của Bình'
    };

    // P1 dùng DR-06 Mượn Đồ Quên Trả để cướp quân của P2 sang sân P1
    state.players['p1'].hand = [
      { instanceId: 'dr06', cardId: 'DR-06', name: 'Mượn Đồ Quên Trả' }
    ];

    GameEngine.useDrama(state, 'p1', 'dr06', {
      targetPlayerId: 'p2',
      targetSlotIndex: 0
    });

    // Kiểm tra quân đã sang slot 1 của P1 và có flag wasStolenTurn = turnNumber
    const stolen = state.players['p1'].monsterSlots[1];
    assert.ok(stolen);
    assert.equal(stolen.wasStolenTurn, state.turnNumber);

    // Ngay trong lượt này, P1 dùng chính quân vừa cướp cùng quân của mình để Dung Hợp ra DH-07!
    const canFuse = FusionSystem.canFusionSummon(state, 'p1', 'DH-07', [
      'my-monster',
      'enemy-monster'
    ]);
    assert.equal(canFuse.valid, true, 'Đủ điều kiện triệu hồi DH-07 với 1 quân mình + 1 quân vừa cướp');

    // Thực hiện Dung Hợp
    const hpP1Before = state.players['p1'].hp;
    const fusionMonster = GameEngine.fusionSummon(state, 'p1', 'DH-07', [
      'my-monster',
      'enemy-monster'
    ]);

    assert.equal(fusionMonster.cardId, 'DH-07');
    assert.equal(fusionMonster.basePower, 7);
    // DH-07 hồi +3 HP cho P1
    assert.equal(state.players['p1'].hp, Math.min(10, hpP1Before + 3));
  });
});
