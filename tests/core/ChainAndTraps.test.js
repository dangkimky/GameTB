import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { ChainResolver } from '../../src/core/ChainResolver.js';
import { PHASES } from '../../src/core/GameState.js';

test('ChainResolver & Bài Nghiệp Quật (Bẫy Úp)', async (t) => {
  await t.test('TEST-1.14: Bẫy mới úp trong lượt này KHÔNG được phép kích hoạt ngay', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.turnNumber = 1;

    // P1 úp lá Bẫy NQ-01 trong lượt 1
    state.players['p1'].hand = [
      { instanceId: 'trap1', cardId: 'NQ-01', name: 'Gương Phản Đòn' }
    ];
    GameEngine.setTrap(state, 'p1', 'trap1', 0);

    // Kiểm tra: Không được kích hoạt vì vừa mới úp ở lượt 1
    const canActivateTurn1 = ChainResolver.canActivateTrap(state, 'p1', 0, {
      type: 'DECLARED_ATTACK',
      targetId: 'p1'
    });
    assert.equal(canActivateTurn1, false, 'Bẫy mới úp trong lượt 1 không được kích hoạt ở lượt 1');

    // Chuyển sang lượt 2
    state.turnNumber = 2;
    const canActivateTurn2 = ChainResolver.canActivateTrap(state, 'p1', 0, {
      type: 'DECLARED_ATTACK',
      targetId: 'p1'
    });
    assert.equal(canActivateTurn2, true, 'Bẫy úp từ lượt trước được phép kích hoạt ở lượt sau');
  });

  await t.test('TEST-1.13: Chuỗi phản đòn Chain Link giải quyết theo nguyên tắc LIFO', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    // Giả lập Link 1: P1 dùng Bài Drama
    ChainResolver.addToChain(state, {
      activatorId: 'p1',
      cardInstance: { instanceId: 'dr1', name: 'Hội Đồng Quản Trị' }
    });

    // Giả lập Link 2: P2 lật Bẫy NQ-05 Camera Hành Trình để hủy Link 1
    ChainResolver.addToChain(state, {
      activatorId: 'p2',
      cardInstance: { instanceId: 'nq05_1', name: 'Camera Hành Trình 1' }
    });

    // Giả lập Link 3: P1 lật tiếp NQ-05 Camera Hành Trình của mình để phản lại Link 2!
    ChainResolver.addToChain(state, {
      activatorId: 'p1',
      cardInstance: { instanceId: 'nq05_2', name: 'Camera Hành Trình 2' }
    });

    assert.equal(state.chainStack.length, 3);

    // Giải quyết chuỗi
    const executed = [];
    ChainResolver.resolveChain(state, (st, link) => {
      executed.push(link.cardInstance.name);
      // Link 3 vô hiệu hóa Link 2
      if (link.cardInstance.instanceId === 'nq05_2') {
        const link2 = state.chainStack.find(l => l.cardInstance.instanceId === 'nq05_1');
        if (link2) link2.isNegated = true;
      }
    });

    // Thứ tự giải quyết phải là LIFO: Link 3 trước, Link 2 bị hủy, Link 1 phát huy tác dụng
    assert.equal(executed[0], 'Camera Hành Trình 2');
    assert.equal(executed.length, 2); // Link 2 bị isNegated nên không vào executed
    assert.equal(executed[1], 'Hội Đồng Quản Trị');
  });
});
