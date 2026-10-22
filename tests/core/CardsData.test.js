import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_96_CARDS,
  ALL_120_CARDS,
  CARD_TYPES,
  createMainDeckInstances,
  getFusionDeckCards,
  getCurseDeckCards,
  getCharacterCards
} from '../../src/data/cards.js';

test('Kiểm tra dữ liệu 120 mã thẻ bài Thần Thoại & Linh Thú Việt Nam (184 lá vật lý)', async (t) => {
  await t.test('Đúng 120 mã thẻ độc bản', () => {
    const keys = Object.keys(ALL_96_CARDS);
    assert.equal(keys.length, 120, 'Số mã thẻ bài phải đúng 120');
    assert.equal(Object.keys(ALL_120_CARDS).length, 120);
  });

  await t.test('Đúng 8 Thẻ Đại Diện Thần Thoại (NV-01 -> NV-08)', () => {
    const chars = getCharacterCards();
    assert.equal(chars.length, 8);
    for (let i = 1; i <= 8; i++) {
      const id = `NV-0${i}`;
      assert.ok(ALL_96_CARDS[id], `Thiếu thẻ ${id}`);
      assert.equal(ALL_96_CARDS[id].type, CARD_TYPES.CHARACTER);
      assert.ok(ALL_96_CARDS[id].aliveAbility, `Thiếu aliveAbility ở ${id}`);
      assert.ok(ALL_96_CARDS[id].ghostAbility, `Thiếu ghostAbility ở ${id}`);
    }
  });

  await t.test('Đúng 32 Linh Thú & Con Vật Dân Gian Cấp Thấp (CT-01 -> CT-32)', () => {
    for (let i = 1; i <= 32; i++) {
      const id = i < 10 ? `CT-0${i}` : `CT-${i}`;
      assert.ok(ALL_96_CARDS[id], `Thiếu thẻ ${id}`);
      assert.equal(ALL_96_CARDS[id].type, CARD_TYPES.LOW_MONSTER);
      assert.ok(ALL_96_CARDS[id].power > 0);
      assert.ok(ALL_96_CARDS[id].tribe);
    }
  });

  await t.test('Đúng 16 Đại Yêu & Thần Thú Cấp Cao (TR-01 -> TR-16)', () => {
    for (let i = 1; i <= 16; i++) {
      const id = i < 10 ? `TR-0${i}` : `TR-${i}`;
      assert.ok(ALL_96_CARDS[id], `Thiếu thẻ ${id}`);
      assert.equal(ALL_96_CARDS[id].type, CARD_TYPES.HIGH_MONSTER);
      assert.ok(ALL_96_CARDS[id].power >= 4);
    }
  });

  await t.test('Đúng 12 Thần Thú Dung Hợp Huyền Thoại (DH-01 -> DH-12)', () => {
    const fusions = getFusionDeckCards();
    assert.equal(fusions.length, 12);
    for (let i = 1; i <= 12; i++) {
      const id = i < 10 ? `DH-0${i}` : `DH-${i}`;
      assert.ok(ALL_96_CARDS[id], `Thiếu thẻ ${id}`);
      assert.equal(ALL_96_CARDS[id].type, CARD_TYPES.FUSION_MONSTER);
      assert.ok(ALL_96_CARDS[id].power >= 6);
      assert.ok(ALL_96_CARDS[id].recipe);
    }
  });

  await t.test('Đúng 14 Pháp Bảo Cổ Tích (DC-01 -> DC-14)', () => {
    for (let i = 1; i <= 14; i++) {
      const id = i < 10 ? `DC-0${i}` : `DC-${i}`;
      assert.ok(ALL_96_CARDS[id], `Thiếu thẻ ${id}`);
      assert.equal(ALL_96_CARDS[id].type, CARD_TYPES.EQUIPMENT);
    }
  });

  await t.test('Đúng 16 Phép Sự Tích Dân Gian (DR-01 -> DR-16)', () => {
    for (let i = 1; i <= 16; i++) {
      const id = i < 10 ? `DR-0${i}` : `DR-${i}`;
      assert.ok(ALL_96_CARDS[id], `Thiếu thẻ ${id}`);
      assert.equal(ALL_96_CARDS[id].type, CARD_TYPES.DRAMA);
    }
  });

  await t.test('Đúng 16 Bẫy Thiên Cơ (NQ-01 -> NQ-16)', () => {
    for (let i = 1; i <= 16; i++) {
      const id = i < 10 ? `NQ-0${i}` : `NQ-${i}`;
      assert.ok(ALL_96_CARDS[id], `Thiếu thẻ ${id}`);
      assert.equal(ALL_96_CARDS[id].type, CARD_TYPES.TRAP);
      assert.ok(ALL_96_CARDS[id].trigger);
    }
  });

  await t.test('Đúng 6 Ám Quẻ Tâm Linh (AQ-01 -> AQ-06)', () => {
    const curses = getCurseDeckCards();
    assert.equal(curses.length, 6);
    for (let i = 1; i <= 6; i++) {
      const id = `AQ-0${i}`;
      assert.ok(ALL_96_CARDS[id], `Thiếu thẻ ${id}`);
      assert.equal(ALL_96_CARDS[id].type, CARD_TYPES.CURSE);
    }
  });

  await t.test('Tổng số lá bài vật lý trong Bộ Bài Chính = 158 lá', () => {
    const mainDeck = createMainDeckInstances();
    assert.equal(mainDeck.length, 158, 'Chồng bài chính phải đúng 158 lá vật lý');
  });

  await t.test('Tổng số lá bài vật lý toàn bộ game = 184 lá', () => {
    const mainDeck = createMainDeckInstances();
    const fusion = getFusionDeckCards();
    const curse = getCurseDeckCards();
    const char = getCharacterCards();
    const totalPhysical = mainDeck.length + fusion.length + curse.length + char.length;
    assert.equal(totalPhysical, 184, 'Toàn bộ bàn cờ có đúng 184 lá vật lý');
  });
});
