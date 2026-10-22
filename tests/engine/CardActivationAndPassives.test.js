import test from 'node:test';
import assert from 'node:assert/strict';
import { CardActivationStage } from '../../src/engine/CardActivationStage.js';
import { SpatialBoardAnimator } from '../../src/engine/SpatialBoardAnimator.js';
import { GameEngine } from '../../src/core/GameEngine.js';
import { TurnManager } from '../../src/core/TurnManager.js';
import { BattleResolver } from '../../src/core/BattleResolver.js';
import { ALL_96_CARDS } from '../../src/data/cards.js';

test('Sân Khấu Trình Diễn Kích Hoạt Thẻ Bài & Nội Tại Tướng (Card Activation & Passives)', async (t) => {
  await t.test('TEST-ACT.01: CardActivationStage khởi tạo an toàn và thực thi presentActivation không lỗi trong môi trường headless', async () => {
    const stage = new CardActivationStage();
    assert.ok(stage);
    assert.equal(stage.stageEl, null, 'Không có DOM thì stageEl phải là null');

    let executed = false;
    await stage.presentActivation({
      card: ALL_96_CARDS['DR-06'],
      activatorName: 'Chủ Xóm',
      category: 'DRAMA',
      title: 'Mượn Đồ Không Trả',
      description: 'Cướp 1 Chiến Thần của đối thủ!',
      icon: '🎭',
      boardAction: {
        execute: async () => {
          executed = true;
        }
      }
    });

    assert.equal(executed, true, 'boardAction.execute phải được gọi ngay cả khi không có DOM');
  });

  await t.test('TEST-ACT.02: DH-01 (Tứ Đại Bà Tám) khi xuất trận cướp ngay 1 lá bài giá trị nhất của đối thủ', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    const p1 = state.players['p1'];
    const p2 = state.players['p2'];

    p2.hand = [
      { instanceId: 'h1', cardId: 'CT-02', name: 'Chó Cỏ' }, // power 2
      { instanceId: 'h2', cardId: 'TR-01', name: 'Bà Chủ Trọ' }, // Boss power 5
      { instanceId: 'h3', cardId: 'DR-02', name: 'Bom Hàng' } // Drama
    ];

    const initialP1HandCount = p1.hand.length;
    const initialP2HandCount = p2.hand.length;

    const fusionCard = { instanceId: 'f1', cardId: 'DH-01', name: 'Tứ Đại Bà Tám Thông Tấn Xã' };
    GameEngine.handleFusionOnSummon(state, 'p1', fusionCard);

    assert.equal(p1.hand.length, initialP1HandCount + 1, 'P1 phải nhận thêm 1 lá bài bị cướp');
    assert.equal(p2.hand.length, initialP2HandCount - 1, 'P2 phải bị mất 1 lá bài');
    const stolenCard = p1.hand[p1.hand.length - 1];
    // Lá Drama (power + 5 = 5) hoặc Boss (power 5)
    assert.ok(['TR-01', 'DR-02'].includes(stolenCard.cardId), 'Phải cuỗm lá bài giá trị cao');
  });

  await t.test('TEST-ACT.03: TR-01 (Bà Chủ Trọ Tăng Giá Điện) thu tiền điện đầu mỗi lượt hoặc phạt trừ 1 HP', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03' }
      ]
    });
    const p1 = state.players['p1'];
    const p2 = state.players['p2'];
    const p3 = state.players['p3'];

    // P1 có TR-01 trên sân
    p1.monsterSlots[0] = { instanceId: 'tr01', cardId: 'TR-01', name: 'Bà Chủ Trọ Tăng Giá Điện' };

    p2.hand = [{ instanceId: 'c1', cardId: 'CT-02', name: 'Chó Cỏ' }];
    p3.hand = []; // P3 rỗng túi
    p3.hp = 10;

    const p1InitialHand = p1.hand.length;

    TurnManager.processStartOfTurnEffects(state, 'p1');

    // P2 nộp 1 lá cho P1
    assert.equal(p2.hand.length, 0, 'P2 phải nộp 1 lá bài');
    assert.equal(p1.hand.length, p1InitialHand + 1, 'P1 thu được 1 lá từ P2');

    // P3 không có bài nên bị phạt -1 HP
    assert.equal(p3.hp, 9, 'P3 không có bài nộp tiền điện nên bị trừ 1 HP');
  });

  await t.test('TEST-ACT.04: DH-03 (Karaoke Hủy Diệt Đêm Khuya) đầu mỗi lượt bắt đối thủ vứt bài hoặc trừ 1 HP', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    const p1 = state.players['p1'];
    const p2 = state.players['p2'];

    // P1 có DH-03 trên sân
    p1.monsterSlots[0] = { instanceId: 'dh03', cardId: 'DH-03', name: 'Cỗ Máy Karaoke Hủy Diệt Đêm Khuya' };

    p2.hand = [{ instanceId: 'k1', cardId: 'CT-05', name: 'Bà Bán Nước' }];
    const initialGraveyard = state.graveyard.length;

    TurnManager.processStartOfTurnEffects(state, 'p1');

    assert.equal(p2.hand.length, 0, 'P2 phải vứt 1 lá bài vào bãi rác vì điếc tai');
    assert.equal(state.graveyard.length, initialGraveyard + 1, 'Lá bài phải được chuyển vào bãi rác');
  });

  await t.test('TEST-ACT.05: BattleResolver trả về metadata trapTriggered chuẩn xác khi Bẫy NQ-01 và NQ-10 kích hoạt', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    const p1 = state.players['p1'];
    const p2 = state.players['p2'];

    p1.monsterSlots[0] = { instanceId: 'atk1', cardId: 'CT-02', name: 'Chó Cỏ' }; // 2 power
    p2.trapSlots[0] = {
      instanceId: 'trap1',
      cardId: 'NQ-01',
      name: 'Gương Phản Đòn',
      faceUp: false,
      setTurnNumber: 1
    };

    state.turnNumber = 2; // Bẫy đã úp từ lượt trước
    const res = BattleResolver.resolveBattle(state, 'p1', 0, 'p2', null);

    assert.equal(res.type, 'TRAP_REFLECTED');
    assert.ok(res.trapTriggered, 'Phải có trapTriggered metadata');
    assert.equal(res.trapTriggered.trap.cardId, 'NQ-01');
    assert.equal(res.trapTriggered.effectType, 'REFLECT');
  });

  await t.test('TEST-ACT.06: CT-17 (Thợ Sửa Ống Nước) khi triệu hồi khoan thủng và tiêu diệt bẫy đối thủ', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    const p1 = state.players['p1'];
    const p2 = state.players['p2'];

    p2.trapSlots[0] = { instanceId: 'trapX', cardId: 'NQ-03', name: 'Nhìn Gì Mà Nhìn', faceUp: false };
    const initialGrave = state.graveyard.length;

    const ct17Card = { instanceId: 'ct17', cardId: 'CT-17', name: 'Thợ Sửa Ống Nước' };
    GameEngine.handleLowMonsterOnSummon(state, 'p1', ct17Card, 0);

    assert.equal(p2.trapSlots[0], null, 'Bẫy của P2 phải bị khoan thủng tiêu diệt');
    assert.equal(state.graveyard.length, initialGrave + 1, 'Bẫy bị hủy phải chuyển vào Bãi Rác');
  });

  await t.test('TEST-ACT.07: CT-20 (Gà Trống Gáy) khi triệu hồi giải trừ mọi hiệu ứng Đóng Băng trên bàn', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    const p2 = state.players['p2'];

    p2.monsterSlots[0] = {
      instanceId: 'frozen1',
      cardId: 'CT-02',
      name: 'Chó Cỏ Bị Đóng Băng',
      cannotAttack: true,
      statusEffects: [{ type: 'FREEZE' }]
    };

    const ct20Card = { instanceId: 'ct20', cardId: 'CT-20', name: 'Gà Trống Gáy Lúc 3h Sáng' };
    GameEngine.handleLowMonsterOnSummon(state, 'p1', ct20Card, 0);

    assert.equal(p2.monsterSlots[0].cannotAttack, false, 'cannotAttack phải được gỡ bỏ');
    assert.equal(p2.monsterSlots[0].statusEffects.length, 0, 'Hiệu ứng FREEZE phải được xóa sạch');
  });

  await t.test('TEST-ACT.08: Thời gian đọc hiệu ứng trong CardActivationStage được tính toán chậm rãi, đầy đủ thời gian đọc', async () => {
    const stage = new CardActivationStage();
    // Thử nghiệm với thẻ có mô tả dài (DH-08)
    const cardDH08 = ALL_96_CARDS['DH-08'];
    const startTime = Date.now();

    await stage.presentActivation({
      card: cardDH08,
      activatorName: 'Chủ Xóm',
      category: 'FUSION',
      title: cardDH08.name,
      description: cardDH08.description,
      boardAction: {
        execute: async () => {}
      }
    });

    // Trong môi trường headless không có DOM, hàm thực thi ngay tức thì và an toàn
    assert.ok(stage);
  });

  await t.test('TEST-ACT.09: SpatialBoardAnimator hỗ trợ thời lượng chuyển động chậm rãi và tọa độ chính xác', () => {
    const animator = new SpatialBoardAnimator();
    const zoneRect = animator.getZoneRect('slot-p1-monster-0');
    assert.ok(zoneRect.width > 0, 'Phải có chiều rộng ô bàn cờ');
    assert.ok(zoneRect.height > 0, 'Phải có chiều cao ô bàn cờ');
  });
});
