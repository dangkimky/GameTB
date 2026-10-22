import { ALL_96_CARDS, CARD_TYPES } from '../data/cards.js';
import { GameState, PHASES } from './GameState.js';
import { TurnManager } from './TurnManager.js';
import { BattleResolver } from './BattleResolver.js';
import { FusionSystem } from './FusionSystem.js';
import { GhostSystem } from './GhostSystem.js';
import { RandomUtils } from '../utils/RandomUtils.js';

export class GameEngine {
  /**
   * Khởi tạo trận đấu mới
   */
  static initGame(config) {
    return GameState.createInitialState(config);
  }

  /**
   * Áp dụng hiệu ứng Cộng Hưởng Đồng Tộc (+1 Độ Chiến nếu trên sân bạn đã có Linh Thú cùng Hệ)
   */
  static applyTribeResonanceIfEligible(state, playerId, summonedCard, summonedSlotIndex) {
    const player = state.players[playerId];
    if (!player || !summonedCard) return false;
    const cardData = ALL_96_CARDS[summonedCard.cardId] || summonedCard;
    const tribe = summonedCard.tribe || cardData.tribe;
    if (!tribe) return false;

    const hasSameTribePartner = player.monsterSlots.some((m, idx) => {
      if (!m || m.isGhostSlotMarker || idx === summonedSlotIndex) return false;
      const mData = ALL_96_CARDS[m.cardId] || m;
      return (m.tribe || mData.tribe) === tribe;
    });

    if (hasSameTribePartner) {
      summonedCard.statusEffects = summonedCard.statusEffects || [];
      summonedCard.statusEffects.push({
        type: 'BUFF',
        name: 'Cộng Hưởng Đồng Tộc',
        powerDelta: 1
      });
      const msg = `✨ CỘNG HƯỞNG ĐỒNG TỘC! [${summonedCard.name}] đứng cạnh đồng tộc được tăng thêm +1 Độ Chiến!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: msg
      });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: summonedCard,
        cardId: summonedCard.cardId,
        activatorId: playerId,
        title: `Cộng Hưởng Đồng Tộc: ${summonedCard.name}`,
        effectText: 'Khi triệu hồi Linh Thú cùng Hệ với đồng minh trên sân, tăng ngay +1 Độ Chiến.',
        resultText: msg,
        icon: '✨'
      });
      return true;
    }
    return false;
  }

  /**
   * Triệu hồi thường Linh Thú Cấp Thấp (1 lần/lượt + các lượt triệu hồi thưởng từ CT-32, DC-11, DR-16, NV-08)
   */
  static normalSummon(state, playerId, cardInstanceId, slotIndex) {
    const player = state.players[playerId];
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }
    if (state.currentPhase !== PHASES.MAIN) {
      throw new Error('Chỉ được triệu hồi trong Giai đoạn Bày Trò (MAIN Phase)');
    }
    if (state.normalSummonUsed && !(state.bonusSummonsAvailable > 0)) {
      throw new Error('Bạn đã sử dụng lượt triệu hồi thường trong lượt này');
    }

    const handIndex = player.hand.findIndex(c => c.instanceId === cardInstanceId);
    if (handIndex === -1) {
      throw new Error('Không tìm thấy lá bài trên tay');
    }

    const card = player.hand[handIndex];
    const cardData = ALL_96_CARDS[card.cardId];
    if (cardData.type !== CARD_TYPES.LOW_MONSTER) {
      throw new Error('Chỉ có Linh Thú Cấp Thấp mới được triệu hồi thường');
    }

    // CT-23 (Voi Chín Ngà Bản Đôn): Chiếm luôn cả 2 Ô Linh Thú
    if (card.cardId === 'CT-23') {
      if (player.monsterSlots[0] !== null || player.monsterSlots[1] !== null) {
        throw new Error('CT-23 yêu cầu cả 2 Ô Chiến Thần phải hoàn toàn trống');
      }
      player.hand.splice(handIndex, 1);
      card.summonedTurnNumber = state.turnNumber;
      player.monsterSlots[0] = card;
      player.monsterSlots[1] = { ...card, isGhostSlotMarker: true };
      player.hasSummonedMonster = true;
      if (state.normalSummonUsed && state.bonusSummonsAvailable > 0) {
        state.bonusSummonsAvailable--;
      } else {
        state.normalSummonUsed = true;
      }
      const msg = `🐘 CT-23 Voi Chín Ngà Bản Đôn: ${player.name} triệu hồi [${card.name}] chiếm trọn cả 2 Ô Linh Thú và bật khiên chặn sát thương vượt trội!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: msg
      });
      GameState.pushEffectEvent(state, {
        mode: 'ACTIVE',
        category: 'SUMMON',
        card,
        cardId: card.cardId,
        activatorId: playerId,
        title: `Triệu Hồi: ${card.name}`,
        effectText: cardData.description,
        resultText: msg,
        icon: '🐘',
        hasTriggeredEffect: false
      });
      this.checkAndTriggerSummonTrapNQ09(state, playerId, card);
      return card;
    }

    if (slotIndex < 0 || slotIndex >= player.monsterSlots.length || player.monsterSlots[slotIndex] !== null) {
      throw new Error('Ô Chiến Thần không hợp lệ hoặc đã có quân');
    }

    card.summonedTurnNumber = state.turnNumber;
    player.hand.splice(handIndex, 1);
    player.monsterSlots[slotIndex] = card;
    player.hasSummonedMonster = true;
    if (state.normalSummonUsed && state.bonusSummonsAvailable > 0) {
      state.bonusSummonsAvailable--;
    } else {
      state.normalSummonUsed = true;
    }

    const logBefore = state.actionLog.length;
    state.actionLog.push({
      turn: state.turnNumber,
      message: `${player.name} triệu hồi thường [${card.name}] (${cardData.power} ⚔️)`
    });

    this.applyTribeResonanceIfEligible(state, playerId, card, slotIndex);
    const ownEffectStart = state.actionLog.length;
    this.handleLowMonsterOnSummon(state, playerId, card, slotIndex);
    const ownEffectLogs = state.actionLog.slice(ownEffectStart).map(l => l.message);
    this.checkAndTriggerSummonTrapNQ09(state, playerId, card);

    const hasTriggeredEffect = ownEffectLogs.length > 0;
    const effectLogs = state.actionLog.slice(logBefore + 1).map(l => l.message);
    const currentPower = BattleResolver.calculateMonsterPower(state, playerId, slotIndex);
    const resultText = ownEffectLogs.length > 0
      ? ownEffectLogs.join(' • ')
      : (effectLogs.length > 0 ? effectLogs.join(' • ') : `${card.name} trấn giữ trên sân với ${currentPower} Độ Chiến`);

    GameState.pushEffectEvent(state, {
      mode: 'ACTIVE',
      category: 'SUMMON',
      card,
      cardId: card.cardId,
      activatorId: playerId,
      title: `Triệu Hồi: ${card.name}`,
      effectText: cardData.description,
      resultText,
      icon: '⚔️',
      hasTriggeredEffect
    });

    return card;
  }

  /**
   * Triệu hồi Gọi Bầy / Triệu hồi Nhanh (Swarm Summon — 1 lần/lượt, không tốn lượt Triệu hồi thường!)
   */
  static swarmSummon(state, playerId, cardInstanceId = null, slotIndex = null) {
    const player = state.players[playerId];
    if (!player || player.isGhost) throw new Error('Người chơi không hợp lệ');
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }
    if (state.currentPhase !== PHASES.MAIN) {
      throw new Error('Chỉ được Gọi Bầy trong Giai đoạn Bày Trò (MAIN Phase)');
    }
    if (state.swarmSummonUsedThisTurn || state.swarmSummonUsed) {
      throw new Error('Bạn đã sử dụng lượt Gọi Bầy Linh Thú trong lượt này rồi!');
    }

    const emptySlot = (slotIndex !== null && slotIndex !== undefined && player.monsterSlots[slotIndex] === null)
      ? slotIndex
      : player.monsterSlots.findIndex(s => s === null);
    if (emptySlot === -1) {
      throw new Error('Cả 2 Ô Linh Thú trên sân của bạn đều đã kín!');
    }

    let handIndex = -1;
    if (cardInstanceId) {
      handIndex = player.hand.findIndex(c => c.instanceId === cardInstanceId);
    } else {
      handIndex = player.hand.findIndex(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        if (c.cardId === 'TR-14') return true;
        return (c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23';
      });
    }

    if (handIndex === -1) {
      throw new Error('Không tìm thấy Linh Thú phù hợp trên tay để Gọi Bầy!');
    }

    const card = player.hand[handIndex];
    const cardData = ALL_96_CARDS[card.cardId] || card;

    if (card.cardId === 'TR-14') {
      const oppHasMonster = Object.values(state.players).some(
        p => p.id !== playerId && !p.isGhost && p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker)
      );
      if (!oppHasMonster && !player.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker)) {
        throw new Error('TR-14 Ông Đổng Khổng Lồ cần đối thủ hoặc sân nhà có ít nhất 1 Linh Thú để Triệu Hồi Đặc Biệt!');
      }
    } else if ((card.type || cardData.type) !== CARD_TYPES.LOW_MONSTER || card.cardId === 'CT-23') {
      throw new Error('Chỉ có Linh Thú Cấp Thấp hoặc Ông Đổng Khổng Lồ (TR-14) mới có thể Triệu Hồi Gọi Bầy!');
    }

    player.hand.splice(handIndex, 1);
    card.summonedTurnNumber = state.turnNumber;
    player.monsterSlots[emptySlot] = card;
    player.hasSummonedMonster = true;
    state.swarmSummonUsedThisTurn = true;
    state.swarmSummonUsed = true;

    const logBefore = state.actionLog.length;
    state.actionLog.push({
      turn: state.turnNumber,
      message: `🐾 GỌI BẦY LINH THÚ! ${player.name} triệu hồi nhanh [${card.name}] (${cardData.power || card.basePower} ⚔️) lên sân!`
    });

    this.applyTribeResonanceIfEligible(state, playerId, card, emptySlot);

    const ownEffectStart = state.actionLog.length;
    if ((card.type || cardData.type) === CARD_TYPES.LOW_MONSTER) {
      this.handleLowMonsterOnSummon(state, playerId, card, emptySlot);
    } else if ((card.type || cardData.type) === CARD_TYPES.HIGH_MONSTER) {
      this.handleBossOnSummon(state, playerId, card, emptySlot);
    }
    const ownEffectLogs = state.actionLog.slice(ownEffectStart).map(l => l.message);

    this.checkAndTriggerSummonTrapNQ09(state, playerId, card);

    const hasTriggeredEffect = ownEffectLogs.length > 0;
    const effectLogs = state.actionLog.slice(logBefore + 1).map(l => l.message);
    const currentPower = BattleResolver.calculateMonsterPower(state, playerId, emptySlot);
    const resultText = ownEffectLogs.length > 0
      ? ownEffectLogs.join(' • ')
      : (effectLogs.length > 0 ? effectLogs.join(' • ') : `Gọi bầy thành công, ${card.name} xuất trận với ${currentPower} Độ Chiến`);

    GameState.pushEffectEvent(state, {
      mode: 'ACTIVE',
      category: 'SUMMON',
      card,
      cardId: card.cardId,
      activatorId: playerId,
      title: `Gọi Bầy: ${card.name}`,
      effectText: cardData.description,
      resultText,
      icon: '🐾',
      hasTriggeredEffect
    });

    return card;
  }

  static checkAndTriggerSummonTrapNQ09(state, playerId, summonedCard) {
    const player = state.players[playerId];
    const nq09Opponent = Object.values(state.players).find(p =>
      p.id !== playerId &&
      !p.isGhost &&
      (!state.isTeamMode || p.teamId !== player.teamId) &&
      p.trapSlots.some(t => t && t.cardId === 'NQ-09' && t.setTurnNumber < state.turnNumber)
    );

    if (nq09Opponent) {
      const tIdx = nq09Opponent.trapSlots.findIndex(t => t && t.cardId === 'NQ-09' && t.setTurnNumber < state.turnNumber);
      const trap = nq09Opponent.trapSlots[tIdx];
      nq09Opponent.trapSlots[tIdx] = null;
      state.graveyard.push(trap);

      summonedCard.cannotAttack = true;
      summonedCard.statusEffects = summonedCard.statusEffects || [];
      summonedCard.statusEffects.push({
        type: 'FREEZE',
        name: 'Sa Lầy Đầm Dạ Trạch',
        duration: 1
      });

      const msg = `🚰 BẪY LẬT [${trap.name}]! ${nq09Opponent.name} kích hoạt bẫy! [${summonedCard.name}] của ${player.name} vừa ra sân đã sa lầy đóng băng, không thể tấn công!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: msg
      });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'TRAP',
        card: trap,
        cardId: 'NQ-09',
        activatorId: nq09Opponent.id,
        title: `Bẫy Thiên Cơ: ${trap.name}`,
        resultText: msg,
        icon: '🕸️'
      });
    }
  }

  /**
   * Triệu hồi Hiến Tế Đại Yêu / Thần Thú Cấp Cao
   */
  static tributeSummon(state, playerId, bossCardInstanceId, tributeSlotIndex) {
    const player = state.players[playerId];
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }
    if (state.currentPhase !== PHASES.MAIN) {
      throw new Error('Chỉ được triệu hồi trong Giai đoạn Bày Trò (MAIN Phase)');
    }
    if (state.normalSummonUsed && !(state.bonusSummonsAvailable > 0)) {
      throw new Error('Bạn đã sử dụng lượt triệu hồi trong lượt này');
    }

    const handIndex = player.hand.findIndex(c => c.instanceId === bossCardInstanceId);
    if (handIndex === -1) {
      throw new Error('Không tìm thấy Trùm Khu Phố trên tay');
    }

    const bossCard = player.hand[handIndex];
    const bossData = ALL_96_CARDS[bossCard.cardId];
    if (bossData.type !== CARD_TYPES.HIGH_MONSTER) {
      throw new Error('Lá bài không phải là Trùm Khu Phố Cấp Cao');
    }

    const tributedMonster = player.monsterSlots[tributeSlotIndex];
    if (!tributedMonster) {
      throw new Error('Cần 1 Chiến Thần trên sân của bạn để làm nguyên liệu Hiến Tế');
    }

    if ((tributedMonster.equippedItems || []).some(it => it.cardId === 'DC-07')) {
      throw new Error('Chiến Thần đang bị gắn Tờ Giấy Ghi Nợ (DC-07) không thể dùng làm nguyên liệu Hiến Tế!');
    }

    const logBefore = state.actionLog.length;

    if (tributedMonster.cardId === 'CT-24' && !(tributedMonster.equippedItems || []).some(it => it.cardId === 'DC-04')) {
      TurnManager.drawCard(state, playerId);
      TurnManager.drawCard(state, playerId);
      const ct24Msg = '🦄 CT-24 Ngựa Chín Hồng Mao: Hiến tế sính lễ Sơn Tinh, giúp bạn bốc ngay 2 lá bài!';
      state.actionLog.push({
        turn: state.turnNumber,
        message: ct24Msg
      });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: tributedMonster,
        cardId: 'CT-24',
        activatorId: playerId,
        title: `Nội Tại Hiến Tế: ${tributedMonster.name}`,
        resultText: ct24Msg,
        icon: '🦄'
      });
    }

    if (tributedMonster.equippedItems) {
      state.graveyard.push(...tributedMonster.equippedItems);
    }
    state.graveyard.push(tributedMonster);

    if (tributedMonster.cardId === 'CT-23') {
      player.monsterSlots = [null, null];
    } else {
      player.monsterSlots[tributeSlotIndex] = null;
    }

    bossCard.summonedTurnNumber = state.turnNumber;
    player.hand.splice(handIndex, 1);
    player.monsterSlots[tributeSlotIndex] = bossCard;
    player.hasSummonedMonster = true;
    if (state.normalSummonUsed && state.bonusSummonsAvailable > 0) {
      state.bonusSummonsAvailable--;
    } else {
      state.normalSummonUsed = true;
    }

    state.actionLog.push({
      turn: state.turnNumber,
      message: `👑 HIẾN TẾ! ${player.name} hiến tế [${tributedMonster.name}] gọi ra Thần Thú [${bossCard.name}] (${bossData.power} ⚔️)!`
    });

    const ownEffectStart = state.actionLog.length;
    this.handleBossOnSummon(state, playerId, bossCard, tributeSlotIndex);
    const ownEffectLogs = state.actionLog.slice(ownEffectStart).map(l => l.message);
    this.checkAndTriggerSummonTrapNQ09(state, playerId, bossCard);

    const hasTriggeredEffect = ownEffectLogs.length > 0;
    const effectLogs = state.actionLog.slice(logBefore).map(l => l.message).filter(m => !m.startsWith('👑 HIẾN TẾ!'));
    const currentPower = BattleResolver.calculateMonsterPower(state, playerId, tributeSlotIndex);
    const resultText = ownEffectLogs.length > 0
      ? ownEffectLogs.join(' • ')
      : (effectLogs.length > 0 ? effectLogs.join(' • ') : `Hiến tế [${tributedMonster.name}], triệu hồi [${bossCard.name}] (${currentPower} Độ Chiến) trấn giữ sân đấu`);

    GameState.pushEffectEvent(state, {
      mode: 'ACTIVE',
      category: 'TRIBUTE',
      card: bossCard,
      cardId: bossCard.cardId,
      activatorId: playerId,
      title: `Hiến Tế: ${bossCard.name}`,
      effectText: bossData.description,
      resultText,
      icon: '👑',
      hasTriggeredEffect
    });

    return bossCard;
  }

  /**
   * Triệu hồi Dung Hợp Huyền Thoại (DH-01 -> DH-12)
   */
  static fusionSummon(state, playerId, fusionCardId, materialInstanceIds = []) {
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }
    if (state.currentPhase !== PHASES.MAIN) {
      throw new Error('Chỉ được Dung Hợp trong Giai đoạn Bày Trò (MAIN Phase)');
    }

    const logBefore = state.actionLog.length;
    const fusionMonster = FusionSystem.executeFusionSummon(state, playerId, fusionCardId, materialInstanceIds);
    if (state.players[playerId]) state.players[playerId].hasSummonedMonster = true;
    if (fusionMonster) fusionMonster.summonedTurnNumber = state.turnNumber;

    const ownEffectStart = state.actionLog.length;
    this.handleFusionOnSummon(state, playerId, fusionMonster);
    const ownEffectLogs = state.actionLog.slice(ownEffectStart).map(l => l.message);

    const hasTriggeredEffect = ownEffectLogs.length > 0;
    const fusionData = ALL_96_CARDS[fusionCardId] || fusionMonster;
    const effectLogs = state.actionLog.slice(logBefore).map(l => l.message).filter(m => !m.startsWith('🌀 DUNG HỢP THẦN THOẠI!'));
    const resultText = ownEffectLogs.length > 0
      ? ownEffectLogs.join(' • ')
      : (effectLogs.length > 0 ? effectLogs.join(' • ') : `Dung hợp thành công [${fusionMonster.name}] (${fusionData.power} Độ Chiến) giáng lâm sân đấu`);

    GameState.pushEffectEvent(state, {
      mode: 'ACTIVE',
      category: 'FUSION',
      card: fusionMonster,
      cardId: fusionCardId,
      activatorId: playerId,
      title: `Dung Hợp: ${fusionMonster.name}`,
      effectText: fusionData.description,
      resultText,
      icon: '🌀',
      hasTriggeredEffect
    });

    return fusionMonster;
  }

  static executeFusionSummon(state, playerId, fusionCardId, materialInstanceIds = []) {
    return this.fusionSummon(state, playerId, fusionCardId, materialInstanceIds);
  }

  /**
   * Gắn Pháp Bảo Đạo Cụ (Trang Bị)
   */
  static equipItem(state, playerId, equipCardInstanceId, targetPlayerId, targetSlotIndex) {
    const player = state.players[playerId];
    const targetPlayer = state.players[targetPlayerId];
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }

    const handIndex = player.hand.findIndex(c => c.instanceId === equipCardInstanceId);
    if (handIndex === -1) {
      throw new Error('Không tìm thấy Bài Đạo Cụ trên tay');
    }

    const equipCard = player.hand[handIndex];
    const equipData = ALL_96_CARDS[equipCard.cardId];
    if (equipData.type !== CARD_TYPES.EQUIPMENT) {
      throw new Error('Lá bài không phải là Bài Đạo Cụ');
    }

    const targetMonster = targetPlayer.monsterSlots[targetSlotIndex];
    if (!targetMonster) {
      throw new Error('Không có Chiến Thần tại ô chỉ định để gắn Đạo Cụ');
    }

    targetMonster.equippedItems = targetMonster.equippedItems || [];
    if (targetMonster.equippedItems.length >= 2) {
      throw new Error('Mỗi Chiến Thần chỉ được gắn tối đa 2 Đạo Cụ');
    }

    const logBefore = state.actionLog.length;
    player.hand.splice(handIndex, 1);
    equipCard.equippedByPlayerId = playerId;
    targetMonster.equippedItems.push(equipCard);

    if (equipCard.cardId === 'DC-08') {
      BattleResolver.applyHealing(state, player, 1);
      state.actionLog.push({
        turn: state.turnNumber,
        message: '🍚 DC-08 Niêu Cơm Thạch Sanh kích hoạt: Hồi +1 Điểm Nhân Phẩm và tăng +1 Độ Chiến!'
      });
    }

    if (equipCard.cardId === 'DC-11') {
      state.bonusSummonsAvailable = (state.bonusSummonsAvailable || 0) + 1;
      state.normalSummonUsed = false;
      state.actionLog.push({
        turn: state.turnNumber,
        message: '🗡️ DC-11 Gươm Thần Thuận Thiên: Tăng +2 Độ Chiến và ban thêm +1 lượt Triệu Hồi Thường trong lượt này!'
      });
    }

    if (equipCard.cardId === 'DC-12') {
      TurnManager.drawCard(state, playerId);
      state.actionLog.push({
        turn: state.turnNumber,
        message: '🎋 DC-12 Bụi Tre Ngà: Tăng +1 Độ Chiến và giúp bạn bốc ngay 1 lá bài mới!'
      });
    }

    if (equipCard.cardId === 'DC-13') {
      BattleResolver.applyHealing(state, player, 2);
      state.actionLog.push({
        turn: state.turnNumber,
        message: '🌺 DC-13 Trầu Cánh Phượng: Tăng +1 Độ Chiến và hồi ngay +2 Điểm Nhân Phẩm!'
      });
    }

    if (equipCard.cardId === 'DC-14') {
      const enemies = Object.values(state.players).filter(
        p => p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)
      );
      if (enemies.length > 0) {
        const richestEnemy = [...enemies].sort((a, b) => b.hp - a.hp)[0];
        BattleResolver.applyDamage(state, richestEnemy, 1, playerId);
        state.actionLog.push({
          turn: state.turnNumber,
          message: `🏹 DC-14 Cung Tên Vàng Lạc Việt: Tăng +2 Độ Chiến và bắn tên thần trừ 1 Điểm Nhân Phẩm của ${richestEnemy.name}!`
        });
      }
    }

    const updatedPower = BattleResolver.calculateMonsterPower(state, targetPlayerId, targetSlotIndex);
    const equipSummaryMsg = `${player.name} gắn Pháp Bảo [${equipCard.name}] lên [${targetMonster.name}] của ${targetPlayer.name} (Độ Chiến hiện tại: ${updatedPower} ⚔️)`;
    state.actionLog.push({
      turn: state.turnNumber,
      message: equipSummaryMsg
    });

    const newEffectLogs = state.actionLog.slice(logBefore).map(l => l.message);
    GameState.pushEffectEvent(state, {
      mode: 'ACTIVE',
      category: 'EQUIP',
      card: equipCard,
      cardId: equipCard.cardId,
      activatorId: playerId,
      title: `Trang Bị: ${equipCard.name}`,
      effectText: equipData.description,
      resultText: newEffectLogs.join(' • '),
      icon: '🛡️'
    });

    return equipCard;
  }

  /**
   * Úp Bẫy Thiên Cơ (Bài Nghiệp Quật)
   */
  static setTrap(state, playerId, trapCardInstanceId, trapSlotIndex) {
    const player = state.players[playerId];
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }

    const handIndex = player.hand.findIndex(c => c.instanceId === trapCardInstanceId);
    if (handIndex === -1) {
      throw new Error('Không tìm thấy Bài Nghiệp Quật trên tay');
    }

    const trapCard = player.hand[handIndex];
    const trapData = ALL_96_CARDS[trapCard.cardId];
    if (trapData.type !== CARD_TYPES.TRAP) {
      throw new Error('Chỉ có Bài Nghiệp Quật mới được úp xuống hàng dưới');
    }

    if (trapSlotIndex < 0 || trapSlotIndex >= player.maxTrapSlots || player.trapSlots[trapSlotIndex] !== null) {
      throw new Error('Ô Nghiệp Quật không hợp lệ hoặc đã có bài úp');
    }

    player.hand.splice(handIndex, 1);
    player.trapSlots[trapSlotIndex] = {
      ...trapCard,
      faceUp: false,
      setTurnNumber: state.turnNumber
    };

    state.actionLog.push({
      turn: state.turnNumber,
      message: `${player.name} đã bí mật úp 1 lá Bẫy Thiên Cơ xuống sân...`
    });

    return true;
  }

  /**
   * Kích hoạt & lật Bẫy Thiên Cơ (Bài Nghiệp Quật)
   */
  static activateTrap(state, playerId, trapSlotIndex, triggerContext = {}) {
    const player = state.players[playerId];
    if (!player) throw new Error('Người chơi không tồn tại');

    const trap = player.trapSlots[trapSlotIndex];
    if (!trap) throw new Error('Không có bài úp tại ô này');
    if (trap.faceUp) throw new Error('Lá bài này đã được lật ngửa trước đó');

    if (trap.setTurnNumber >= state.turnNumber) {
      throw new Error('Bài Nghiệp Quật mới úp trong lượt này chưa thể lật ngay!');
    }

    const hasEnemyTR11 = Object.values(state.players).some(p =>
      p.id !== playerId &&
      !p.isGhost &&
      (!state.isTeamMode || p.teamId !== player.teamId) &&
      p.monsterSlots.some(m => m && m.cardId === 'TR-11' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04'))
    );
    if (hasEnemyTR11 && state.currentPhase === PHASES.MAIN) {
      throw new Error('TR-11 Thần Độc Cước đang khóa toàn bộ Bẫy Thiên Cơ trong Giai đoạn Bày Trò!');
    }

    trap.faceUp = true;
    player.trapSlots[trapSlotIndex] = null;
    state.graveyard.push(trap);

    state.actionLog.push({
      turn: state.turnNumber,
      message: `⚡ LẬT BẪY! ${player.name} kích hoạt Bẫy Thiên Cơ: [${trap.name}]!`
    });

    const defaultEnemy = Object.values(state.players).find(
      p => p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)
    );
    const victim = triggerContext.targetPlayerId
      ? state.players[triggerContext.targetPlayerId]
      : defaultEnemy;

    let resultMsg = `${player.name} kích hoạt [${trap.name}]!`;
    if (trap.cardId === 'NQ-03' && victim) {
      BattleResolver.applyDamage(state, victim, 2, playerId);
      resultMsg = `👀 NQ-03 Mắt Thần Đền Cổ: ${victim.name} tò mò nhìn trộm, bị phạt trừ ngay 2 Điểm Nhân Phẩm!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: resultMsg
      });
    } else if (trap.cardId === 'NQ-11' && victim) {
      BattleResolver.applyDamage(state, victim, 2, playerId);
      BattleResolver.applyHealing(state, player, 1);
      resultMsg = `😆 NQ-11 Cười Người Hôm Trước: ${victim.name} bị trừ 2 HP, ${player.name} hồi lại +1 HP!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: resultMsg
      });
    }

    GameState.pushEffectEvent(state, {
      mode: 'ACTIVE',
      category: 'TRAP',
      card: trap,
      cardId: trap.cardId,
      activatorId: playerId,
      title: `Lật Bẫy: ${trap.name}`,
      effectText: ALL_96_CARDS[trap.cardId]?.description || trap.description || '',
      resultText: resultMsg,
      icon: '🚨'
    });

    return trap;
  }

  /**
   * Kích hoạt Kỹ năng Chủ Động của Linh Thú trên sân (CT-13, TR-09, DH-08)
   */
  static activateFieldSkill(state, playerId, slotIndex, targetParams = {}) {
    const player = state.players[playerId];
    if (!player || player.isGhost) throw new Error('Người chơi không hợp lệ');
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }
    if (state.currentPhase !== PHASES.MAIN) {
      throw new Error('Chỉ được kích hoạt kỹ năng chủ động trong Giai đoạn Bày Trò (MAIN Phase)');
    }

    const monster = player.monsterSlots[slotIndex];
    if (!monster || monster.isGhostSlotMarker) {
      throw new Error('Không tìm thấy Linh Thú tại ô này');
    }

    if ((monster.equippedItems || []).some(it => it.cardId === 'DC-04')) {
      throw new Error('Linh Thú này đang bị Tiếng Đàn Thạch Sanh (DC-04) khóa toàn bộ kỹ năng!');
    }

    player.usedFieldSkillInstanceIds = player.usedFieldSkillInstanceIds || [];
    if (player.usedFieldSkillInstanceIds.includes(monster.instanceId)) {
      throw new Error(`[${monster.name}] đã sử dụng kỹ năng trong lượt này rồi!`);
    }

    const validEnemies = Object.values(state.players).filter(
      p => p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)
    );
    const targetEnemy = (targetParams.targetPlayerId && validEnemies.some(p => p.id === targetParams.targetPlayerId))
      ? state.players[targetParams.targetPlayerId]
      : (validEnemies.find(p => p.hand.length > 0) || validEnemies[0]);

    switch (monster.cardId) {
      case 'CT-13': {
        if (player.hand.length === 0) {
          throw new Error('CT-13 yêu cầu bạn phải có ít nhất 1 lá bài trên tay!');
        }
        if (!targetEnemy) {
          throw new Error('Không tìm thấy đối thủ hợp lệ');
        }
        const discardIdx = targetParams.discardInstanceId
          ? player.hand.findIndex(c => c.instanceId === targetParams.discardInstanceId)
          : player.hand.length - 1;
        const [myDiscarded] = player.hand.splice(Math.max(0, discardIdx), 1);
        state.graveyard.push(myDiscarded);

        let enemyDiscardedName = 'không còn bài';
        let enemyDiscardedCard = null;
        if (targetEnemy.hand.length > 0) {
          const [enemyDiscarded] = targetEnemy.hand.splice(0, 1);
          state.graveyard.push(enemyDiscarded);
          enemyDiscardedCard = enemyDiscarded;
          enemyDiscardedName = `[${enemyDiscarded.name}]`;
        }

        player.usedFieldSkillInstanceIds.push(monster.instanceId);
        const msg = `🐦‍⬛ CT-13 Quạ Thần Cắp Ngọc: ${player.name} bỏ [${myDiscarded.name}], quắp bay ${enemyDiscardedName} của ${targetEnemy.name} vào Bãi Rác!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        if (enemyDiscardedCard) {
          GameState.pushRevealedCardsEvent(state, {
            viewerId: playerId,
            targetPlayerId: targetEnemy.id,
            targetPlayerName: targetEnemy.name,
            sourceCardId: 'CT-13',
            sourceCardName: monster.name,
            revealType: 'CAPTURED',
            title: `🐦‍⬛ QUẠ THẦN CẮP NGỌC — LÁ BÀI ĐỐI THỦ BỊ QUẮP BAY`,
            subtitle: `${monster.name} đã quắp lá bài sau từ trên tay ${targetEnemy.name} xuống Bãi Rác:`,
            cards: [enemyDiscardedCard]
          });
        }
        GameState.pushEffectEvent(state, {
          mode: 'ACTIVE',
          category: 'SKILL',
          card: monster,
          cardId: 'CT-13',
          activatorId: playerId,
          title: `Tuyệt Kỹ: ${monster.name}`,
          resultText: msg,
          icon: '🐦‍⬛'
        });
        return { skill: 'CHOT_DON', myDiscarded, targetEnemyId: targetEnemy.id };
      }

      case 'TR-09': {
        if (player.hand.length === 0) {
          throw new Error('TR-09 yêu cầu bạn phải có ít nhất 1 lá bài trên tay!');
        }
        if (!targetEnemy || targetEnemy.hand.length === 0) {
          throw new Error('Đối thủ không có bài trên tay để Hồ Tinh mê hoặc!');
        }

        const giveIdx = targetParams.giveInstanceId
          ? player.hand.findIndex(c => c.instanceId === targetParams.giveInstanceId)
          : 0;
        const [givenCard] = player.hand.splice(Math.max(0, giveIdx), 1);

        const nq13Idx = targetEnemy.trapSlots.findIndex(t => t && t.cardId === 'NQ-13' && t.setTurnNumber < state.turnNumber);
        if (nq13Idx !== -1) {
          const trap = targetEnemy.trapSlots[nq13Idx];
          targetEnemy.trapSlots[nq13Idx] = null;
          state.graveyard.push(trap);
          state.graveyard.push(givenCard);
          player.usedFieldSkillInstanceIds.push(monster.instanceId);
          const msg = `🪶 BẪY LẬT [${trap.name}]! ${targetEnemy.name} hóa giải phép Hồ Tinh TR-09 và tịch thu luôn lá [${givenCard.name}] vào Bãi Rác!`;
          state.actionLog.push({
            turn: state.turnNumber,
            message: msg
          });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'TRAP',
            card: trap,
            cardId: 'NQ-13',
            activatorId: targetEnemy.id,
            title: `Bẫy Thiên Cơ: ${trap.name}`,
            resultText: msg,
            icon: '🪶'
          });
          return { skill: 'NEGATED_BY_NQ13' };
        }

        const stolenCards = [];
        while (stolenCards.length < 2 && targetEnemy.hand.length > 0) {
          const randIdx = Math.floor(Math.random() * targetEnemy.hand.length);
          const [pulled] = targetEnemy.hand.splice(randIdx, 1);
          stolenCards.push(pulled);
          player.hand.push(pulled);
        }
        targetEnemy.hand.push(givenCard);

        player.usedFieldSkillInstanceIds.push(monster.instanceId);
        const stolenNames = stolenCards.map(c => `[${c.name}]`).join(', ');
        const msg = `🦊 TR-09 Hồ Tinh Chín Đuôi: Đưa [${givenCard.name}] cho ${targetEnemy.name} và thu về ${stolenCards.length} lá bài (${stolenNames}) từ tay họ!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushRevealedCardsEvent(state, {
          viewerId: playerId,
          targetPlayerId: targetEnemy.id,
          targetPlayerName: targetEnemy.name,
          sourceCardId: 'TR-09',
          sourceCardName: monster.name,
          revealType: 'CAPTURED',
          title: `🦊 HỒ TINH CHÍN ĐUÔI — LẬT MỞ BÀI THU PHỤC TỪ ${targetEnemy.name.toUpperCase()}`,
          subtitle: `Bạn đã mê hoặc ${targetEnemy.name} và rút về tay ${stolenCards.length} lá bài sau:`,
          cards: stolenCards,
          capturedCardIds: stolenCards.map(c => c.instanceId)
        });
        GameState.pushEffectEvent(state, {
          mode: 'ACTIVE',
          category: 'SKILL',
          card: monster,
          cardId: 'TR-09',
          activatorId: playerId,
          title: `Tuyệt Kỹ: ${monster.name}`,
          resultText: msg,
          icon: '🦊'
        });
        return { skill: 'DA_CAP', givenCard, stolenCards };
      }

      case 'DH-08': {
        if (state.graveyard.length === 0) {
          throw new Error('Bãi Rác đang trống, không có mục tiêu nào để DH-08 ném sang sân đối thủ!');
        }
        const enemyWithEmptySlot = validEnemies.find(p => p.monsterSlots.some(s => s === null));
        const target = (targetEnemy && targetEnemy.monsterSlots.some(s => s === null))
          ? targetEnemy
          : enemyWithEmptySlot;
        if (!target) {
          throw new Error('Sân của đối thủ đã kín cả 2 Ô Linh Thú!');
        }

        const emptySlot = target.monsterSlots.findIndex(s => s === null);
        const junkCard = state.graveyard.pop();
        const dummyMonster = {
          instanceId: `bombed-dummy-${Date.now()}`,
          cardId: junkCard.cardId || 'CT-01',
          name: `Hình Nhân Thế Mạng (${junkCard.name})`,
          type: CARD_TYPES.LOW_MONSTER,
          basePower: 0,
          power: 0,
          isDummyTarget: true,
          cannotAttack: true,
          equippedItems: [],
          statusEffects: [{ type: 'DEBUFF', name: 'Bia Đập 0 Độ Chiến' }]
        };
        target.monsterSlots[emptySlot] = dummyMonster;
        player.usedFieldSkillInstanceIds.push(monster.instanceId);

        const msg = `⚔️ DH-08 Thạch Sanh Đại Chiến: Ném [${junkCard.name}] từ Bãi Rác vào Ô Linh Thú của ${target.name} làm bia 0 ⚔️!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushEffectEvent(state, {
          mode: 'ACTIVE',
          category: 'SKILL',
          card: monster,
          cardId: 'DH-08',
          activatorId: playerId,
          title: `Tuyệt Kỹ: ${monster.name}`,
          resultText: msg,
          icon: '⚔️'
        });
        return { skill: 'BOM_HANG_DUMMY', dummyMonster, targetPlayerId: target.id, targetSlot: emptySlot };
      }

      default:
        throw new Error(`[${monster.name}] không có kỹ năng kích hoạt chủ động trên sân!`);
    }
  }

  /**
   * Kích hoạt Kỹ năng Chủ Động của Thẻ Đại Diện lúc còn sống (NV-01, NV-06, NV-07, NV-08)
   */
  static activateCharacterSkill(state, playerId, targetParams = {}) {
    const player = state.players[playerId];
    if (!player || player.isGhost) throw new Error('Người chơi không hợp lệ hoặc đã là Anh Linh');
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }
    if (player.hasUsedAliveSkillThisTurn) {
      throw new Error('Bạn đã sử dụng kỹ năng Thẻ Đại Diện trong lượt này rồi!');
    }

    const validEnemies = Object.values(state.players).filter(
      p => p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)
    );
    const charData = ALL_96_CARDS[player.characterId] || { id: player.characterId, name: 'Đại Diện Thần Thoại' };

    switch (player.characterId) {
      case 'NV-01': { // Sơn Tinh: Soi bẫy úp của đối thủ (lật ngửa bẫy đó trên bàn đấu và trong Modal cho người chơi xem!)
        const hasEnemyTR11 = validEnemies.some(p =>
          p.monsterSlots.some(m => m && m.cardId === 'TR-11' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04'))
        );
        if (hasEnemyTR11 && state.currentPhase === PHASES.MAIN) {
          throw new Error('TR-11 Thần Độc Cước đang trấn biển, không ai được nhìn trộm Bẫy Thiên Cơ trong Giai đoạn Bày Trò!');
        }

        let targetOpp = targetParams.targetPlayerId ? state.players[targetParams.targetPlayerId] : null;
        let trapIdx = targetParams.trapSlotIndex ?? -1;
        if (!targetOpp || trapIdx === -1 || !targetOpp.trapSlots[trapIdx]) {
          // Ưu tiên tìm lá bẫy chưa được lật soi trước đó
          targetOpp = validEnemies.find(p =>
            p.trapSlots.some((t, idx) => t !== null && !(state.revealedTraps && state.revealedTraps[`${p.id}_${idx}`]))
          ) || validEnemies.find(p => p.trapSlots.some(t => t !== null));

          if (targetOpp) {
            trapIdx = targetOpp.trapSlots.findIndex((t, idx) => t !== null && !(state.revealedTraps && state.revealedTraps[`${targetOpp.id}_${idx}`]));
            if (trapIdx === -1) {
              trapIdx = targetOpp.trapSlots.findIndex(t => t !== null);
            }
          }
        }
        if (!targetOpp || trapIdx === -1 || !targetOpp.trapSlots[trapIdx]) {
          throw new Error('Không có lá Bẫy Thiên Cơ nào đang úp trên sân đối thủ để soi!');
        }
        const trap = targetOpp.trapSlots[trapIdx];
        player.hasUsedAliveSkillThisTurn = true;
        state.revealedTraps = state.revealedTraps || {};
        state.revealedTraps[`${targetOpp.id}_${trapIdx}`] = trap.cardId;
        const msg = `⛰️ NV-01 Sơn Tinh Tản Viên: ${player.name} mở nhãn thông, lật mở bẫy úp của ${targetOpp.name} là [${trap.name}]!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushRevealedCardsEvent(state, {
          viewerId: playerId,
          targetPlayerId: targetOpp.id,
          targetPlayerName: targetOpp.name,
          sourceCardId: 'NV-01',
          sourceCardName: charData.name,
          revealType: 'TRAP',
          title: `⛰️ SƠN TINH NHÃN THÔNG — LẬT NGỬA BẪY CỦA ${targetOpp.name.toUpperCase()}`,
          subtitle: `Phép Nhãn Thông đã lật ngửa lá Bẫy Thiên Cơ tại Ô Bẫy ${trapIdx + 1} của ${targetOpp.name} cho bạn xem:`,
          cards: [trap]
        });
        GameState.pushEffectEvent(state, {
          mode: 'ACTIVE',
          category: 'SKILL',
          card: charData,
          cardId: 'NV-01',
          activatorId: playerId,
          title: `Thần Lực: ${charData.name}`,
          effectText: charData.aliveAbility,
          resultText: msg,
          icon: '⛰️'
        });
        return { skill: 'PEEK_TRAP', trap, targetPlayerId: targetOpp.id, trapSlotIndex: trapIdx };
      }

      case 'NV-06': { // Lạc Long Quân: Nhận cống phẩm 1 lá bài và ký hòa ước trong lượt
        const targetDonor = (targetParams.targetPlayerId && state.players[targetParams.targetPlayerId])
          ? state.players[targetParams.targetPlayerId]
          : validEnemies.find(p => p.hand.length > 0);
        if (!targetDonor || targetDonor.hand.length === 0) {
          throw new Error('Không có người chơi nào còn bài trên tay để nhận cống phẩm!');
        }
        player.hasUsedAliveSkillThisTurn = true;
        const [giftedCard] = targetDonor.hand.splice(0, 1);
        player.hand.push(giftedCard);
        player.diplomacyPeaceTargets = player.diplomacyPeaceTargets || [];
        player.diplomacyPeaceTargets.push(targetDonor.id);

        const msg = `🐉 NV-06 Lạc Long Quân: ${targetDonor.name} dâng 1 lá bài hòa hiếu [${giftedCard.name}] cho ${player.name} (Hiệp ước Ngoại Giao không tấn công ${targetDonor.name} trong lượt này)!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushRevealedCardsEvent(state, {
          viewerId: playerId,
          targetPlayerId: targetDonor.id,
          targetPlayerName: targetDonor.name,
          sourceCardId: 'NV-06',
          sourceCardName: charData.name,
          revealType: 'CAPTURED',
          title: `🐉 LẠC LONG QUÂN — CỐNG PHẨM HÒA HIẾU TỪ ${targetDonor.name.toUpperCase()}`,
          subtitle: `${targetDonor.name} đã dâng lá bài sau về tay bạn:`,
          cards: [giftedCard],
          capturedCardIds: [giftedCard.instanceId]
        });
        GameState.pushEffectEvent(state, {
          mode: 'ACTIVE',
          category: 'SKILL',
          card: charData,
          cardId: 'NV-06',
          activatorId: playerId,
          title: `Thần Lực: ${charData.name}`,
          effectText: charData.aliveAbility,
          resultText: msg,
          icon: '🐉'
        });
        return { skill: 'DIPLOMACY', giftedCard, donorId: targetDonor.id };
      }

      case 'NV-07': { // Tổ Mẫu Âu Cơ: Hồi sinh 1 Linh Thú Cấp Thấp từ Bãi Rác thẳng lên sân (hoặc về tay nếu sân đầy)
        player.hasUsedAliveSkillThisTurn = true;
        const graveLowIdx = state.graveyard.findIndex(c => (ALL_96_CARDS[c.cardId]?.type || c.type) === CARD_TYPES.LOW_MONSTER);
        if (graveLowIdx !== -1) {
          const [revived] = state.graveyard.splice(graveLowIdx, 1);
          const emptySlot = player.monsterSlots.findIndex(s => s === null);
          let msg = '';
          if (emptySlot !== -1 && revived.cardId !== 'CT-23') {
            player.monsterSlots[emptySlot] = revived;
            player.hasSummonedMonster = true;
            msg = `🦢 NV-07 Tổ Mẫu Âu Cơ: Ấp nở Bọc Trăm Trứng, hồi sinh [${revived.name}] từ Bãi Rác thẳng lên sân!`;
            this.applyTribeResonanceIfEligible(state, playerId, revived, emptySlot);
            this.handleLowMonsterOnSummon(state, playerId, revived, emptySlot, 1);
          } else {
            player.hand.push(revived);
            msg = `🦢 NV-07 Tổ Mẫu Âu Cơ: Ấp nở Bọc Trăm Trứng, hồi sinh [${revived.name}] từ Bãi Rác về tay!`;
          }
          state.actionLog.push({
            turn: state.turnNumber,
            message: msg
          });
          GameState.pushEffectEvent(state, {
            mode: 'ACTIVE',
            category: 'SKILL',
            card: charData,
            cardId: 'NV-07',
            activatorId: playerId,
            title: `Thần Lực: ${charData.name}`,
            effectText: charData.aliveAbility,
            resultText: msg,
            icon: '🦢'
          });
          return { skill: 'AU_CO_REVIVE', revived };
        }
        const drawn = TurnManager.drawCard(state, playerId);
        const msg = `🦢 NV-07 Tổ Mẫu Âu Cơ: Ban phước bốc thêm 1 lá bài mới${drawn ? ` [${drawn.name}]` : ''}!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushEffectEvent(state, {
          mode: 'ACTIVE',
          category: 'SKILL',
          card: charData,
          cardId: 'NV-07',
          activatorId: playerId,
          title: `Thần Lực: ${charData.name}`,
          effectText: charData.aliveAbility,
          resultText: msg,
          icon: '🦢'
        });
        return { skill: 'AU_CO_DRAW', drawn };
      }

      case 'NV-08': { // Cóc Tía Kiện Trời: Nhận thêm +1 lượt Triệu Hồi Thường và bốc 1 lá bài
        player.hasUsedAliveSkillThisTurn = true;
        state.bonusSummonsAvailable = (state.bonusSummonsAvailable || 0) + 1;
        state.normalSummonUsed = false;
        const drawn = TurnManager.drawCard(state, playerId);
        const msg = `🐸 NV-08 Cóc Tía Kiện Trời: Gọi mưa gọi gió! Bốc 1 lá bài${drawn ? ` [${drawn.name}]` : ''} và nhận thêm +1 lượt Triệu Hồi Thường trong lượt này!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushEffectEvent(state, {
          mode: 'ACTIVE',
          category: 'SKILL',
          card: charData,
          cardId: 'NV-08',
          activatorId: playerId,
          title: `Thần Lực: ${charData.name}`,
          effectText: charData.aliveAbility,
          resultText: msg,
          icon: '🐸'
        });
        return { skill: 'COC_KIEN_TROI', drawn };
      }

      default:
        throw new Error('Thẻ Đại Diện của bạn là kỹ năng Nội Tại Tự Động (không cần bấm kích hoạt thủ công)!');
    }
  }

  /**
   * Sử dụng Phép Sự Tích Dân Gian (Drama)
   */
  static useDrama(state, playerId, dramaCardInstanceId, targetParams = {}) {
    const player = state.players[playerId];
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }

    const handIndex = player.hand.findIndex(c => c.instanceId === dramaCardInstanceId);
    if (handIndex === -1) {
      throw new Error('Không tìm thấy Bài Drama trên tay');
    }

    const dramaCard = player.hand[handIndex];
    const dramaData = ALL_96_CARDS[dramaCard.cardId];
    if (dramaData.type !== CARD_TYPES.DRAMA) {
      throw new Error('Lá bài không phải là Bài Drama');
    }

    // CT-05: Chừng nào còn trên sân, không ai được dùng Phép Hồi Nhân Phẩm (DR-08, DR-14)
    const isHealingDrama = ['DR-08', 'DR-14'].includes(dramaCard.cardId);
    if (isHealingDrama) {
      const ct05Owner = Object.values(state.players).find(p =>
        !p.isGhost &&
        p.monsterSlots.some(m => m && m.cardId === 'CT-05' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04'))
      );
      if (ct05Owner) {
        const ct05Card = ct05Owner.monsterSlots.find(m => m && m.cardId === 'CT-05');
        const blockMsg = '🦗 CT-05 Bé Tập Đánh Đàn / Ve Sầu Gọi Hè đang ngân vang: Không ai được dùng Bài Drama Hồi Nhân Phẩm!';
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: ct05Card,
          cardId: 'CT-05',
          activatorId: ct05Owner.id,
          title: `Nội Tại Linh Thú: ${ct05Card?.name || 'Ve Sầu Gọi Hè'}`,
          resultText: blockMsg,
          icon: '🦗'
        });
        throw new Error(blockMsg);
      }
    }

    player.hand.splice(handIndex, 1);
    state.dramaCardsUsedThisTurn += 1;

    const logBefore = state.actionLog.length;
    state.actionLog.push({
      turn: state.turnNumber,
      message: `🎭 SỰ TÍCH KHỞI PHÁT! ${player.name} tung ra: [${dramaCard.name}]!`
    });

    const nq05Opponent = Object.values(state.players).find(p =>
      p.id !== playerId &&
      !p.isGhost &&
      (!state.isTeamMode || p.teamId !== player.teamId) &&
      p.trapSlots.some(t => t && t.cardId === 'NQ-05' && t.setTurnNumber < state.turnNumber)
    );

    if (nq05Opponent) {
      const tIdx = nq05Opponent.trapSlots.findIndex(t => t && t.cardId === 'NQ-05' && t.setTurnNumber < state.turnNumber);
      const trap = nq05Opponent.trapSlots[tIdx];
      nq05Opponent.trapSlots[tIdx] = null;
      state.graveyard.push(trap);
      state.graveyard.push(dramaCard);

      const negateMsg = `📖 BẪY LẬT [${trap.name}]! ${nq05Opponent.name} đã ghi sổ Thiên Đình, vô hiệu hóa hoàn toàn lá [${dramaCard.name}] của ${player.name}!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: negateMsg
      });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'TRAP',
        card: trap,
        cardId: 'NQ-05',
        activatorId: nq05Opponent.id,
        title: `Bẫy Thiên Cơ: ${trap.name}`,
        resultText: negateMsg,
        icon: '📖'
      });
      return dramaCard;
    }

    this.executeDramaEffect(state, playerId, dramaCard.cardId, targetParams);
    state.graveyard.push(dramaCard);

    const effectLogs = state.actionLog.slice(logBefore + 1).map(l => l.message);
    GameState.pushEffectEvent(state, {
      mode: 'ACTIVE',
      category: 'DRAMA',
      card: dramaCard,
      cardId: dramaCard.cardId,
      activatorId: playerId,
      title: `Phép Sự Tích: ${dramaCard.name}`,
      effectText: dramaData.description,
      resultText: effectLogs.join(' • ') || `Phép [${dramaCard.name}] đã phát huy hiệu lực!`,
      icon: '🎭'
    });

    if (player.characterId === 'NV-02' && !player.isGhost && !player.hasUsedAliveSkillThisTurn) {
      player.hasUsedAliveSkillThisTurn = true;
      const drawn = TurnManager.drawCard(state, playerId);
      let discardedName = '';
      if (player.hand.length > 0) {
        const disc = player.hand.pop();
        state.graveyard.push(disc);
        discardedName = disc.name;
      }
      const nv02Msg = `🌊 NV-02 Thủy Tinh kích hoạt nội tại: Sóng cuộn bốc thêm 1 lá bài${drawn ? ` [${drawn.name}]` : ''} và bỏ 1 lá${discardedName ? ` [${discardedName}]` : ''}!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: nv02Msg
      });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: ALL_96_CARDS['NV-02'],
        cardId: 'NV-02',
        activatorId: playerId,
        title: 'Nội Tại Đại Diện: Thủy Tinh',
        effectText: ALL_96_CARDS['NV-02'].aliveAbility,
        resultText: nv02Msg,
        icon: '🌊'
      });
    }

    return dramaCard;
  }

  /**
   * Tuyên bố tấn công trong Giai đoạn Hỗn Chiến (BATTLE Phase)
   */
  static declareAttack(state, attackerId, attackerSlotIndex, targetId, targetSlotIndex = null, options = {}) {
    const attackerPlayer = state.players[attackerId];
    if (state.turnOrder[state.currentTurnIndex] !== attackerId) {
      throw new Error('Chưa đến lượt của bạn');
    }
    if (state.currentPhase !== PHASES.BATTLE) {
      state.currentPhase = PHASES.BATTLE;
    }

    const targetPlayer = state.players[targetId];
    if (state.isTeamMode && attackerPlayer.teamId && targetPlayer && attackerPlayer.teamId === targetPlayer.teamId) {
      throw new Error('Không thể tấn công đồng đội cùng phe!');
    }

    if ((state.turnNumber === 1 || state.openingRoundActive) && !options.allowFirstTurnAttack && !state.allowFirstTurnAttack) {
      throw new Error('Hiệp Ước Hòa Bình Lượt 1: Không thể tấn công trong Lượt 1 của trận đấu để bảo đảm công bằng!');
    }

    if (attackerPlayer.diplomacyPeaceTargets && attackerPlayer.diplomacyPeaceTargets.includes(targetId)) {
      throw new Error('Hiệp ước Ngoại Giao (NV-06): Bạn đã nhận bài từ người chơi này nên không được phép tấn công họ trong lượt này!');
    }

    const monster = attackerPlayer.monsterSlots[attackerSlotIndex];
    if (!monster) {
      throw new Error('Không có Chiến Thần tại ô tấn công');
    }

    const hasDC04 = (monster.equippedItems || []).some(it => it.cardId === 'DC-04');

    if (monster.cardId === 'CT-10' && !hasDC04) {
      throw new Error('CT-10 Rùa Đá Đội Bia chỉ có thể trấn giữ đỡ đòn, không thể chủ động tấn công!');
    }

    if (monster.cannotAttack && !(monster.cardId === 'CT-15' && !hasDC04)) {
      throw new Error(`[${monster.name}] đang bị khóa hành động (Sa lầy / Đóng băng), không thể tấn công trong lượt này!`);
    }

    if (monster.cannotAttack && monster.cardId === 'CT-15' && !hasDC04) {
      const ct15Msg = `🐟 CT-15 Cá Chép Vượt Vũ Môn: Vượt mọi thác ghềnh, phá giải trạng thái khóa đòn để lao lên tấn công!`;
      state.actionLog.push({ turn: state.turnNumber, message: ct15Msg });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: monster,
        cardId: 'CT-15',
        activatorId: attackerId,
        title: `Nội Tại Linh Thú: ${monster.name}`,
        resultText: ct15Msg,
        icon: '🐟'
      });
    }

    if (monster.bombedByPlayerId && monster.bombedByPlayerId === targetId) {
      throw new Error(`[${monster.name}] là nội gián (DR-02), không được phép tấn công người đã phái nó đi!`);
    }

    const dc10Item = (monster.equippedItems || []).find(it => it.cardId === 'DC-10');
    if (dc10Item && dc10Item.equippedByPlayerId === targetId) {
      const otherValidOpponents = Object.values(state.players).filter(
        p => p.id !== attackerId && p.id !== targetId && !p.isGhost && (!state.isTeamMode || p.teamId !== attackerPlayer.teamId)
      );
      if (otherValidOpponents.length > 0) {
        throw new Error('Vòng Kim Cô (DC-10): Linh Thú này không thể tấn công người đã niệm chú, phải tấn công người chơi khác!');
      }
    }

    const attacksDeclared = state.attacksDeclaredThisTurn.filter(id => id === monster.instanceId).length;
    const maxAttacks = (['TR-04', 'DH-11'].includes(monster.cardId) && !hasDC04) ? 2 : 1;
    if (attacksDeclared >= maxAttacks) {
      throw new Error('Chiến Thần này đã hết số lần tấn công trong lượt');
    }

    if (attacksDeclared === 1 && ['TR-04', 'DH-11'].includes(monster.cardId) && !hasDC04) {
      const multiAtkMsg = `🐅 ${monster.cardId} [${monster.name}]: Phát động Liên Hoàn Công Kích lần thứ 2 trong cùng lượt!`;
      state.actionLog.push({ turn: state.turnNumber, message: multiAtkMsg });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: monster,
        cardId: monster.cardId,
        activatorId: attackerId,
        title: `Nội Tại Liên Kích: ${monster.name}`,
        resultText: multiAtkMsg,
        icon: '🐅'
      });
    }

    let appliedCT02BarkBuff = false;
    if ((options.barkSuccess !== false) && monster.cardId === 'CT-02' && !hasDC04) {
      monster.statusEffects = monster.statusEffects || [];
      monster.statusEffects.push({ type: 'BUFF', name: 'CT02_BARK_BUFF', powerDelta: 2 });
      appliedCT02BarkBuff = true;
      const barkMsg = '🐕 CT-02 Khuyển Thần Đá Đầu Làng: Phát uy tiếng sủa trấn yểm, tăng +2 Độ Chiến trong pha giao tranh này!';
      state.actionLog.push({
        turn: state.turnNumber,
        message: barkMsg
      });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: monster,
        cardId: 'CT-02',
        activatorId: attackerId,
        title: `Hiệu Ứng Tấn Công: ${monster.name}`,
        resultText: barkMsg,
        icon: '🐕'
      });
    }

    let bypassMonsters = false;
    if (monster.cardId === 'CT-03' && !hasDC04) {
      const rng = new RandomUtils(state.seed + state.turnNumber);
      if (rng.flipCoin()) {
        bypassMonsters = true;
        const ct03Msg = '🐴 CT-03 Ngựa Sắt Phù Đổng Nhỏ: Tung đồng xu âm dương thắng cuộc, phi nước đại đánh thẳng vào Điểm Nhân Phẩm đối thủ!';
        state.actionLog.push({
          turn: state.turnNumber,
          message: ct03Msg
        });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: monster,
          cardId: 'CT-03',
          activatorId: attackerId,
          title: `Hiệu Ứng Tấn Công: ${monster.name}`,
          resultText: ct03Msg,
          icon: '🐴'
        });
      } else {
        const ct03FailMsg = '🐴 CT-03 Ngựa Sắt Phù Đổng Nhỏ: Tung đồng xu âm dương mặt sấp, giao chiến trực diện với Linh Thú chắn đường!';
        state.actionLog.push({
          turn: state.turnNumber,
          message: ct03FailMsg
        });
      }
    }

    if (monster.cardId === 'DH-04' && !hasDC04) {
      bypassMonsters = true;
      const dh04Msg = '🐎 DH-04 Thần Mã Phi Thiên Cưỡi Mây: Tung vó vượt chín tầng mây, đánh thẳng vào Điểm Nhân Phẩm đối thủ!';
      state.actionLog.push({ turn: state.turnNumber, message: dh04Msg });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: monster,
        cardId: 'DH-04',
        activatorId: attackerId,
        title: `Nội Tại Dung Hợp: ${monster.name}`,
        resultText: dh04Msg,
        icon: '🐎'
      });
    }

    const battleResult = BattleResolver.resolveBattle(
      state,
      attackerId,
      attackerSlotIndex,
      targetId,
      targetSlotIndex,
      {
        bypassMonsters: bypassMonsters || options.bypassMonsters,
        singSuccess: options.singSuccess
      }
    );

    if (appliedCT02BarkBuff && !options.barkSuccess && monster.statusEffects) {
      const buffIdx = monster.statusEffects.findIndex(e => e.name === 'CT02_BARK_BUFF');
      if (buffIdx !== -1) {
        monster.statusEffects.splice(buffIdx, 1);
      }
    }

    state.attacksDeclaredThisTurn.push(monster.instanceId);
    monster.attackedTargetsThisTurn = monster.attackedTargetsThisTurn || [];
    monster.attackedTargetsThisTurn.push(targetId);

    if (monster.cardId === 'DH-02' && !hasDC04 && attackerPlayer.monsterSlots[attackerSlotIndex] === monster) {
      const secondOpponent = Object.values(state.players).find(
        p => p.id !== attackerId && p.id !== targetId && !p.isGhost && (!state.isTeamMode || p.teamId !== attackerPlayer.teamId)
      );
      if (secondOpponent) {
        const splashRes = BattleResolver.resolveBattle(
          state,
          attackerId,
          attackerSlotIndex,
          secondOpponent.id,
          null,
          { bypassMonsters: false }
        );
        const splashMsg = `🐕‍🦺 DH-02 Thần Chó 3 Đầu Núi Tản càn quét đánh lan sang cả ${secondOpponent.name}!`;
        battleResult.logs.push(splashMsg);
        battleResult.logs.push(...splashRes.logs);
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: monster,
          cardId: 'DH-02',
          activatorId: attackerId,
          title: `Tuyệt Kỹ Đánh Lan: ${monster.name}`,
          resultText: `${splashMsg} ${splashRes.logs.join(' • ')}`,
          icon: '🐕‍🦺'
        });
      }
    }

    if (targetPlayer.hp === 0 && !targetPlayer.isGhost) {
      GhostSystem.transformToGhost(state, targetId, attackerId);
    }

    return battleResult;
  }

  /**
   * Kết thúc lượt chơi
   */
  static endTurn(state, playerId, discardedInstanceIds = []) {
    return TurnManager.endTurn(state, playerId, discardedInstanceIds);
  }

  // ==========================================
  // XỬ LÝ CHI TIẾT CÁC HIỆU ỨNG THẺ BÀI THẦN THOẠI
  // ==========================================

  static handleLowMonsterOnSummon(state, playerId, card, slotIndex, depth = 0) {
    if (depth > 3) return;
    const player = state.players[playerId];

    switch (card.cardId) {
      case 'CT-01': { // Chim Lạc Báo Tin: Bắt người chơi ngồi bên trái LẬT NGỬA toàn bộ bài trên tay cho người sử dụng xem!
        const myIdx = state.turnOrder.indexOf(playerId);
        const leftIdx = (myIdx + 1) % state.turnOrder.length;
        const leftPid = state.turnOrder[leftIdx];
        state.revealedHands = state.revealedHands || {};
        state.revealedHands[leftPid] = Date.now() + 30000;
        const leftPlayer = state.players[leftPid];
        const handPreview = leftPlayer?.hand?.length
          ? leftPlayer.hand.map(c => `[${c.name}]`).join(', ')
          : 'trống';
        const msg = `🦅 CT-01 Chim Lạc Báo Tin: Lật ngửa toàn bộ ${leftPlayer?.hand?.length || 0} lá bài trên tay của ${leftPlayer?.name || 'đối thủ'} (${handPreview})!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        if (leftPlayer) {
          GameState.pushRevealedCardsEvent(state, {
            viewerId: playerId,
            targetPlayerId: leftPid,
            targetPlayerName: leftPlayer.name,
            sourceCardId: 'CT-01',
            sourceCardName: card.name,
            revealType: 'HAND',
            title: `🦅 CHIM LẠC BÁO TIN — LẬT NGỬA BÀI CỦA ${leftPlayer.name.toUpperCase()}`,
            subtitle: `Toàn bộ ${leftPlayer.hand.length} lá bài trên tay của ${leftPlayer.name} đã bị lật ngửa cho bạn xem:`,
            cards: [...leftPlayer.hand]
          });
        }
        break;
      }

      case 'CT-07': { // Cò Trắng Đầu Đình: Bốc ngay 1 lá
        const drawn = TurnManager.drawCard(state, playerId);
        state.actionLog.push({
          turn: state.turnNumber,
          message: `🦩 CT-07 Cò Trắng Đầu Đình: Cắp lộc về làng, giúp ${player.name} bốc thêm 1 lá bài${drawn ? ` [${drawn.name}]` : ''}!`
        });
        break;
      }

      case 'CT-08': { // Khỉ Vàng Núi Đá: Chuyển 1 Đạo Cụ đối thủ sang gắn cho mình (ưu tiên Đạo Cụ tăng chỉ số trước)
        let stoleEquip = false;
        const candidates = [];
        for (const p of Object.values(state.players)) {
          if (p.id !== playerId && (!state.isTeamMode || p.teamId !== player.teamId)) {
            for (const m of p.monsterSlots) {
              if (m && m.equippedItems && m.equippedItems.length > 0) {
                m.equippedItems.forEach((eq, eqIdx) => {
                  const eqData = ALL_96_CARDS[eq.cardId] || eq;
                  const isPositive = eqData.target !== 'ENEMY';
                  candidates.push({ monster: m, eqIdx, eq, isPositive, ownerName: p.name });
                });
              }
            }
          }
        }
        if (candidates.length > 0) {
          candidates.sort((a, b) => (b.isPositive ? 1 : 0) - (a.isPositive ? 1 : 0));
          const chosen = candidates[0];
          const [stolen] = chosen.monster.equippedItems.splice(chosen.eqIdx, 1);
          card.equippedItems = card.equippedItems || [];
          card.equippedItems.push(stolen);
          stoleEquip = true;
          state.actionLog.push({
            turn: state.turnNumber,
            message: `🐒 CT-08 Khỉ Vàng Núi Đá cuỗm Pháp Bảo [${stolen.name}] từ sân ${chosen.ownerName} sang gắn cho mình!`
          });
        }

        break;
      }

      case 'CT-16': { // Bồ Nông Ngậm Túi Thần: Lục Bãi Rác lấy lại 1 Đạo Cụ
        const equipIndex = state.graveyard.findIndex(c => ALL_96_CARDS[c.cardId]?.type === CARD_TYPES.EQUIPMENT);
        if (equipIndex !== -1) {
          const [retrieved] = state.graveyard.splice(equipIndex, 1);
          player.hand.push(retrieved);
          state.actionLog.push({
            turn: state.turnNumber,
            message: `🦤 CT-16 Bồ Nông vớt được Pháp Bảo [${retrieved.name}] từ Bãi Rác lên tay!`
          });
        }
        break;
      }

      case 'CT-17': { // Tê Giác Một Sừng: Hủy ngay 1 lá Bẫy Thiên Cơ đang úp của đối thủ và lật ngửa cho xem
        let destroyedAnyTrap = false;
        for (const p of Object.values(state.players)) {
          if (p.id !== playerId && (!state.isTeamMode || p.teamId !== player.teamId)) {
            const trapIdx = p.trapSlots.findIndex(t => t !== null);
            if (trapIdx !== -1) {
              const destroyedTrap = p.trapSlots[trapIdx];
              p.trapSlots[trapIdx] = null;
              state.graveyard.push(destroyedTrap);
              destroyedAnyTrap = true;
              state.actionLog.push({
                turn: state.turnNumber,
                message: `🦏 CT-17 Tê Giác Một Sừng: Húc tung và phá hủy bẫy [${destroyedTrap.name}] của ${p.name}!`
              });
              GameState.pushRevealedCardsEvent(state, {
                viewerId: playerId,
                targetPlayerId: p.id,
                targetPlayerName: p.name,
                sourceCardId: 'CT-17',
                sourceCardName: card.name,
                revealType: 'TRAP',
                title: `🦏 TÊ GIÁC MỘT SỪNG — LẬT MỞ BẪY ĐỐI THỦ BỊ PHÁ HỦY`,
                subtitle: `Tê Giác Một Sừng đã húc tung và phá hủy lá Bẫy Thiên Cơ sau của ${p.name}:`,
                cards: [destroyedTrap]
              });
              break;
            }
          }
        }

        break;
      }

      case 'CT-20': { // Gà Trống Chín Cựa: Giải trừ mọi hiệu ứng Đóng Băng trên bàn
        for (const p of Object.values(state.players)) {
          for (const m of p.monsterSlots) {
            if (m) {
              m.cannotAttack = false;
              if (m.statusEffects) {
                m.statusEffects = m.statusEffects.filter(eff => eff.type !== 'FREEZE');
              }
            }
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🐓 CT-20 Gà Trống Chín Cựa: Gáy vang gọi mặt trời, xóa sạch mọi hiệu ứng Đóng Băng!'
        });
        break;
      }

      case 'CT-25': { // Đàn Chim Lạc Hồng: Tự động gọi thêm 1 Linh Thú Cấp Thấp từ trên tay lên ô trống
        const emptySlot = player.monsterSlots.findIndex(s => s === null);
        if (emptySlot !== -1) {
          const companionIdx = player.hand.findIndex(c => {
            const d = ALL_96_CARDS[c.cardId] || c;
            return (c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23';
          });
          if (companionIdx !== -1) {
            const [companion] = player.hand.splice(companionIdx, 1);
            companion.summonedTurnNumber = state.turnNumber;
            player.monsterSlots[emptySlot] = companion;
            state.actionLog.push({
              turn: state.turnNumber,
              message: `🕊️ CT-25 Đàn Chim Lạc Hồng: Gọi bầy liên hoàn, triệu hồi miễn phí [${companion.name}] từ tay lên sân!`
            });
            this.applyTribeResonanceIfEligible(state, playerId, companion, emptySlot);
            this.handleLowMonsterOnSummon(state, playerId, companion, emptySlot, depth + 1);
            break;
          }
        }

        break;
      }

      case 'CT-26': { // Nghê Đá Chầu Đền Thiêng: Cộng +1 Độ Chiến cho toàn bộ Linh Thú phe bạn trên sân
        for (const m of player.monsterSlots) {
          if (m && !m.isGhostSlotMarker) {
            m.statusEffects = m.statusEffects || [];
            m.statusEffects.push({ type: 'BUFF', name: 'Hộ Pháp Nghê Đá', powerDelta: 1 });
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🦁 CT-26 Nghê Đá Chầu Đền: Hộ Pháp ban phước +1 Độ Chiến cho toàn bộ Linh Thú phe bạn!'
        });
        break;
      }

      case 'CT-27': { // Sao La Sừng Kiếm: Bốc 1 lá bài khi ra sân
        const drawn = TurnManager.drawCard(state, playerId);
        state.actionLog.push({
          turn: state.turnNumber,
          message: `🦌 CT-27 Sao La Trường Sơn: Linh khí đại ngàn giúp bạn bốc thêm 1 lá bài${drawn ? ` [${drawn.name}]` : ''}!`
        });
        break;
      }

      case 'CT-28': { // Cá Ông Nam Hải: Hồi +1 HP và bốc 1 lá bài
        BattleResolver.applyHealing(state, player, 1);
        const drawn = TurnManager.drawCard(state, playerId);
        state.actionLog.push({
          turn: state.turnNumber,
          message: `🐋 CT-28 Cá Ông Nam Hải: Cứu độ vượt sóng, hồi +1 Điểm Nhân Phẩm và bốc 1 lá bài${drawn ? ` [${drawn.name}]` : ''}!`
        });
        break;
      }

      case 'CT-29': { // Trăn Gấm Rừng U Minh: Khóa 1 Linh Thú đối thủ không thể tấn công
        let frozeEnemy = false;
        for (const p of Object.values(state.players)) {
          if (p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)) {
            const enemyM = p.monsterSlots.find(m => m && !m.isGhostSlotMarker);
            if (enemyM) {
              enemyM.cannotAttack = true;
              enemyM.statusEffects = enemyM.statusEffects || [];
              enemyM.statusEffects.push({ type: 'FREEZE', name: 'Trăn Gấm Siết Chặt', duration: 1 });
              frozeEnemy = true;
              state.actionLog.push({
                turn: state.turnNumber,
                message: `🐍 CT-29 Trăn Gấm U Minh: Cuộn mình khóa chặt [${enemyM.name}] của ${p.name}, không thể tấn công lượt tới!`
              });
              break;
            }
          }
        }

        break;
      }

      case 'CT-30': { // Gà Đông Tảo Tiến Vua: +1 Độ Chiến ngay khi xung trận
        card.statusEffects = card.statusEffects || [];
        card.statusEffects.push({ type: 'BUFF', name: 'Cựa Sắt Tiến Vua', powerDelta: 1 });
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🐔 CT-30 Gà Đông Tảo Tiến Vua: Cựa sắt oai phong tăng thêm +1 Độ Chiến ngay khi xuất trận!'
        });
        break;
      }

      case 'CT-31': { // Rái Cá Sông Mê Kông: Hồi sinh 1 Linh Thú Cấp Thấp từ Bãi Rác lên thẳng ô trống trên sân
        const graveLowIdx = state.graveyard.findIndex(c => {
          const d = ALL_96_CARDS[c.cardId] || c;
          return (c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23';
        });
        if (graveLowIdx !== -1) {
          const [revived] = state.graveyard.splice(graveLowIdx, 1);
          const emptySlot = player.monsterSlots.findIndex(s => s === null);
          if (emptySlot !== -1) {
            revived.summonedTurnNumber = state.turnNumber;
            player.monsterSlots[emptySlot] = revived;
            state.actionLog.push({
              turn: state.turnNumber,
              message: `🦦 CT-31 Rái Cá Mê Kông: Cứu [${revived.name}] từ Bãi Rác gọi thẳng lên sân!`
            });
            this.applyTribeResonanceIfEligible(state, playerId, revived, emptySlot);
            this.handleLowMonsterOnSummon(state, playerId, revived, emptySlot, depth + 1);
          } else {
            player.hand.push(revived);
            state.actionLog.push({
              turn: state.turnNumber,
              message: `🦦 CT-31 Rái Cá Mê Kông: Vớt [${revived.name}] từ Bãi Rác đưa lên tay!`
            });
          }
        }
        break;
      }

      case 'CT-32': { // Hươu Sao Rừng Cúc Phương: Cho phép thêm +1 lượt Triệu Hồi Thường ngay trong lượt này
        state.bonusSummonsAvailable = (state.bonusSummonsAvailable || 0) + 1;
        state.normalSummonUsed = false;
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🦌 CT-32 Hươu Sao Cúc Phương: Dẫn lối rừng vàng, ban thêm +1 lượt Triệu Hồi Thường ngay trong lượt này!'
        });
        break;
      }
    }
  }

  static handleBossOnSummon(state, playerId, bossCard, slotIndex) {
    const player = state.players[playerId];

    switch (bossCard.cardId) {
      case 'TR-03':
        for (const p of Object.values(state.players)) {
          if (p.id !== playerId) {
            for (const m of p.monsterSlots) {
              if (m && m.equippedItems && m.equippedItems.length > 0) {
                state.graveyard.push(...m.equippedItems);
                m.equippedItems = [];
              }
            }
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🌳 TR-03 Mộc Tinh Ngàn Năm: Rễ cây quét sạch mọi Pháp Bảo Đạo Cụ của đối thủ vào Bãi Rác!'
        });
        break;

      case 'TR-05': {
        BattleResolver.applyHealing(state, player, 2);
        const trapIndex = state.graveyard.findIndex(c => ALL_96_CARDS[c.cardId]?.type === CARD_TYPES.TRAP);
        const emptyTrapSlot = player.trapSlots.findIndex(s => s === null);
        if (trapIndex !== -1 && emptyTrapSlot !== -1) {
          const [trapCard] = state.graveyard.splice(trapIndex, 1);
          player.trapSlots[emptyTrapSlot] = {
            ...trapCard,
            faceUp: false,
            setTurnNumber: state.turnNumber
          };
          state.actionLog.push({
            turn: state.turnNumber,
            message: `🐢 TR-05 Thần Kim Quy: Hồi +2 Điểm Nhân Phẩm và rước bẫy [${trapCard.name}] từ Bãi Rác úp xuống sân!`
          });
        } else {
          state.actionLog.push({
            turn: state.turnNumber,
            message: '🐢 TR-05 Thần Kim Quy: Hiện thần Hồ Gươm hồi ngay +2 Điểm Nhân Phẩm cho bạn!'
          });
        }
        break;
      }

      case 'TR-13': {
        BattleResolver.applyHealing(state, player, 2);
        const eqIdx = state.graveyard.findIndex(c => ALL_96_CARDS[c.cardId]?.type === CARD_TYPES.EQUIPMENT && ALL_96_CARDS[c.cardId]?.target !== 'ENEMY');
        if (eqIdx !== -1) {
          const [eq] = state.graveyard.splice(eqIdx, 1);
          bossCard.equippedItems = bossCard.equippedItems || [];
          if (bossCard.equippedItems.length < 2) {
            bossCard.equippedItems.push(eq);
          }
          state.actionLog.push({
            turn: state.turnNumber,
            message: `🐲 TR-13 Long Vương Đông Hải: Hồi +2 Điểm Nhân Phẩm và tự động trang bị Pháp Bảo [${eq.name}] từ Bãi Rác!`
          });
        } else {
          state.actionLog.push({
            turn: state.turnNumber,
            message: '🐲 TR-13 Long Vương Đông Hải: Hồi +2 Điểm Nhân Phẩm và triệu tập uy linh biển khơi!'
          });
        }
        break;
      }

      case 'TR-14': {
        bossCard.statusEffects = bossCard.statusEffects || [];
        bossCard.statusEffects.push({ type: 'BUFF', name: 'Thần Lực Dời Non', powerDelta: 1 });
        state.actionLog.push({
          turn: state.turnNumber,
          message: '⛰️ TR-14 Ông Đổng Khổng Lồ: Giáng thế dời non lấp bể, tăng thêm +1 Độ Chiến!'
        });
        break;
      }

      case 'TR-15': {
        TurnManager.drawCard(state, playerId);
        TurnManager.drawCard(state, playerId);
        const emptySlot = player.monsterSlots.findIndex(s => s === null);
        if (emptySlot !== -1) {
          const lowIdx = player.hand.findIndex(c => {
            const d = ALL_96_CARDS[c.cardId] || c;
            return (c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23';
          });
          if (lowIdx !== -1) {
            const [summoned] = player.hand.splice(lowIdx, 1);
            summoned.summonedTurnNumber = state.turnNumber;
            player.monsterSlots[emptySlot] = summoned;
            state.actionLog.push({
              turn: state.turnNumber,
              message: `🦅 TR-15 Đại Bàng Chín Mỏ: Ăn khế trả vàng, bốc 2 lá và chở thêm [${summoned.name}] hạ cánh xuống sân!`
            });
            this.applyTribeResonanceIfEligible(state, playerId, summoned, emptySlot);
            this.handleLowMonsterOnSummon(state, playerId, summoned, emptySlot, 1);
            break;
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🦅 TR-15 Đại Bàng Chín Mỏ: Ăn khế trả vàng, giúp bạn bốc ngay 2 lá bài!'
        });
        break;
      }

      case 'TR-16': {
        BattleResolver.applyHealing(state, player, 1);
        for (const m of player.monsterSlots) {
          if (m && !m.isGhostSlotMarker) {
            m.statusEffects = m.statusEffects || [];
            m.statusEffects.push({ type: 'BUFF', name: 'Lửa Thiêng Phượng Hoàng', powerDelta: 2 });
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🐦‍🔥 TR-16 Phượng Hoàng Lửa: Hồi +1 Điểm Nhân Phẩm và ban lửa thiêng +2 Độ Chiến cho toàn đội hình!'
        });
        break;
      }
    }
  }

  static handleFusionOnSummon(state, playerId, fusionMonster) {
    const player = state.players[playerId];

    switch (fusionMonster.cardId) {
      case 'DH-01': { // Thiên Nhãn Thuận Phong Nhĩ: Soi toàn bộ bài trên tay đối thủ (lật ngửa cho xem) và thu phục 1 lá mạnh nhất!
        let victim = null;
        for (const p of Object.values(state.players)) {
          if (p.id !== playerId && (!state.isTeamMode || p.teamId !== player.teamId)) {
            if (p.hand && p.hand.length > 0) {
              if (!victim || p.hand.length > victim.hand.length) {
                victim = p;
              }
            }
          }
        }
        if (victim && victim.hand.length > 0) {
          const allHandSnapshot = [...victim.hand];
          state.revealedHands = state.revealedHands || {};
          state.revealedHands[victim.id] = Date.now() + 30000;

          let bestIdx = 0;
          let bestVal = -1;
          victim.hand.forEach((c, idx) => {
            const def = ALL_96_CARDS[c.cardId] || c;
            const val = (def.power || 0) + (def.type === CARD_TYPES.DRAMA ? 5 : 0) + (def.type === CARD_TYPES.FUSION_MONSTER ? 6 : 0);
            if (val > bestVal) {
              bestVal = val;
              bestIdx = idx;
            }
          });
          const [stolen] = victim.hand.splice(bestIdx, 1);
          player.hand.push(stolen);
          state.actionLog.push({
            turn: state.turnNumber,
            message: `👁️ DH-01 Thiên Nhãn Thuận Phong Nhĩ: Soi thấu toàn bộ bài trên tay ${victim.name} và thu phục lá mạnh nhất [${stolen.name}] về tay!`
          });
          GameState.pushRevealedCardsEvent(state, {
            viewerId: playerId,
            targetPlayerId: victim.id,
            targetPlayerName: victim.name,
            sourceCardId: 'DH-01',
            sourceCardName: fusionMonster.name,
            revealType: 'HAND',
            title: `👁️ THIÊN NHÃN THUẬN PHONG NHĨ — LẬT MỞ BÀI CỦA ${victim.name.toUpperCase()}`,
            subtitle: `Đã soi toàn bộ bài của ${victim.name} và thu phục lá mạnh nhất [${stolen.name}] về tay bạn:`,
            cards: allHandSnapshot,
            capturedCardIds: [stolen.instanceId]
          });
        }
        break;
      }

      case 'DH-06': {
        const emptySlot = player.monsterSlots.findIndex(s => s === null);
        if (emptySlot !== -1) {
          for (const p of Object.values(state.players)) {
            if (p.id !== playerId && (!state.isTeamMode || p.teamId !== player.teamId)) {
              const enemyLowIdx = p.monsterSlots.findIndex(m => m && ALL_96_CARDS[m.cardId]?.type === CARD_TYPES.LOW_MONSTER);
              if (enemyLowIdx !== -1) {
                const [stolen] = p.monsterSlots.splice(enemyLowIdx, 1, null);
                stolen.wasStolenTurn = state.turnNumber;
                stolen.stolenFromPlayerId = p.id;
                state.lastStolenFromPlayerId = p.id;
                player.monsterSlots[emptySlot] = stolen;
                state.actionLog.push({
                  turn: state.turnNumber,
                  message: `👑 DH-06 Chúa Tể Sơn Lâm: Thu phục Linh Thú [${stolen.name}] của ${p.name} sang sân bạn!`
                });
                return;
              }
            }
          }
        }
        break;
      }

      case 'DH-07': {
        BattleResolver.applyHealing(state, player, 3);
        const victimId = fusionMonster.stolenMaterialVictimId || state.lastStolenFromPlayerId;
        const victim = victimId ? state.players[victimId] : null;
        if (victim && victim.id !== playerId && !victim.isGhost) {
          BattleResolver.applyDamage(state, victim, 2, playerId);
          state.actionLog.push({
            turn: state.turnNumber,
            message: `🐉 DH-07 Thần Rồng Cháu Tiên: Hồi +3 Điểm Nhân Phẩm cho ${player.name} và trừ 2 Điểm Nhân Phẩm của ${victim.name}!`
          });
        } else {
          state.actionLog.push({
            turn: state.turnNumber,
            message: '🐉 DH-07 Thần Rồng Cháu Tiên: Hồi +3 Điểm Nhân Phẩm cho bạn!'
          });
        }
        break;
      }

      case 'DH-09': {
        BattleResolver.applyHealing(state, player, 2);
        TurnManager.drawCard(state, playerId);
        for (const m of player.monsterSlots) {
          if (m && !m.isGhostSlotMarker) {
            m.statusEffects = m.statusEffects || [];
            m.statusEffects.push({ type: 'BUFF', name: 'Tứ Linh Hộ Mệnh', powerDelta: 1 });
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🌟 DH-09 Tứ Linh Hội Tụ: Hồi +2 Điểm Nhân Phẩm, bốc 1 lá bài và cộng +1 Độ Chiến toàn sân!'
        });
        break;
      }

      case 'DH-10': {
        TurnManager.drawCard(state, playerId);
        TurnManager.drawCard(state, playerId);
        const emptySlot = player.monsterSlots.findIndex(s => s === null);
        if (emptySlot !== -1) {
          const lowIdx = player.hand.findIndex(c => {
            const d = ALL_96_CARDS[c.cardId] || c;
            return (c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23';
          });
          if (lowIdx !== -1) {
            const [summoned] = player.hand.splice(lowIdx, 1);
            summoned.summonedTurnNumber = state.turnNumber;
            player.monsterSlots[emptySlot] = summoned;
            state.actionLog.push({
              turn: state.turnNumber,
              message: `🐲 DH-10 Kim Long Hóa Rồng: Vượt Vũ Môn bốc 2 lá bài và gọi thêm [${summoned.name}] lên sân!`
            });
            this.applyTribeResonanceIfEligible(state, playerId, summoned, emptySlot);
            this.handleLowMonsterOnSummon(state, playerId, summoned, emptySlot, 1);
            break;
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🐲 DH-10 Kim Long Hóa Rồng: Vượt Vũ Môn giúp bạn bốc 2 lá bài!'
        });
        break;
      }

      case 'DH-11': {
        for (const p of Object.values(state.players)) {
          if (p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)) {
            const mIdx = p.monsterSlots.findIndex(m => m && !m.isGhostSlotMarker);
            if (mIdx !== -1) {
              const destroyed = p.monsterSlots[mIdx];
              BattleResolver.destroyMonsterToGraveyard(state, p.id, mIdx, playerId, []);
              BattleResolver.applyDamage(state, p, 2, playerId);
              state.actionLog.push({
                turn: state.turnNumber,
                message: `☄️ DH-11 Thánh Gióng Cưỡi Ngựa Sắt: Phun lửa thiêu rụi [${destroyed.name}] và trừ 2 Điểm Nhân Phẩm của ${p.name}!`
              });
              return;
            }
          }
        }
        break;
      }

      case 'DH-12': {
        BattleResolver.applyHealing(state, player, 2);
        for (const m of player.monsterSlots) {
          if (m && !m.isGhostSlotMarker) {
            m.statusEffects = m.statusEffects || [];
            m.statusEffects.push({ type: 'BUFF', name: 'Sơn Tinh Dâng Núi', powerDelta: 2 });
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🏔️ DH-12 Sơn Tinh Dâng Núi: Hồi +2 Điểm Nhân Phẩm và cộng +2 Độ Chiến bảo hộ toàn sân!'
        });
        break;
      }
    }
  }

  static executeDramaEffect(state, playerId, dramaCardId, targetParams = {}) {
    const player = state.players[playerId];

    const ct21Card = player.monsterSlots.find(
      m => m && m.cardId === 'CT-21' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04')
    );
    const bonusDramaDamage = ct21Card ? 1 : 0;

    if (ct21Card && ['DR-01', 'DR-02', 'DR-11'].includes(dramaCardId)) {
      const ct21Msg = `🐝 CT-21 Đom Đóm Đèn Sách Trạng Nguyên: Ánh sáng trí tuệ cộng thêm +1 sát thương cho Phép Sự Tích!`;
      state.actionLog.push({ turn: state.turnNumber, message: ct21Msg });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: ct21Card,
        cardId: 'CT-21',
        activatorId: playerId,
        title: `Nội Tại Linh Thú: ${ct21Card.name}`,
        resultText: ct21Msg,
        icon: '🐝'
      });
    }

    const isImmuneToOpponentDrama = (monster) => {
      if (!monster) return false;
      const hasDC04 = (monster.equippedItems || []).some(it => it.cardId === 'DC-04');
      if (hasDC04) return false;
      return ['CT-09', 'DH-03', 'DH-12'].includes(monster.cardId);
    };

    switch (dramaCardId) {
      case 'DR-01': { // Sự Tích Sơn Tinh Thủy Tinh Đại Chiến
        const allWithMonsters = Object.values(state.players).filter(
          p => !p.isGhost && p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker)
        );
        const enemiesWithMonsters = allWithMonsters.filter(
          p => p.id !== playerId && (!state.isTeamMode || p.teamId !== player.teamId)
        );
        // Nếu có từ 2 đối thủ trở lên đang có Linh Thú trên sân, ưu tiên ép 2 đối thủ đánh nhau
        const targets = enemiesWithMonsters.length >= 2 ? enemiesWithMonsters : allWithMonsters;
        if (targets.length >= 2) {
          const p1 = targets[0];
          const p2 = targets[1];
          const getStrongestSlot = (pl) => {
            let bestSlot = -1;
            let bestPwr = -1;
            pl.monsterSlots.forEach((m, idx) => {
              if (m && !m.isGhostSlotMarker) {
                const pwr = BattleResolver.calculateMonsterPower(state, pl.id, idx);
                if (pwr > bestPwr) {
                  bestPwr = pwr;
                  bestSlot = idx;
                }
              }
            });
            return { slot: bestSlot, monster: pl.monsterSlots[bestSlot], power: bestPwr };
          };

          const f1 = getStrongestSlot(p1);
          const f2 = getStrongestSlot(p2);
          if (f1.monster && f2.monster) {
            const diff = f1.power - f2.power;
            if (diff > 0) {
              BattleResolver.applyDamage(state, p2, diff + bonusDramaDamage, playerId);
              BattleResolver.destroyMonsterToGraveyard(state, p2.id, f2.slot, p1.id, []);
            } else if (diff < 0) {
              BattleResolver.applyDamage(state, p1, Math.abs(diff) + bonusDramaDamage, playerId);
              BattleResolver.destroyMonsterToGraveyard(state, p1.id, f1.slot, p2.id, []);
            } else {
              BattleResolver.destroyMonsterToGraveyard(state, p1.id, f1.slot, p2.id, []);
              BattleResolver.destroyMonsterToGraveyard(state, p2.id, f2.slot, p1.id, []);
            }
            state.actionLog.push({
              turn: state.turnNumber,
              message: `🌊 DR-01 Sơn Tinh Thủy Tinh Đại Chiến: [${f1.monster.name}] (${f1.power} ⚔️) và [${f2.monster.name}] (${f2.power} ⚔️) quyết đấu! Chênh lệch: ${Math.abs(diff) + bonusDramaDamage} HP!`
            });
          }
        }
        break;
      }

      case 'DR-02': { // Sự Tích Lý Thông Tráo Công Thạch Sanh
        // Ưu tiên chọn Linh Thú đang gắn DC-07 (Combo Tặng Quà Tử Thần) hoặc Linh Thú yếu nhất trên sân mình
        let ownMonsterIdx = player.monsterSlots.findIndex(m => m && !m.isGhostSlotMarker && (m.equippedItems || []).some(it => it.cardId === 'DC-07'));
        if (ownMonsterIdx === -1) {
          ownMonsterIdx = player.monsterSlots.findIndex(m => m !== null && !m.isGhostSlotMarker);
        }

        const validEnemy = Object.values(state.players).filter(p =>
          p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId) && p.monsterSlots.some(s => s === null)
        );
        const targetPlayerId = (targetParams.targetPlayerId && validEnemy.some(p => p.id === targetParams.targetPlayerId))
          ? targetParams.targetPlayerId
          : (validEnemy[0]?.id || null);

        if (ownMonsterIdx !== -1 && targetPlayerId && state.players[targetPlayerId]) {
          const targetPlayer = state.players[targetPlayerId];
          const emptySlot = targetPlayer.monsterSlots.findIndex(s => s === null);
          if (emptySlot !== -1) {
            const monster = player.monsterSlots[ownMonsterIdx];
            player.monsterSlots[ownMonsterIdx] = null;
            monster.bombedByPlayerId = playerId;
            targetPlayer.monsterSlots[emptySlot] = monster;
            const dmg = 1 + bonusDramaDamage;
            BattleResolver.applyDamage(state, targetPlayer, dmg, playerId);
            state.actionLog.push({
              turn: state.turnNumber,
              message: `🎭 DR-02 Lý Thông Tráo Công: Đẩy [${monster.name}] sang sân ${targetPlayer.name}, trừ ${dmg} Điểm Nhân Phẩm và khóa không cho đánh chủ cũ!`
            });
          }
        }
        break;
      }

      case 'DR-03': {
        const allTraps = [];
        const participants = [];
        for (const p of Object.values(state.players)) {
          if (p.isGhost) continue;
          p.trapSlots.forEach((slot, idx) => {
            if (slot) {
              allTraps.push(slot);
              p.trapSlots[idx] = null;
              participants.push(p.id);
            }
          });
        }
        if (allTraps.length > 0) {
          for (let i = allTraps.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTraps[i], allTraps[j]] = [allTraps[j], allTraps[i]];
          }
          participants.forEach((pid, i) => {
            const p = state.players[pid];
            const emptySlot = p.trapSlots.findIndex(s => s === null);
            if (emptySlot !== -1 && allTraps[i]) {
              p.trapSlots[emptySlot] = allTraps[i];
            }
          });
          state.actionLog.push({
            turn: state.turnNumber,
            message: `🌪️ DR-03 Thủy Tinh Dâng Nước Lũ: ${allTraps.length} lá Bẫy Thiên Cơ đã bị cuốn trôi tráo đổi ngẫu nhiên!`
          });
        }
        break;
      }

      case 'DR-04': {
        if (state.graveyard.length > 0) {
          const card = targetParams.cardInstanceId
            ? state.graveyard.find(c => c.instanceId === targetParams.cardInstanceId)
            : state.graveyard[state.graveyard.length - 1];

          if (card) {
            const idx = state.graveyard.indexOf(card);
            state.graveyard.splice(idx, 1);
            player.hand.push(card);
            state.actionLog.push({
              turn: state.turnNumber,
              message: `🌕 DR-04 Lá Đa Chú Cuội: Hồi sinh [${card.name}] từ Bãi Rác lên tay!`
            });
            GameState.pushRevealedCardsEvent(state, {
              viewerId: playerId,
              targetPlayerId: playerId,
              targetPlayerName: player.name,
              sourceCardId: 'DR-04',
              sourceCardName: 'Sự Tích Chú Cuội Cải Tử Hoàn Sinh',
              revealType: 'CAPTURED',
              title: '🌕 CHÚ CUỘI CẢI TỬ HOÀN SINH — LÁ BÀI ĐƯỢC HỒI SINH TỪ BÃI RÁC',
              subtitle: 'Lá cây đa thần đã hồi sinh lá bài sau từ Bãi Rác đưa thẳng về tay bạn:',
              cards: [card],
              capturedCardIds: [card.instanceId]
            });
          }
        }
        break;
      }

      case 'DR-05': {
        const richerCount = Object.values(state.players).filter(p => p.id !== playerId && p.hp > player.hp).length;
        const drawCount = Math.min(3, Math.max(1, richerCount));
        for (let i = 0; i < drawCount; i++) {
          TurnManager.drawCard(state, playerId);
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: `⭐ DR-05 Ăn Khế Trả Vàng: Túi ba gang đựng đầy ${drawCount} lá bài mới!`
        });
        break;
      }

      case 'DR-06': { // Mượn Đồ Quên Trả — Cướp Nỏ Thần Trọng Thủy
        const validEnemy = Object.values(state.players).filter(p =>
          p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)
        );
        // Ưu tiên tìm đối thủ thực sự đang có Linh Thú trên sân
        let targetPlayerId = null;
        if (targetParams.targetPlayerId && validEnemy.some(p => p.id === targetParams.targetPlayerId && p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker))) {
          targetPlayerId = targetParams.targetPlayerId;
        } else {
          const enemyWithStealable = validEnemy.find(p => p.monsterSlots.some(m => m && !m.isGhostSlotMarker && !isImmuneToOpponentDrama(m)))
            || validEnemy.find(p => p.monsterSlots.some(m => m && !m.isGhostSlotMarker))
            || validEnemy[0];
          targetPlayerId = enemyWithStealable?.id || null;
        }

        const targetSlot = targetParams.targetSlotIndex ?? 0;
        const emptySlot = player.monsterSlots.findIndex(s => s === null);

        if (targetPlayerId && emptySlot !== -1 && state.players[targetPlayerId]) {
          const targetPlayer = state.players[targetPlayerId];

          const nq13Idx = targetPlayer.trapSlots.findIndex(t => t && t.cardId === 'NQ-13' && t.setTurnNumber < state.turnNumber);
          if (nq13Idx !== -1) {
            const trap = targetPlayer.trapSlots[nq13Idx];
            targetPlayer.trapSlots[nq13Idx] = null;
            state.graveyard.push(trap);

            let discardedName = '';
            if (player.hand.length > 0) {
              const discarded = player.hand.pop();
              state.graveyard.push(discarded);
              discardedName = ` [${discarded.name}]`;
            }

            const msg = `🪶 BẪY LẬT [${trap.name}]! ${targetPlayer.name} phát hiện mưu kế! Hủy trò mượn quân và phạt ${player.name} vứt 1 lá bài${discardedName} vào Bãi Rác!`;
            state.actionLog.push({
              turn: state.turnNumber,
              message: msg
            });
            GameState.pushEffectEvent(state, {
              mode: 'PASSIVE',
              category: 'TRAP',
              card: trap,
              cardId: 'NQ-13',
              activatorId: targetPlayer.id,
              title: `Bẫy Thiên Cơ: ${trap.name}`,
              resultText: msg,
              icon: '🪶'
            });
            break;
          }

          let enemyMonster = targetPlayer.monsterSlots[targetSlot];
          let actualSlot = targetSlot;
          if (!enemyMonster || enemyMonster.isGhostSlotMarker || isImmuneToOpponentDrama(enemyMonster)) {
            actualSlot = targetPlayer.monsterSlots.findIndex(m => m && !m.isGhostSlotMarker && !isImmuneToOpponentDrama(m));
            enemyMonster = actualSlot !== -1 ? targetPlayer.monsterSlots[actualSlot] : null;
          }

          if (enemyMonster) {
            targetPlayer.monsterSlots[actualSlot] = null;
            if (enemyMonster.cardId === 'CT-23') {
              targetPlayer.monsterSlots = [null, null];
            }
            enemyMonster.wasStolenTurn = state.turnNumber;
            enemyMonster.stolenFromPlayerId = targetPlayerId;
            enemyMonster.originalOwnerId = targetPlayerId;
            enemyMonster.temporaryStealUntilEndOfTurn = state.turnNumber;
            state.lastStolenFromPlayerId = targetPlayerId;
            player.monsterSlots[emptySlot] = enemyMonster;
            state.stolenMonstersThisTurn.push(enemyMonster.instanceId);
            state.actionLog.push({
              turn: state.turnNumber,
              message: `🧲 DR-06: Thu phục tạm thời [${enemyMonster.name}] của ${targetPlayer.name} sang sân bạn!`
            });
          } else {
            const immuneMonster = targetPlayer.monsterSlots.find(m => m && isImmuneToOpponentDrama(m));
            const immuneMsg = `🛡️ [${immuneMonster?.name || 'Linh Thú'}] của ${targetPlayer.name} miễn nhiễm hoàn toàn với Phép Sự Tích của đối thủ!`;
            state.actionLog.push({
              turn: state.turnNumber,
              message: immuneMsg
            });
            if (immuneMonster) {
              GameState.pushEffectEvent(state, {
                mode: 'PASSIVE',
                category: 'PASSIVE',
                card: immuneMonster,
                cardId: immuneMonster.cardId,
                activatorId: targetPlayer.id,
                title: `Miễn Nhiễm Phép: ${immuneMonster.name}`,
                resultText: immuneMsg,
                icon: '🛡️'
              });
            }
          }
        }
        break;
      }

      case 'DR-07': { // Sự Tích Hồn Trương Ba Da Hàng Thịt: Hoán đổi toàn bộ bài trên tay và lật mở cho xem!
        const validEnemy = Object.values(state.players).filter(p =>
          p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)
        );
        const richestHandEnemy = [...validEnemy].sort((a, b) => b.hand.length - a.hand.length)[0];
        const targetPlayerId = (targetParams.targetPlayerId && validEnemy.some(p => p.id === targetParams.targetPlayerId))
          ? targetParams.targetPlayerId
          : (richestHandEnemy?.id || null);

        if (targetPlayerId && state.players[targetPlayerId]) {
          const targetPlayer = state.players[targetPlayerId];
          const temp = player.hand;
          player.hand = targetPlayer.hand;
          targetPlayer.hand = temp;
          state.revealedHands = state.revealedHands || {};
          state.revealedHands[targetPlayerId] = Date.now() + 30000;
          state.actionLog.push({
            turn: state.turnNumber,
            message: `☯️ DR-07 Hồn Trương Ba Da Hàng Thịt: ${player.name} và ${targetPlayer.name} đã hoán đổi toàn bộ bài trên tay (${player.hand.length} lá)!`
          });
          GameState.pushRevealedCardsEvent(state, {
            viewerId: playerId,
            targetPlayerId,
            targetPlayerName: targetPlayer.name,
            sourceCardId: 'DR-07',
            sourceCardName: 'Sự Tích Hồn Trương Ba Da Hàng Thịt',
            revealType: 'CAPTURED',
            title: `☯️ HỒN TRƯƠNG BA — BÀI NHẬN ĐƯỢC TỪ ${targetPlayer.name.toUpperCase()}`,
            subtitle: `Bạn đã hoán đổi bài với ${targetPlayer.name} và nhận về tay ${player.hand.length} lá bài sau:`,
            cards: [...player.hand],
            capturedCardIds: player.hand.map(c => c.instanceId)
          });
        }
        break;
      }

      case 'DR-08': {
        for (const p of Object.values(state.players)) {
          if (!p.isGhost) {
            BattleResolver.applyHealing(state, p, 2);
            TurnManager.drawCard(state, p.id);
          }
        }
        TurnManager.drawCard(state, playerId);
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🥁 DR-08 Lễ Hội Đền Hùng: Toàn bàn hồi +2 Điểm Nhân Phẩm và bốc bài lộc!'
        });
        break;
      }

      case 'DR-09': { // Chiếu Chỉ Thiên Đình Soi Thấu Bẫy: Lật ngửa toàn bộ bẫy úp của đối thủ trên bàn và trong Modal!
        const validEnemy = Object.values(state.players).filter(p =>
          p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)
        );
        const hasEnemyTR11 = validEnemy.some(p =>
          p.monsterSlots.some(m => m && m.cardId === 'TR-11' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04'))
        );
        if (hasEnemyTR11 && state.currentPhase === PHASES.MAIN) {
          const tr11Msg = '🪓 TR-11 Thần Độc Cước trấn biển: Chặn đứng Chiếu Chỉ Thiên Đình, không cho nhìn Bẫy Thiên Cơ trong Giai đoạn Bày Trò!';
          state.actionLog.push({ turn: state.turnNumber, message: tr11Msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            cardId: 'TR-11',
            title: 'Nội Tại Thần Thú: Thần Độc Cước Trấn Biển',
            resultText: tr11Msg,
            icon: '🪓'
          });
          break;
        }

        // Ưu tiên chọn đối thủ đang có bẫy úp trên sân
        const enemyWithTraps = validEnemy.find(p => p.trapSlots.some(t => t !== null));
        const targetPlayerId = (targetParams.targetPlayerId && validEnemy.some(p => p.id === targetParams.targetPlayerId && p.trapSlots.some(t => t !== null)))
          ? targetParams.targetPlayerId
          : (enemyWithTraps?.id || targetParams.targetPlayerId || validEnemy[0]?.id || null);

        if (targetPlayerId && state.players[targetPlayerId]) {
          const targetPlayer = state.players[targetPlayerId];
          const traps = targetPlayer.trapSlots.filter(t => t !== null);
          targetPlayer.trapSlots.forEach((t, idx) => {
            if (t) {
              state.revealedTraps = state.revealedTraps || {};
              state.revealedTraps[`${targetPlayer.id}_${idx}`] = t.cardId;
            }
          });
          const trapNames = traps.map(t => `[${t.name}]`).join(', ') || 'Không có bẫy nào';
          state.actionLog.push({
            turn: state.turnNumber,
            message: `📜 DR-09 Chiếu Chỉ Thiên Đình: Bắt ${targetPlayer.name} lật ngửa công khai toàn bộ bẫy úp: ${trapNames}!`
          });
          GameState.pushRevealedCardsEvent(state, {
            viewerId: playerId,
            targetPlayerId: targetPlayer.id,
            targetPlayerName: targetPlayer.name,
            sourceCardId: 'DR-09',
            sourceCardName: 'Chiếu Chỉ Thiên Đình Soi Thấu Bẫy',
            revealType: 'TRAP',
            title: `📜 CHIẾU CHỈ THIÊN ĐÌNH — LẬT NGỬA TOÀN BỘ BẪY CỦA ${targetPlayer.name.toUpperCase()}`,
            subtitle: `Toàn bộ ${traps.length} lá Bẫy Thiên Cơ của ${targetPlayer.name} đã bị lật ngửa công khai:`,
            cards: traps
          });
        }
        break;
      }

      case 'DR-10': { // Kế Ly Gián Cổ Loa Thành
        const validEnemy = Object.values(state.players).filter(p =>
          p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)
        );
        const enemyWithTwo = validEnemy.find(p => p.monsterSlots.filter(m => m && !m.isGhostSlotMarker).length >= 2);
        const enemyWithOne = validEnemy.find(p => p.monsterSlots.some(m => m && !m.isGhostSlotMarker));
        const targetPlayer = enemyWithTwo || enemyWithOne;
        if (targetPlayer) {
          const slotToDestroy = targetPlayer.monsterSlots.findIndex(m => m !== null && !m.isGhostSlotMarker && !isImmuneToOpponentDrama(m));
          if (slotToDestroy !== -1) {
            const destroyed = targetPlayer.monsterSlots[slotToDestroy];
            BattleResolver.destroyMonsterToGraveyard(state, targetPlayer.id, slotToDestroy, playerId, []);
            state.actionLog.push({
              turn: state.turnNumber,
              message: `⚡ DR-10 Kế Ly Gián Cổ Loa: Phá hủy [${destroyed.name}] của ${targetPlayer.name}!`
            });
          }
        }
        break;
      }

      case 'DR-11': {
        const validEnemy = Object.values(state.players).filter(p =>
          p.id !== playerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)
        );
        const targetPlayerId = (targetParams.targetPlayerId && validEnemy.some(p => p.id === targetParams.targetPlayerId))
          ? targetParams.targetPlayerId
          : ([...validEnemy].sort((a, b) => b.hp - a.hp)[0]?.id || null);

        if (targetPlayerId && state.players[targetPlayerId]) {
          const targetPlayer = state.players[targetPlayerId];
          const dmg = 2 + bonusDramaDamage;
          BattleResolver.applyDamage(state, targetPlayer, dmg, playerId);
          state.actionLog.push({
            turn: state.turnNumber,
            message: `🔔 DR-11 Trống Kêu Oan Sân Đình: Phán xử trừ ${dmg} Điểm Nhân Phẩm của ${targetPlayer.name}!${bonusDramaDamage > 0 ? ' (+1 từ CT-21 Đom Đóm Trạng Nguyên)' : ''}`
          });
        }
        break;
      }

      case 'DR-12': {
        for (const p of Object.values(state.players)) {
          if (p.isGhost) continue;
          while (p.hand.length > 0) {
            state.graveyard.push(p.hand.pop());
          }
          for (let i = 0; i < 4; i++) {
            TurnManager.drawCard(state, p.id);
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🐟 DR-12 Táo Quân Về Trời: Cả bàn đổi toàn bộ bài cũ lấy 4 lá bài lộc mới!'
        });
        break;
      }

      case 'DR-13': {
        let summoned = 0;
        const newlySummonedSlots = [];
        for (let i = player.hand.length - 1; i >= 0 && summoned < 2; i--) {
          const card = player.hand[i];
          const cardData = ALL_96_CARDS[card.cardId];
          if (cardData && cardData.type === CARD_TYPES.LOW_MONSTER && card.cardId !== 'CT-23') {
            const emptySlot = player.monsterSlots.findIndex(s => s === null);
            if (emptySlot !== -1) {
              player.hand.splice(i, 1);
              const inst = {
                ...card,
                currentPower: card.power || cardData.power,
                turnSummoned: state.turnNumber,
                statusEffects: []
              };
              player.monsterSlots[emptySlot] = inst;
              player.hasSummonedMonster = true;
              newlySummonedSlots.push({ inst, slot: emptySlot });
              summoned++;
            }
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: `🥚 DR-13 Bọc Trăm Trứng Nở Rộ: Triệu hồi liên hoàn ${summoned} Linh Thú Cấp Thấp lên sân!`
        });
        for (const item of newlySummonedSlots) {
          this.applyTribeResonanceIfEligible(state, playerId, item.inst, item.slot);
          this.handleLowMonsterOnSummon(state, playerId, item.inst, item.slot, 1);
        }
        break;
      }

      case 'DR-14': {
        BattleResolver.applyHealing(state, player, 2);
        for (const m of player.monsterSlots) {
          if (m) {
            m.cannotAttack = false;
            if (m.statusEffects) {
              m.statusEffects = m.statusEffects.filter(eff => eff.type !== 'DEBUFF' && eff.type !== 'FREEZE');
            }
            if (m.equippedItems) {
              const badEquips = m.equippedItems.filter(it => ['DC-04', 'DC-07', 'DC-10'].includes(it.cardId));
              m.equippedItems = m.equippedItems.filter(it => !['DC-04', 'DC-07', 'DC-10'].includes(it.cardId));
              state.graveyard.push(...badEquips);
            }
          }
        }
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🟩 DR-14 Bánh Chưng Bánh Giầy: Hồi +2 Điểm Nhân Phẩm và thanh tẩy mọi hiệu ứng bất lợi!'
        });
        break;
      }

      case 'DR-15': {
        let summonedNames = [];
        const newlySummoned = [];
        while (summonedNames.length < 2) {
          const emptySlot = player.monsterSlots.findIndex(s => s === null);
          if (emptySlot === -1) break;

          const graveIdx = state.graveyard.findIndex(c => {
            const d = ALL_96_CARDS[c.cardId] || c;
            return (c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23';
          });
          if (graveIdx !== -1) {
            const [revived] = state.graveyard.splice(graveIdx, 1);
            revived.summonedTurnNumber = state.turnNumber;
            revived.statusEffects = [{ type: 'BUFF', name: 'Khắc Nhập!', powerDelta: 1 }];
            player.monsterSlots[emptySlot] = revived;
            player.hasSummonedMonster = true;
            summonedNames.push(revived.name);
            newlySummoned.push({ inst: revived, slot: emptySlot });
            continue;
          }

          const handIdx = player.hand.findIndex(c => {
            const d = ALL_96_CARDS[c.cardId] || c;
            return (c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23';
          });
          if (handIdx !== -1) {
            const [fromHand] = player.hand.splice(handIdx, 1);
            fromHand.summonedTurnNumber = state.turnNumber;
            fromHand.statusEffects = [{ type: 'BUFF', name: 'Khắc Nhập!', powerDelta: 1 }];
            player.monsterSlots[emptySlot] = fromHand;
            player.hasSummonedMonster = true;
            summonedNames.push(fromHand.name);
            newlySummoned.push({ inst: fromHand, slot: emptySlot });
            continue;
          }

          break;
        }

        for (const m of player.monsterSlots) {
          if (m && !m.isGhostSlotMarker) {
            m.statusEffects = m.statusEffects || [];
            m.statusEffects.push({ type: 'BUFF', name: 'Cây Tre Trăm Đốt', powerDelta: 1 });
          }
        }

        state.actionLog.push({
          turn: state.turnNumber,
          message: `🎋 DR-15 Cây Tre Trăm Đốt ("Khắc Nhập!"): Triệu hồi đặc biệt ${summonedNames.length} Linh Thú (${summonedNames.join(', ') || 'Cường hóa đội hình'}) và cộng +1 Độ Chiến toàn sân!`
        });
        for (const item of newlySummoned) {
          this.applyTribeResonanceIfEligible(state, playerId, item.inst, item.slot);
          this.handleLowMonsterOnSummon(state, playerId, item.inst, item.slot, 1);
        }
        break;
      }

      case 'DR-16': {
        TurnManager.drawCard(state, playerId);
        TurnManager.drawCard(state, playerId);
        state.bonusSummonsAvailable = (state.bonusSummonsAvailable || 0) + 1;
        state.normalSummonUsed = false;
        state.actionLog.push({
          turn: state.turnNumber,
          message: '🌧️ DR-16 Lễ Cầu Mưa Cóc Kiện Trời: Bốc ngay 2 lá bài mới và nhận thêm +1 lượt Triệu Hồi Thường trong lượt này!'
        });
        break;
      }
    }
  }
}
