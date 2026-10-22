import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { FusionSystem } from '../../src/core/FusionSystem.js';
import { GhostSystem } from '../../src/core/GhostSystem.js';
import { PHASES } from '../../src/core/GameState.js';

test('Hệ Thống Dung Hợp Huyền Thoại & Hồn Ma Báo Oán', async (t) => {
  await t.test('TEST-1.08: Kiểm tra đầy đủ 8 công thức Dung Hợp Huyền Thoại', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    state.currentPhase = PHASES.MAIN;
    const player = state.players['p1'];

    // 1. DH-01: 2 Hóng Hớt
    player.hand = [
      { instanceId: 'hh1', cardId: 'CT-01' },
      { instanceId: 'hh2', cardId: 'CT-07' }
    ];
    const canDH01 = FusionSystem.canFusionSummon(state, 'p1', 'DH-01', ['hh1', 'hh2']);
    assert.equal(canDH01.valid, true);

    // 2. DH-02: CT-02 + CT-12
    player.hand = [
      { instanceId: 'cho', cardId: 'CT-02' },
      { instanceId: 'vang', cardId: 'CT-12' }
    ];
    const canDH02 = FusionSystem.canFusionSummon(state, 'p1', 'DH-02', ['cho', 'vang']);
    assert.equal(canDH02.valid, true);

    // 3. DH-03: 1 Quậy Phá + 1 Đạo Cụ
    player.hand = [
      { instanceId: 'qp1', cardId: 'CT-06' },
      { instanceId: 'dc1', cardId: 'DC-01' }
    ];
    const canDH03 = FusionSystem.canFusionSummon(state, 'p1', 'DH-03', ['qp1', 'dc1']);
    assert.equal(canDH03.valid, true);

    // 4. DH-04: 2 Tốc Độ
    player.hand = [
      { instanceId: 'td1', cardId: 'CT-03' },
      { instanceId: 'td2', cardId: 'CT-09' }
    ];
    const canDH04 = FusionSystem.canFusionSummon(state, 'p1', 'DH-04', ['td1', 'td2']);
    assert.equal(canDH04.valid, true);

    // 5. DH-05: 2 Ăn Vạ
    player.hand = [
      { instanceId: 'av1', cardId: 'CT-04' },
      { instanceId: 'av2', cardId: 'CT-08' }
    ];
    const canDH05 = FusionSystem.canFusionSummon(state, 'p1', 'DH-05', ['av1', 'av2']);
    assert.equal(canDH05.valid, true);

    // 6. DH-06: TR-01 + 1 Chiến Thần
    player.hand = [
      { instanceId: 'tr01', cardId: 'TR-01' },
      { instanceId: 'anyM', cardId: 'CT-01' }
    ];
    const canDH06 = FusionSystem.canFusionSummon(state, 'p1', 'DH-06', ['tr01', 'anyM']);
    assert.equal(canDH06.valid, true);

    // 7. DH-07: 1 Chiến Thần của bạn + 1 Chiến Thần vừa cướp từ đối thủ trong lượt này
    player.hand = [
      { instanceId: 'myM', cardId: 'CT-01' },
      { instanceId: 'stolenM', cardId: 'CT-02', wasStolenTurn: state.turnNumber }
    ];
    const canDH07 = FusionSystem.canFusionSummon(state, 'p1', 'DH-07', ['myM', 'stolenM']);
    assert.equal(canDH07.valid, true);

    // 8. DH-08: CT-03 + CT-13
    player.hand = [
      { instanceId: 'ct03', cardId: 'CT-03' },
      { instanceId: 'ct13', cardId: 'CT-13' }
    ];
    const canDH08 = FusionSystem.canFusionSummon(state, 'p1', 'DH-08', ['ct03', 'ct13']);
    assert.equal(canDH08.valid, true);
  });

  await t.test('TEST-1.15 & 1.28: Hồn Ma Báo Oán khi HP về 0, rút Ám Quẻ và Win Condition', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    // P2 bị trừ hết 10 HP
    state.players['p2'].hp = 0;
    GhostSystem.transformToGhost(state, 'p2');

    // P2 phải thành Hồn Ma
    assert.equal(state.players['p2'].isGhost, true);
    // Sân và tay của P2 phải được dọn sạch vào bãi rác
    assert.equal(state.players['p2'].monsterSlots[0], null);
    assert.equal(state.players['p2'].monsterSlots[1], null);
    assert.equal(state.players['p2'].hand.length, 0);

    // Hồn Ma P2 rút Ám Quẻ đầu lượt
    const ghostRes = GhostSystem.handleGhostTurnStart(state, 'p2');
    assert.ok(ghostRes);
    assert.ok(ghostRes.curseCard);
    assert.equal(state.curseDeck.length, 6); // Trả lại về đáy chồng sau khi rút

    // Win condition: Chỉ còn duy nhất P1 sống sót => P1 thắng cuộc!
    assert.equal(state.gameStatus, 'ENDED');
    assert.equal(state.winnerId, 'p1');
  });
});
