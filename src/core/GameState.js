import { ALL_96_CARDS, CARD_TYPES, createMainDeckInstances, getCurseDeckCards, getFusionDeckCards } from '../data/cards.js';
import { RandomUtils } from '../utils/RandomUtils.js';

export const PHASES = {
  DRAW: 'DRAW',
  MAIN: 'MAIN',
  BATTLE: 'BATTLE',
  END: 'END'
};

export class GameState {
  static _lastOpeningSignature = null;

  static createInitialState({
    playerConfigs = [
      { id: 'p1', name: 'Người chơi 1', characterId: 'NV-01' },
      { id: 'p2', name: 'Người chơi 2', characterId: 'NV-02' }
    ],
    seed = null,
    isTeamMode = false
  } = {}) {
    if (playerConfigs.length < 2 || playerConfigs.length > 6) {
      throw new Error('Số người chơi phải từ 2 đến 6 người');
    }

    const isExplicitSeed = (seed !== null && seed !== undefined);
    let effectiveSeed = isExplicitSeed ? seed : RandomUtils.generateFreshSeed();
    let rng = new RandomUtils(effectiveSeed);
    let mainDeck = rng.shuffle(createMainDeckInstances());

    if (!isExplicitSeed && this._lastOpeningSignature) {
      let previewSig = mainDeck.slice(-5).map(c => c.cardId).join(',');
      let retries = 0;
      while (previewSig === this._lastOpeningSignature && retries < 5) {
        effectiveSeed = RandomUtils.generateFreshSeed();
        rng = new RandomUtils(effectiveSeed);
        mainDeck = rng.shuffle(createMainDeckInstances());
        previewSig = mainDeck.slice(-5).map(c => c.cardId).join(',');
        retries++;
      }
    }

    const curseDeck = rng.shuffle(getCurseDeckCards().map(c => ({ ...c, cardId: c.id })));
    const fusionDeck = getFusionDeckCards().map(c => ({ ...c, cardId: c.id }));

    const players = {};
    const turnOrder = playerConfigs.map(p => p.id);

    const baseTeamHp = Math.max(10, Math.floor(playerConfigs.length / 2) * 10);
    const teamHp = isTeamMode ? {
      TEAM_A: baseTeamHp,
      TEAM_B: baseTeamHp
    } : null;

    for (let idx = 0; idx < playerConfigs.length; idx++) {
      const config = playerConfigs[idx];
      const charCard = ALL_96_CARDS[config.characterId];
      if (!charCard || charCard.type !== CARD_TYPES.CHARACTER) {
        throw new Error(`Thẻ Đại Diện không hợp lệ: ${config.characterId}`);
      }

      const maxTrapSlots = config.characterId === 'NV-04' ? 3 : 2;
      const handLimit = config.characterId === 'NV-05' ? 7 : 6;
      const teamId = config.teamId || (idx % 2 === 0 ? 'TEAM_A' : 'TEAM_B');

      players[config.id] = {
        id: config.id,
        name: config.name,
        characterId: config.characterId,
        isBot: !!config.isBot,
        teamId: isTeamMode ? teamId : null,
        hp: isTeamMode ? teamHp[teamId] : 10,
        isGhost: false,
        hand: [],
        monsterSlots: [null, null],
        trapSlots: Array(maxTrapSlots).fill(null),
        maxTrapSlots,
        handLimit,
        hasUsedAliveSkillThisTurn: false,
        turnsCompleted: 0,
        hasSummonedMonster: false
      };
    }

    for (let round = 0; round < 5; round++) {
      for (const pId of turnOrder) {
        if (mainDeck.length > 0) {
          players[pId].hand.push(mainDeck.pop());
        }
      }
    }

    for (const pId of turnOrder) {
      const p = players[pId];
      const hasLowMonster = p.hand.some(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return (c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23';
      });
      if (!hasLowMonster && p.hand.length > 0) {
        const lowIndices = [];
        mainDeck.forEach((c, idx) => {
          const d = ALL_96_CARDS[c.cardId] || c;
          if ((c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23') {
            lowIndices.push(idx);
          }
        });
        if (lowIndices.length > 0) {
          const pickIdx = lowIndices[Math.floor(rng.next() * lowIndices.length)];
          const [lowMonsterCard] = mainDeck.splice(pickIdx, 1);
          const swappedOut = p.hand.pop();
          p.hand.push(lowMonsterCard);
          mainDeck.unshift(swappedOut);
          p.hand = rng.shuffle(p.hand);
        }
      }
    }

    if (!isExplicitSeed && turnOrder.length > 0 && players[turnOrder[0]]) {
      this._lastOpeningSignature = players[turnOrder[0]].hand.map(c => c.cardId).join(',');
    }

    return {
      seed: effectiveSeed,
      gameStatus: 'PLAYING',
      winnerId: null,
      turnOrder,
      players,
      currentTurnIndex: 0,
      turnNumber: 1,
      roundNumber: 1,
      openingRoundActive: false,
      currentPhase: PHASES.DRAW,
      normalSummonUsed: false,
      swarmSummonUsed: false,
      swarmSummonUsedThisTurn: false,
      bonusSummonsAvailable: 0,
      attacksDeclaredThisTurn: [],
      dramaCardsUsedThisTurn: 0,
      stolenMonstersThisTurn: [],
      drawPile: mainDeck,
      graveyard: [],
      fusionDeck,
      curseDeck,
      chainStack: [],
      actionLog: [{ turn: 1, message: 'Trận đấu bắt đầu! Bộ bài đã được xáo trộn ngẫu nhiên và chia 5 lá cho mỗi người chơi.' }],
      effectEvents: [],
      damageEvents: [],
      revealedHands: {},
      revealedTraps: {},
      revealedCardsQueue: [],
      lastRevealedView: null,
      partyMode: false,
      isTeamMode: !!isTeamMode,
      teamHp
    };
  }

  /**
   * Ghi nhận một sự kiện kích hoạt hiệu ứng
   * hasTriggeredEffect = true nghĩa là hiệu ứng của lá bài thực sự được kích hoạt (cần đọc lên);
   * hasTriggeredEffect = false nghĩa là chỉ triệu hồi quân bài thông thường (hiệu ứng chưa kích hoạt nên KHÔNG đọc để tránh mất thời gian).
   */
  static pushEffectEvent(state, {
    mode = 'PASSIVE',
    category = 'PASSIVE',
    card = null,
    cardId = '',
    cardName = '',
    activatorId = null,
    activatorName = '',
    title = '',
    effectText = '',
    resultText = '',
    icon = '✨',
    hasTriggeredEffect = true
  } = {}) {
    if (!state) return null;
    state.effectEvents = state.effectEvents || [];
    const resolvedId = cardId || card?.cardId || card?.id || '';
    const cardData = ALL_96_CARDS[resolvedId] || card || {};
    const resolvedName = cardName || card?.name || cardData?.name || title || 'Hiệu Ứng Thẻ Bài';
    const resolvedEffect = effectText || cardData?.description || cardData?.aliveAbility || cardData?.ghostAbility || card?.description || '';
    const eventObj = {
      id: `eff-${state.turnNumber || 1}-${state.effectEvents.length + 1}`,
      turn: state.turnNumber || 1,
      mode,
      category,
      card: card || cardData,
      cardId: resolvedId,
      cardName: resolvedName,
      activatorId,
      activatorName: activatorName || (activatorId && state.players?.[activatorId]?.name) || '',
      title: title || `${mode === 'PASSIVE' ? 'Kích Hoạt Bị Động' : 'Kích Hoạt Hiệu Ứng'}: ${resolvedName}`,
      effectText: resolvedEffect,
      resultText: resultText || resolvedEffect,
      icon,
      hasTriggeredEffect: Boolean(hasTriggeredEffect)
    };
    state.effectEvents.push(eventObj);
    return eventObj;
  }

  /**
   * Ghi nhận sự kiện Trừ Máu (HP Damage Event) để hiển thị hiệu ứng trừ máu đặc sắc trên màn hình
   */
  static pushDamageEvent(state, {
    targetPlayerId,
    targetPlayerName = '',
    amount = 1,
    oldHp = 10,
    newHp = 9,
    sourcePlayerId = null,
    isTeamDamage = false,
    teamId = null
  } = {}) {
    if (!state || amount <= 0) return null;
    state.damageEvents = state.damageEvents || [];
    const dmgObj = {
      id: `dmg-${state.turnNumber || 1}-${state.damageEvents.length + 1}`,
      turn: state.turnNumber || 1,
      targetPlayerId,
      targetPlayerName: targetPlayerName || (targetPlayerId && state.players?.[targetPlayerId]?.name) || 'Người chơi',
      amount,
      oldHp,
      newHp,
      sourcePlayerId,
      isTeamDamage,
      teamId,
      timestamp: Date.now()
    };
    state.damageEvents.push(dmgObj);
    return dmgObj;
  }

  /**
   * Ghi nhận sự kiện Lật Mở Xem Bài Của Người Chơi Khác (CT-01, DH-01, DR-09, NV-01, TR-09, DR-07...)
   */
  static pushRevealedCardsEvent(state, {
    viewerId = null,
    targetPlayerId = null,
    targetPlayerName = '',
    sourceCardId = '',
    sourceCardName = '',
    revealType = 'HAND',
    title = '👁️ LẬT MỞ XEM BÀI ĐỐI THỦ',
    subtitle = '',
    cards = [],
    capturedCardIds = []
  } = {}) {
    if (!state) return null;
    state.revealedCardsQueue = state.revealedCardsQueue || [];
    const normalizedCards = (cards || []).filter(Boolean).map(c => {
      const cid = c.cardId || c.id || '';
      const data = ALL_96_CARDS[cid] || {};
      return {
        ...data,
        ...c,
        cardId: cid,
        name: c.name || data.name || 'Thẻ Bài',
        faceUp: true,
        isCaptured: Array.isArray(capturedCardIds) && (capturedCardIds.includes(c.instanceId) || capturedCardIds.includes(cid))
      };
    });

    const revealObj = {
      id: `rev-${state.turnNumber || 1}-${state.revealedCardsQueue.length + 1}`,
      turn: state.turnNumber || 1,
      viewerId,
      targetPlayerId,
      targetPlayerName: targetPlayerName || (targetPlayerId && state.players?.[targetPlayerId]?.name) || 'Đối thủ',
      sourceCardId,
      sourceCardName,
      revealType,
      title,
      subtitle: subtitle || `Các lá bài của ${targetPlayerName || 'đối thủ'} đã được lật ngửa cho bạn xem:`,
      cards: normalizedCards,
      timestamp: Date.now()
    };

    state.revealedCardsQueue.push(revealObj);
    state.lastRevealedView = revealObj;
    return revealObj;
  }

  static clone(state) {
    return JSON.parse(JSON.stringify(state));
  }
}
