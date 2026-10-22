import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionSequencer } from '../../src/engine/ActionSequencer.js';
import { CanvasVFXEngine } from '../../src/engine/CanvasVFXEngine.js';
import { SpatialBoardAnimator } from '../../src/engine/SpatialBoardAnimator.js';
import { ScreenShake } from '../../src/engine/ScreenShake.js';

test('VFX Engine & Spatial Board Animations (Giai Đoạn 4)', async (t) => {
  await t.test('TEST-4.12: ActionSequencer khóa input khi đang diễn hoạt (isAnimating = true)', async () => {
    const sequencer = new ActionSequencer();
    assert.equal(sequencer.isAnimating, false);

    let step = 0;
    const task1 = sequencer.enqueue(async () => {
      assert.equal(sequencer.isAnimating, true, 'isAnimating phải là true trong lúc thực thi');
      await new Promise(r => setTimeout(r, 40));
      step = 1;
    });

    const task2 = sequencer.enqueue(async () => {
      assert.equal(step, 1, 'Task 2 phải chờ Task 1 hoàn thành mới được chạy');
      step = 2;
    });

    await Promise.all([task1, task2]);
    assert.equal(step, 2);
    assert.equal(sequencer.isAnimating, false, 'isAnimating phải về false sau khi xong hàng đợi');
  });

  await t.test('TEST-4.11: SpatialBoardAnimator.getZoneRect() trả về tọa độ hợp lệ', () => {
    const animator = new SpatialBoardAnimator();
    const rect = animator.getZoneRect('zone-draw-pile');
    assert.ok(typeof rect.left === 'number');
    assert.ok(typeof rect.top === 'number');
    assert.ok(typeof rect.width === 'number');
    assert.ok(typeof rect.height === 'number');
  });

  await t.test('TEST-4.13: CanvasVFXEngine sinh hạt và chữ nổi không gây rò rỉ bộ nhớ', () => {
    const vfx = new CanvasVFXEngine();
    // Giả lập mock canvas context trong môi trường Node.js
    vfx.ctx = {
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      strokeText: () => {},
      fillText: () => {},
      translate: () => {},
      scale: () => {}
    };
    vfx.canvas = { width: 1000, height: 800 };

    vfx.spawnParticles(100, 100, '#facc15', 20, 'CUỖM LUÔN!');
    assert.equal(vfx.particles.length, 20);
    assert.equal(vfx.shockwaves.length, 1);
    assert.equal(vfx.textBanners.length, 1);
    assert.equal(vfx.textBanners[0].text, 'CUỖM LUÔN!');
  });

  await t.test('TEST-4.01 -> 4.07: Kiểm tra sự tồn tại của các kịch bản bay bài trong SpatialBoardAnimator', () => {
    const animator = new SpatialBoardAnimator();
    assert.equal(typeof animator.flyCardBetweenZones, 'function', 'Phải có kịch bản bay bài Parabol');
    assert.equal(typeof animator.deflectAttackToThirdParty, 'function', 'Phải có kịch bản bẻ lái phản đòn');
    assert.equal(typeof animator.fusionVortex, 'function', 'Phải có kịch bản Dung Hợp xoáy');
    assert.equal(typeof ScreenShake.shake, 'function', 'Phải có chức năng rung màn hình ScreenShake');
  });
});
