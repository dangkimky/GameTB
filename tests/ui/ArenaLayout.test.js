import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { ArenaLayout } from '../../src/ui/ArenaLayout.js';
import { CardComponent } from '../../src/ui/CardComponent.js';

test('UI/UX & Sàn Đấu (ArenaLayout & CardComponent)', async (t) => {
  await t.test('TEST-2.01: Layout tính toán đúng số lượng trạm ngồi cho 2, 3, 4, 5, 6 người chơi', () => {
    for (let count = 2; count <= 6; count++) {
      const styles = ArenaLayout.getSeatStyles(count);
      assert.equal(styles.length, count - 1, `Số vị trí đối thủ cho bàn ${count} người phải là ${count - 1}`);
    }
  });

  await t.test('TEST-2.02: Đăng ký chuẩn xác tất cả định danh tọa độ data-zone-id', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03' }
      ]
    });

    const html = ArenaLayout.renderArenaHtml(state, 'p1');

    assert.ok(html.includes('data-zone-id="zone-draw-pile"'), 'Phải có zone-draw-pile');
    assert.ok(html.includes('data-zone-id="zone-graveyard"'), 'Phải có zone-graveyard');
    assert.ok(html.includes('data-zone-id="zone-fusion-deck"'), 'Phải có zone-fusion-deck');
    assert.ok(html.includes('data-zone-id="zone-amque-deck"'), 'Phải có zone-amque-deck');

    for (const p of Object.values(state.players)) {
      assert.ok(html.includes(`data-zone-id="zone-player-${p.id}-hp"`), `Thiếu hp zone của ${p.id}`);
      assert.ok(html.includes(`data-zone-id="zone-player-${p.id}-monster-0"`), `Thiếu monster-0 zone của ${p.id}`);
      assert.ok(html.includes(`data-zone-id="zone-player-${p.id}-monster-1"`), `Thiếu monster-1 zone của ${p.id}`);
      assert.ok(html.includes(`data-zone-id="zone-player-${p.id}-trap-0"`), `Thiếu trap-0 zone của ${p.id}`);
    }

    assert.ok(html.includes('data-zone-id="zone-player-p1-hand"'), 'Phải có zone-player-p1-hand');
    assert.ok(html.includes('id="arena-motion-layer"'), 'Phải có arena-motion-layer');
  });

  await t.test('TEST-2.03: Bài trên tay hiển thị đúng cấu trúc và lớp xòe quạt', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    const html = ArenaLayout.renderArenaHtml(state, 'p1');
    assert.ok(html.includes('hand-fan-container'), 'Phải có container xòe quạt bài trên tay');
    assert.ok(html.includes('hand-card-wrapper'), 'Phải có wrapper xoay góc thẻ bài');
  });

  await t.test('TEST-2.04 & 2.05: Linh Thú hiển thị Độ Chiến, Pháp Bảo gắn kèm và Bẫy hiển thị đúng mặt', () => {
    const monsterCard = {
      instanceId: 'm1',
      cardId: 'CT-02',
      name: 'Khuyển Thần Đá Cổ Thạch',
      basePower: 3,
      equippedItems: [{ instanceId: 'eq1', cardId: 'DC-01', name: 'Nỏ Thần Liên Châu' }]
    };

    const monsterHtml = CardComponent.renderCardHtml(monsterCard);
    assert.ok(monsterHtml.includes('Khuyển Thần Đá Cổ Thạch'));
    assert.ok(monsterHtml.includes('⚔️ 3'));
    assert.ok(monsterHtml.includes('Nỏ Thần Liên Châu'));
    assert.ok(monsterHtml.includes('card-layer-cutout'));

    const trapCard = { instanceId: 't1', cardId: 'NQ-01', name: 'Gương Bát Quái Phản Đòn' };
    const trapFaceDownHtml = CardComponent.renderCardHtml(trapCard, { faceDown: true });
    assert.ok(trapFaceDownHtml.includes('card-back-design'));
    assert.ok(trapFaceDownHtml.includes('THẦN THOẠI VIỆT'));
    assert.ok(!trapFaceDownHtml.includes('Gương Bát Quái Phản Đòn'), 'Bài úp không được lộ tên thẻ bài');
  });

  await t.test('TEST-2.09 & 2.13: Menu hành động (bao gồm nút Gọi Bầy) và Turn Indicator hiển thị đầy đủ', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    const html = ArenaLayout.renderArenaHtml(state, 'p1');
    assert.ok(html.includes('btn-action-summon'));
    assert.ok(html.includes('btn-action-swarm'));
    assert.ok(html.includes('btn-action-tribute'));
    assert.ok(html.includes('btn-action-fusion'));
    assert.ok(html.includes('btn-action-attack'));
    assert.ok(html.includes('btn-action-endturn'));
    assert.ok(html.includes('LƯỢT 1'));
    assert.ok(html.includes('1. Hóng Hớt'));
    assert.ok(html.includes('2. Bày Trò'));
  });
});
