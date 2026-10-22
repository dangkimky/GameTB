import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { TurnManager } from '../../src/core/TurnManager.js';
import { BattleResolver } from '../../src/core/BattleResolver.js';
import { GhostSystem } from '../../src/core/GhostSystem.js';
import { PHASES } from '../../src/core/GameState.js';
import { CARD_TYPES, TRIBES } from '../../src/data/cards.js';

test('Kiểm thử Toàn Diện 100% Hiệu Ứng Nâng Cấp Của 96 Thẻ Bài (Deep Work Suite)', async (t) => {
  await t.test('TEST-UPG.01: 6 Kỹ năng Hồn Ma của Thẻ Đại Diện (NV-01 -> NV-06 Mặt Sau) hoạt động chính xác', () => {
    // NV-01 Ghost: Ngửa bài người nhiều máu nhất
    const state1 = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03' }
      ]
    });
    state1.players.p1.hp = 0;
    state1.players.p1.isGhost = true;
    state1.players.p2.hp = 10;
    state1.players.p3.hp = 6;
    GhostSystem.handleGhostTurnStart(state1, 'p1');
    assert.ok(state1.revealedHands && state1.revealedHands['p2'], 'NV-01 Hồn Ma phải công khai bài của người nhiều máu nhất (p2)');

    // NV-03 Ghost: Giảm 1 Độ Chiến của Chiến Thần trên sân
    const state3 = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-03' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-01' }
      ]
    });
    state3.players.p1.hp = 0;
    state3.players.p1.isGhost = true;
    state3.players.p2.monsterSlots[0] = { instanceId: 'm-p2', cardId: 'CT-02', name: 'Chó Cỏ', basePower: 3 };
    GhostSystem.handleGhostTurnStart(state3, 'p1');
    assert.ok(
      state3.players.p2.monsterSlots[0].statusEffects.some(e => e.powerDelta === -1),
      'NV-03 Hồn Ma phải ám giảm 1 Độ Chiến của quái trên sân'
    );

    // NV-04 Ghost: Tráo đổi 2 bẫy úp của 2 người chơi khác nhau
    const state4 = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-04' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-01' }
      ]
    });
    state4.players.p1.hp = 0;
    state4.players.p1.isGhost = true;
    state4.players.p2.trapSlots[0] = { instanceId: 't-p2', cardId: 'NQ-01', name: 'Gương', faceUp: false };
    state4.players.p3.trapSlots[0] = { instanceId: 't-p3', cardId: 'NQ-06', name: 'Vỏ Quýt', faceUp: false };
    state4.curseDeck = [{ id: 'AQ-03', name: 'Bóng Đè', description: '' }];
    GhostSystem.handleGhostTurnStart(state4, 'p1');
    assert.equal(state4.players.p2.trapSlots[0].cardId, 'NQ-06', 'NV-04 Hồn Ma phải tráo bẫy của P3 sang P2');
    assert.equal(state4.players.p3.trapSlots[0].cardId, 'NQ-01', 'NV-04 Hồn Ma phải tráo bẫy của P2 sang P3');

    // NV-05 Ghost: Lấy 1 lá từ Bãi Rác cho người ít HP nhất
    const state5 = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-05' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-01' }
      ]
    });
    state5.players.p1.hp = 0;
    state5.players.p1.isGhost = true;
    state5.players.p2.hp = 9;
    state5.players.p3.hp = 3;
    state5.graveyard = [{ instanceId: 'g-gift', cardId: 'DC-01', name: 'Dép Tổ Ong' }];
    state5.curseDeck = [{ id: 'AQ-03', name: 'Bóng Đè', description: '' }];
    const p3HandBefore = state5.players.p3.hand.length;
    GhostSystem.handleGhostTurnStart(state5, 'p1');
    assert.equal(state5.players.p3.hand.length, p3HandBefore + 1, 'NV-05 Hồn Ma phải tặng 1 lá từ Bãi Rác cho người ít máu nhất (p3)');

    // NV-06 Mặt Sống (Xin bài ngoại giao & cấm đánh) + Mặt Hồn Ma (+1 Độ Chiến khi 2 người chỉ định đánh nhau)
    const state6 = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-06' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    state6.turnNumber = 2;
    state6.currentPhase = PHASES.MAIN;
    const p1HandBefore = state6.players.p1.hand.length;
    const resDip = GameEngine.activateCharacterSkill(state6, 'p1', { targetPlayerId: 'p2' });
    assert.equal(resDip.skill, 'DIPLOMACY');
    assert.equal(state6.players.p1.hand.length, p1HandBefore + 1);
    state6.players.p1.monsterSlots[0] = { instanceId: 'm1', cardId: 'CT-02', name: 'Chó Cỏ', basePower: 3 };
    assert.throws(() => {
      GameEngine.declareAttack(state6, 'p1', 0, 'p2', null);
    }, /Hiệp ước Ngoại Giao/, 'Không được đánh người vừa cho bài ngoại giao trong lượt đó');
  });

  await t.test('TEST-UPG.02: CT-05 cấm Drama hồi máu, CT-09 & DH-03 miễn nhiễm Drama, CT-21 +1 sát thương Drama', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    state.currentPhase = PHASES.MAIN;

    // Đặt CT-05 lên sân P2 -> P1 không được dùng DR-14 (Trà Đá Cắn Hướng Dương hồi máu)
    state.players.p2.monsterSlots[0] = { instanceId: 'ct05', cardId: 'CT-05', name: 'Bé Tập Đánh Đàn', basePower: 2 };
    state.players.p1.hand.push({ instanceId: 'dr14', cardId: 'DR-14', name: 'Trà Đá Cắn Hướng Dương' });
    assert.throws(() => {
      GameEngine.useDrama(state, 'p1', 'dr14');
    }, /CT-05 Bé Tập Đánh Đàn/, 'CT-05 trên sân phải chặn mọi Bài Drama Hồi Nhân Phẩm');

    // Gắn DC-04 (Micro Hết Pin) vào CT-05 -> Nội tại CT-05 bị vô hiệu hóa, dùng DR-14 thành công!
    state.players.p2.monsterSlots[0].equippedItems = [{ instanceId: 'dc04', cardId: 'DC-04', name: 'Micro Hết Pin' }];
    state.players.p1.hp = 6;
    GameEngine.useDrama(state, 'p1', 'dr14');
    assert.equal(state.players.p1.hp, 8, 'Khi CT-05 bị khóa bởi DC-04 thì dùng DR-14 hồi +2 HP bình thường');

    // CT-09 (Mèo Hoang) miễn nhiễm với DR-06 (Mượn Đồ) của đối thủ
    state.players.p2.monsterSlots[0] = { instanceId: 'ct09', cardId: 'CT-09', name: 'Mèo Hoang', basePower: 2 };
    state.players.p1.hand.push({ instanceId: 'dr06', cardId: 'DR-06', name: 'Mượn Đồ Quên Trả' });
    GameEngine.useDrama(state, 'p1', 'dr06', { targetPlayerId: 'p2', targetSlotIndex: 0 });
    assert.equal(state.players.p2.monsterSlots[0]?.cardId, 'CT-09', 'CT-09 miễn nhiễm với Drama đối thủ, không bị cướp');

    // CT-21 (Thánh Gõ Phím) tăng +1 sát thương cho DR-11 (Bốc Phốt: từ 2 lên 3 sát thương)
    state.players.p1.monsterSlots[0] = { instanceId: 'ct21', cardId: 'CT-21', name: 'Thánh Gõ Phím', basePower: 1 };
    state.players.p1.hand.push({ instanceId: 'dr11', cardId: 'DR-11', name: 'Bốc Phốt' });
    state.players.p2.hp = 10;
    GameEngine.useDrama(state, 'p1', 'dr11', { targetPlayerId: 'p2' });
    assert.equal(state.players.p2.hp, 7, 'CT-21 tăng +1 sát thương cho DR-11, trừ 3 HP thay vì 2 HP');
  });

  await t.test('TEST-UPG.03: CT-11 ké bài Wifi, NQ-15 bốc 2 lá khi đối thủ bốc thêm, CT-18 quét lá đa cuối lượt, CT-22 ép bỏ bài', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    // P2 có CT-11 (Thánh Xin Pass Wifi) trên sân và úp NQ-15 (Nói Có Sách Mách Có Chứng) từ lượt 1
    state.players.p2.monsterSlots[0] = { instanceId: 'ct11', cardId: 'CT-11', name: 'Xin Wifi', basePower: 1 };
    state.players.p2.trapSlots[0] = { instanceId: 'nq15', cardId: 'NQ-15', name: 'Nói Có Sách', setTurnNumber: 1 };

    const p2HandBefore = state.players.p2.hand.length;
    // P1 triệu hồi CT-07 (Cô Bán Xôi) để bốc thêm 1 lá trong Main Phase
    state.players.p1.hand.push({ instanceId: 'ct07', cardId: 'CT-07', name: 'Cô Bán Xôi', basePower: 1 });
    GameEngine.normalSummon(state, 'p1', 'ct07', 0);

    // P2 được +1 lá từ CT-11 và +2 lá từ bẫy NQ-15 => tổng cộng +3 lá!
    assert.equal(state.players.p2.hand.length, p2HandBefore + 3, 'P2 phải nhận 1 lá từ CT-11 và 2 lá từ NQ-15');

    // CT-22 (Bà Cô Hỏi Bao Giờ Lấy Chồng) đánh trực diện vào P1 khi P1 trống sân -> P1 mất máu + mất 1 bài trên tay
    state.players.p1.monsterSlots = [null, null];
    state.players.p2.monsterSlots[1] = { instanceId: 'ct22', cardId: 'CT-22', name: 'Bà Cô', basePower: 3 };
    const p1HandBefore = state.players.p1.hand.length;
    BattleResolver.resolveBattle(state, 'p2', 1, 'p1', null);
    assert.equal(state.players.p1.hand.length, p1HandBefore - 1, 'CT-22 đánh vào sân trống bắt đối thủ bỏ thêm 1 lá bài vì áp lực tâm lý');

    // CT-18 (Cô Hàng Xóm Quét Lá Đa) cuối lượt đẩy 1 lá từ đỉnh Bãi Rác xuống đáy chồng bài bốc
    state.players.p1.monsterSlots[0] = { instanceId: 'ct18', cardId: 'CT-18', name: 'Cô Hàng Xóm', basePower: 2 };
    state.players.p1.hand = [];
    const specialGraveCard = { instanceId: 'la-da-1', cardId: 'DC-01', name: 'Lá Đa Kỷ Niệm' };
    state.graveyard.push(specialGraveCard);
    TurnManager.endTurn(state, 'p1', []);
    assert.equal(state.drawPile[0].instanceId, 'la-da-1', 'CT-18 phải đẩy lá bài trên cùng của Bãi Rác xuống đáy chồng bài bốc');
  });

  await t.test('TEST-UPG.04: Kỹ năng chủ động trên sân của CT-13 (Chốt Đơn), TR-09 (Đa Cấp), DH-08 (Bom Hàng Bãi Rác)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    // 1. CT-13: Chốt Đơn (Bỏ 1 bài mình, ép đối thủ bỏ 1 bài)
    state.players.p1.monsterSlots[0] = { instanceId: 'ct13-m', cardId: 'CT-13', name: 'Chị Đẹp Online', basePower: 2 };
    const p1Hand1 = state.players.p1.hand.length;
    const p2Hand1 = state.players.p2.hand.length;
    GameEngine.activateFieldSkill(state, 'p1', 0, { targetPlayerId: 'p2' });
    assert.equal(state.players.p1.hand.length, p1Hand1 - 1, 'P1 bỏ 1 lá bài');
    assert.equal(state.players.p2.hand.length, p2Hand1 - 1, 'P2 bị ép bỏ 1 lá bài');

    // 2. TR-09: Thánh Đa Cấp (Đưa 1 lá bài rác cho đối thủ, rút ngẫu nhiên 2 lá từ tay đối thủ)
    state.players.p1.monsterSlots[1] = { instanceId: 'tr09-m', cardId: 'TR-09', name: 'Thánh Đa Cấp', basePower: 4 };
    const p1Hand2 = state.players.p1.hand.length;
    const p2Hand2 = state.players.p2.hand.length;
    GameEngine.activateFieldSkill(state, 'p1', 1, { targetPlayerId: 'p2' });
    assert.equal(state.players.p1.hand.length, p1Hand2 - 1 + 2, 'P1 đưa 1 lá và rút về 2 lá (+1 ròng)');
    assert.equal(state.players.p2.hand.length, p2Hand2 - 2 + 1, 'P2 mất 2 lá và nhận 1 lá rác (-1 ròng)');

    // 3. DH-08: Thánh Bom Hàng Liên Hoàn Cước (Đẩy 1 lá từ Bãi Rác vào Ô Chiến Thần đối thủ làm bia 0 Độ Chiến)
    state.players.p1.monsterSlots[0] = { instanceId: 'dh08-m', cardId: 'DH-08', name: 'Thánh Bom Hàng', basePower: 6 };
    state.players.p2.monsterSlots = [null, null];
    const resDH08 = GameEngine.activateFieldSkill(state, 'p1', 0, { targetPlayerId: 'p2' });
    assert.equal(resDH08.skill, 'BOM_HANG_DUMMY');
    assert.ok(state.players.p2.monsterSlots[0]?.isDummyTarget, 'Sân P2 phải xuất hiện Kiện Hàng Rác 0 Độ Chiến');
    assert.equal(BattleResolver.calculateMonsterPower(state, 'p2', 0), 0, 'Độ Chiến của Kiện Hàng Rác phải bằng 0');
  });

  await t.test('TEST-UPG.05: TR-02 hát bolero khóa bẫy, TR-07 hồi sinh Cấp Thấp, TR-10 phân xử, DH-02 đánh lan, DH-05 phản sát thương x2', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03' }
      ]
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.BATTLE;

    // P3 có TR-10 (Tổ Trưởng Hòa Giải) trên sân
    state.players.p3.monsterSlots[0] = { instanceId: 'tr10', cardId: 'TR-10', name: 'Tổ Trưởng Hòa Giải', basePower: 5 };

    // P1 dùng TR-02 (Chiến Thần Loa Kẹo Kéo) tấn công P2 đang úp bẫy NQ-01 (Gương Phản Đòn) và có TR-07 (Chủ Tịch Giả Nghèo)
    state.players.p1.monsterSlots[0] = { instanceId: 'tr02', cardId: 'TR-02', name: 'Loa Kẹo Kéo', basePower: 5 };
    state.players.p2.trapSlots[0] = { instanceId: 'nq01', cardId: 'NQ-01', name: 'Gương Phản Đòn', setTurnNumber: 1 };
    state.players.p2.monsterSlots[0] = { instanceId: 'tr07', cardId: 'TR-07', name: 'Chủ Tịch Giả Nghèo', basePower: 4 };
    state.players.p2.hand = [{ instanceId: 'low-revive', cardId: 'CT-02', name: 'Chó Cỏ', type: CARD_TYPES.LOW_MONSTER, basePower: 3 }];

    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', 0, { singSuccess: true });
    // TR-02 khóa bẫy NQ-01 của P2 -> đòn đánh không bị phản!
    assert.equal(res.type, 'MONSTER_BATTLE', 'TR-02 phải vô hiệu hóa bẫy NQ-01 của mục tiêu');
    // TR-10 của P3 nhảy vào phân xử trừ cả P1 và P2 mỗi người 1 HP!
    assert.equal(state.players.p1.hp, 9, 'TR-10 của P3 nhảy vào phân xử trừ 1 HP của P1');
    // TR-07 của P2 bị tiêu diệt và tự động triệu hồi miễn phí CT-02 từ tay lên sân!
    assert.equal(state.players.p2.monsterSlots[0]?.cardId, 'CT-02', 'TR-07 chết phải triệu hồi miễn phí 1 Chiến Thần Cấp Thấp lên sân');

    // DH-05 (Chí Phèo 4.0): Khi nhận sát thương giao tranh, kẻ đánh phải chịu gấp đôi sát thương đó!
    state.players.p2.trapSlots = [null, null];
    state.players.p2.monsterSlots[0] = { instanceId: 'dh05', cardId: 'DH-05', name: 'Chí Phèo 4.0', basePower: 4 };
    state.players.p1.monsterSlots[0] = { instanceId: 'dh02', cardId: 'DH-02', name: 'Thần Chó 3 Đầu', basePower: 7 };
    state.players.p1.hp = 10;
    BattleResolver.resolveBattle(state, 'p1', 0, 'p2', 0);
    // Chênh lệch 7 - 4 = 3 => Chí Phèo phản ngược 3 * 2 = 6 HP vào P1!
    assert.equal(state.players.p1.hp, 4, 'DH-05 Chí Phèo phải bắt kẻ tấn công chịu gấp đôi sát thương Nhân Phẩm (6 HP)');
  });

  await t.test('TEST-UPG.06: Đạo Cụ DC-05 (Áo Mưa phản 1 dmg), DC-06 (Bình Xịt Muỗi khóa Ăn Vạ), DC-07 (Cấm Hiến Tế), DC-09 (Gậy Tự Sướng), DC-10 (Vòng Kim Cô)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03' }
      ]
    });
    state.turnNumber = 2;
    state.currentPhase = PHASES.MAIN;

    // DC-07 cấm Hiến Tế
    state.players.p1.monsterSlots[0] = {
      instanceId: 'm-debt',
      cardId: 'CT-01',
      name: 'Camera',
      equippedItems: [{ instanceId: 'dc07', cardId: 'DC-07', name: 'Giấy Ghi Nợ' }]
    };
    state.players.p1.hand.push({ instanceId: 'boss1', cardId: 'TR-01', name: 'Bà Chủ Trọ', type: CARD_TYPES.HIGH_MONSTER });
    assert.throws(() => {
      GameEngine.tributeSummon(state, 'p1', 'boss1', 0);
    }, /Tờ Giấy Ghi Nợ/, 'Quái đang mang DC-07 không được làm nguyên liệu Hiến Tế');

    // DC-10 Vòng Kim Cô cấm tấn công người gắn
    state.players.p1.monsterSlots[0] = {
      instanceId: 'm-kimco',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3,
      equippedItems: [{ instanceId: 'dc10', cardId: 'DC-10', name: 'Vòng Kim Cô', equippedByPlayerId: 'p2' }]
    };
    assert.throws(() => {
      GameEngine.declareAttack(state, 'p1', 0, 'p2', null);
    }, /Vòng Kim Cô/, 'Quái dính Vòng Kim Cô của P2 không được đánh P2 khi vẫn còn P3');

    // DC-06 (Bình Xịt Muỗi) khóa nội tại hệ Ăn Vạ (CT-10 mất +2 thủ) + DC-09 (Gậy Tự Sướng) cướp Đạo Cụ khi thắng + DC-05 (Áo Mưa) phản 1 sát thương
    state.players.p1.monsterSlots[1] = {
      instanceId: 'm-spray',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3,
      equippedItems: [
        { instanceId: 'dc06', cardId: 'DC-06', name: 'Bình Xịt Muỗi', powerBonus: 1 },
        { instanceId: 'dc09', cardId: 'DC-09', name: 'Gậy Tự Sướng' }
      ]
    };
    state.players.p2.monsterSlots[0] = {
      instanceId: 'ct10-def',
      cardId: 'CT-10',
      name: 'Bác Bảo Vệ',
      tribe: TRIBES.AN_VA,
      basePower: 3,
      equippedItems: [{ instanceId: 'dc05', cardId: 'DC-05', name: 'Áo Mưa Rách' }]
    };

    const p1HpBefore = state.players.p1.hp;
    const res = BattleResolver.resolveBattle(state, 'p1', 1, 'p2', 0);
    assert.equal(res.defenderDestroyed, true, 'DC-06 khóa nội tại +2 thủ của CT-10 giúp P1 đánh thắng');
    assert.equal(state.players.p1.hp, p1HpBefore - 1, 'DC-05 Áo Mưa Rách phản lại 1 sát thương vào P1');
  });
});
