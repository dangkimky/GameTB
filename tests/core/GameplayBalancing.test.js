import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { BattleResolver } from '../../src/core/BattleResolver.js';
import { GhostSystem } from '../../src/core/GhostSystem.js';
import { BotBrain } from '../../src/core/BotBrain.js';
import { PHASES } from '../../src/core/GameState.js';
import { CARD_TYPES } from '../../src/data/cards.js';

test('Nâng Cấp Cân Bằng & Công Bằng Lối Chơi (Gameplay Balancing & Fairness)', async (t) => {
  await t.test('TEST-FAIR.01: Chế độ Đấu Phe — Phe chiến thắng khi toàn bộ thành viên phe đối thủ biến thành Hồn Ma', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', teamId: 'TEAM_A' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02', teamId: 'TEAM_B' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03', teamId: 'TEAM_A' },
        { id: 'p4', name: 'Dũng', characterId: 'NV-04', teamId: 'TEAM_B' }
      ],
      isTeamMode: true
    });

    // Cả Phe B (p2 & p4) bị hạ gục về 0 HP
    state.players['p2'].hp = 0;
    state.players['p2'].isGhost = true;
    state.players['p4'].hp = 0;
    state.players['p4'].isGhost = true;

    // Kiểm tra người chiến thắng
    const winnerId = GhostSystem.checkWinner(state);

    assert.equal(state.gameStatus, 'ENDED', 'Game phải kết thúc');
    assert.equal(state.winnerTeamId, 'TEAM_A', 'TEAM_A (Phe Đỏ) phải là phe chiến thắng');
    assert.ok(winnerId, 'Phải có winnerId trả về');
  });

  await t.test('TEST-FAIR.02: Hiệp Ước Hòa Bình Lượt 1 — Chặn đòn tấn công ở Lượt 1 của trận đấu', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 1;
    state.currentPhase = PHASES.BATTLE;
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'atk-m',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3
    };

    assert.throws(
      () => {
        GameEngine.declareAttack(state, 'p1', 0, 'p2', null);
      },
      /Hiệp Ước Hòa Bình Lượt 1/,
      'Phải chặn tấn công ở Lượt 1 để đảm bảo công bằng'
    );
  });

  await t.test('TEST-FAIR.03: Bẫy NQ-07 (Giả Chết Bắt Quạ) — Hủy sát thương trực diện và bốc 1 lá bài', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm1',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3
    };

    // P2 trống sân nhưng đã úp sẵn NQ-07 từ lượt 1
    state.players['p2'].hp = 10;
    state.players['p2'].monsterSlots = [null, null];
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq07',
      cardId: 'NQ-07',
      name: 'Giả Chết Bắt Quạ',
      setTurnNumber: 1
    };

    const initialHandCount = state.players['p2'].hand.length;
    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', null);

    assert.equal(res.type, 'TRAP_NEGATED', 'Đòn đánh phải bị bẫy hủy bỏ');
    assert.equal(state.players['p2'].hp, 10, 'P2 không bị mất HP');
    assert.equal(state.players['p2'].hand.length, initialHandCount + 1, 'P2 được bốc thêm 1 lá');
    assert.ok(state.graveyard.some(c => c.cardId === 'NQ-07'), 'NQ-07 vào bãi rác sau khi lật');
  });

  await t.test('TEST-FAIR.04: Bẫy NQ-01 (Gương Phản Đòn) — Bật ngược toàn bộ sát thương vào kẻ tấn công', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.players['p1'].hp = 10;
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm1',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3
    };

    // P2 đã úp sẵn NQ-01 từ lượt 1
    state.players['p2'].hp = 10;
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq01',
      cardId: 'NQ-01',
      name: 'Gương Phản Đòn',
      setTurnNumber: 1
    };

    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', null);

    assert.equal(res.type, 'TRAP_REFLECTED', 'Phải phản ngược đòn đánh');
    assert.equal(state.players['p1'].hp, 7, 'P1 phải nhận 3 sát thương dội ngược');
    assert.equal(state.players['p2'].hp, 10, 'P2 nguyên vẹn 10 HP');
  });

  await t.test('TEST-FAIR.05: Bẫy NQ-08 (Mách Mẹ) — Đuổi Trùm Khu Phố về tay và hủy giao tranh', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    // P1 dùng Boss TR-01 (Bà Tổ Trưởng) tấn công
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'boss-tr01',
      cardId: 'TR-01',
      name: 'Bà Tổ Trưởng',
      type: CARD_TYPES.HIGH_MONSTER,
      basePower: 5
    };

    state.players['p2'].monsterSlots[0] = {
      instanceId: 'm-def',
      cardId: 'CT-01',
      name: 'Camera Cơm',
      basePower: 1
    };

    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq08',
      cardId: 'NQ-08',
      name: 'Mách Mẹ!',
      setTurnNumber: 1
    };

    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', 0);

    assert.equal(res.type, 'TRAP_BOUNCED', 'Boss phải bị bẫy đuổi về tay');
    assert.equal(state.players['p1'].monsterSlots[0], null, 'Boss rời khỏi sân P1');
    assert.ok(state.players['p1'].hand.some(c => c.cardId === 'TR-01'), 'Boss quay lại tay P1');
    assert.ok(state.players['p2'].monsterSlots[0] !== null, 'Quái P2 được an toàn');
  });

  await t.test('TEST-FAIR.06: Bẫy NQ-06 (Vỏ Quýt Dày) — Tăng +3 Độ Chiến cho Chiến Thần bị đánh', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    // P1 có quái Độ Chiến 4
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm-atk',
      cardId: 'CT-02',
      name: 'Quân Mạnh',
      basePower: 4
    };

    // P2 có quái Độ Chiến 2, nhưng có Bẫy NQ-06 (+3 Độ Chiến => thành 5 Độ Chiến!)
    state.players['p2'].monsterSlots[0] = {
      instanceId: 'm-def',
      cardId: 'CT-01',
      name: 'Quân Yếu',
      basePower: 2
    };
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq06',
      cardId: 'NQ-06',
      name: 'Vỏ Quýt Dày',
      setTurnNumber: 1
    };

    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', 0);

    // Quân yếu (2 + 3 = 5) đập ngược lại Quân mạnh (4) -> Kẻ tấn công thua!
    assert.equal(res.attackerDestroyed, true, 'Kẻ tấn công bị phản đòn tiêu diệt');
    assert.equal(res.defenderDestroyed, false, 'Quân phòng thủ sống sót');
  });

  await t.test('TEST-FAIR.07: Bẫy NQ-14 (Đồng Quy Vu Tận) — Kéo kẻ tấn công cùng tử trận', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm-atk',
      cardId: 'CT-02',
      name: 'Quân Mạnh',
      basePower: 4
    };

    state.players['p2'].monsterSlots[0] = {
      instanceId: 'm-def',
      cardId: 'CT-01',
      name: 'Quân Yếu',
      basePower: 2
    };
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq14',
      cardId: 'NQ-14',
      name: 'Đồng Quy Vu Tận',
      setTurnNumber: 1
    };

    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', 0);

    // Cả 2 cùng chết
    assert.equal(res.defenderDestroyed, true);
    assert.equal(res.attackerDestroyed, true);
    assert.equal(state.players['p1'].monsterSlots[0], null, 'Kẻ tấn công bị chết chùm');
  });

  await t.test('TEST-FAIR.08: GameEngine.activateTrap lật bẫy an toàn và chuyển vào Bãi Rác', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.players['p1'].trapSlots[0] = {
      instanceId: 'trap-test',
      cardId: 'NQ-03',
      name: 'Nhìn Gì Mà Nhìn',
      setTurnNumber: 1,
      faceUp: false
    };

    const flipped = GameEngine.activateTrap(state, 'p1', 0);
    assert.equal(flipped.cardId, 'NQ-03');
    assert.equal(state.players['p1'].trapSlots[0], null, 'Slot bẫy được giải phóng');
    assert.ok(state.graveyard.some(c => c.cardId === 'NQ-03'), 'Bẫy đã vào Bãi Rác');
  });

  await t.test('TEST-FAIR.09: Bẫy NQ-10 (Thu Phí Qua Đường) — Thu phí 1 lá khi tấn công hoặc hủy đòn khi kẻ đánh rỗng túi', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm-atk',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3
    };

    // P2 úp NQ-10 từ lượt trước
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq10',
      cardId: 'NQ-10',
      name: 'Thu Phí Qua Đường',
      setTurnNumber: 1
    };

    // Trường hợp A: P1 có bài trên tay -> Bị thu phí 1 lá và đòn đánh tiếp tục
    state.players['p1'].hand = [
      { instanceId: 'h1', cardId: 'CT-01', name: 'Camera' }
    ];
    const initialP2Hand = state.players['p2'].hand.length;

    const resA = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', null);
    assert.equal(state.players['p1'].hand.length, 0, 'P1 bị nộp 1 lá bài');
    assert.equal(state.players['p2'].hand.length, initialP2Hand + 1, 'P2 nhận được bài nộp phí');
    assert.notEqual(resA.type, 'TRAP_NEGATED', 'Đòn đánh không bị hủy vì đã nộp đủ phí');

    // Trường hợp B: P1 rỗng túi (0 lá bài) -> Đòn đánh bị hủy hoàn toàn
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq10-b',
      cardId: 'NQ-10',
      name: 'Thu Phí Qua Đường',
      setTurnNumber: 1
    };
    state.players['p1'].hand = [];

    const resB = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', null);
    assert.equal(resB.type, 'TRAP_NEGATED', 'Đòn đánh bị hủy do rỗng túi không có bài nộp phí');
  });

  await t.test('TEST-FAIR.10: Bẫy NQ-16 (Phút 89 Lật Kèo) — Cứu tử thần, giữ 1 HP và bốc 2 lá bài', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.players['p2'].hp = 2;
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq16',
      cardId: 'NQ-16',
      name: 'Phút 89 Lật Kèo',
      setTurnNumber: 1
    };

    const initialHand = state.players['p2'].hand.length;

    // P2 nhận sát thương trí mạng 5 HP (vượt quá 2 HP hiện có)
    BattleResolver.applyDamage(state, state.players['p2'], 5);

    assert.equal(state.players['p2'].hp, 1, 'HP của P2 phải được giữ lại ở mức 1 điểm');
    assert.equal(state.players['p2'].isGhost, false, 'P2 không bị biến thành Hồn Ma');
    assert.equal(state.players['p2'].hand.length, initialHand + 2, 'P2 được bốc thêm 2 lá bài lật kèo');
    assert.equal(state.players['p2'].trapSlots[0], null, 'Bẫy NQ-16 đã kích hoạt và giải phóng slot');
    assert.ok(state.graveyard.some(c => c.cardId === 'NQ-16'), 'NQ-16 đã vào Bãi Rác');
  });

  await t.test('TEST-FAIR.11: Bẫy NQ-05 (Camera Hành Trình) — Vô hiệu hóa Bài Drama của đối thủ', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;
    state.turnOrder = ['p1', 'p2'];
    state.currentTurnIndex = 0;

    // P2 đã úp NQ-05 từ lượt 1
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq05',
      cardId: 'NQ-05',
      name: 'Camera Hành Trình',
      setTurnNumber: 1
    };

    // P1 dùng Drama DR-11 (Bốc Phốt, đáng lẽ gây 2 sát thương cho P2)
    state.players['p1'].hand.push({
      instanceId: 'drama-dr11',
      cardId: 'DR-11',
      name: 'Bốc Phốt Lên Nhóm Chat'
    });

    state.players['p2'].hp = 10;
    GameEngine.useDrama(state, 'p1', 'drama-dr11', { targetPlayerId: 'p2' });

    // Hiệu ứng bốc phốt bị vô hiệu hóa: P2 vẫn nguyên 10 HP
    assert.equal(state.players['p2'].hp, 10, 'P2 không bị trừ HP vì Drama đã bị NQ-05 chặn đứng');
    assert.ok(state.graveyard.some(c => c.cardId === 'NQ-05'), 'NQ-05 đã vào bãi rác');
    assert.ok(state.graveyard.some(c => c.cardId === 'DR-11'), 'DR-11 bị gửi vào bãi rác');
  });

  await t.test('TEST-FAIR.12: Bẫy NQ-09 (Cúp Nước Đột Xuất) — Đóng băng Chiến Thần đối thủ vừa triệu hồi', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;
    state.turnOrder = ['p1', 'p2'];
    state.currentTurnIndex = 0;

    // P2 úp NQ-09 từ lượt 1
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq09',
      cardId: 'NQ-09',
      name: 'Cúp Nước Đột Xuất',
      setTurnNumber: 1
    };

    // P1 triệu hồi CT-02
    state.players['p1'].hand.push({
      instanceId: 'monster-ct02',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3
    });

    GameEngine.normalSummon(state, 'p1', 'monster-ct02', 0);

    const summoned = state.players['p1'].monsterSlots[0];
    assert.ok(summoned, 'Quái đã được triệu hồi lên sân');
    assert.equal(summoned.cannotAttack, true, 'Quái bị dính bẫy ngã sấp mặt, không thể tấn công');
    assert.ok(summoned.statusEffects.some(e => e.type === 'FREEZE'), 'Quái có hiệu ứng FREEZE');
    assert.ok(state.graveyard.some(c => c.cardId === 'NQ-09'), 'NQ-09 đã lật và vào bãi rác');
  });

  await t.test('TEST-FAIR.13: Bẫy NQ-13 (Hàng Giả Hàng Nhái) — Chặn cướp quái (DR-06) và phạt vứt bài', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;
    state.turnOrder = ['p1', 'p2'];
    state.currentTurnIndex = 0;

    // P2 có quái trên sân và úp NQ-13
    state.players['p2'].monsterSlots[0] = {
      instanceId: 'p2-monster',
      cardId: 'CT-02',
      name: 'Chó Cỏ Quý',
      basePower: 3
    };
    state.players['p2'].trapSlots[0] = {
      instanceId: 'trap-nq13',
      cardId: 'NQ-13',
      name: 'Hàng Giả Hàng Nhái',
      setTurnNumber: 1
    };

    // P1 dùng DR-06 để cướp quái của P2
    state.players['p1'].hand.push({
      instanceId: 'drama-dr06',
      cardId: 'DR-06',
      name: 'Mượn Đồ Quên Trả'
    });
    state.players['p1'].hand.push({
      instanceId: 'p1-extra-card',
      cardId: 'CT-01',
      name: 'Bài Dư'
    });

    GameEngine.useDrama(state, 'p1', 'drama-dr06', { targetPlayerId: 'p2', targetSlotIndex: 0 });

    // Quái của P2 vẫn an toàn trên sân P2
    assert.ok(state.players['p2'].monsterSlots[0], 'Quái P2 không bị cướp');
    assert.equal(state.players['p1'].monsterSlots[0], null, 'Sân P1 không nhận được quái');
    assert.ok(state.graveyard.some(c => c.instanceId === 'p1-extra-card'), 'P1 bị phạt vứt 1 lá bài vào bãi rác');
  });

  await t.test('TEST-FAIR.14: Bot AI thông minh tự động xả bài thừa cuối lượt vào Bãi Rác', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'bot1', name: 'Bot Xóm Trọ', characterId: 'NV-01', isBot: true },
        { id: 'p1', name: 'Người chơi', characterId: 'NV-02' }
      ]
    });

    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;
    state.turnOrder = ['bot1', 'p1'];
    state.currentTurnIndex = 0;

    // Nhét 8 lá vào tay bot (vượt quá giới hạn 6 lá)
    state.players['bot1'].hand = [
      { instanceId: 'b1', cardId: 'CT-01', name: 'C1', power: 1 },
      { instanceId: 'b2', cardId: 'CT-02', name: 'C2', power: 2 },
      { instanceId: 'b3', cardId: 'CT-03', name: 'C3', power: 3 },
      { instanceId: 'b4', cardId: 'CT-04', name: 'C4', power: 4 },
      { instanceId: 'b5', cardId: 'CT-05', name: 'C5', power: 5 },
      { instanceId: 'b6', cardId: 'CT-06', name: 'C6', power: 6 },
      { instanceId: 'b7', cardId: 'CT-07', name: 'C7', power: 7 },
      { instanceId: 'b8', cardId: 'CT-08', name: 'C8', power: 8 }
    ];

    // BotBrain kết thúc lượt mà không gặp lỗi và xả đúng số lá bài thừa
    assert.doesNotThrow(() => {
      BotBrain.executeTurn(state, 'bot1');
    });

    assert.ok(state.players['bot1'].hand.length <= 6, 'Bot đã xả bài thừa về mức an toàn <= 6 lá');
    assert.ok(state.graveyard.length >= 2, 'Các lá bài thừa đã được đưa vào Bãi Rác sạch sẽ');
  });

  await t.test('TEST-FAIR.15: Chế độ Đấu Phe — Bài Drama (DR-02, DR-11) không tấn công đồng đội và đồng bộ máu chung', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', teamId: 'TEAM_A' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02', teamId: 'TEAM_B' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03', teamId: 'TEAM_A' },
        { id: 'p4', name: 'Dũng', characterId: 'NV-04', teamId: 'TEAM_B' }
      ],
      isTeamMode: true
    });

    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;
    state.turnOrder = ['p1', 'p2', 'p3', 'p4'];
    state.currentTurnIndex = 0;

    // P1 dùng DR-11 (Bốc Phốt): nếu không chỉ định đối thủ, phải tự nhắm vào kẻ địch (TEAM_B), tuyệt đối không bắn đồng đội (p3)
    state.players['p1'].hand.push({
      instanceId: 'dr11-test',
      cardId: 'DR-11',
      name: 'Bốc Phốt Lên Nhóm Chat'
    });

    const initialTeamAHp = state.teamHp['TEAM_A'];
    const initialTeamBHp = state.teamHp['TEAM_B'];

    GameEngine.useDrama(state, 'p1', 'dr11-test');

    assert.equal(state.teamHp['TEAM_A'], initialTeamAHp, 'TEAM_A (Phe P1 và đồng đội P3) hoàn toàn không bị trúng đạn');
    assert.equal(state.players['p3'].hp, initialTeamAHp, 'Máu đồng đội P3 không bị ảnh hưởng');
    assert.equal(state.teamHp['TEAM_B'], initialTeamBHp - 2, 'TEAM_B bị trừ 2 HP và đồng bộ toàn phe');
    assert.equal(state.players['p2'].hp, state.teamHp['TEAM_B'], 'Máu của thành viên đối thủ được đồng bộ chuẩn xác');
  });
});
