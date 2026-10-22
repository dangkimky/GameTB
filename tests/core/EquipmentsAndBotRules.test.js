import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/core/GameEngine.js';
import { BotBrain } from '../../src/core/BotBrain.js';
import { PHASES } from '../../src/core/GameState.js';
import { CARD_TYPES } from '../../src/data/cards.js';
import { CardComponent } from '../../src/ui/CardComponent.js';
import { CardInspectorDrawer } from '../../src/ui/CardInspectorDrawer.js';
import { audioManager } from '../../src/audio/AudioManager.js';

test('Kiểm tra Sửa Lỗi Trang Bị, Soi Đạo Cụ, Showcase Mode & Luật Chơi Bot AI', async (t) => {
  await t.test('TEST-FIX.01: AudioManager cung cấp đầy đủ các phương thức SFX và Voice Callout', () => {
    assert.equal(typeof audioManager.playVoiceCallout, 'function', 'audioManager.playVoiceCallout phải là function');
    assert.equal(typeof audioManager.playTrapTrigger, 'function', 'audioManager.playTrapTrigger phải là function');
    assert.equal(typeof audioManager.playGraveyardSend, 'function', 'audioManager.playGraveyardSend phải là function');
    assert.equal(typeof audioManager.playItemEquip, 'function', 'audioManager.playItemEquip phải là function');

    // Gọi thử nghiệm trong môi trường test (không gây ngoại lệ crash)
    assert.doesNotThrow(() => {
      audioManager.playVoiceCallout('skill');
      audioManager.playTrapTrigger();
      audioManager.playGraveyardSend();
      audioManager.playItemEquip();
    });
  });

  await t.test('TEST-FIX.02: CardComponent renderCardHtml hỗ trợ isShowcase không cắt xén chữ', () => {
    const cardInstance = {
      instanceId: 'showcase-1',
      cardId: 'CT-01',
      name: 'Camera Chạy Bằng Cơm',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: 'HONG_HOT',
      basePower: 1,
      power: 1
    };

    const normalHtml = CardComponent.renderCardHtml(cardInstance, { isShowcase: false });
    assert.ok(!normalHtml.includes('card-showcase-mode'), 'Chế độ bình thường không có class card-showcase-mode');

    const showcaseHtml = CardComponent.renderCardHtml(cardInstance, { isShowcase: true });
    assert.ok(showcaseHtml.includes('card-showcase-mode'), 'Chế độ Showcase phải có class card-showcase-mode');
    assert.ok(showcaseHtml.includes('Camera Chạy Bằng Cơm'), 'Phải chứa đầy đủ tên thẻ');
  });

  await t.test('TEST-FIX.03: CardInspectorDrawer hiển thị đầy đủ danh sách Trang Bị đang mang và chức năng', () => {
    const monsterInstance = {
      instanceId: 'm-equipped-1',
      cardId: 'CT-02',
      name: 'Chú Chó Cỏ',
      type: CARD_TYPES.LOW_MONSTER,
      tribe: 'QUAY_PHA',
      basePower: 3,
      power: 5,
      equippedItems: [
        {
          instanceId: 'eq-dep-1',
          cardId: 'DC-01',
          name: 'Dép Tổ Ong Huyền Thoại',
          type: CARD_TYPES.EQUIPMENT,
          powerBonus: 2,
          description: 'Gắn vào Chiến Thần tăng +2 Độ Chiến thực tế.'
        }
      ]
    };

    // Mô phỏng container DOM tối thiểu
    const mockDrawer = { classList: { add: () => {}, remove: () => {} }, setAttribute: () => {} };
    const mockBody = { innerHTML: '' };
    const mockTypePill = { textContent: '', style: {} };

    globalThis.document = {
      getElementById: (id) => {
        if (id === 'card-inspector-drawer') return mockDrawer;
        if (id === 'inspector-body') return mockBody;
        if (id === 'inspector-type-pill') return mockTypePill;
        return null;
      }
    };

    CardInspectorDrawer.inspectCard(monsterInstance, { isHandCard: false });

    assert.ok(mockBody.innerHTML.includes('TRANG BỊ ĐANG MANG'), 'Phải hiển thị tiêu đề TRANG BỊ ĐANG MANG');
    assert.ok(mockBody.innerHTML.includes('Dép Tổ Ong'), 'Phải hiển thị tên trang bị');
    assert.ok(mockBody.innerHTML.includes('DC-01'), 'Phải hiển thị mã thẻ trang bị');
    assert.ok(mockBody.innerHTML.includes('Tăng +2 Độ Chiến'), 'Phải hiển thị mô tả chức năng chi tiết của trang bị');
  });

  await t.test('TEST-FIX.04: Tribute Summon và Normal Summon dùng chung giới hạn 1 lần triệu hồi/lượt', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.normalSummonUsed = false;
    state.players.p1.monsterSlots[0] = {
      instanceId: 'm-field',
      cardId: 'CT-01',
      name: 'Camera Cơm',
      basePower: 1
    };
    state.players.p1.hand = [
      { instanceId: 'boss-hand', cardId: 'TR-01', name: 'Bà Tổ Trưởng', type: CARD_TYPES.HIGH_MONSTER },
      { instanceId: 'low-hand', cardId: 'CT-02', name: 'Chó Cỏ', type: CARD_TYPES.LOW_MONSTER }
    ];

    // 1. Hiến Tế gọi Boss TR-01
    GameEngine.tributeSummon(state, 'p1', 'boss-hand', 0);
    assert.equal(state.normalSummonUsed, true, 'Tribute Summon phải đánh dấu normalSummonUsed = true');
    assert.equal(state.players.p1.monsterSlots[0].cardId, 'TR-01');

    // 2. Cố gắng triệu hồi thường thêm 1 quái trong cùng lượt -> Phải bị chặn!
    assert.throws(
      () => {
        GameEngine.normalSummon(state, 'p1', 'low-hand', 1);
      },
      /lượt triệu hồi/,
      'Không được phép triệu hồi thường sau khi đã triệu hồi Hiến Tế trong cùng lượt'
    );
  });

  await t.test('TEST-FIX.05: Không được Tribute Summon sau khi đã sử dụng Normal Summon trong cùng lượt', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01' },
        { id: 'p2', name: 'Bình', characterId: 'NV-02' }
      ]
    });

    state.currentPhase = PHASES.MAIN;
    state.normalSummonUsed = false;
    state.players.p1.monsterSlots = [
      { instanceId: 'm-field', cardId: 'CT-01', name: 'Camera Cơm', basePower: 1 },
      null
    ];
    state.players.p1.hand = [
      { instanceId: 'low-hand', cardId: 'CT-02', name: 'Chó Cỏ', type: CARD_TYPES.LOW_MONSTER },
      { instanceId: 'boss-hand', cardId: 'TR-01', name: 'Bà Tổ Trưởng', type: CARD_TYPES.HIGH_MONSTER }
    ];

    // 1. Triệu hồi thường CT-02 vào slot 1
    GameEngine.normalSummon(state, 'p1', 'low-hand', 1);
    assert.equal(state.normalSummonUsed, true);

    // 2. Cố gắng hiến tế gọi Boss TR-01 -> Phải bị chặn!
    assert.throws(
      () => {
        GameEngine.tributeSummon(state, 'p1', 'boss-hand', 0);
      },
      /lượt triệu hồi/,
      'Không được phép Hiến Tế gọi Boss nếu đã dùng lượt triệu hồi thường trong cùng lượt'
    );
  });

  await t.test('TEST-FIX.06: Bot AI tuyệt đối tuân thủ Hiệp Ước Hòa Bình Lượt 1, không tấn công ở Lượt 1', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'bot1', name: 'Bot Bình', characterId: 'NV-02', isBot: true },
        { id: 'p1', name: 'Người chơi An', characterId: 'NV-01', isBot: false }
      ]
    });

    state.turnNumber = 1;
    state.currentTurnIndex = 0; // Lượt của Bot Bình
    state.currentPhase = PHASES.MAIN;
    state.players.bot1.monsterSlots[0] = {
      instanceId: 'bot-m-1',
      cardId: 'CT-02',
      name: 'Chó Cỏ',
      basePower: 3,
      power: 3
    };
    state.players.p1.monsterSlots = [null, null]; // Đối thủ trống sân

    const result = BotBrain.executeTurn(state, 'bot1');

    assert.ok(
      result.logs.some(l => l.includes('Hiệp Ước Hòa Bình Lượt 1')),
      'Bot phải ghi nhận tuân thủ Hiệp Ước Hòa Bình Lượt 1'
    );
    assert.equal(state.players.p1.hp, 10, 'Đối thủ không bị mất máu ở Lượt 1 vì Bot không được tấn công');
    assert.equal(state.attacksDeclaredThisTurn.length, 0, 'Không có đòn tấn công nào được Bot khai triển ở Lượt 1');
  });

  await t.test('TEST-FIX.07: Bot AI tuân thủ giới hạn triệu hồi: không triệu hồi vô hạn trong cùng lượt', () => {
    const state = GameEngine.initGame({
      playerConfigs: [
        { id: 'p1', name: 'An', characterId: 'NV-01', isBot: false },
        { id: 'bot1', name: 'Bot Bình', characterId: 'NV-02', isBot: true }
      ]
    });

    state.turnNumber = 2;
    state.currentTurnIndex = 1;
    state.currentPhase = PHASES.MAIN;
    state.normalSummonUsed = false;

    // Cho Bot 1 quái trên sân và cả Boss lẫn quái cấp thấp trên tay
    state.players.bot1.monsterSlots = [
      { instanceId: 'weak-bot', cardId: 'CT-01', name: 'Camera Cơm', basePower: 1, power: 1 },
      null
    ];
    state.players.bot1.hand = [
      { instanceId: 'boss-b', cardId: 'TR-02', name: 'Đại Ca Bán Hoa Quả', type: CARD_TYPES.HIGH_MONSTER },
      { instanceId: 'low-b', cardId: 'CT-03', name: 'Shipper', type: CARD_TYPES.LOW_MONSTER }
    ];

    BotBrain.executeTurn(state, 'bot1');

    // Sau lượt đi:
    // Bot đã hiến tế CT-01 để gọi TR-02 vào slot 0.
    // Vì giới hạn 1 lượt triệu hồi thường/hiến tế đã dùng, slot 1 PHẢI VẪN LÀ NULL (không triệu hồi thêm CT-03)!
    assert.equal(state.players.bot1.monsterSlots[0]?.cardId, 'TR-02', 'Slot 0 phải là Boss TR-02');
    assert.equal(state.players.bot1.monsterSlots[1], null, 'Slot 1 phải trống, Bot không được triệu hồi quái cấp thấp thứ 2');
    assert.ok(state.players.bot1.hand.some(c => c.cardId === 'CT-03'), 'CT-03 phải còn trên tay Bot vì đã hết lượt triệu hồi');
  });
});
