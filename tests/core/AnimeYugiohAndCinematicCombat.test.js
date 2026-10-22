import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { TurnManager } from '../../src/core/TurnManager.js';
import { BattleResolver } from '../../src/core/BattleResolver.js';
import { GhostSystem } from '../../src/core/GhostSystem.js';
import { BotBrain } from '../../src/core/BotBrain.js';
import { PHASES } from '../../src/core/GameState.js';
import { ALL_96_CARDS, CARD_TYPES, TRIBES } from '../../src/data/cards.js';
import { audioManager } from '../../src/audio/AudioManager.js';
import { SpatialBoardAnimator } from '../../src/engine/SpatialBoardAnimator.js';
import { CardActivationStage } from '../../src/engine/CardActivationStage.js';
import { ArenaLayout } from '../../src/ui/ArenaLayout.js';
import { ModalPanels } from '../../src/ui/ModalPanels.js';
import { GameApp } from '../../src/index.js';

test('Kiểm thử Nâng cấp v4.4: Mở Khóa Thao Tác Tức Thì 100%, Chỉ Đọc Hiệu Ứng Đang Kích Hoạt, Tấn Công Gọn Nhanh, Hiệu Ứng Trừ Máu Đặc Sắc & Lật Ngửa Bài Đối Thủ', async (t) => {
  await t.test('TEST-YGO.01: Bài chia khởi đầu luôn đảm bảo mỗi người chơi có ít nhất 1 Linh Thú Cấp Thấp để triệu hồi ở lượt Bày Trò đầu tiên', () => {
    for (let seed = 100; seed < 120; seed++) {
      const state = GameEngine.initGame({
        seed,
        playerConfigs: [
          { id: 'p1', name: 'Bạn (Sơn Tinh)', characterId: 'NV-01', isBot: false },
          { id: 'p2', name: 'Bot Thủy Tinh', characterId: 'NV-02', isBot: true },
          { id: 'p3', name: 'Bot Thánh Gióng', characterId: 'NV-03', isBot: true },
          { id: 'p4', name: 'Bot Chử Đồng Tử', characterId: 'NV-04', isBot: true }
        ],
        isTeamMode: true
      });

      for (const p of Object.values(state.players)) {
        assert.equal(p.hand.length, 5, 'Mỗi người chơi phải có đúng 5 lá khởi đầu');
        const hasSummonableLow = p.hand.some(c => {
          const d = ALL_96_CARDS[c.cardId] || c;
          return (c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23';
        });
        assert.ok(hasSummonableLow, `Người chơi ${p.id} (seed ${seed}) phải có ít nhất 1 Linh Thú Cấp Thấp trong 5 lá đầu`);
      }
    }
  });

  await t.test('TEST-YGO.02: Bot tuyệt đối KHÔNG tấn công trong lượt Bày Trò đầu tiên của bàn đấu (Vòng 1 cho cả 4 người chơi)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Bạn (Sơn Tinh)', characterId: 'NV-01', teamId: 'TEAM_A', isBot: false },
        { id: 'p2', name: 'Bot Thủy Tinh', characterId: 'NV-02', teamId: 'TEAM_B', isBot: true },
        { id: 'p3', name: 'Bot Thánh Gióng', characterId: 'NV-03', teamId: 'TEAM_A', isBot: true },
        { id: 'p4', name: 'Bot Chử Đồng Tử', characterId: 'NV-04', teamId: 'TEAM_B', isBot: true }
      ],
      isTeamMode: true
    });

    state.currentPhase = PHASES.MAIN;
    const excessRound1 = state.players.p1.hand.length > 6 ? [state.players.p1.hand[state.players.p1.hand.length - 1].instanceId] : [];
    TurnManager.endTurn(state, 'p1', excessRound1);

    assert.equal(state.turnOrder[state.currentTurnIndex], 'p2');
    assert.equal(state.openingRoundActive, true, 'Vòng 1 của bàn đấu vẫn đang diễn ra cho p2');

    state.players.p2.hand.push({ instanceId: 'dr11-test', cardId: 'DR-11', name: 'Tiếng Trống Kiện Trời' });
    const resP2 = BotBrain.executeTurn(state, 'p2');
    assert.equal(state.players.p1.hp, 20, 'Bot p2 không được phép tấn công hay dùng Drama trừ máu p1 ở lượt Bày Trò đầu tiên');
    assert.ok(resP2.logs.some(l => l.includes('Hiệp Ước Hòa Bình') || l.includes('Bảo hộ')), 'Phải có thông báo tuân thủ hòa bình lượt đầu');

    assert.equal(state.turnOrder[state.currentTurnIndex], 'p3');
    assert.equal(state.openingRoundActive, true);
    BotBrain.executeTurn(state, 'p3');
    assert.equal(state.players.p2.hp, 20, 'Bot p3 cũng không được tấn công ở lượt Bày Trò đầu tiên');

    assert.equal(state.turnOrder[state.currentTurnIndex], 'p4');
    assert.equal(state.openingRoundActive, true);
    BotBrain.executeTurn(state, 'p4');
    assert.equal(state.players.p1.hp, 20, 'Bot p4 cũng không được tấn công p1 ở lượt Bày Trò đầu tiên');

    assert.equal(state.turnOrder[state.currentTurnIndex], 'p1');
    assert.equal(state.roundNumber, 2);
    assert.equal(state.openingRoundActive, false);
  });

  await t.test('TEST-YGO.03: Bảo hộ khi người chơi chưa triệu hồi nhân vật nào — Bot không tấn công người chơi chưa từng triệu hồi Chiến Thần', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Bạn (Sơn Tinh)', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Thủy Tinh', characterId: 'NV-02', isBot: true }
      ],
      isTeamMode: false
    });

    state.currentPhase = PHASES.MAIN;
    const excessRound1 = state.players.p1.hand.length > 6 ? [state.players.p1.hand[state.players.p1.hand.length - 1].instanceId] : [];
    TurnManager.endTurn(state, 'p1', excessRound1);
    BotBrain.executeTurn(state, 'p2');
    assert.equal(state.players.p1.hp, 10);

    const excessRound2 = state.players.p1.hand.length > 6 ? [state.players.p1.hand[state.players.p1.hand.length - 1].instanceId] : [];
    TurnManager.endTurn(state, 'p1', excessRound2);
    assert.equal(state.players.p1.hasSummonedMonster, false);
    assert.ok(state.players.p1.monsterSlots.every(s => s === null));

    const resBotRound2 = BotBrain.executeTurn(state, 'p2');
    assert.equal(state.players.p1.hp, 10, 'Bot không được tấn công khi người chơi chưa có nhân vật nào được triệu hồi');
    assert.ok(resBotRound2.logs.some(l => l.includes('chưa triệu hồi Chiến Thần')), 'Bot phải ghi nhận bảo hộ người chơi chưa triệu hồi Chiến Thần');

    const lowCard = state.players.p1.hand.find(c => ALL_96_CARDS[c.cardId]?.type === CARD_TYPES.LOW_MONSTER);
    GameEngine.normalSummon(state, 'p1', lowCard.instanceId, 0);
    assert.equal(state.players.p1.hasSummonedMonster, true, 'Sau khi triệu hồi, cờ hasSummonedMonster phải bật thành true');
  });

  await t.test('TEST-YGO.04: Giọng đọc phong cách Anime Yu-Gi-Oh! bỏ qua tên người thi triển, đọc Hiệu Ứng đang kích hoạt và khi Tấn Công chỉ đọc Đối Tượng Tấn Công + Mục Tiêu', async () => {
    const ct28 = ALL_96_CARDS['CT-28']; // Cá Ông Nam Hải Cứu Độ
    const narrationSummon = audioManager.buildYugiohNarration({
      card: ct28,
      activatorName: 'Bạn (Sơn Tinh)',
      category: 'SUMMON',
      triggeredEffectText: '🐋 CT-28 Cá Ông Nam Hải: Cứu độ vượt sóng, hồi +1 Điểm Nhân Phẩm và bốc 1 lá bài!'
    });

    assert.ok(!narrationSummon.animeDeclaration.includes('Bạn (Sơn Tinh)'), 'Lời khai chiêu phải bỏ qua tên người thi triển');
    assert.ok(!narrationSummon.spokenText.includes('Bạn (Sơn Tinh)'), 'Câu đọc spokenText phải bỏ qua tên người thi triển');
    assert.ok(narrationSummon.animeDeclaration.includes(ct28.name), 'Lời khai chiêu phải hô vang tên lá bài');
    assert.ok(narrationSummon.spokenText.includes('Hiệu ứng:'), 'Phải đọc phần nội dung Hiệu ứng của lá bài đang kích hoạt');
    assert.ok(narrationSummon.spokenText.includes('Kết quả:'), 'Phải đọc phần Kết quả khi kích hoạt hiệu ứng');
    assert.equal(narrationSummon.fullCardEffect, ct28.description, 'Trên giao diện thẻ vẫn giữ nguyên vẹn 100% hiệu ứng gốc');

    // Khi TẤN CÔNG (category === 'ATTACK'): CHỈ đọc đối tượng tấn công và mục tiêu tấn công!
    const tr06 = ALL_96_CARDS['TR-06'];
    const narrationAttack = audioManager.buildYugiohNarration({
      card: tr06,
      activatorName: 'Bạn (Sơn Tinh)',
      category: 'ATTACK',
      targetName: 'Chim Lạc Báo Tin',
      atkPower: 5,
      defPower: 2,
      triggeredEffectText: `${tr06.name} tiêu diệt mục tiêu và gây thêm 1 sát thương xuyên giáp!`
    });

    assert.ok(!narrationAttack.spokenText.includes('Bạn (Sơn Tinh)'), 'Câu đọc tấn công không đọc tên người thi triển');
    assert.ok(narrationAttack.spokenText.includes(tr06.name), 'Câu đọc tấn công phải nêu rõ tên Linh Thú tấn công');
    assert.ok(narrationAttack.spokenText.includes('Chim Lạc Báo Tin'), 'Câu đọc tấn công phải nêu rõ tên Mục Tiêu bị tấn công');
    assert.equal(narrationAttack.sentences.length, 1, 'Khi tấn công chỉ đọc đúng 1 câu gồm đối tượng tấn công và mục tiêu tấn công');
    assert.ok(!narrationAttack.spokenText.includes('Hiệu ứng:'), 'Khi tấn công không đọc lại mô tả hiệu ứng để tránh mất thời gian');
    assert.ok(!narrationAttack.spokenText.includes('Kết quả:'), 'Khi tấn công không đọc trước kết quả bằng chữ vì kết quả thể hiện bằng hiệu ứng tấn công trên màn hình');

    const stage = new CardActivationStage();
    const stageNarration = await stage.presentActivation({
      card: ALL_96_CARDS['DR-08'],
      activatorName: 'Thủy Tinh',
      category: 'DRAMA',
      triggeredEffectText: '🥁 DR-08 Lễ Hội Đền Hùng: Toàn bàn hồi +2 Điểm Nhân Phẩm và bốc bài lộc!'
    });
    assert.ok(!stageNarration.animeDeclaration.includes('Thủy Tinh'), 'Không đọc tên người thi triển Thủy Tinh');
    assert.ok(stageNarration.spokenText.includes('Hiệu ứng:'));
    assert.ok(stageNarration.spokenText.includes('Kết quả:'));
    assert.equal(audioManager.lastNarration.cardId, 'DR-08');
    assert.equal(stage.isShowing, false, 'Sau khi presentActivation kết thúc, stage.isShowing phải tự động mở khóa về false');
  });

  await t.test('TEST-YGO.05: Đã loại bỏ hoàn toàn bước đọc giọng khiêu khích (VOICE) của nhân vật/Bot và diễn hoạt tấn công khóa đúng mục tiêu', async () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Bình', characterId: 'NV-02', isBot: true }
      ]
    });

    state.turnNumber = 3;
    state.roundNumber = 2;
    state.openingRoundActive = false;
    state.currentTurnIndex = 1;
    state.currentPhase = PHASES.MAIN;

    state.players.p1.hasSummonedMonster = true;
    state.players.p1.monsterSlots = [
      null,
      { instanceId: 'p1-m-slot1', cardId: 'CT-07', name: 'Cò Trắng Đầu Đình', basePower: 1, power: 1, equippedItems: [] }
    ];

    state.players.p2.hasSummonedMonster = true;
    state.players.p2.monsterSlots = [
      { instanceId: 'p2-m-slot0', cardId: 'CT-06', name: 'Trâu Vàng Hồ Tây', basePower: 3, power: 3, equippedItems: [] },
      null
    ];
    state.players.p2.hand = [];

    const allSteps = [];
    await BotBrain.executeTurnAnimated(state, 'p2', async (step) => {
      allSteps.push(step);
    }, 5);

    assert.equal(allSteps.some(s => s.type === 'VOICE'), false, 'Tuyệt đối không còn bước VOICE khiêu khích của nhân vật trong lượt Bot');
    const capturedAttackSteps = allSteps.filter(s => s.type === 'ATTACK');
    assert.equal(capturedAttackSteps.length, 1, 'Bot phải thực hiện đúng 1 pha tấn công có diễn hoạt');
    const atkStep = capturedAttackSteps[0];
    assert.equal(atkStep.attackerSlot, 0, 'Phải xác định đúng ô Chiến Thần tấn công (slot 0)');
    assert.equal(atkStep.targetPlayerId, 'p1', 'Phải xác định đúng người chơi mục tiêu (p1)');
    assert.equal(atkStep.targetSlot, 1, 'Phải khóa chính xác vào ô số 1 nơi Cò Trắng đang đứng');
    assert.equal(atkStep.defenderCard?.cardId, 'CT-07', 'Phải lưu lại bản sao lá bài bị tấn công trước khi bị phá hủy');
    assert.equal(atkStep.battleResult?.defenderDestroyed, true, 'Kết quả giao tranh phải ghi nhận lá bài mục tiêu bị phá hủy');

    const animator = new SpatialBoardAnimator();
    const animRes = await animator.executeCinematicAttack({
      attackerZoneId: `zone-player-p2-monster-${atkStep.attackerSlot}`,
      targetZoneId: `zone-player-p1-monster-${atkStep.targetSlot}`,
      attackerCard: atkStep.card,
      defenderCard: atkStep.defenderCard,
      targetPlayerName: 'An',
      atkPower: atkStep.atkPower,
      defPower: atkStep.defPower,
      damageDealt: 3,
      attackerDestroyed: false,
      defenderDestroyed: true
    });
    assert.equal(animRes.targetZoneId, 'zone-player-p1-monster-1');
    assert.equal(animRes.defenderDestroyed, true);
  });

  await t.test('TEST-YGO.06: Cơ chế chặn hành động (Action Lock) CHỈ diễn ra khi đang đọc và kích hoạt hiệu ứng, tự động mở khóa 100% nút ngay khi kết thúc', async () => {
    const app = new GameApp();
    app.state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Bình', characterId: 'NV-02', isBot: true }
      ]
    });
    app.state.currentPhase = PHASES.MAIN;

    assert.equal(app.isBusy(), false, 'Ban đầu khi chưa kích hoạt hiệu ứng, hệ thống hoàn toàn không bị khóa');

    let executionLog = [];
    let secondCallBlocked = false;

    const p1Promise = app.runLockedAction(async () => {
      executionLog.push('start-1');
      assert.equal(app.isBusy(), true, 'Trong khi đang đọc và kích hoạt hiệu ứng, app.isBusy() phải bằng true');

      const allowedSecond = await app.runLockedAction(async () => {
        executionLog.push('start-2-overlapping');
      });
      if (allowedSecond === false) {
        secondCallBlocked = true;
      }

      await new Promise(r => setTimeout(r, 30));
      executionLog.push('end-1');
    });

    const firstAllowed = await p1Promise;
    assert.equal(firstAllowed, true, 'Hành động 1 phải được thực thi');
    assert.equal(secondCallBlocked, true, 'Hành động 2 gọi chồng trong lúc đang đọc và kích hoạt hiệu ứng 1 phải bị chặn');
    assert.deepEqual(executionLog, ['start-1', 'end-1'], 'Không được có hành động chồng chéo chen ngang');
    assert.equal(app.isBusy(), false, 'Ngay sau khi hiệu ứng đọc và kích hoạt xong, app.isBusy() phải lập tức về false');
    assert.equal(app.isActionLocked, false, 'Cờ isActionLocked phải về false ngay sau khi kết thúc hiệu ứng');

    const unlockedHtml = ArenaLayout.renderArenaHtml(app.state, 'p1', { isActionLocked: app.isBusy() });
    assert.ok(unlockedHtml.includes('data-action-locked="false"'), 'Sau khi hiệu ứng kết thúc, thanh công cụ phải ở trạng thái mở khóa data-action-locked="false"');
    assert.ok(!unlockedHtml.includes('ĐANG XỬ LÝ HIỆU ỨNG'), 'Không còn hiển thị nhãn khóa sau khi hiệu ứng kết thúc');
    assert.ok(unlockedHtml.includes('id="btn-action-summon" >⚔️ Triệu Hồi'), 'Các nút hành động phải được mở khóa (không bị disabled)');

    const lockedHtml = ArenaLayout.renderArenaHtml(app.state, 'p1', { isActionLocked: true });
    assert.ok(lockedHtml.includes('data-action-locked="true"'), 'Khi đang kích hoạt hiệu ứng, toolbar phải gắn cờ data-action-locked="true"');
  });

  await t.test('TEST-YGO.07: Các lá bài được đánh tráo ngẫu nhiên sau mỗi ván đấu (tuyệt đối không lặp lại bộ bài giữa các ván)', () => {
    const openingSignatures = new Set();
    const topDeckSignatures = new Set();

    for (let i = 0; i < 6; i++) {
      const state = GameEngine.initGame({
        playerConfigs: [
          { id: 'p1', name: 'Bạn', characterId: 'NV-01' },
          { id: 'p2', name: 'Đối Thủ', characterId: 'NV-02' }
        ]
      });
      const handSig = state.players.p1.hand.map(c => c.cardId).join(',');
      const deckSig = state.drawPile.slice(-10).map(c => c.cardId).join(',');
      openingSignatures.add(handSig);
      topDeckSignatures.add(deckSig);
    }

    assert.ok(openingSignatures.size >= 5, `6 ván đấu liên tiếp phải có các bộ bài khởi đầu ngẫu nhiên khác nhau (số bộ khác nhau: ${openingSignatures.size}/6)`);
    assert.ok(topDeckSignatures.size >= 5, `Chồng bài bốc của mỗi ván phải được xáo trộn ngẫu nhiên khác nhau (số chồng khác nhau: ${topDeckSignatures.size}/6)`);
  });

  await t.test('TEST-YGO.08: Cơ chế chọn mục tiêu của Bài Đạo Cụ cho phép gắn chính xác lên Linh Thú ở ô chỉ định (cả phe mình và đối thủ)', async () => {
    const app = new GameApp();
    app.state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bình', characterId: 'NV-02', isBot: true }
      ],
      isTeamMode: false
    });
    app.state.currentPhase = PHASES.MAIN;

    app.state.players.p1.monsterSlots[0] = {
      instanceId: 'p1-m0',
      cardId: 'CT-01',
      name: 'Chim Lạc Báo Tin',
      basePower: 2,
      power: 2,
      equippedItems: []
    };
    app.state.players.p1.monsterSlots[1] = {
      instanceId: 'p1-m1',
      cardId: 'CT-02',
      name: 'Khuyển Thần Đá Đầu Làng',
      basePower: 3,
      power: 3,
      equippedItems: []
    };
    app.state.players.p2.monsterSlots[0] = {
      instanceId: 'p2-m0',
      cardId: 'CT-06',
      name: 'Trâu Vàng Hồ Tây',
      basePower: 3,
      power: 3,
      equippedItems: []
    };
    app.state.players.p2.monsterSlots[1] = {
      instanceId: 'p2-m1',
      cardId: 'TR-04',
      name: 'Ông Ba Mươi — Chúa Sơn Lâm',
      basePower: 4,
      power: 4,
      equippedItems: []
    };

    app.state.players.p1.hand.push(
      { instanceId: 'eq-self-1', cardId: 'DC-01', name: 'Dép Tổ Ong Thần Tốc — Nỏ Thần Liên Châu', type: CARD_TYPES.EQUIPMENT },
      { instanceId: 'eq-enemy-1', cardId: 'DC-04', name: 'Tiếng Đàn Thạch Sanh Làm Quân Giặc Bủn Rủn', type: CARD_TYPES.EQUIPMENT }
    );

    await app.executeEquipWithTarget('eq-self-1', 'p1', 1);
    assert.equal(app.state.players.p1.monsterSlots[0].equippedItems.length, 0, 'Ô 1 không bị gắn nhầm');
    assert.equal(app.state.players.p1.monsterSlots[1].equippedItems.length, 1, 'Ô 2 của p1 phải nhận đúng Đạo Cụ DC-01');
    assert.equal(app.state.players.p1.monsterSlots[1].equippedItems[0].cardId, 'DC-01');
    assert.equal(app.isBusy(), false, 'Sau khi gắn Đạo Cụ xong, khóa hành động phải mở lại ngay');

    await app.executeEquipWithTarget('eq-enemy-1', 'p2', 1);
    assert.equal(app.state.players.p2.monsterSlots[0].equippedItems.length, 0, 'Ô 1 của đối thủ không bị gắn nhầm');
    assert.equal(app.state.players.p2.monsterSlots[1].equippedItems.length, 1, 'Ô 2 của đối thủ p2 phải nhận đúng Đạo Cụ DC-04');
    assert.equal(app.state.players.p2.monsterSlots[1].equippedItems[0].cardId, 'DC-04');
    assert.equal(app.isBusy(), false, 'Sau khi gắn Đạo Cụ lên đối thủ xong, khóa hành động phải mở lại ngay');
  });

  await t.test('TEST-YGO.09: Kiểm tra toàn bộ 120 mã thẻ bài — khi hiệu ứng kích hoạt (hasTriggeredEffect = true), buildYugiohNarration đọc đủ 3 câu rõ ràng', () => {
    const allCards = Object.values(ALL_96_CARDS);
    assert.equal(allCards.length, 120, 'Phải có đủ 120 mã thẻ độc bản');

    for (const card of allCards) {
      let category = 'SUMMON';
      if (card.type === CARD_TYPES.HIGH_MONSTER) category = 'TRIBUTE';
      else if (card.type === CARD_TYPES.FUSION_MONSTER) category = 'FUSION';
      else if (card.type === CARD_TYPES.EQUIPMENT) category = 'EQUIP';
      else if (card.type === CARD_TYPES.DRAMA) category = 'DRAMA';
      else if (card.type === CARD_TYPES.TRAP) category = 'TRAP';
      else if (card.type === CARD_TYPES.CURSE) category = 'GHOST';
      else if (card.type === CARD_TYPES.CHARACTER) category = 'SKILL';

      const narration = audioManager.buildYugiohNarration({
        card,
        activatorName: 'Người chơi thử nghiệm',
        category,
        hasTriggeredEffect: true,
        triggeredEffectText: `Kích hoạt hiệu ứng của [${card.name}]`
      });

      assert.equal(narration.sentences.length, 3, `Thẻ ${card.id} (${card.name}) khi hiệu ứng kích hoạt phải có 3 câu đọc`);
      assert.ok(narration.effectSummary && narration.effectSummary.length > 3, `Thẻ ${card.id} phải có effectSummary đầy đủ`);
      assert.ok(narration.resultSummary && narration.resultSummary.length > 3, `Thẻ ${card.id} phải có resultSummary đầy đủ`);
      assert.ok(narration.spokenText.includes('Hiệu ứng:'), `Thẻ ${card.id} phải đọc 'Hiệu ứng:'`);
      assert.ok(narration.spokenText.includes('Kết quả:'), `Thẻ ${card.id} phải đọc 'Kết quả:'`);
    }
  });

  await t.test('TEST-YGO.10: Mỗi khi hiệu ứng kích hoạt (kể cả Chủ Động và Bị Động) đều sinh sự kiện thông báo trong state.effectEvents', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-02' },
        { id: 'p2', name: 'Bình', characterId: 'NV-03' }
      ]
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    state.players.p1.hand.push(
      { instanceId: 'ct01-a', cardId: 'CT-01', name: 'Chim Lạc Báo Tin', type: CARD_TYPES.LOW_MONSTER, tribe: TRIBES.HONG_HOT, basePower: 2 },
      { instanceId: 'ct07-b', cardId: 'CT-07', name: 'Cò Trắng Đầu Đình', type: CARD_TYPES.LOW_MONSTER, tribe: TRIBES.HONG_HOT, basePower: 1 }
    );
    state.players.p2.monsterSlots[0] = {
      instanceId: 'ct11-p2',
      cardId: 'CT-11',
      name: 'Chim Khách Báo Hỷ',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.HONG_HOT,
      basePower: 1
    };

    GameEngine.normalSummon(state, 'p1', 'ct01-a', 0);
    GameEngine.swarmSummon(state, 'p1', 'ct07-b', 1);

    const hasActiveSummonEvent = state.effectEvents.some(e => e.mode === 'ACTIVE' && e.cardId === 'CT-07');
    const hasResonancePassive = state.effectEvents.some(e => e.mode === 'PASSIVE' && e.title.includes('Cộng Hưởng Đồng Tộc'));
    const hasCT11Passive = state.effectEvents.some(e => e.mode === 'PASSIVE' && e.cardId === 'CT-11');

    assert.ok(hasActiveSummonEvent, 'Phải có thông báo hiệu ứng Chủ Động khi triệu hồi CT-07');
    assert.ok(hasResonancePassive, 'Phải có thông báo hiệu ứng Bị Động khi kích hoạt Cộng Hưởng Đồng Tộc');
    assert.ok(hasCT11Passive, 'Phải có thông báo hiệu ứng Bị Động khi CT-11 của đối thủ hưởng ké lộc bốc bài');

    state.players.p1.hand.push({ instanceId: 'dr14-test', cardId: 'DR-14', name: 'Sự Tích Bánh Chưng Bánh Giầy Lang Liêu', type: CARD_TYPES.DRAMA });
    GameEngine.useDrama(state, 'p1', 'dr14-test');

    assert.ok(state.effectEvents.some(e => e.mode === 'ACTIVE' && e.cardId === 'DR-14'), 'Phải có thông báo Chủ Động cho DR-14');
    assert.ok(state.effectEvents.some(e => e.mode === 'PASSIVE' && e.cardId === 'NV-02'), 'Phải có thông báo Bị Động cho nội tại Thủy Tinh NV-02');
  });

  await t.test('TEST-YGO.11: Kiểm toán đầy đủ hiệu ứng của Quái Vật (CT-02 sủa +2 ⚔️, CT-25 gọi bầy kích hoạt hiệu ứng quái đi kèm, TR-05 hồi máu, TR-08 khiêu khích, CT-04/CT-09/TR-07 khi bị tiêu diệt)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    state.players.p1.monsterSlots = [null, null];
    state.players.p1.hand = [
      { instanceId: 'ct25-1', cardId: 'CT-25', name: 'Đàn Chim Lạc Hồng', type: CARD_TYPES.LOW_MONSTER, tribe: TRIBES.TOC_DO, basePower: 3 },
      { instanceId: 'ct07-1', cardId: 'CT-07', name: 'Cò Trắng Đầu Đình', type: CARD_TYPES.LOW_MONSTER, tribe: TRIBES.HONG_HOT, basePower: 1 }
    ];
    GameEngine.normalSummon(state, 'p1', 'ct25-1', 0);
    assert.equal(state.players.p1.monsterSlots[0]?.cardId, 'CT-25', 'Ô 0 phải là CT-25');
    assert.equal(state.players.p1.monsterSlots[1]?.cardId, 'CT-07', 'CT-25 phải tự động gọi CT-07 lên Ô 1');
    assert.equal(state.players.p1.hand.length, 1, 'CT-07 được CT-25 gọi ra phải kích hoạt luôn nội tại bốc 1 lá bài mới');

    state.players.p1.monsterSlots[0] = {
      instanceId: 'ct02-atk',
      cardId: 'CT-02',
      name: 'Khuyển Thần Đá Đầu Làng',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.QUAY_PHA,
      basePower: 3
    };
    state.players.p2.monsterSlots[0] = {
      instanceId: 'ct04-def',
      cardId: 'CT-04',
      name: 'Cóc Tía Nghiến Răng',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.AN_VA,
      basePower: 1
    };
    state.players.p2.monsterSlots[1] = {
      instanceId: 'tr08-taunt',
      cardId: 'TR-08',
      name: 'Trùm Đầu Gấu Hắc Hổ Sơn Thần',
      type: CARD_TYPES.HIGH_MONSTER,
      basePower: 4
    };

    const atkRes = GameEngine.declareAttack(state, 'p1', 0, 'p2', 0);
    assert.equal(atkRes.resolvedTargetSlot, 1, 'TR-08 phải kích hoạt nội tại khiêu khích hút đòn đánh về slot 1');
    assert.equal(atkRes.atkPower, 5, 'CT-02 khi tấn công phải tự động kích hoạt hiệu ứng +2 Độ Chiến (3 + 2 = 5)');
    assert.equal(atkRes.defenderDestroyed, true, 'CT-02 (5 ⚔️) phải đánh bại TR-08 (4 ⚔️)');
    assert.ok(state.effectEvents.some(e => e.cardId === 'CT-02'), 'Phải có thông báo hiệu ứng cho CT-02');
    assert.ok(state.effectEvents.some(e => e.cardId === 'TR-08'), 'Phải có thông báo hiệu ứng bị động cho TR-08');
  });

  await t.test('TEST-YGO.12: Thời lượng đọc 3 phần (Khai chiêu -> Hiệu ứng -> Kết quả) không bao giờ bị ngắt sớm và tự động mở khóa thao tác ngay khi tắt hiển thị', async () => {
    const narration = audioManager.buildYugiohNarration({
      card: ALL_96_CARDS['CT-01'],
      activatorName: 'An',
      category: 'SUMMON',
      triggeredEffectText: '🦅 CT-01 Chim Lạc Báo Tin: Đã lật ngửa toàn bộ bài trên tay của Bình!'
    });

    assert.equal(narration.segmentDurations.length, 3, 'Phải có đúng 3 khoảng thời gian đọc cho 3 phần');
    assert.ok(narration.segmentDurations[0] >= 1200, 'Phần 1 (Khai chiêu) phải có thời gian đọc tối thiểu >= 1200ms');
    assert.ok(narration.segmentDurations[1] >= 1650, 'Phần 2 (Hiệu ứng) phải có thời gian đọc tối thiểu >= 1650ms');
    assert.ok(narration.segmentDurations[2] >= 1600, 'Phần 3 (Kết quả) phải có thời gian đọc tối thiểu >= 1600ms');
    assert.ok(narration.totalExpectedDurationMs >= 4450, 'Tổng thời gian đọc đủ 3 phần phải >= 4450ms để không bao giờ bị tắt sớm');

    const app = new GameApp();
    app.state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    app.state.currentPhase = PHASES.MAIN;

    let lockStatesDuringStage = [];
    app.activationStage.onStateChange = (active) => {
      lockStatesDuringStage.push(active);
    };

    await app.runLockedAction(async () => {
      await app.activationStage.presentActivation({
        card: ALL_96_CARDS['CT-01'],
        activatorName: 'An',
        category: 'SUMMON',
        triggeredEffectText: 'Đã lật ngửa bài của đối thủ!'
      });
    });

    assert.deepEqual(lockStatesDuringStage, [true, false], 'Sân khấu phải khóa thao tác khi mở (true) và mở khóa ngay lập tức khi tắt hiển thị (false)');
    assert.equal(app.isBusy(), false, 'Sau khi tắt hiển thị hiệu ứng, app.isBusy() phải lập tức về false');
    assert.equal(app.isActionLocked, false, 'Sau khi tắt hiển thị hiệu ứng, app.isActionLocked phải lập tức về false');
  });

  await t.test('TEST-YGO.13: Các lá bài có kỹ năng xem bài của người chơi khác (CT-01, DH-01, DR-09, NV-01, TR-09, DR-07) bắt buộc LẬT NGỬA các lá bài được xem lên trên bàn và trong Modal Xem Bài', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An (Sơn Tinh)', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bình (Thủy Tinh)', characterId: 'NV-02', isBot: true }
      ]
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    state.players.p2.hand = [
      { instanceId: 'p2-h1', cardId: 'TR-04', name: 'Ông Ba Mươi — Chúa Sơn Lâm', type: CARD_TYPES.HIGH_MONSTER, basePower: 4 },
      { instanceId: 'p2-h2', cardId: 'DR-08', name: 'Lễ Hội Đền Hùng Mở Tiệc Linh Đình', type: CARD_TYPES.DRAMA }
    ];
    state.players.p2.trapSlots[0] = {
      instanceId: 'p2-trap0',
      cardId: 'NQ-01',
      name: 'Gương Phản Đòn Chiếu Yêu Đầm Dạ Trạch',
      type: CARD_TYPES.TRAP,
      faceUp: false,
      setTurnNumber: 1
    };

    const htmlBefore = ArenaLayout.renderArenaHtml(state, 'p1');
    assert.ok(!htmlBefore.includes('opponent-revealed-hand-strip'), 'Khi chưa dùng kỹ năng xem bài, bài trên tay đối thủ không lật ngửa');
    assert.ok(htmlBefore.includes('data-is-facedown="true"'), 'Khi chưa soi bẫy, bẫy của đối thủ phải úp (data-is-facedown="true")');

    state.players.p1.hand.push({
      instanceId: 'p1-ct01',
      cardId: 'CT-01',
      name: 'Chim Lạc Báo Tin',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.HONG_HOT,
      basePower: 2
    });
    GameEngine.normalSummon(state, 'p1', 'p1-ct01', 0);

    assert.ok(state.revealedHands['p2'] > Date.now(), 'CT-01 phải đánh dấu revealedHands cho đối thủ p2');
    assert.ok(state.lastRevealedView, 'CT-01 phải đẩy sự kiện lật bài vào state.lastRevealedView');
    assert.equal(state.lastRevealedView.cards.length, 2, 'Modal Xem Bài phải chứa đủ 2 lá bài trên tay của p2');
    assert.equal(state.lastRevealedView.cards[0].cardId, 'TR-04');
    assert.equal(state.lastRevealedView.cards[1].cardId, 'DR-08');

    const htmlAfterCT01 = ArenaLayout.renderArenaHtml(state, 'p1');
    assert.ok(htmlAfterCT01.includes('opponent-revealed-hand-strip'), 'Trên trạm của đối thủ phải hiển thị khay bài lật ngửa (.opponent-revealed-hand-strip)');
    assert.ok(htmlAfterCT01.includes('revealed-opponent-hand-card'), 'Các lá bài trên tay đối thủ phải được render lật ngửa (.revealed-opponent-hand-card)');
    assert.ok(htmlAfterCT01.includes('Ông Ba Mươi — Chúa Sơn Lâm'), 'Phải nhìn thấy rõ tên lá bài Ông Ba Mươi của đối thủ');
    assert.ok(htmlAfterCT01.includes('Lễ Hội Đền Hùng Mở Tiệc Linh Đình'), 'Phải nhìn thấy rõ tên lá bài Lễ Hội Đền Hùng của đối thủ');

    const revealedModalHtml = ModalPanels.renderRevealedCardsModal(state.lastRevealedView);
    assert.ok(revealedModalHtml.includes('id="modal-revealed-cards"'), 'Phải render Modal Xem Bài Đã Lật Ngửa (#modal-revealed-cards)');
    assert.ok(revealedModalHtml.includes('ĐÃ LẬT NGỬA'), 'Mỗi lá bài trong Modal phải có nhãn ĐÃ LẬT NGỬA');
    assert.ok(revealedModalHtml.includes('Ông Ba Mươi — Chúa Sơn Lâm'), 'Modal phải lật ngửa lá Ông Ba Mươi kèm đầy đủ mô tả');

    GameEngine.activateCharacterSkill(state, 'p1', { targetPlayerId: 'p2', trapSlotIndex: 0 });
    assert.equal(state.revealedTraps['p2_0'], 'NQ-01', 'Bẫy ô 0 của p2 phải được đánh dấu đã soi (NQ-01)');
    assert.equal(state.lastRevealedView.cards[0].cardId, 'NQ-01', 'Modal Xem Bài phải hiển thị lá bẫy NQ-01 vừa soi được');

    const htmlAfterPeekTrap = ArenaLayout.renderArenaHtml(state, 'p1');
    assert.ok(htmlAfterPeekTrap.includes('revealed-trap-slot'), 'Ô bẫy của đối thủ phải chuyển sang trạng thái lật ngửa (.revealed-trap-slot)');
    assert.ok(htmlAfterPeekTrap.includes('👁️ ĐÃ LẬT SOI'), 'Ô bẫy của đối thủ phải có nhãn 👁️ ĐÃ LẬT SOI');
    assert.ok(htmlAfterPeekTrap.includes('Gương Phản Đòn Chiếu Yêu Đầm Dạ Trạch'), 'Lá bẫy NQ-01 của đối thủ phải hiện rõ mặt ngửa trên sân');

    state.players.p2.trapSlots[1] = {
      instanceId: 'p2-trap1',
      cardId: 'NQ-06',
      name: 'Vỏ Quýt Dày Có Móng Tay Nhọn',
      type: CARD_TYPES.TRAP,
      faceUp: false,
      setTurnNumber: 1
    };
    state.players.p1.hand.push({
      instanceId: 'p1-dr09',
      cardId: 'DR-09',
      name: 'Chiếu Chỉ Thiên Đình Soi Thấu Bẫy',
      type: CARD_TYPES.DRAMA
    });
    GameEngine.useDrama(state, 'p1', 'p1-dr09', { targetPlayerId: 'p2' });
    assert.equal(state.revealedTraps['p2_1'], 'NQ-06', 'DR-09 phải lật ngửa cả lá bẫy thứ 2 (NQ-06) của đối thủ');
    assert.equal(state.lastRevealedView.cards.length, 2, 'DR-09 phải lật ngửa toàn bộ 2 lá bẫy của đối thủ trong Modal Xem Bài');
  });

  await t.test('TEST-YGO.14: Kiểm toán các kỹ năng nâng cao (CT-11 cả 2 bên trái/phải, DR-06 tự tìm đối thủ có quái, DR-10 phá hủy quái, CT-08 ưu tiên cướp Pháp Bảo tốt, Battle Modal hiển thị +2 ⚔️ cho CT-02)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03' }
      ],
      isTeamMode: false
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    state.players.p3.monsterSlots[0] = {
      instanceId: 'p3-ct11',
      cardId: 'CT-11',
      name: 'Chim Khách Báo Hỷ',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.HONG_HOT,
      basePower: 1
    };
    const p3HandBefore = state.players.p3.hand.length;
    TurnManager.drawCard(state, 'p1');
    assert.equal(state.players.p3.hand.length, p3HandBefore + 1, 'CT-11 của người ngồi bên phải (p3) cũng phải kích hoạt bốc 1 lá bài');

    state.players.p1.monsterSlots = [null, null];
    state.players.p2.monsterSlots = [null, null];
    state.players.p1.hand.push({
      instanceId: 'p1-dr06',
      cardId: 'DR-06',
      name: 'Mượn Đồ Quên Trả — Cướp Nỏ Thần Trọng Thủy',
      type: CARD_TYPES.DRAMA
    });
    GameEngine.useDrama(state, 'p1', 'p1-dr06');
    assert.equal(state.players.p1.monsterSlots[0]?.cardId, 'CT-11', 'DR-06 phải tự động tìm đối thủ có Linh Thú (p3) để thu phục sang sân p1');

    state.players.p2.monsterSlots[0] = {
      instanceId: 'p2-m-eq',
      cardId: 'CT-06',
      name: 'Trâu Vàng Hồ Tây',
      type: CARD_TYPES.LOW_MONSTER,
      basePower: 3,
      equippedItems: [
        { instanceId: 'eq-bad', cardId: 'DC-04', name: 'Tiếng Đàn Thạch Sanh' },
        { instanceId: 'eq-good', cardId: 'DC-01', name: 'Dép Tổ Ong Thần Tốc — Nỏ Thần Liên Châu' }
      ]
    };
    state.players.p1.hand.push({
      instanceId: 'p1-ct08',
      cardId: 'CT-08',
      name: 'Khỉ Vàng Núi Đá',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.AN_VA,
      basePower: 2
    });
    GameEngine.normalSummon(state, 'p1', 'p1-ct08', 1);
    assert.equal(state.players.p1.monsterSlots[1]?.equippedItems?.[0]?.cardId, 'DC-01', 'CT-08 phải thông minh ưu tiên cuỗm Pháp Bảo có lợi (DC-01)');

    state.players.p1.monsterSlots[0] = {
      instanceId: 'p1-ct02-preview',
      cardId: 'CT-02',
      name: 'Khuyển Thần Đá Đầu Làng',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.QUAY_PHA,
      basePower: 3,
      equippedItems: []
    };
    const battleModalHtml = ModalPanels.renderBattleTargetModal(state, 'p1', 0);
    assert.ok(battleModalHtml.includes('5 ⚔️'), 'Battle Modal phải tính trước nội tại +2 Độ Chiến khi tấn công của CT-02 (hiển thị 5 ⚔️)');
    assert.ok(battleModalHtml.includes('+2 ⚔️ Tiếng Sủa Trấn Yểm'), 'Battle Modal phải ghi chú rõ +2 ⚔️ Tiếng Sủa Trấn Yểm cho CT-02');
  });

  await t.test('TEST-YGO.15: Sửa triệt để lỗi microtask ActionSequencer — Ngay tại thời điểm this.render() trong khối finally của runLockedAction, app.isBusy() phải bằng false và DOM được mở khóa 100%', async () => {
    const app = new GameApp();
    app.currentScreen = 'ARENA';
    app.state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'Bạn (Sơn Tinh)', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bot Thủy Tinh', characterId: 'NV-02', isBot: true }
      ]
    });
    app.state.currentPhase = PHASES.MAIN;

    let renderedLockStatesInFinally = [];
    const origRender = app.render.bind(app);
    app.render = () => {
      renderedLockStatesInFinally.push({
        isBusy: app.isBusy(),
        isActionLocked: app.isActionLocked,
        sequencerAnimating: app.sequencer.isAnimating,
        stageShowing: app.activationStage.isShowing,
        renderedHtml: ArenaLayout.renderArenaHtml(app.state, 'p1', { isActionLocked: app.isBusy() })
      });
      origRender();
    };

    app.state.players.p1.hand.push({
      instanceId: 'p1-ct30-test',
      cardId: 'CT-30',
      name: 'Gà Đông Tảo Tiến Vua',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.QUAY_PHA,
      basePower: 3
    });
    app.selectedHandInstanceId = 'p1-ct30-test';
    await app.handleSummon();

    assert.ok(renderedLockStatesInFinally.length >= 1, 'app.render() phải được gọi trong khối finally sau khi hiệu ứng kết thúc');
    const finalRenderSnapshot = renderedLockStatesInFinally[renderedLockStatesInFinally.length - 1];
    assert.equal(finalRenderSnapshot.isBusy, false, 'Ngay tại thời điểm app.render() chạy trong finally, app.isBusy() phải bằng false');
    assert.equal(finalRenderSnapshot.sequencerAnimating, false, 'ActionSequencer.isAnimating phải bằng false TRƯỚC khi resolve Promise');
    assert.equal(finalRenderSnapshot.stageShowing, false, 'CardActivationStage.isShowing phải bằng false');
    assert.ok(finalRenderSnapshot.renderedHtml.includes('data-action-locked="false"'), 'HTML được render ra DOM phải có data-action-locked="false"');
    assert.ok(!finalRenderSnapshot.renderedHtml.includes('ĐANG XỬ LÝ HIỆU ỨNG'), 'HTML được render ra DOM tuyệt đối KHÔNG còn dòng chữ ĐANG XỬ LÝ HIỆU ỨNG');
    assert.ok(finalRenderSnapshot.renderedHtml.includes('id="btn-action-summon" >⚔️ Triệu Hồi'), 'Các nút thao tác trên thanh công cụ phải được mở khóa hoàn toàn');
  });

  await t.test('TEST-YGO.16: Chỉ đọc các hiệu ứng đang thực sự kích hoạt, KHÔNG đọc các hiệu ứng không kích hoạt để tránh mất thời gian', async () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    // 1. Triệu hồi CT-02 (Khuyển Thần Đá Đầu Làng - hiệu ứng chỉ kích hoạt khi tấn công, KHÔNG kích hoạt khi triệu hồi)
    state.players.p1.monsterSlots = [null, null];
    state.players.p1.hand = [
      { instanceId: 'ct02-summon', cardId: 'CT-02', name: 'Khuyển Thần Đá Đầu Làng', type: CARD_TYPES.LOW_MONSTER, tribe: TRIBES.QUAY_PHA, basePower: 3 }
    ];
    const evBefore1 = state.effectEvents.length;
    GameEngine.normalSummon(state, 'p1', 'ct02-summon', 0);
    const ct02Ev = state.effectEvents.slice(evBefore1).find(e => e.mode === 'ACTIVE');
    assert.equal(ct02Ev.hasTriggeredEffect, false, 'CT-02 khi vừa triệu hồi chưa kích hoạt hiệu ứng nên hasTriggeredEffect phải bằng false');

    const stage = new CardActivationStage();
    const skippedNarration = await stage.presentActivation({
      card: ALL_96_CARDS['CT-02'],
      activatorName: 'An',
      category: 'SUMMON',
      hasTriggeredEffect: ct02Ev.hasTriggeredEffect
    });
    assert.equal(skippedNarration.isSkippedInactive, true, 'CardActivationStage phải bỏ qua không đọc hiệu ứng không kích hoạt');
    assert.equal(skippedNarration.sentences.length, 0, 'Không sinh câu đọc nào khi hiệu ứng không kích hoạt');

    // 2. Triệu hồi CT-17 (Tê Giác Một Sừng) khi đối thủ KHÔNG có bẫy úp -> Hiệu ứng không kích hoạt -> Không đọc!
    state.players.p2.trapSlots = [null, null];
    state.players.p1.hand.push({
      instanceId: 'ct17-no-trap',
      cardId: 'CT-17',
      name: 'Tê Giác Một Sừng Rừng Nam',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.QUAY_PHA,
      basePower: 2
    });
    const evBefore2 = state.effectEvents.length;
    GameEngine.swarmSummon(state, 'p1', 'ct17-no-trap', 1);
    const ct17EvEmpty = state.effectEvents.slice(evBefore2).find(e => e.mode === 'ACTIVE');
    assert.equal(ct17EvEmpty.hasTriggeredEffect, false, 'CT-17 khi đối thủ không có bẫy thì hiệu ứng không kích hoạt (hasTriggeredEffect = false)');

    // 3. Triệu hồi CT-07 (Cò Trắng Đầu Đình - bốc 1 lá ngay khi triệu hồi) -> Hiệu ứng ĐANG kích hoạt -> Phải đọc!
    state.normalSummonUsed = false;
    state.players.p1.monsterSlots[0] = null;
    state.players.p1.hand.push({
      instanceId: 'ct07-active',
      cardId: 'CT-07',
      name: 'Cò Trắng Đầu Đình',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: TRIBES.HONG_HOT,
      basePower: 1
    });
    const evBefore3 = state.effectEvents.length;
    GameEngine.normalSummon(state, 'p1', 'ct07-active', 0);
    const ct07Ev = state.effectEvents.slice(evBefore3).find(e => e.mode === 'ACTIVE');
    assert.equal(ct07Ev.hasTriggeredEffect, true, 'CT-07 bốc bài ngay khi triệu hồi nên hasTriggeredEffect phải bằng true');
  });

  await t.test('TEST-YGO.17: Đối với việc Tấn Công chỉ đọc Đối tượng tấn công và Mục tiêu tấn công, kết quả thể hiện bằng hiệu ứng tấn công trên màn hình', async () => {
    const stage = new CardActivationStage();
    const atkNarration = await stage.presentActivation({
      card: ALL_96_CARDS['CT-02'],
      activatorName: 'An',
      category: 'ATTACK',
      targetName: 'Cóc Tía Nghiến Răng',
      isDirectAttack: false
    });

    assert.equal(atkNarration.isAttackOnlyCallout, true, 'Khi tấn công phải đánh dấu chế độ đọc ngắn gọn isAttackOnlyCallout');
    assert.equal(atkNarration.sentences.length, 1, 'Chỉ đọc đúng 1 câu thông báo đối tượng tấn công và mục tiêu tấn công');
    assert.equal(atkNarration.spokenText, 'Khuyển Thần Đá Đầu Làng tấn công Cóc Tía Nghiến Răng.');

    const directAtkNarration = audioManager.speakAttackDeclaration({
      card: ALL_96_CARDS['TR-04'],
      attackerName: 'An',
      targetName: 'Bình',
      isDirectAttack: true
    });
    assert.equal(directAtkNarration.sentences.length, 1);
    assert.equal(directAtkNarration.spokenText, 'Ông Ba Mươi — Chúa Sơn Lâm tấn công trực diện Bình.');
  });

  await t.test('TEST-YGO.18: Hệ thống Hiệu Ứng Trừ Máu Đặc Sắc & Rõ Ràng (state.damageEvents & SpatialBoardAnimator.executeHpDamageEffect)', async () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'p2', name: 'Bình', characterId: 'NV-02', isBot: true }
      ],
      isTeamMode: false
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    state.players.p1.monsterSlots[0] = {
      instanceId: 'p1-tr06',
      cardId: 'TR-06',
      name: 'Ngư Tinh Chín Đuôi Biển Đông',
      type: CARD_TYPES.HIGH_MONSTER,
      basePower: 5
    };
    state.players.p2.monsterSlots[0] = {
      instanceId: 'p2-ct07',
      cardId: 'CT-07',
      name: 'Cò Trắng Đầu Đình',
      type: CARD_TYPES.LOW_MONSTER,
      basePower: 1
    };

    const dmgBefore = state.damageEvents.length;
    GameEngine.declareAttack(state, 'p1', 0, 'p2', 0);
    const newDamages = state.damageEvents.slice(dmgBefore);

    assert.equal(newDamages.length, 1, 'Phải ghi nhận sự kiện trừ máu vào state.damageEvents');
    assert.equal(newDamages[0].targetPlayerId, 'p2');
    assert.equal(newDamages[0].targetPlayerName, 'Bình');
    assert.equal(newDamages[0].oldHp, 10);
    assert.equal(newDamages[0].newHp, 5, 'Chênh lệch 4 ⚔️ + 1 xuyên giáp của TR-06 = trừ 5 HP (còn 5 HP)');
    assert.equal(newDamages[0].amount, 5);

    const animator = new SpatialBoardAnimator();
    const vfxRes = await animator.executeHpDamageEffect(newDamages[0]);
    assert.equal(vfxRes.targetPlayerId, 'p2');
    assert.equal(vfxRes.amount, 5);
    assert.equal(vfxRes.oldHp, 10);
    assert.equal(vfxRes.newHp, 5);
  });
});
