import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { PHASES } from '../../src/core/GameState.js';
import { TurnManager } from '../../src/core/TurnManager.js';
import { BattleResolver } from '../../src/core/BattleResolver.js';
import { ALL_96_CARDS, TRIBES } from '../../src/data/cards.js';

test('Core GameEngine - Luật Chơi & Cơ Chế Chính (120 Mã Thẻ Bài • Gọi Bầy & Cộng Hưởng Hệ)', async (t) => {
  await t.test('TEST-1.01 & 1.02: Khởi tạo game và chia bài ban đầu (5 lá, 10 HP, 12 Dung Hợp, 158 lá Bộ Bài Chính)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    assert.equal(state.players['p1'].hp, 10);
    assert.equal(state.players['p2'].hp, 10);
    assert.equal(state.players['p1'].hand.length, 5);
    assert.equal(state.players['p2'].hand.length, 5);
    assert.equal(state.fusionDeck.length, 12);
    assert.equal(state.curseDeck.length, 6);
    // 158 - 10 = 148 lá còn lại trong chồng bài bốc
    assert.equal(state.drawPile.length, 148);
  });

  await t.test('TEST-1.03 & 1.04: Luật mỗi vòng chỉ được 1 lượt bốc bài (1 lá duy nhất)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    assert.equal(state.players['p1'].hand.length, 5);

    TurnManager.startTurn(state);
    assert.equal(state.players['p1'].hand.length, 6);
    assert.equal(state.manualDrawUsedThisTurn, true, 'Đã dùng xong lượt bốc bài của vòng');

    state.players['p1'].monsterSlots[0] = {
      instanceId: 'test-m1',
      cardId: 'CT-02',
      name: 'Khuyển Thần Đá Cổ Thạch',
      basePower: 3
    };

    const handBefore = state.players['p1'].hand.length;
    TurnManager.startTurn(state);
    assert.equal(state.players['p1'].hand.length, handBefore + 1);
  });

  await t.test('TEST-1.05: Tái chế Bãi Rác khi chồng bài bốc cạn', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.drawPile = [];
    state.graveyard = [
      { instanceId: 'g1', name: 'Rác 1' },
      { instanceId: 'g2', name: 'Rác 2' }
    ];

    const drawn = TurnManager.drawCard(state, 'p1');
    assert.ok(drawn);
    assert.equal(state.graveyard.length, 0);
    assert.equal(state.drawPile.length, 1);
  });

  await t.test('TEST-1.06: Triệu hồi thường - Tối đa 1 quân/lượt (nếu không dùng Gọi Bầy hay Lượt thưởng)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.players['p1'].hand = [
      { instanceId: 'c1', cardId: 'CT-01', name: 'Chim Lạc Đông Sơn' },
      { instanceId: 'c2', cardId: 'CT-02', name: 'Khuyển Thần Đá Cổ Thạch' }
    ];

    GameEngine.normalSummon(state, 'p1', 'c1', 0);
    assert.ok(state.players['p1'].monsterSlots[0]);
    assert.equal(state.normalSummonUsed, true);

    assert.throws(() => {
      GameEngine.normalSummon(state, 'p1', 'c2', 1);
    }, /đã sử dụng lượt triệu hồi thường/);
  });

  await t.test('TEST-1.06B: Cơ chế mới Triệu hồi Gọi Bầy (Swarm Summon) & Cộng Hưởng Linh Thú Cùng Hệ (+1 Độ Chiến)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-08' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.players['p1'].hand = [
      { instanceId: 'c1', cardId: 'CT-01', name: 'Chim Lạc Đông Sơn', tribe: TRIBES.HONG_HOT, basePower: 2 },
      { instanceId: 'c2', cardId: 'CT-07', name: 'Cò Trắng Đồng Chiêm', tribe: TRIBES.HONG_HOT, basePower: 1 }
    ];

    // 1. Triệu hồi thường Chim Lạc vào ô 0
    GameEngine.normalSummon(state, 'p1', 'c1', 0);
    assert.equal(state.normalSummonUsed, true);

    // 2. Triệu hồi Gọi Bầy (Swarm Summon) Cò Trắng (cùng hệ HONG_HOT) vào ô 1 ngay trong cùng 1 lượt!
    const swarmMonster = GameEngine.swarmSummon(state, 'p1', 'c2', 1);
    assert.ok(swarmMonster);
    assert.equal(state.swarmSummonUsed, true);
    assert.ok(state.players['p1'].monsterSlots[1], 'Ô thứ 2 đã có Cò Trắng xuất trận nhờ Gọi Bầy');

    // Kiểm tra Cộng Hưởng Linh Thú Cùng Hệ: Cò Trắng (basePower 1) + 1 Cộng Hưởng Hệ = 2 Độ Chiến!
    const pwrSlot1 = BattleResolver.calculateMonsterPower(state, 'p1', 1);
    assert.equal(pwrSlot1, 2, 'Cò Trắng được +1 Độ Chiến nhờ Cộng Hưởng Cùng Hệ Linh Giác với Chim Lạc');
  });

  await t.test('TEST-1.06C: Các thẻ bài mới (NV-07 Âu Cơ, NV-08 Cóc Tía, DR-15 Cây Tre Trăm Đốt, DH-09 Tứ Linh Hội Tụ)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Âu Cơ', characterId: 'NV-07' },
        { id: 'p2', name: 'Cóc Tía', characterId: 'NV-08' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.players['p1'].monsterSlots = [null, null];
    state.graveyard.push({
      instanceId: 'g-low-1',
      cardId: 'CT-02',
      name: 'Khuyển Thần Đá Cổ Thạch',
      type: 'LOW_MONSTER',
      tribe: TRIBES.QUAY_PHA,
      basePower: 3
    });

    // NV-07 Âu Cơ hồi sinh trực tiếp Linh Thú từ Bãi Rác lên sân!
    const skillRes = GameEngine.activateCharacterSkill(state, 'p1');
    assert.equal(skillRes.skill, 'AU_CO_REVIVE');
    assert.equal(state.players['p1'].monsterSlots[0].cardId, 'CT-02');

    // DR-15 Sự Tích Cây Tre Trăm Đốt ("Khắc nhập!"): Gọi thêm Linh Thú từ tay lên sân và +1 Độ Chiến toàn sân
    state.players['p1'].hand = [
      { instanceId: 'dr15-1', cardId: 'DR-15', name: 'Sự Tích Cây Tre Trăm Đốt' },
      { instanceId: 'ct03-hand', cardId: 'CT-03', name: 'Ngựa Sắt Phù Đổng', type: 'LOW_MONSTER', tribe: TRIBES.TOC_DO, basePower: 2 }
    ];
    GameEngine.useDrama(state, 'p1', 'dr15-1');
    assert.ok(state.players['p1'].monsterSlots[1], 'DR-15 phải triệu hồi đặc biệt Ngựa Sắt lên ô 1');

    // Dung hợp DH-09 (Tứ Linh Hội Tụ) từ 2 Linh Thú khác Hệ bất kỳ (CT-02 QUAY_PHA + CT-03 TOC_DO)
    const dh09 = GameEngine.executeFusionSummon(state, 'p1', 'DH-09', ['g-low-1', 'ct03-hand']);
    assert.equal(dh09.cardId, 'DH-09');
    assert.equal(dh09.basePower, 7);
  });

  await t.test('TEST-1.07: Hiến Tế - Bỏ 1 quân sân gọi Thần Thú Cấp Cao từ tay', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm1',
      cardId: 'CT-01',
      name: 'Chim Lạc Đông Sơn'
    };
    state.players['p1'].hand = [
      { instanceId: 'boss1', cardId: 'TR-01', name: 'Chằn Tinh Hang Đá' }
    ];

    GameEngine.tributeSummon(state, 'p1', 'boss1', 0);

    assert.ok(state.graveyard.some(c => c.instanceId === 'm1'));
    assert.equal(state.players['p1'].monsterSlots[0].cardId, 'TR-01');
  });

  await t.test('TEST-1.09 & 1.10: Giao tranh Độ Chiến, sát thương chênh lệch và ngang Độ Chiến', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.players['p1'].monsterSlots[0] = {
      instanceId: 'atk1',
      cardId: 'CT-02',
      name: 'Quân Mạnh',
      basePower: 4
    };
    state.players['p2'].monsterSlots[0] = {
      instanceId: 'def1',
      cardId: 'CT-01',
      name: 'Quân Yếu',
      basePower: 2
    };

    const res1 = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', 0);
    assert.equal(state.players['p2'].hp, 8);
    assert.equal(res1.defenderDestroyed, true);
    assert.equal(state.players['p2'].monsterSlots[0], null);

    state.players['p1'].monsterSlots[0] = {
      instanceId: 'tie1',
      cardId: 'CT-01',
      name: 'Chim Lạc 1',
      basePower: 2
    };
    state.players['p2'].monsterSlots[0] = {
      instanceId: 'tie2',
      cardId: 'CT-01',
      name: 'Chim Lạc 2',
      basePower: 2
    };

    const hpP1 = state.players['p1'].hp;
    const hpP2 = state.players['p2'].hp;
    const resTie = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', 0);

    assert.equal(state.players['p1'].hp, hpP1);
    assert.equal(state.players['p2'].hp, hpP2);
    assert.equal(resTie.attackerDestroyed, true);
    assert.equal(resTie.defenderDestroyed, true);
    assert.equal(state.players['p1'].monsterSlots[0], null);
    assert.equal(state.players['p2'].monsterSlots[0], null);
  });

  await t.test('TEST-1.11: Đánh trực diện - Giới hạn tối đa 3 Điểm Nhân Phẩm', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.players['p1'].monsterSlots[0] = {
      instanceId: 'fusion7',
      cardId: 'DH-02',
      name: 'Khuyển Thần Song Đầu',
      basePower: 7
    };
    state.players['p2'].monsterSlots = [null, null];

    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', null);
    assert.equal(res.damageDealt, 3);
    assert.equal(state.players['p2'].hp, 7);
  });

  await t.test('TEST-1.12: Giới hạn bài cuối lượt (6 lá, NV-05 = 7 lá)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-05' }
      ]
    });

    state.players['p1'].hand = Array.from({ length: 8 }, (_, i) => ({
      instanceId: `card-${i}`,
      name: `Lá ${i}`
    }));

    assert.throws(() => {
      TurnManager.endTurn(state, 'p1', []);
    }, /phải bỏ ít nhất 2 lá bài thừa/);

    TurnManager.endTurn(state, 'p1', ['card-0', 'card-1']);
    assert.equal(state.players['p1'].hand.length, 6);
  });

  await t.test('TEST-1.30: CT-23 (Voi Chín Ngà Bảo Hộ) chiếm trọn cả 2 ô và sát thương vượt trội bằng 0', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.players['p1'].hand = [{ instanceId: 'ct23', cardId: 'CT-23', name: 'Voi Chín Ngà Bảo Hộ' }];

    GameEngine.normalSummon(state, 'p1', 'ct23', 0);
    assert.ok(state.players['p1'].monsterSlots[0]);
    assert.ok(state.players['p1'].monsterSlots[1]);

    state.players['p2'].monsterSlots[0] = {
      instanceId: 'boss6',
      cardId: 'DH-01',
      name: 'Hội Đồng Tứ Bất Tử',
      basePower: 6
    };

    const hpBefore = state.players['p1'].hp;
    BattleResolver.resolveBattle(state, 'p2', 0, 'p1', 0);

    assert.equal(state.players['p1'].hp, hpBefore);
    assert.equal(state.players['p1'].monsterSlots[0], null);
    assert.equal(state.players['p1'].monsterSlots[1], null);
  });
});
