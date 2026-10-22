import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_96_CARDS } from '../../src/data/cards.js';
import { CARD_ART_METADATA, getCardArtSvg } from '../../src/data/cardImages.js';
import { CardComponent } from '../../src/ui/CardComponent.js';

test('Đồ Họa 120 Mã Thẻ Bài Thần Thoại Việt & Pipeline Visual 2.5D', async (t) => {
  await t.test('TEST-3.01: Toàn bộ 120/120 mã thẻ đều có đồ họa Vector SVG riêng biệt', () => {
    const cardIds = Object.keys(ALL_96_CARDS);
    assert.equal(cardIds.length, 120, 'Tổng số mã thẻ bài phải là 120');

    for (const id of cardIds) {
      assert.ok(CARD_ART_METADATA[id], `Thẻ bài ${id} chưa có metadata đồ họa trong CARD_ART_METADATA`);
      const svg = getCardArtSvg(id, false);
      assert.ok(svg.includes('<svg'), `Thẻ bài ${id} sinh SVG không hợp lệ`);
      assert.ok(svg.includes(`grad-${id}-a`), `Thẻ bài ${id} thiếu gradient định danh riêng`);
    }
  });

  await t.test('TEST-3.02: 8 Thẻ Đại Diện Thần Thoại (NV-01 -> NV-08) có 2 trạng thái riêng biệt (Sống & Anh Linh)', () => {
    for (let i = 1; i <= 8; i++) {
      const id = `NV-0${i}`;
      const meta = CARD_ART_METADATA[id];
      assert.ok(meta.aliveIcon, `NV-0${i} thiếu aliveIcon`);
      assert.ok(meta.ghostIcon, `NV-0${i} thiếu ghostIcon`);
      assert.notEqual(meta.aliveIcon, meta.ghostIcon, `NV-0${i} có aliveIcon và ghostIcon bị trùng lặp`);

      const aliveSvg = getCardArtSvg(id, false);
      const ghostSvg = getCardArtSvg(id, true);
      assert.notEqual(aliveSvg, ghostSvg, `Ảnh SVG mặt sống và mặt ma của ${id} phải khác nhau`);
      assert.ok(ghostSvg.includes(`grad-${id}-g`), `Mặt ma của ${id} phải dùng gradient ma`);
    }
  });

  await t.test('TEST-3.03 & 3.05: Hologram Shader chỉ xuất hiện trên thẻ Thần Thú Cấp Cao (TR) và Dung Hợp (DH)', () => {
    const ctHtml = CardComponent.renderCardHtml({ cardId: 'CT-01', name: 'Chim Lạc Đông Sơn' });
    assert.ok(!ctHtml.includes('card-layer-holo'), 'Linh Thú Cấp Thấp không được có Hologram');

    const dcHtml = CardComponent.renderCardHtml({ cardId: 'DC-01', name: 'Nỏ Thần Liên Châu' });
    assert.ok(!dcHtml.includes('card-layer-holo'), 'Pháp Bảo Đạo Cụ không được có Hologram');

    const trHtml = CardComponent.renderCardHtml({ cardId: 'TR-01', name: 'Chằn Tinh Hang Đá' });
    assert.ok(trHtml.includes('card-layer-holo'), 'Thần Thú Cấp Cao phải có Hologram ánh kim');

    const dhHtml = CardComponent.renderCardHtml({ cardId: 'DH-01', name: 'Hội Đồng Tứ Bất Tử' });
    assert.ok(dhHtml.includes('card-layer-holo'), 'Huyền Thoại Dung Hợp phải có Hologram ánh kim');
  });

  await t.test('TEST-3.06: Mỗi hệ có class hào quang đúng màu', () => {
    const tribes = ['HONG_HOT', 'QUAY_PHA', 'TOC_DO', 'AN_VA'];
    for (const tr of tribes) {
      const html = CardComponent.renderCardHtml({ cardId: 'CT-01', tribe: tr, name: 'Quân' });
      assert.ok(html.includes(`tribe-${tr}`), `Thẻ phải có class tribe-${tr}`);
    }
  });

  await t.test('TEST-3.07: Mặt sau thẻ bài thống nhất nhận diện thương hiệu Thần Thoại Việt', () => {
    const faceDownHtml = CardComponent.renderCardHtml({ cardId: 'NQ-01' }, { faceDown: true });
    assert.ok(faceDownHtml.includes('card-back-design'));
    assert.ok(faceDownHtml.includes('card-back-emblem'));
    assert.ok(faceDownHtml.includes('THẦN THOẠI VIỆT'));
  });
});
