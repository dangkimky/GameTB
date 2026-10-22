import test from 'node:test';
import assert from 'node:assert/strict';
import { PartyModeToggle } from '../../src/party/PartyModeToggle.js';
import { MicDetector } from '../../src/party/MicDetector.js';
import { VotingSystem } from '../../src/party/VotingSystem.js';
import { GameEngine } from '../../src/core/GameEngine.js';
import { PHASES } from '../../src/core/GameState.js';

test('Party Mode & Tương Tác Đời Thực (Giai Đoạn 7)', async (t) => {
  await t.test('TEST-7.01: Toggle Party Mode / Chill Mode chuyển đổi mượt mà', () => {
    const toggle = new PartyModeToggle('CHILL');
    assert.equal(toggle.isChillMode(), true);
    assert.equal(toggle.isPartyMode(), false);

    const mode1 = toggle.toggle();
    assert.equal(mode1, 'PARTY');
    assert.equal(toggle.isPartyMode(), true);

    const mode2 = toggle.toggle();
    assert.equal(mode2, 'CHILL');
    assert.equal(toggle.isChillMode(), true);
  });

  await t.test('TEST-7.04: Chill Mode tự động kích hoạt hiệu ứng mà không cần Microphone', async () => {
    const detector = new MicDetector();
    // Chế độ mặc định chill mode
    const res = await detector.listenForBark();
    assert.equal(res.success, true);
    assert.equal(res.mode, 'CHILL_AUTO');

    const resSing = await detector.listenForSinging();
    assert.equal(resSing.success, true);
    assert.equal(resSing.mode, 'CHILL_AUTO');
  });

  await t.test('TEST-7.05: Hệ thống bỏ phiếu trực tiếp (DR-11 Bốc Phốt Lên Nhóm Chat)', () => {
    // 4 người chơi: p1 bốc phốt p2, cử tri gồm p1, p3, p4
    const session = VotingSystem.createVoteSession({
      initiatorPlayerId: 'p1',
      targetPlayerId: 'p2',
      livingPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      durationSeconds: 3
    });

    assert.equal(session.eligibleVoters.includes('p2'), false, 'Người bị phốt không được tham gia bỏ phiếu');
    assert.equal(session.eligibleVoters.length, 3);

    // p1 và p3 vote YES (tán thành), p4 vote NO (phản đối)
    VotingSystem.castVote(session, 'p1', 'YES');
    VotingSystem.castVote(session, 'p3', 'YES');
    VotingSystem.castVote(session, 'p4', 'NO');

    const tally = VotingSystem.tallyVotes(session);
    assert.equal(tally.yesCount, 2);
    assert.equal(tally.noCount, 1);
    assert.equal(tally.passed, true, 'Đa số tán thành (2 > 1) => Phạt mất 2 HP!');
  });

  await t.test('TEST-7.06: CT-01 Camera Chạy Bằng Cơm ngửa bài người bên trái', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.players['p1'].hand = [
      { instanceId: 'cam1', cardId: 'CT-01', name: 'Camera Cơm' }
    ];

    // Triệu hồi CT-01
    const card = GameEngine.normalSummon(state, 'p1', 'cam1', 0);
    assert.equal(card.cardId, 'CT-01');

    // Kiểm tra log ghi nhận hiệu ứng soi bài
    const lastLog = state.actionLog[state.actionLog.length - 1];
    assert.ok(lastLog);
  });
});
