import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { GameState, PHASES } from '../../src/core/GameState.js';
import { BotBrain } from '../../src/core/BotBrain.js';
import { ActionCueManager } from '../../src/engine/ActionCueManager.js';
import { CARD_TYPES, ALL_96_CARDS } from '../../src/data/cards.js';

describe('Bot AI Xóm Trọ & Cơ Chế Đấu Phe (Team Battle)', () => {
  test('TEST-TEAM.01: Khởi tạo chế độ Đấu Phe 2v2 (Máu chung 20 HP mỗi phe)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Người chơi 1', characterId: 'NV-01', teamId: 'TEAM_A' },
        { id: 'p2', name: 'Người chơi 2', characterId: 'NV-02', teamId: 'TEAM_B' },
        { id: 'p3', name: 'Người chơi 3', characterId: 'NV-03', teamId: 'TEAM_A' },
        { id: 'p4', name: 'Người chơi 4', characterId: 'NV-04', teamId: 'TEAM_B' }
      ],
      isTeamMode: true
    });

    assert.equal(state.isTeamMode, true, 'isTeamMode phải là true');
    assert.ok(state.teamHp, 'teamHp phải tồn tại');
    assert.equal(state.teamHp.TEAM_A, 20, 'Phe A phải có 20 HP khởi đầu');
    assert.equal(state.teamHp.TEAM_B, 20, 'Phe B phải có 20 HP khởi đầu');
    assert.equal(state.players.p1.hp, 20, 'Người chơi p1 phải hiển thị 20 HP theo phe');
    assert.equal(state.players.p3.hp, 20, 'Đồng đội p3 phải hiển thị 20 HP theo phe');
  });

  test('TEST-TEAM.02: Cấm tuyệt đối tấn công người chơi cùng phe', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Người chơi 1', characterId: 'NV-01', teamId: 'TEAM_A' },
        { id: 'p2', name: 'Người chơi 2', characterId: 'NV-02', teamId: 'TEAM_B' },
        { id: 'p3', name: 'Người chơi 3', characterId: 'NV-03', teamId: 'TEAM_A' },
        { id: 'p4', name: 'Người chơi 4', characterId: 'NV-04', teamId: 'TEAM_B' }
      ],
      isTeamMode: true
    });

    state.currentPhase = PHASES.BATTLE;
    state.players.p1.monsterSlots[0] = {
      instanceId: 'test-monster',
      cardId: 'CT-01',
      name: 'Camera Chạy Bằng Cơm',
      type: CARD_TYPES.LOW_MONSTER,
      basePower: 3
    };

    assert.throws(
      () => {
        // p1 tấn công đồng đội p3
        GameEngine.declareAttack(state, 'p1', 0, 'p3', null);
      },
      /Không thể tấn công đồng đội cùng phe/,
      'Hệ thống phải chặn đòn đánh vào đồng đội'
    );
  });

  test('TEST-TEAM.03: Sát thương trừ vào Máu Chung và đồng bộ toàn bộ thành viên cùng phe', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Người chơi 1', characterId: 'NV-01', teamId: 'TEAM_A' },
        { id: 'p2', name: 'Người chơi 2', characterId: 'NV-02', teamId: 'TEAM_B' },
        { id: 'p3', name: 'Người chơi 3', characterId: 'NV-03', teamId: 'TEAM_A' },
        { id: 'p4', name: 'Người chơi 4', characterId: 'NV-04', teamId: 'TEAM_B' }
      ],
      isTeamMode: true
    });

    state.currentPhase = PHASES.BATTLE;
    state.turnNumber = 2;
    // p1 gọi quái đánh trực diện p2 (Phe B)
    state.players.p1.monsterSlots[0] = {
      instanceId: 'test-monster',
      cardId: 'CT-01',
      name: 'Camera Chạy Bằng Cơm',
      type: CARD_TYPES.LOW_MONSTER,
      basePower: 3
    };

    GameEngine.declareAttack(state, 'p1', 0, 'p2', null);

    // Máu Phe B (20 - 3 = 17)
    assert.equal(state.teamHp.TEAM_B, 17, 'Máu chung Phe B phải giảm còn 17');
    assert.equal(state.players.p2.hp, 17, 'p2 phải có 17 HP');
    assert.equal(state.players.p4.hp, 17, 'Đồng đội p4 cũng phải có 17 HP đồng bộ');
  });

  test('TEST-BOT.01: Bot AI tự động triệu hồi quái và úp bẫy trong lượt của mình', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Người chơi', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Bình', characterId: 'NV-02', isBot: true }
      ]
    });

    // Chuyển lượt sang p2 (Bot)
    state.currentTurnIndex = 1;
    state.currentPhase = PHASES.MAIN;

    // Đảm bảo tay Bot có 1 quái cấp thấp và 1 bẫy
    state.players.p2.hand = [
      {
        instanceId: 'bot-card-1',
        cardId: 'CT-02',
        name: 'Chó Cỏ Đầu Đàn',
        type: CARD_TYPES.LOW_MONSTER,
        basePower: 3
      },
      {
        instanceId: 'bot-card-2',
        cardId: 'NQ-01',
        name: 'Gậy Ông Đập Lưng Ông',
        type: CARD_TYPES.TRAP,
        basePower: 0
      }
    ];

    const result = BotBrain.executeTurn(state, 'p2');

    assert.ok(result.logs.length > 0, 'Bot phải sinh nhật ký hành động');
    assert.ok(state.players.p2.monsterSlots[0] !== null, 'Bot phải triệu hồi quái vào ô trống');
    assert.ok(state.players.p2.trapSlots[0] !== null, 'Bot phải úp bẫy vào ô trống');
    assert.ok(result.logs.some(l => l.includes('Bot Bình')), 'Phải có câu thoại cà khịa của Bot');
  });

  test('TEST-CUE.01: ActionCueManager gợi ý nút Triệu Hồi và Tấn Công chính xác', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Người chơi', characterId: 'NV-01' },
        { id: 'p2', name: 'Đối thủ', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.players.p1.hand = [
      {
        instanceId: 'h-1',
        cardId: 'CT-01',
        type: CARD_TYPES.LOW_MONSTER,
        basePower: 3
      }
    ];

    // Chưa chọn thẻ, nhưng có quái trên tay và ô trống -> gợi ý Triệu Hồi
    const cue1 = ActionCueManager.getSuggestedAction(state, 'p1', null);
    assert.equal(cue1, 'btn-action-summon', 'Phải gợi ý btn-action-summon');

    // Sau khi đã triệu hồi quái lên sân, chuyển sang Battle -> gợi ý Tấn Công
    state.players.p1.monsterSlots[0] = state.players.p1.hand[0];
    state.currentPhase = PHASES.BATTLE;

    const cue2 = ActionCueManager.getSuggestedAction(state, 'p1', null);
    assert.equal(cue2, 'btn-action-attack', 'Phải gợi ý btn-action-attack');

    // Sau khi đánh xong -> gợi ý Hết Lượt
    state.attacksDeclaredThisTurn.push('p1_0');
    const cue3 = ActionCueManager.getSuggestedAction(state, 'p1', null);
    assert.equal(cue3, 'btn-action-endturn', 'Phải gợi ý btn-action-endturn');

    // Khi chọn 1 thẻ Đạo Cụ (Trang Bị) trên tay -> gợi ý btn-action-equip
    state.players.p1.hand.push({
      instanceId: 'equip-1',
      cardId: 'DC-01',
      type: CARD_TYPES.EQUIPMENT
    });
    const cue4 = ActionCueManager.getSuggestedAction(state, 'p1', 'equip-1');
    assert.equal(cue4, 'btn-action-equip', 'Phải gợi ý btn-action-equip khi chọn bài Đạo Cụ');
  });

  test('TEST-DRAW.01: Quy tắc chuẩn — Mỗi vòng chỉ được 1 lượt bốc bài (1 lá), cấm bốc thêm lá thứ 2', async () => {
    const { TurnManager } = await import('../../src/core/TurnManager.js');
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Người chơi', characterId: 'NV-01' },
        { id: 'p2', name: 'Đối thủ', characterId: 'NV-02' }
      ]
    });

    const initialHandCount = state.players.p1.hand.length;
    TurnManager.startTurn(state);

    // Dù sân trống 0 quái, quy tắc mới bắt buộc chỉ nhận đúng 1 lá duy nhất
    assert.equal(state.players.p1.hand.length, initialHandCount + 1, 'Chỉ nhận đúng 1 lá bài duy nhất cho vòng');
    assert.equal(state.manualDrawUsedThisTurn, true, 'Đã dùng xong lượt bốc bài của vòng');
  });
});

