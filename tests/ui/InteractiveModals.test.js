import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { ModalPanels } from '../../src/ui/ModalPanels.js';
import { audioManager } from '../../src/audio/AudioManager.js';
import { CARD_TYPES, TRIBES } from '../../src/data/cards.js';

test('Kiểm tra Giao diện Modal Tương Tác (Interactive Modals UI)', async (t) => {
  await t.test('TEST-UI.01: renderBattleTargetModal hiển thị đúng danh sách Linh Thú của Bạn', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm1',
      cardId: 'CT-01',
      name: 'Chim Lạc Đông Sơn',
      basePower: 2,
      power: 2
    };
    state.players['p1'].monsterSlots[1] = {
      instanceId: 'm2',
      cardId: 'CT-02',
      name: 'Khuyển Thần Đá Đầu Làng',
      basePower: 3,
      power: 3
    };

    const html = ModalPanels.renderBattleTargetModal(state, 'p1', 0);
    assert.ok(html.includes('id="modal-battle-target"'));
    assert.ok(html.includes('Chim Lạc Đông Sơn'));
    assert.ok(html.includes('Khuyển Thần Đá Đầu Làng'));
    assert.ok(html.includes('data-attacker-slot="0"'));
    assert.ok(html.includes('data-attacker-slot="1"'));
  });

  await t.test('TEST-UI.02: renderBattleTargetModal cấm nhắm mục tiêu vào đồng đội trong chế độ Team', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', teamId: 'TEAM_A' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02', teamId: 'TEAM_B' },
        { id: 'p3', name: 'Cường', characterId: 'NV-03', teamId: 'TEAM_A' }
      ],
      isTeamMode: true
    });

    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm1',
      cardId: 'CT-01',
      name: 'Chim Lạc Đông Sơn',
      basePower: 2,
      power: 2
    };

    const html = ModalPanels.renderBattleTargetModal(state, 'p1', 0);
    assert.ok(html.includes('Bình'));
    assert.ok(!html.includes('data-target-player="p3"'), 'Cấm hiển thị đồng đội làm mục tiêu');
  });

  await t.test('TEST-UI.03: renderBattleTargetModal hiển thị Đánh Trực Diện khi đối thủ trống sân', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm1',
      cardId: 'CT-02',
      name: 'Khuyển Thần Đá Đầu Làng',
      basePower: 3,
      power: 3
    };
    state.players['p2'].monsterSlots = [null, null];

    const html = ModalPanels.renderBattleTargetModal(state, 'p1', 0);
    assert.ok(html.includes('ĐÁNH TRỰC DIỆN'));
    assert.ok(html.includes('data-target-slot="null"'));
  });

  await t.test('TEST-UI.04: renderTributeModal hiển thị Thần Thú Cấp Cao trên tay và quân hiến tế trên sân', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.players['p1'].hand = [
      { instanceId: 'boss1', cardId: 'TR-01', name: 'Chằn Tinh Hang Đá' }
    ];
    state.players['p1'].monsterSlots[0] = {
      instanceId: 'm1',
      cardId: 'CT-01',
      name: 'Chim Lạc Đông Sơn',
      basePower: 2,
      power: 2
    };

    const html = ModalPanels.renderTributeModal(state, 'p1');
    assert.ok(html.includes('id="modal-tribute-summon"'));
    assert.ok(html.includes('data-boss-instance-id="boss1"'));
    assert.ok(html.includes('data-tribute-slot="0"'));
    assert.ok(html.includes('btn-confirm-tribute-summon'));
  });

  await t.test('TEST-UI.05: renderAudioSettingsModal hiển thị thanh điều khiển âm lượng và nút test', () => {
    const html = ModalPanels.renderAudioSettingsModal(audioManager);
    assert.ok(html.includes('id="modal-audio-settings"'));
    assert.ok(html.includes('id="slider-vol-sfx"'));
    assert.ok(html.includes('id="slider-vol-music"'));
    assert.ok(html.includes('id="slider-vol-voice"'));
    assert.ok(html.includes('btn-test-sound'));
  });

  await t.test('TEST-UI.06: renderDiscardModal hiển thị đúng danh sách bài cần xả rác cuối lượt', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.players['p1'].hand = [
      { instanceId: 'h1', cardId: 'CT-01', name: 'Lá 1' },
      { instanceId: 'h2', cardId: 'CT-02', name: 'Lá 2' },
      { instanceId: 'h3', cardId: 'CT-03', name: 'Lá 3' },
      { instanceId: 'h4', cardId: 'CT-04', name: 'Lá 4' },
      { instanceId: 'h5', cardId: 'CT-05', name: 'Lá 5' },
      { instanceId: 'h6', cardId: 'CT-06', name: 'Lá 6' },
      { instanceId: 'h7', cardId: 'CT-07', name: 'Lá 7' },
      { instanceId: 'h8', cardId: 'CT-08', name: 'Lá 8' }
    ];

    const html = ModalPanels.renderDiscardModal(state, 'p1');
    assert.ok(html.includes('id="modal-discard-selection"'));
    assert.ok(html.includes('2 lá bài thừa'));
    assert.ok(html.includes('data-discard-instance-id="h1"'));
    assert.ok(html.includes('data-discard-instance-id="h8"'));
    assert.ok(html.includes('id="btn-confirm-discard-endturn"'));
    assert.ok(html.includes('data-needed="2"'));
  });

  await t.test('TEST-UI.07: renderCompendiumModal hỗ trợ lọc 120 lá theo nhóm thẻ, hệ tộc và từ khóa tìm kiếm', () => {
    const allHtml = ModalPanels.renderCompendiumModal({ type: 'ALL', tribe: 'ALL', query: '' });
    assert.ok(allHtml.includes('(120/120 LÁ)'));

    const fusionHtml = ModalPanels.renderCompendiumModal({ type: CARD_TYPES.FUSION_MONSTER, tribe: 'ALL', query: '' });
    assert.ok(fusionHtml.includes('(12/120 LÁ)'));
    assert.ok(fusionHtml.includes('Thần Chó 3 Đầu Núi Tản Viên'));

    const searchHtml = ModalPanels.renderCompendiumModal({ type: 'ALL', tribe: TRIBES.QUAY_PHA, query: 'Khuyển Thần' });
    assert.ok(searchHtml.includes('Khuyển Thần Đá Đầu Làng'));
  });

  await t.test('TEST-UI.08: renderActiveSkillsModal hiển thị Kỹ năng Đại Diện, Tuyệt kỹ Linh Thú và Bẫy Tâm Lý', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    state.turnNumber = 2;
    state.players.p1.monsterSlots[0] = { instanceId: 'ct13-1', cardId: 'CT-13', name: 'Quạ Thần Ăn Khế Trả Vàng' };
    state.players.p1.trapSlots[0] = { instanceId: 'nq03-1', cardId: 'NQ-03', name: 'Mắt Thần Chử Đồng Tử', faceUp: false, setTurnNumber: 1 };

    const html = ModalPanels.renderActiveSkillsModal(state, 'p1');
    assert.ok(html.includes('id="modal-active-skills"'));
    assert.ok(html.includes('btn-activate-char-skill'));
    assert.ok(html.includes('btn-activate-field-skill'));
    assert.ok(html.includes('btn-activate-mind-trap'));
  });

  await t.test('TEST-UI.09: renderGameOverModal và renderAchievementsModal hiển thị bảng vinh danh và huy hiệu', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });
    state.gameStatus = 'ENDED';
    state.winnerId = 'p1';
    state.players.p2.hp = 0;
    state.players.p2.isGhost = true;

    const gameOverHtml = ModalPanels.renderGameOverModal(state, 'p1');
    assert.ok(gameOverHtml.includes('id="modal-game-over"'));
    assert.ok(gameOverHtml.includes('CHÚC MỪNG! BẠN ĐÃ XƯNG BÁ ĐẤU TRƯỜNG THẦN THOẠI!'));
    assert.ok(gameOverHtml.includes('id="btn-rematch-game"'));

    const achHtml = ModalPanels.renderAchievementsModal({ gamesPlayed: 5, gamesWon: 3, fusionsDone: 2, trapsTriggered: 4, bossesSummoned: 2 });
    assert.ok(achHtml.includes('id="modal-achievements"'));
    assert.ok(achHtml.includes('Thần Thoại Bất Bại ✅'));
  });

  await t.test('TEST-UI.10: renderEquipTargetModal hiển thị đúng mục tiêu cho cả Đạo Cụ Cường Hóa Phe Mình (SELF) và Đạo Cụ Ám Hại Đối Thủ (ENEMY)', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', teamId: 'TEAM_A' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02', teamId: 'TEAM_B' }
      ],
      isTeamMode: true
    });

    state.players.p1.hand = [
      { instanceId: 'eq-self', cardId: 'DC-01', name: 'Dép Tổ Ong Thần Tốc — Nỏ Thần Liên Châu', type: CARD_TYPES.EQUIPMENT },
      { instanceId: 'eq-enemy', cardId: 'DC-04', name: 'Tiếng Đàn Thạch Sanh Làm Quân Giặc Bủn Rủn', type: CARD_TYPES.EQUIPMENT }
    ];
    state.players.p1.monsterSlots[0] = {
      instanceId: 'm-p1-0',
      cardId: 'CT-01',
      name: 'Chim Lạc Báo Tin',
      basePower: 2,
      power: 2,
      equippedItems: []
    };
    state.players.p1.monsterSlots[1] = {
      instanceId: 'm-p1-1',
      cardId: 'CT-02',
      name: 'Khuyển Thần Đá Đầu Làng',
      basePower: 3,
      power: 3,
      equippedItems: []
    };
    state.players.p2.monsterSlots[1] = {
      instanceId: 'm-p2-1',
      cardId: 'CT-06',
      name: 'Trâu Vàng Hồ Tây',
      basePower: 3,
      power: 3,
      equippedItems: []
    };

    // Khi chọn eq-self (DC-01), chỉ hiển thị Linh Thú phe mình (p1) với cả Ô 1 và Ô 2
    const selfEquipHtml = ModalPanels.renderEquipTargetModal(state, 'p1', 'eq-self');
    assert.ok(selfEquipHtml.includes('id="modal-equip-target"'));
    assert.ok(selfEquipHtml.includes('data-target-player="p1"'));
    assert.ok(selfEquipHtml.includes('data-target-slot="0"'));
    assert.ok(selfEquipHtml.includes('data-target-slot="1"'));
    assert.ok(!selfEquipHtml.includes('data-target-player="p2"'), 'Đạo cụ SELF không được liệt kê Linh Thú đối thủ làm mục tiêu');

    // Khi chọn eq-enemy (DC-04), chỉ hiển thị Linh Thú đối thủ (p2)
    const enemyEquipHtml = ModalPanels.renderEquipTargetModal(state, 'p1', 'eq-enemy');
    assert.ok(enemyEquipHtml.includes('data-target-player="p2"'));
    assert.ok(enemyEquipHtml.includes('data-target-slot="1"'));
    assert.ok(!enemyEquipHtml.includes('data-target-player="p1"'), 'Đạo cụ ENEMY không được liệt kê Linh Thú phe mình làm mục tiêu');
  });
});
