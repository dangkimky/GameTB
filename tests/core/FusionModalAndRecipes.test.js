import test from 'node:test';
import assert from 'node:assert/strict';
import { FusionSystem } from '../../src/core/FusionSystem.js';
import { GameState } from '../../src/core/GameState.js';
import { ALL_96_CARDS } from '../../src/data/cards.js';

test('Hệ Thống Công Thức & Quét Nguyên Liệu Dung Hợp (Giai Đoạn 1 & UI)', async (t) => {
  await t.test('TEST-FUS.01: Tất cả 8 lá Huyền Thoại đều có mô tả công thức chuẩn xác', () => {
    for (let i = 1; i <= 8; i++) {
      const fusionId = `DH-0${i}`;
      const desc = FusionSystem.getRecipeDescription(fusionId);
      assert.ok(desc && desc.length > 5, `Công thức ${fusionId} phải có mô tả hợp lệ`);
    }
  });

  await t.test('TEST-FUS.02: findAvailableFusionMaterials trả về null khi không đủ nguyên liệu', () => {
    const state = GameState.createInitialState({ numPlayers: 2 });
    // Người chơi mới vào trận với bài ngẫu nhiên thường chưa có đủ cặp đặc biệt
    state.players.p1.hand = [];
    state.players.p1.monsterSlots = [null, null];

    const mats = FusionSystem.findAvailableFusionMaterials(state, 'p1', 'DH-02');
    assert.strictEqual(mats, null, 'Chưa có bài trên tay thì không thể Dung Hợp');
  });

  await t.test('TEST-FUS.03: Quét tự động cặp Chó Cỏ (CT-02) và Cậu Vàng (CT-12) cho DH-02', () => {
    const state = GameState.createInitialState({ numPlayers: 2 });
    state.players.p1.hand = [
      { instanceId: 'c1', cardId: 'CT-02', name: 'Chó Cỏ Đầu Đàn' },
      { instanceId: 'c2', cardId: 'CT-12', name: 'Cậu Vàng Hàng Xóm' }
    ];

    const mats = FusionSystem.findAvailableFusionMaterials(state, 'p1', 'DH-02');
    assert.ok(Array.isArray(mats), 'Phải tìm thấy nguyên liệu hợp lệ');
    assert.strictEqual(mats.length, 2);
    assert.ok(mats.includes('c1') && mats.includes('c2'));
  });

  await t.test('TEST-FUS.04: Quét tự động 1 Quậy Phá trên sân + 1 Đạo Cụ trên tay cho DH-03', () => {
    const state = GameState.createInitialState({ numPlayers: 2 });
    state.players.p1.monsterSlots[0] = { instanceId: 'm1', cardId: 'CT-05', name: 'Bé Đánh Đàn' };
    state.players.p1.hand = [
      { instanceId: 'e1', cardId: 'DC-01', name: 'Dép Tổ Ong' }
    ];

    const mats = FusionSystem.findAvailableFusionMaterials(state, 'p1', 'DH-03');
    assert.ok(Array.isArray(mats), 'Phải phát hiện cặp Quậy Phá + Đạo Cụ');
    assert.strictEqual(mats.length, 2);
    assert.ok(mats.includes('m1') && mats.includes('e1'));
  });

  await t.test('TEST-FUS.05: Quét tự động nguyên liệu bị cướp cho DH-07 (Liên Minh Giả Trân)', () => {
    const state = GameState.createInitialState({ numPlayers: 2 });
    state.players.p1.monsterSlots[0] = { instanceId: 'own1', cardId: 'CT-01', name: 'Camera' };
    state.players.p1.monsterSlots[1] = {
      instanceId: 'stolen1',
      cardId: 'CT-04',
      name: 'Ăn Vạ',
      wasStolenTurn: state.turnNumber
    };

    const mats = FusionSystem.findAvailableFusionMaterials(state, 'p1', 'DH-07');
    assert.ok(Array.isArray(mats), 'Phải phát hiện quân cướp trong lượt');
    assert.strictEqual(mats.length, 2);
    assert.ok(mats.includes('own1') && mats.includes('stolen1'));
  });
});
