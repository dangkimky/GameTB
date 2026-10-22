import { ALL_96_CARDS, CARD_TYPES, TRIBES } from '../data/cards.js';
import { GhostSystem } from './GhostSystem.js';
import { GameState } from './GameState.js';

export class BattleResolver {
  /**
   * Tính toán Độ Chiến thực tế của Chiến Thần trên sân (sau khi tính Buff, Debuff, Đạo Cụ)
   */
  static calculateMonsterPower(state, playerId, slotIndex, context = {}) {
    const player = state.players[playerId];
    if (!player) return 0;
    const monsterInstance = player.monsterSlots[slotIndex];
    if (!monsterInstance) return 0;

    // Nếu là bia thịt 0 Độ Chiến do DH-08 đẩy từ Bãi Rác lên
    if (monsterInstance.isDummyTarget) {
      return 0;
    }

    const cardData = ALL_96_CARDS[monsterInstance.cardId] || monsterInstance;
    let power = monsterInstance.basePower !== undefined
      ? monsterInstance.basePower
      : (monsterInstance.power !== undefined ? monsterInstance.power : (cardData.power || 0));

    // Kiểm tra xem thẻ có bị Tiếng Đàn Thạch Sanh / Micro Hết Pin (DC-04) vô hiệu hóa hiệu ứng không
    const hasDC04 = (monsterInstance.equippedItems || []).some(item => item.cardId === 'DC-04');

    // Kiểm tra xem kẻ đối đầu có mang Bùa Trấn Yểm (DC-06) khóa hiệu ứng hệ Linh Giác / Huyền Bí không
    const tribe = monsterInstance.tribe || cardData.tribe;
    const isBlockedByDC06 = Boolean(
      context.opponentHasDC06 &&
      (tribe === TRIBES.HONG_HOT || tribe === TRIBES.AN_VA)
    );

    // 1. Tính hiệu ứng từ Đạo Cụ (Equipment)
    if (monsterInstance.equippedItems) {
      for (const item of monsterInstance.equippedItems) {
        const itemData = ALL_96_CARDS[item.cardId] || item;
        if (itemData.powerBonus) {
          power += itemData.powerBonus;
        }
        // DC-03: +2 Độ Chiến khi tấn công Chiến Thần Cấp Thấp
        if (item.cardId === 'DC-03' && context.isAttacking && context.targetCardType === CARD_TYPES.LOW_MONSTER) {
          power += (itemData.powerBonusVsLow || 2);
        }
      }
    }

    // Nếu không bị DC-04 hoặc DC-06 khóa hiệu ứng, tính tiếp các nội tại của Linh Thú
    if (!hasDC04 && !isBlockedByDC06) {
      // CT-06: Trâu Vàng Hồ Tây (+1 Độ Chiến nếu trên sân không có bẫy úp)
      if (monsterInstance.cardId === 'CT-06') {
        const hasSetTrap = player.trapSlots.some(t => t !== null && !t.faceUp);
        if (!hasSetTrap) power += 1;
      }

      // CT-10: Rùa Đá Đội Bia Văn Miếu (+2 Độ Chiến khi đỡ đòn)
      if (monsterInstance.cardId === 'CT-10' && context.isDefending) {
        power += 2;
      }

      // CT-12: Chó Phú Quốc Lưng Xoáy (+1 Độ Chiến nếu có Linh Thú hệ Dũng Mãnh trên sân bất kỳ ai)
      if (monsterInstance.cardId === 'CT-12') {
        const hasQuayPhaOnBoard = Object.values(state.players).some(p =>
          p.monsterSlots.some(m => m && (m.tribe === TRIBES.QUAY_PHA || ALL_96_CARDS[m.cardId]?.tribe === TRIBES.QUAY_PHA))
        );
        if (hasQuayPhaOnBoard) power += 1;
      }

      // CT-14: Dế Mèn Phiêu Lưu Ký (+3 Độ Chiến nếu đang ít Điểm Nhân Phẩm nhất bàn)
      if (monsterInstance.cardId === 'CT-14') {
        const livingHps = Object.values(state.players).filter(p => !p.isGhost).map(p => p.hp);
        const minHp = livingHps.length > 0 ? Math.min(...livingHps) : player.hp;
        if (player.hp === minHp) {
          power += 3;
        }
      }
    }

    // Anh Linh Lạc Long Quân (NV-06 Mặt Sau): Nếu 2 người chơi được chỉ định giao chiến trong vòng này, Linh Thú tấn công +1 Độ Chiến
    if (
      context.isAttacking &&
      context.targetPlayerId &&
      Array.isArray(state.ghostDiplomacyPair) &&
      state.ghostDiplomacyPair.includes(playerId) &&
      state.ghostDiplomacyPair.includes(context.targetPlayerId)
    ) {
      power += 1;
    }

    // 2. Tính các hiệu ứng tạm thời trong lượt (statusEffects)
    if (monsterInstance.statusEffects) {
      for (const eff of monsterInstance.statusEffects) {
        if (eff.powerDelta) {
          power += eff.powerDelta;
        }
      }
    }

    return Math.max(0, power);
  }

  /**
   * Ghi nhận thông báo kích hoạt hiệu ứng nội tại khi giao tranh (CT-06, CT-10, CT-12, CT-14, DC-03, DC-06, NV-06)
   */
  static recordPassiveCombatBuffs(state, playerId, slotIndex, context = {}, battleLog = []) {
    const player = state.players[playerId];
    if (!player) return;
    const monsterInstance = player.monsterSlots[slotIndex];
    if (!monsterInstance || monsterInstance.isDummyTarget) return;

    const cardData = ALL_96_CARDS[monsterInstance.cardId] || monsterInstance;
    const hasDC04 = (monsterInstance.equippedItems || []).some(item => item.cardId === 'DC-04');
    const tribe = monsterInstance.tribe || cardData.tribe;
    const isBlockedByDC06 = Boolean(
      context.opponentHasDC06 &&
      (tribe === TRIBES.HONG_HOT || tribe === TRIBES.AN_VA)
    );

    if (isBlockedByDC06) {
      const msg = `🧿 DC-06 Bùa Trấn Yểm Rừng Thiêng: Phong ấn nội tại hệ ${tribe === TRIBES.HONG_HOT ? 'Linh Giác' : 'Huyền Bí'} của [${monsterInstance.name}]!`;
      battleLog.push(msg);
      state.actionLog.push({ turn: state.turnNumber, message: msg });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        cardId: 'DC-06',
        activatorId: context.opponentId || null,
        title: 'Hiệu Ứng Bị Động: Bùa Trấn Yểm Rừng Thiêng',
        resultText: msg,
        icon: '🧿'
      });
      return;
    }

    if (monsterInstance.equippedItems) {
      for (const item of monsterInstance.equippedItems) {
        if (item.cardId === 'DC-03' && context.isAttacking && context.targetCardType === CARD_TYPES.LOW_MONSTER) {
          const msg = `🦯 DC-03 Roi Sắt Gãy Của Thánh Gióng: Tăng +2 Độ Chiến cho [${monsterInstance.name}] khi tấn công Linh Thú Cấp Thấp!`;
          battleLog.push(msg);
          state.actionLog.push({ turn: state.turnNumber, message: msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            card: item,
            cardId: 'DC-03',
            activatorId: playerId,
            title: `Hiệu Ứng Pháp Bảo: ${item.name}`,
            resultText: msg,
            icon: '🦯'
          });
        }
      }
    }

    if (!hasDC04) {
      if (monsterInstance.cardId === 'CT-06') {
        const hasSetTrap = player.trapSlots.some(t => t !== null && !t.faceUp);
        if (!hasSetTrap) {
          const msg = `🐃 CT-06 Trâu Vàng Hồ Tây: Sân không úp bẫy, kích hoạt nội tại tăng +1 Độ Chiến!`;
          battleLog.push(msg);
          state.actionLog.push({ turn: state.turnNumber, message: msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            card: monsterInstance,
            cardId: 'CT-06',
            activatorId: playerId,
            title: `Nội Tại Linh Thú: ${monsterInstance.name}`,
            resultText: msg,
            icon: '🐃'
          });
        }
      }

      if (monsterInstance.cardId === 'CT-10' && context.isDefending) {
        const msg = `🐢 CT-10 Rùa Đá Đội Bia Văn Miếu: Linh Quy trấn giữ tăng +2 Độ Chiến khi đỡ đòn!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: monsterInstance,
          cardId: 'CT-10',
          activatorId: playerId,
          title: `Nội Tại Linh Thú: ${monsterInstance.name}`,
          resultText: msg,
          icon: '🐢'
        });
      }

      if (monsterInstance.cardId === 'CT-12') {
        const hasQuayPhaOnBoard = Object.values(state.players).some(p =>
          p.monsterSlots.some(m => m && (m.tribe === TRIBES.QUAY_PHA || ALL_96_CARDS[m.cardId]?.tribe === TRIBES.QUAY_PHA))
        );
        if (hasQuayPhaOnBoard) {
          const msg = `🐶 CT-12 Chó Phú Quốc Lưng Xoáy: Hưởng ứng hệ Dũng Mãnh trên sân, tăng +1 Độ Chiến!`;
          battleLog.push(msg);
          state.actionLog.push({ turn: state.turnNumber, message: msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            card: monsterInstance,
            cardId: 'CT-12',
            activatorId: playerId,
            title: `Nội Tại Linh Thú: ${monsterInstance.name}`,
            resultText: msg,
            icon: '🐶'
          });
        }
      }

      if (monsterInstance.cardId === 'CT-14') {
        const livingHps = Object.values(state.players).filter(p => !p.isGhost).map(p => p.hp);
        const minHp = livingHps.length > 0 ? Math.min(...livingHps) : player.hp;
        if (player.hp === minHp) {
          const msg = `🪳 CT-14 Dế Mèn Phiêu Lưu Ký: Ý chí quật cường khi ít Nhân Phẩm nhất bàn, bùng nổ +3 Độ Chiến!`;
          battleLog.push(msg);
          state.actionLog.push({ turn: state.turnNumber, message: msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            card: monsterInstance,
            cardId: 'CT-14',
            activatorId: playerId,
            title: `Nội Tại Linh Thú: ${monsterInstance.name}`,
            resultText: msg,
            icon: '🪳'
          });
        }
      }
    }
  }

  /**
   * Xử lý giao tranh giữa 2 người chơi
   */
  static resolveBattle(state, attackerId, attackerSlotIndex, targetId, targetSlotIndex = null, options = {}) {
    const attackerPlayer = state.players[attackerId];
    let targetPlayer = state.players[targetId];
    const attackerMonster = attackerPlayer?.monsterSlots[attackerSlotIndex];

    if (!attackerMonster) {
      throw new Error('Không tìm thấy Chiến Thần tấn công');
    }

    // Chế độ Chia Phe: Cấm tuyệt đối tấn công người chơi cùng phe
    if (state.isTeamMode && attackerPlayer.teamId && attackerPlayer.teamId === targetPlayer.teamId) {
      throw new Error('Không thể tấn công đồng đội cùng phe!');
    }

    const battleLog = [];
    const isDirectAttackBypassed = options.bypassMonsters || false;
    let trapTriggered = null;

    const attackerHasDC04 = (attackerMonster.equippedItems || []).some(it => it.cardId === 'DC-04');
    const attackerHasDC06 = (attackerMonster.equippedItems || []).some(it => it.cardId === 'DC-06');

    // Kiểm tra TR-02 (Tinh Gà Trắng Cửu Đầu): Vô hiệu hóa mọi Bẫy Thiên Cơ của mục tiêu trong pha đánh đó
    const targetTrapsDisabledByTR02 = Boolean(
      attackerMonster.cardId === 'TR-02' &&
      !attackerHasDC04 &&
      (options.singSuccess !== false)
    );
    if (targetTrapsDisabledByTR02 && targetPlayer.trapSlots.some(t => t !== null)) {
      const msg = `🐓 TR-02 Tinh Gà Trắng Cửu Đầu: Tiếng hú ma mị vô hiệu hóa mọi Bẫy Thiên Cơ của ${targetPlayer.name} trong pha đánh này!`;
      battleLog.push(msg);
      state.actionLog.push({ turn: state.turnNumber, message: msg });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: attackerMonster,
        cardId: 'TR-02',
        activatorId: attackerId,
        title: `Hiệu Ứng Thần Thú: ${attackerMonster.name}`,
        resultText: msg,
        icon: '🐓'
      });
    }

    // TR-10: Thần Sét Thiên Lôi Búa Đá — Khi 2 người chơi khác giao chiến, giáng búa trừ cả 2 mỗi người 1 HP (1 lần/vòng)
    for (const p of Object.values(state.players)) {
      if (p.id !== attackerId && p.id !== targetId && !p.isGhost) {
        const tr10 = p.monsterSlots.find(
          m => m && m.cardId === 'TR-10' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04')
        );
        if (tr10 && tr10.intervenedTurnNumber !== state.turnNumber) {
          tr10.intervenedTurnNumber = state.turnNumber;
          this.applyDamage(state, attackerPlayer, 1, p.id);
          this.applyDamage(state, targetPlayer, 1, p.id);
          const msg = `⚡ TR-10 Thần Sét Thiên Lôi của ${p.name} giáng búa phân xử: Trừ cả ${attackerPlayer.name} và ${targetPlayer.name} mỗi người 1 Điểm Nhân Phẩm!`;
          battleLog.push(msg);
          state.actionLog.push({ turn: state.turnNumber, message: msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            card: tr10,
            cardId: 'TR-10',
            activatorId: p.id,
            title: `Nội Tại Thần Thú: ${tr10.name}`,
            resultText: msg,
            icon: '⚡'
          });
          break;
        }
      }
    }

    // 0. Kiểm tra Bẫy NQ-10: Thu Phí Qua Đường (Bắt nộp 1 lá mới cho đánh, rỗng túi thì hủy đòn)
    const nq10Owner = Object.values(state.players).find(p =>
      p.id !== attackerId &&
      !p.isGhost &&
      (!state.isTeamMode || p.teamId !== attackerPlayer.teamId) &&
      !(targetTrapsDisabledByTR02 && p.id === targetId) &&
      p.trapSlots.some(t => t && t.cardId === 'NQ-10' && t.setTurnNumber < state.turnNumber)
    );

    if (nq10Owner) {
      const tIdx = nq10Owner.trapSlots.findIndex(t => t && t.cardId === 'NQ-10' && t.setTurnNumber < state.turnNumber);
      const trap = nq10Owner.trapSlots[tIdx];
      nq10Owner.trapSlots[tIdx] = null;
      state.graveyard.push(trap);
      trapTriggered = { trap, activatorId: nq10Owner.id, activatorName: nq10Owner.name, effectType: 'TOLL' };

      if (attackerPlayer.hand.length > 0) {
        const tollCard = attackerPlayer.hand.pop();
        nq10Owner.hand.push(tollCard);
        const msg = `⚠️ BẪY LẬT: ${nq10Owner.name} kích hoạt [${trap.name}]! Bắt ${attackerPlayer.name} nộp lá [${tollCard.name}] làm phí qua đường mới cho tấn công!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'TRAP',
          card: trap,
          cardId: 'NQ-10',
          activatorId: nq10Owner.id,
          title: `Bẫy Thiên Cơ: ${trap.name}`,
          resultText: msg,
          icon: '🚧'
        });
      } else {
        const msg = `⚠️ BẪY LẬT: ${nq10Owner.name} kích hoạt [${trap.name}]! ${attackerPlayer.name} rỗng túi không có bài nộp phí nên đòn đánh bị hủy!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'TRAP',
          card: trap,
          cardId: 'NQ-10',
          activatorId: nq10Owner.id,
          title: `Bẫy Thiên Cơ: ${trap.name}`,
          resultText: msg,
          icon: '🚧'
        });
        return {
          type: 'TRAP_NEGATED',
          damageDealt: 0,
          damageReflected: 0,
          attackerDestroyed: false,
          defenderDestroyed: false,
          logs: battleLog,
          trapTriggered
        };
      }
    }

    // 0.1. Kiểm tra Bẫy NQ-01: Gương Phản Đòn (Phản lại kẻ tấn công hoặc chuyển sang người thứ 3)
    const nq01Idx = !targetTrapsDisabledByTR02
      ? targetPlayer.trapSlots.findIndex(t => t && t.cardId === 'NQ-01' && t.setTurnNumber < state.turnNumber)
      : -1;
    if (nq01Idx !== -1) {
      const trap = targetPlayer.trapSlots[nq01Idx];
      targetPlayer.trapSlots[nq01Idx] = null;
      state.graveyard.push(trap);
      const atkPwr = this.calculateMonsterPower(state, attackerId, attackerSlotIndex, { isAttacking: true, targetPlayerId: targetId });
      const reflectVictim = (options.redirectPlayerId && state.players[options.redirectPlayerId])
        ? state.players[options.redirectPlayerId]
        : attackerPlayer;
      this.applyDamage(state, reflectVictim, atkPwr, targetPlayer.id);
      const msg = `⚠️ BẪY LẬT: ${targetPlayer.name} kích hoạt [${trap.name}]! Gương phản đòn bật ngược ${atkPwr} sát thương vào ${reflectVictim.name}!`;
      battleLog.push(msg);
      state.actionLog.push({ turn: state.turnNumber, message: msg });
      trapTriggered = { trap, activatorId: targetPlayer.id, activatorName: targetPlayer.name, effectType: 'REFLECT' };
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'TRAP',
        card: trap,
        cardId: 'NQ-01',
        activatorId: targetPlayer.id,
        title: `Bẫy Thiên Cơ: ${trap.name}`,
        resultText: msg,
        icon: '🪞'
      });
      return {
        type: 'TRAP_REFLECTED',
        damageDealt: 0,
        damageReflected: atkPwr,
        attackerDestroyed: false,
        defenderDestroyed: false,
        logs: battleLog,
        trapTriggered
      };
    }

    // Tìm xem đối thủ có Chiến Thần nào trên sân không
    const targetMonsters = targetPlayer.monsterSlots
      .map((m, idx) => ({ monster: m, slotIndex: idx }))
      .filter(item => item.monster !== null);

    // TRƯỜNG HỢP 1: ĐÁNH TRỰC DIỆN (Sân trống HOẶC có hiệu ứng đánh xuyên như DH-04, CT-03)
    if (targetMonsters.length === 0 || isDirectAttackBypassed) {
      // Kiểm tra Bẫy NQ-07: Giả Chết Bắt Quạ
      const nq07Idx = !targetTrapsDisabledByTR02
        ? targetPlayer.trapSlots.findIndex(t => t && t.cardId === 'NQ-07' && t.setTurnNumber < state.turnNumber)
        : -1;
      if (nq07Idx !== -1) {
        const trap = targetPlayer.trapSlots[nq07Idx];
        targetPlayer.trapSlots[nq07Idx] = null;
        state.graveyard.push(trap);
        let drawnCardName = '';
        if (state.drawPile.length > 0) {
          const drawn = state.drawPile.pop();
          targetPlayer.hand.push(drawn);
          drawnCardName = ` [${drawn.name}]`;
        }
        const msg = `⚠️ BẪY LẬT: ${targetPlayer.name} kích hoạt [${trap.name}]! Hóa giải đòn đánh trực diện và bốc 1 lá bài${drawnCardName}!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        trapTriggered = { trap, activatorId: targetPlayer.id, activatorName: targetPlayer.name, effectType: 'NEGATE_AND_DRAW' };
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'TRAP',
          card: trap,
          cardId: 'NQ-07',
          activatorId: targetPlayer.id,
          title: `Bẫy Thiên Cơ: ${trap.name}`,
          resultText: msg,
          icon: '🌳'
        });
        return {
          type: 'TRAP_NEGATED',
          damageDealt: 0,
          attackerDestroyed: false,
          defenderDestroyed: false,
          logs: battleLog,
          trapTriggered
        };
      }

      this.recordPassiveCombatBuffs(state, attackerId, attackerSlotIndex, {
        isAttacking: true,
        targetPlayerId: targetId
      }, battleLog);

      const atkPower = this.calculateMonsterPower(state, attackerId, attackerSlotIndex, {
        isAttacking: true,
        targetPlayerId: targetId
      });
      // Giới hạn bảo hộ: Tối đa 3 sát thương trực diện
      let directDamage = Math.min(3, atkPower);

      // Nội tại NV-03 (Thánh Gióng): Giảm 1 sát thương khi bị đánh trực diện (tối thiểu 1)
      if (targetPlayer.characterId === 'NV-03' && !targetPlayer.isGhost) {
        directDamage = Math.max(1, directDamage - 1);
        const msg = `🛡️ NV-03 Thánh Gióng kích hoạt Giáp Sắt Hộ Thân: Giảm 1 sát thương đòn đánh trực diện (chỉ nhận ${directDamage} sát thương)!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: ALL_96_CARDS['NV-03'],
          cardId: 'NV-03',
          activatorId: targetPlayer.id,
          title: 'Nội Tại Đại Diện: Thánh Gióng',
          resultText: msg,
          icon: '🛡️'
        });
      }

      // CT-22: Hồ Ly Tinh Trắng Hồ Tây — Khi tấn công trực diện người chơi trống sân, bắt đối thủ bỏ thêm 1 lá bài trên tay
      if (attackerMonster.cardId === 'CT-22' && !attackerHasDC04 && targetMonsters.length === 0) {
        if (targetPlayer.hand.length > 0) {
          const discarded = targetPlayer.hand.pop();
          state.graveyard.push(discarded);
          const msg = `🦊 CT-22 Hồ Ly Tinh Trắng Hồ Tây: Tiếng hồ cầm mê hoặc bắt ${targetPlayer.name} bỏ thêm lá [${discarded.name}] vào Bãi Rác!`;
          battleLog.push(msg);
          state.actionLog.push({ turn: state.turnNumber, message: msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            card: attackerMonster,
            cardId: 'CT-22',
            activatorId: attackerId,
            title: `Hiệu Ứng Linh Thú: ${attackerMonster.name}`,
            resultText: msg,
            icon: '🦊'
          });
        }
      }

      // Kiểm tra Bẫy NQ-04: Lý Thông Đổ Vỏ Cho Thằng Bên Cạnh (Khi sắp mất Điểm Nhân Phẩm)
      const nq04Idx = !targetTrapsDisabledByTR02
        ? targetPlayer.trapSlots.findIndex(t => t && t.cardId === 'NQ-04' && t.setTurnNumber < state.turnNumber)
        : -1;
      if (nq04Idx !== -1 && directDamage > 0) {
        const trap = targetPlayer.trapSlots[nq04Idx];
        targetPlayer.trapSlots[nq04Idx] = null;
        state.graveyard.push(trap);
        const scapegoat = Object.values(state.players).find(
          p => p.id !== targetPlayer.id && !p.isGhost && (!state.isTeamMode || p.teamId !== targetPlayer.teamId)
        ) || attackerPlayer;
        this.applyDamage(state, scapegoat, directDamage, targetPlayer.id);
        const msg = `👉 BẪY LẬT [${trap.name}]! ${targetPlayer.name} đẩy toàn bộ ${directDamage} sát thương sang ${scapegoat.name}!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        trapTriggered = { trap, activatorId: targetPlayer.id, activatorName: targetPlayer.name, effectType: 'REFLECT' };
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'TRAP',
          card: trap,
          cardId: 'NQ-04',
          activatorId: targetPlayer.id,
          title: `Bẫy Thiên Cơ: ${trap.name}`,
          resultText: msg,
          icon: '👉'
        });
        return {
          type: 'TRAP_DEFLECTED',
          damageDealt: directDamage,
          scapegoatId: scapegoat.id,
          attackerDestroyed: false,
          defenderDestroyed: false,
          logs: battleLog,
          trapTriggered
        };
      }

      this.applyDamage(state, targetPlayer, directDamage, attackerId);
      const directMsg = `${attackerMonster.name} đánh trực diện ${targetPlayer.name}, gây ${directDamage} sát thương Nhân Phẩm!`;
      battleLog.push(directMsg);
      state.actionLog.push({ turn: state.turnNumber, message: directMsg });

      if (targetPlayer.hp === 0) {
        battleLog.push(`${targetPlayer.name} ${state.isTeamMode ? 'và phe đồng đội' : ''} đã hết Điểm Nhân Phẩm!`);
      }

      return {
        type: 'DIRECT_ATTACK',
        damageDealt: directDamage,
        attackerDestroyed: false,
        defenderDestroyed: false,
        logs: battleLog
      };
    }

    // TRƯỜNG HỢP 2: GIAO TRANH VỚI CHIẾN THẦN TRÊN SÂN
    let chosenTargetSlot = targetSlotIndex;
    // Nếu đối thủ có Trùm Đầu Gấu Hắc Hổ Sơn Thần (TR-08) không bị khóa bởi DC-04, bắt buộc phải ưu tiên đánh TR-08!
    const tr08Entry = targetMonsters.find(
      m => m.monster.cardId === 'TR-08' && !(m.monster.equippedItems || []).some(it => it.cardId === 'DC-04')
    );
    if (tr08Entry) {
      if (chosenTargetSlot !== tr08Entry.slotIndex) {
        const tauntMsg = `🐯 TR-08 Hắc Hổ Sơn Thần phát uy áp Chúa Sơn Lâm: Bắt buộc đòn tấn công của [${attackerMonster.name}] phải nhắm vào Hắc Hổ!`;
        battleLog.push(tauntMsg);
        state.actionLog.push({ turn: state.turnNumber, message: tauntMsg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: tr08Entry.monster,
          cardId: 'TR-08',
          activatorId: targetId,
          title: `Nội Tại Thần Thú: ${tr08Entry.monster.name}`,
          resultText: tauntMsg,
          icon: '🐯'
        });
      }
      chosenTargetSlot = tr08Entry.slotIndex;
    } else if (chosenTargetSlot === null || targetPlayer.monsterSlots[chosenTargetSlot] === null) {
      chosenTargetSlot = targetMonsters[0].slotIndex;
    }

    let defenderMonster = targetPlayer.monsterSlots[chosenTargetSlot];
    const atkCardData = ALL_96_CARDS[attackerMonster.cardId] || attackerMonster;

    // Bẫy NQ-08 Mách Mẹ: Nếu kẻ tấn công là Boss hoặc Dung Hợp
    const isBossOrFusion = atkCardData.type === CARD_TYPES.HIGH_MONSTER || atkCardData.type === CARD_TYPES.FUSION_MONSTER;
    const nq08Idx = !targetTrapsDisabledByTR02
      ? targetPlayer.trapSlots.findIndex(t => t && t.cardId === 'NQ-08' && t.setTurnNumber < state.turnNumber)
      : -1;
    if (isBossOrFusion && nq08Idx !== -1) {
      const trap = targetPlayer.trapSlots[nq08Idx];
      targetPlayer.trapSlots[nq08Idx] = null;
      state.graveyard.push(trap);
      attackerPlayer.monsterSlots[attackerSlotIndex] = null;
      if (atkCardData.type === CARD_TYPES.FUSION_MONSTER) {
        state.fusionDeck.push(attackerMonster);
      } else {
        attackerPlayer.hand.push(attackerMonster);
      }
      const msg = `⚠️ BẪY LẬT: ${targetPlayer.name} kích hoạt [${trap.name}]! Đuổi [${attackerMonster.name}] về chỗ cũ và hủy đòn tấn công!`;
      battleLog.push(msg);
      state.actionLog.push({ turn: state.turnNumber, message: msg });
      trapTriggered = { trap, activatorId: targetPlayer.id, activatorName: targetPlayer.name, effectType: 'BOUNCE' };
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'TRAP',
        card: trap,
        cardId: 'NQ-08',
        activatorId: targetPlayer.id,
        title: `Bẫy Thiên Cơ: ${trap.name}`,
        resultText: msg,
        icon: '👑'
      });
      return {
        type: 'TRAP_BOUNCED',
        damageDealt: 0,
        attackerDestroyed: false,
        defenderDestroyed: false,
        logs: battleLog,
        trapTriggered
      };
    }

    // Bẫy NQ-12: Phép Biến Hình Quả Thị Của Tấm (Đổi quyền sở hữu với 1 Linh Thú Cấp Thấp của người thứ 3 ra hứng đòn thay)
    const nq12Idx = !targetTrapsDisabledByTR02
      ? targetPlayer.trapSlots.findIndex(t => t && t.cardId === 'NQ-12' && t.setTurnNumber < state.turnNumber)
      : -1;
    if (nq12Idx !== -1) {
      let thirdParty = null;
      let thirdSlot = -1;
      for (const p of Object.values(state.players)) {
        if (p.id !== targetPlayer.id && p.id !== attackerId && !p.isGhost) {
          const sIdx = p.monsterSlots.findIndex(m => m && (ALL_96_CARDS[m.cardId]?.type === CARD_TYPES.LOW_MONSTER || m.type === CARD_TYPES.LOW_MONSTER));
          if (sIdx !== -1) {
            thirdParty = p;
            thirdSlot = sIdx;
            break;
          }
        }
      }
      if (thirdParty && thirdSlot !== -1) {
        const trap = targetPlayer.trapSlots[nq12Idx];
        targetPlayer.trapSlots[nq12Idx] = null;
        state.graveyard.push(trap);
        const swappedIn = thirdParty.monsterSlots[thirdSlot];
        thirdParty.monsterSlots[thirdSlot] = defenderMonster;
        targetPlayer.monsterSlots[chosenTargetSlot] = swappedIn;
        defenderMonster = swappedIn;
        trapTriggered = { trap, activatorId: targetPlayer.id, activatorName: targetPlayer.name, effectType: 'SWAP' };
        const msg = `🔄 BẪY LẬT [${trap.name}]! ${targetPlayer.name} hoán đổi [${thirdParty.monsterSlots[thirdSlot].name}] lấy [${swappedIn.name}] của ${thirdParty.name} ra hứng đòn thay!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'TRAP',
          card: trap,
          cardId: 'NQ-12',
          activatorId: targetPlayer.id,
          title: `Bẫy Thiên Cơ: ${trap.name}`,
          resultText: msg,
          icon: '🍑'
        });
      }
    }

    const defCardData = ALL_96_CARDS[defenderMonster.cardId] || defenderMonster;
    const defenderHasDC04 = (defenderMonster.equippedItems || []).some(it => it.cardId === 'DC-04');
    const defenderHasDC06 = (defenderMonster.equippedItems || []).some(it => it.cardId === 'DC-06');

    // DC-05: Áo Tơi Lá Cọ Phản Đòn (Phản lại 1 điểm sát thương vào kẻ tấn công mỗi khi Chiến Thần mang Áo Tơi bị đánh)
    const defenderHasDC05 = (defenderMonster.equippedItems || []).some(it => it.cardId === 'DC-05');
    if (defenderHasDC05) {
      this.applyDamage(state, attackerPlayer, 1, targetPlayer.id);
      const msg = `🧥 DC-05 Áo Tơi Lá Cọ Phản Đòn: Gai nhọn hộ thân phản lại 1 sát thương vào ${attackerPlayer.name}!`;
      battleLog.push(msg);
      state.actionLog.push({ turn: state.turnNumber, message: msg });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        cardId: 'DC-05',
        activatorId: targetPlayer.id,
        title: 'Hiệu Ứng Pháp Bảo: Áo Tơi Lá Cọ Phản Đòn',
        resultText: msg,
        icon: '🧥'
      });
    }

    // Bẫy NQ-06 Vỏ Quýt Dày: Tăng +3 Độ Chiến cho Chiến Thần bị đánh
    let trapBonusDefPower = 0;
    const nq06Idx = !targetTrapsDisabledByTR02
      ? targetPlayer.trapSlots.findIndex(t => t && t.cardId === 'NQ-06' && t.setTurnNumber < state.turnNumber)
      : -1;
    if (nq06Idx !== -1) {
      const trap = targetPlayer.trapSlots[nq06Idx];
      targetPlayer.trapSlots[nq06Idx] = null;
      state.graveyard.push(trap);
      trapBonusDefPower = 3;
      trapTriggered = { trap, activatorId: targetPlayer.id, activatorName: targetPlayer.name, effectType: 'BUFF' };
      const msg = `⚠️ BẪY LẬT: ${targetPlayer.name} kích hoạt [${trap.name}]! [${defenderMonster.name}] được cộng thêm +3 Độ Chiến trong pha này!`;
      battleLog.push(msg);
      state.actionLog.push({ turn: state.turnNumber, message: msg });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'TRAP',
        card: trap,
        cardId: 'NQ-06',
        activatorId: targetPlayer.id,
        title: `Bẫy Thiên Cơ: ${trap.name}`,
        resultText: msg,
        icon: '🍊'
      });
    }

    // Ghi nhận thông báo các nội tại tăng Độ Chiến khi giao tranh
    this.recordPassiveCombatBuffs(state, attackerId, attackerSlotIndex, {
      isAttacking: true,
      targetCardType: defCardData.type,
      targetPlayerId: targetId,
      opponentHasDC06: defenderHasDC06,
      opponentId: targetId
    }, battleLog);

    this.recordPassiveCombatBuffs(state, targetId, chosenTargetSlot, {
      isDefending: true,
      targetCardType: atkCardData.type,
      opponentHasDC06: attackerHasDC06,
      opponentId: attackerId
    }, battleLog);

    const atkPower = this.calculateMonsterPower(state, attackerId, attackerSlotIndex, {
      isAttacking: true,
      targetCardType: defCardData.type,
      targetPlayerId: targetId,
      opponentHasDC06: defenderHasDC06
    });

    const defPower = this.calculateMonsterPower(state, targetId, chosenTargetSlot, {
      isDefending: true,
      targetCardType: atkCardData.type,
      opponentHasDC06: attackerHasDC06
    }) + trapBonusDefPower;

    battleLog.push(`${attackerMonster.name} (${atkPower} ⚔️) giao tranh với ${defenderMonster.name} (${defPower} ⚔️)`);

    let attackerDestroyed = false;
    let defenderDestroyed = false;

    if (atkPower > defPower) {
      // Kẻ tấn công thắng
      const diff = atkPower - defPower;
      defenderDestroyed = true;

      // Kiểm tra bảo hộ của Mai Rùa Vàng Kim Quy / Nồi Cơm Điện (DC-02)
      const dc02Index = (defenderMonster.equippedItems || []).findIndex(it => it.cardId === 'DC-02');
      if (dc02Index !== -1) {
        const [usedPot] = defenderMonster.equippedItems.splice(dc02Index, 1);
        state.graveyard.push(usedPot);
        defenderDestroyed = false;
        const msg = `🛡️ DC-02 Mai Rùa Vàng Kim Quy: Bảo vệ [${defenderMonster.name}] khỏi bị tiêu diệt trong giao tranh!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: usedPot,
          cardId: 'DC-02',
          activatorId: targetId,
          title: `Hiệu Ứng Pháp Bảo: ${usedPot.name}`,
          resultText: msg,
          icon: '🛡️'
        });
      }

      // DC-09: Túi Ba Gang Đựng Vàng — Cướp luôn 1 lá Pháp Bảo Đạo Cụ của đối thủ khi đánh thắng Linh Thú của họ
      const attackerHasDC09 = (attackerMonster.equippedItems || []).some(it => it.cardId === 'DC-09');
      if (attackerHasDC09 && defenderMonster.equippedItems && defenderMonster.equippedItems.length > 0) {
        const stolenEquip = defenderMonster.equippedItems.pop();
        attackerMonster.equippedItems = attackerMonster.equippedItems || [];
        if (attackerMonster.equippedItems.length < 2) {
          attackerMonster.equippedItems.push(stolenEquip);
        } else {
          attackerPlayer.hand.push(stolenEquip);
        }
        const msg = `💰 DC-09 Túi Ba Gang Đựng Vàng: [${attackerMonster.name}] thu chiến lợi phẩm, cướp luôn Pháp Bảo [${stolenEquip.name}] của đối thủ!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          cardId: 'DC-09',
          activatorId: attackerId,
          title: 'Hiệu Ứng Pháp Bảo: Túi Ba Gang Đựng Vàng',
          resultText: msg,
          icon: '💰'
        });
      }

      // Tính sát thương chênh lệch vào Nhân Phẩm đối thủ
      let damageToDefender = diff;
      if (defenderMonster.cardId === 'CT-23' && !defenderHasDC04 && !attackerHasDC06) {
        damageToDefender = 0;
        const msg = `🐘 CT-23 Voi Chín Ngà Bản Đôn: Thân hình khổng lồ cản phá toàn bộ sát thương vượt trội về 0!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: defenderMonster,
          cardId: 'CT-23',
          activatorId: targetId,
          title: `Nội Tại Linh Thú: ${defenderMonster.name}`,
          resultText: msg,
          icon: '🐘'
        });
      }

      // TR-06: Ngư Tinh Chín Đuôi Biển Đông gây thêm 1 sát thương xuyên giáp
      if (attackerMonster.cardId === 'TR-06' && !attackerHasDC04) {
        damageToDefender += 1;
        const msg = `🦈 TR-06 Ngư Tinh Chín Đuôi: Sóng thần cuộn trào gây thêm +1 sát thương xuyên giáp vào Nhân Phẩm của ${targetPlayer.name}!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: attackerMonster,
          cardId: 'TR-06',
          activatorId: attackerId,
          title: `Nội Tại Thần Thú: ${attackerMonster.name}`,
          resultText: msg,
          icon: '🦈'
        });
      }

      this.applyDamage(state, targetPlayer, damageToDefender, attackerId);
      const winMsg = `${defenderMonster.name} thua trận. ${targetPlayer.name} mất ${damageToDefender} Điểm Nhân Phẩm!`;
      battleLog.push(winMsg);
      state.actionLog.push({ turn: state.turnNumber, message: winMsg });

      // DH-05: Ma Vương Chí Phèo Làng Vũ Đại — Khi nhận sát thương hoặc bị tiêu diệt, kẻ gây ra phải chịu GẤP ĐÔI lượng sát thương Nhân Phẩm đó
      if (defenderMonster.cardId === 'DH-05' && !defenderHasDC04) {
        const backlash = Math.max(1, damageToDefender) * 2;
        this.applyDamage(state, attackerPlayer, backlash, targetId);
        const msg = `🍶 DH-05 Ma Vương Chí Phèo ăn vạ kinh hoàng: Phản ngược gấp đôi (${backlash} sát thương Nhân Phẩm) vào ${attackerPlayer.name}!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: defenderMonster,
          cardId: 'DH-05',
          activatorId: targetId,
          title: `Nội Tại Dung Hợp: ${defenderMonster.name}`,
          resultText: msg,
          icon: '🍶'
        });
      }

      // CT-19: Sếu Đầu Đỏ Đồng Tháp — Hồi +1 HP khi đánh bại Linh Thú đối thủ
      if (attackerMonster.cardId === 'CT-19' && !attackerHasDC04) {
        this.applyHealing(state, attackerPlayer, 1);
        const msg = `🦢 CT-19 Sếu Đầu Đỏ Đồng Tháp: Vũ điệu linh thiêng hồi +1 Điểm Nhân Phẩm cho ${attackerPlayer.name}!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: attackerMonster,
          cardId: 'CT-19',
          activatorId: attackerId,
          title: `Nội Tại Linh Thú: ${attackerMonster.name}`,
          resultText: msg,
          icon: '🦢'
        });
      }

      // Bẫy NQ-14: Đồng Quy Vu Tận (kéo kẻ tấn công cùng tử trận và cả hai người chơi cùng mất 1 Điểm Nhân Phẩm)
      const nq14Idx = !targetTrapsDisabledByTR02
        ? targetPlayer.trapSlots.findIndex(t => t && t.cardId === 'NQ-14' && t.setTurnNumber < state.turnNumber)
        : -1;
      if (nq14Idx !== -1) {
        const trap = targetPlayer.trapSlots[nq14Idx];
        targetPlayer.trapSlots[nq14Idx] = null;
        state.graveyard.push(trap);
        attackerDestroyed = true;
        this.applyDamage(state, attackerPlayer, 1, targetId);
        this.applyDamage(state, targetPlayer, 1, attackerId);
        trapTriggered = { trap, activatorId: targetPlayer.id, activatorName: targetPlayer.name, effectType: 'DESTROY_BOTH' };
        const msg = `⚠️ BẪY LẬT: ${targetPlayer.name} kích hoạt [${trap.name}]! Đồng quy vu tận kéo [${attackerMonster.name}] xuống Bãi Rác và cả hai cùng mất 1 HP!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'TRAP',
          card: trap,
          cardId: 'NQ-14',
          activatorId: targetPlayer.id,
          title: `Bẫy Thiên Cơ: ${trap.name}`,
          resultText: msg,
          icon: '💥'
        });
        this.destroyMonsterToGraveyard(state, attackerId, attackerSlotIndex, targetId, battleLog);
      }

      // Bẫy NQ-02: Tiếng Kêu Oan Thị Kính (kẻ tấn công phải đền 2 lá bài)
      const nq02Idx = !targetTrapsDisabledByTR02
        ? targetPlayer.trapSlots.findIndex(t => t && t.cardId === 'NQ-02' && t.setTurnNumber < state.turnNumber)
        : -1;
      if (nq02Idx !== -1) {
        const trap = targetPlayer.trapSlots[nq02Idx];
        targetPlayer.trapSlots[nq02Idx] = null;
        state.graveyard.push(trap);
        let stolen = 0;
        while (stolen < 2 && attackerPlayer.hand.length > 0) {
          targetPlayer.hand.push(attackerPlayer.hand.pop());
          stolen++;
        }
        trapTriggered = { trap, activatorId: targetPlayer.id, activatorName: targetPlayer.name, effectType: 'STEAL' };
        const msg = `⚠️ BẪY LẬT: ${targetPlayer.name} kích hoạt [${trap.name}]! Bắt ${attackerPlayer.name} bồi thường ${stolen} lá bài trên tay!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'TRAP',
          card: trap,
          cardId: 'NQ-02',
          activatorId: targetPlayer.id,
          title: `Bẫy Thiên Cơ: ${trap.name}`,
          resultText: msg,
          icon: '🙏'
        });
      }

      // Xử lý đưa vào Bãi Rác và hiệu ứng On-Destroy
      if (defenderDestroyed) {
        this.destroyMonsterToGraveyard(state, targetId, chosenTargetSlot, attackerId, battleLog, {
          blockedByDC06: attackerHasDC06
        });
      }
    } else if (atkPower < defPower) {
      // Kẻ tấn công thua
      const diff = defPower - atkPower;
      attackerDestroyed = true;

      this.applyDamage(state, attackerPlayer, diff, targetId);
      const loseMsg = `${attackerMonster.name} thua trận và bị tiêu diệt. ${attackerPlayer.name} mất ${diff} Điểm Nhân Phẩm!`;
      battleLog.push(loseMsg);
      state.actionLog.push({ turn: state.turnNumber, message: loseMsg });

      if (attackerMonster.cardId === 'DH-05' && !attackerHasDC04) {
        const backlash = diff * 2;
        this.applyDamage(state, targetPlayer, backlash, attackerId);
        const msg = `🍶 DH-05 Ma Vương Chí Phèo ăn vạ: Bắt ${targetPlayer.name} chịu gấp đôi (${backlash} sát thương Nhân Phẩm)!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: attackerMonster,
          cardId: 'DH-05',
          activatorId: attackerId,
          title: `Nội Tại Dung Hợp: ${attackerMonster.name}`,
          resultText: msg,
          icon: '🍶'
        });
      }

      this.destroyMonsterToGraveyard(state, attackerId, attackerSlotIndex, targetId, battleLog);
    } else {
      // Cả hai bằng Độ Chiến: Cùng vào Bãi Rác, không ai mất máu
      attackerDestroyed = true;
      defenderDestroyed = true;
      const tieMsg = 'Hai Chiến Thần ngang tài ngang sức! Cùng nắm tay nhau vào Bãi Rác.';
      battleLog.push(tieMsg);
      state.actionLog.push({ turn: state.turnNumber, message: tieMsg });

      if (defenderMonster.cardId === 'DH-05' && !defenderHasDC04) {
        this.applyDamage(state, attackerPlayer, 2, targetId);
        const msg = `🍶 DH-05 Ma Vương Chí Phèo bị tiêu diệt: Bắt ${attackerPlayer.name} đền 2 Điểm Nhân Phẩm!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: defenderMonster,
          cardId: 'DH-05',
          activatorId: targetId,
          title: `Nội Tại Dung Hợp: ${defenderMonster.name}`,
          resultText: msg,
          icon: '🍶'
        });
      }
      if (attackerMonster.cardId === 'DH-05' && !attackerHasDC04) {
        this.applyDamage(state, targetPlayer, 2, attackerId);
        const msg = `🍶 DH-05 Ma Vương Chí Phèo bị tiêu diệt: Bắt ${targetPlayer.name} đền 2 Điểm Nhân Phẩm!`;
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: attackerMonster,
          cardId: 'DH-05',
          activatorId: attackerId,
          title: `Nội Tại Dung Hợp: ${attackerMonster.name}`,
          resultText: msg,
          icon: '🍶'
        });
      }

      this.destroyMonsterToGraveyard(state, attackerId, attackerSlotIndex, targetId, battleLog);
      this.destroyMonsterToGraveyard(state, targetId, chosenTargetSlot, attackerId, battleLog, {
        blockedByDC06: attackerHasDC06
      });
    }

    return {
      type: 'MONSTER_BATTLE',
      resolvedTargetSlot: chosenTargetSlot,
      atkPower,
      defPower,
      attackerDestroyed,
      defenderDestroyed,
      logs: battleLog,
      trapTriggered
    };
  }

  /**
   * Đưa Chiến Thần và toàn bộ Đạo Cụ gắn kèm vào Bãi Rác, kích hoạt các hiệu ứng phản hồi
   */
  static destroyMonsterToGraveyard(state, ownerId, slotIndex, killerPlayerId, battleLog = [], options = {}) {
    const player = state.players[ownerId];
    if (!player) return;
    const monster = player.monsterSlots[slotIndex];
    if (!monster) return;

    const hasDC04 = (monster.equippedItems || []).some(it => it.cardId === 'DC-04');
    const cardData = ALL_96_CARDS[monster.cardId] || monster;
    const tribe = monster.tribe || cardData.tribe;
    const isBlockedByDC06 = Boolean(
      options.blockedByDC06 && (tribe === TRIBES.HONG_HOT || tribe === TRIBES.AN_VA)
    );

    // CT-09 Linh Miêu Mái Đình: Lần đầu chết quay về tay thay vì vào Bãi Rác
    if (monster.cardId === 'CT-09' && !monster.hasRevivedOnce && !hasDC04) {
      monster.hasRevivedOnce = true;
      if (monster.equippedItems && monster.equippedItems.length > 0) {
        state.graveyard.push(...monster.equippedItems);
        monster.equippedItems = [];
      }
      player.monsterSlots[slotIndex] = null;
      player.hand.push(monster);
      const msg = `🐈 CT-09 Linh Miêu Mái Đình: Bật nhảy thoát hiểm quay lại tay của ${player.name} thay vì vào Bãi Rác!`;
      battleLog.push(msg);
      state.actionLog.push({ turn: state.turnNumber, message: msg });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: monster,
        cardId: 'CT-09',
        activatorId: ownerId,
        title: `Nội Tại Linh Thú: ${monster.name}`,
        resultText: msg,
        icon: '🐈'
      });
      return;
    }

    // Đưa Đạo Cụ gắn kèm vào Bãi Rác và kích hoạt hiệu ứng của Đạo Cụ
    if (monster.equippedItems) {
      for (const item of monster.equippedItems) {
        state.graveyard.push(item);
        // DC-01 Nỏ Thần Liên Châu / Dép Tổ Ong: bắn trả trừ 1 HP kẻ tấn công
        if (item.cardId === 'DC-01' && killerPlayerId && state.players[killerPlayerId]) {
          this.applyDamage(state, state.players[killerPlayerId], 1, ownerId);
          const msg = `🏹 DC-01 Nỏ Thần Liên Châu: Bắn trả tên thần trừ 1 Điểm Nhân Phẩm của ${state.players[killerPlayerId].name}!`;
          battleLog.push(msg);
          state.actionLog.push({ turn: state.turnNumber, message: msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            card: item,
            cardId: 'DC-01',
            activatorId: ownerId,
            title: `Hiệu Ứng Pháp Bảo: ${item.name}`,
            resultText: msg,
            icon: '🏹'
          });
        }
      }
    }

    // Xử lý hiệu ứng khi bị tiêu diệt (nếu không bị DC-04 hoặc DC-06 khóa)
    if (!hasDC04 && !isBlockedByDC06) {
      // CT-04 Cóc Tía Nghiến Răng: Kẻ tiêu diệt phải đền 1 lá bài trên tay
      if (monster.cardId === 'CT-04' && killerPlayerId && state.players[killerPlayerId]) {
        const killer = state.players[killerPlayerId];
        if (killer.hand.length > 0) {
          const stolenCard = killer.hand.pop();
          player.hand.push(stolenCard);
          const msg = `🐸 CT-04 Cóc Tía Nghiến Răng: Trời giáng phạt bắt ${killer.name} đền 1 lá bài [${stolenCard.name}] cho ${player.name}!`;
          battleLog.push(msg);
          state.actionLog.push({ turn: state.turnNumber, message: msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            card: monster,
            cardId: 'CT-04',
            activatorId: ownerId,
            title: `Nội Tại Linh Thú: ${monster.name}`,
            resultText: msg,
            icon: '🐸'
          });
        }
      }

      // TR-12 Hỏa Kỳ Lân Phun Lửa Thiêng: Nổ tung khi bị tiêu diệt, trừ 2 HP mọi người có quân trên sân
      if (monster.cardId === 'TR-12') {
        const msg = '🔥 TR-12 Hỏa Kỳ Lân nổ tung biển lửa! Mọi người chơi có Linh Thú trên sân mất 2 Điểm Nhân Phẩm!';
        battleLog.push(msg);
        state.actionLog.push({ turn: state.turnNumber, message: msg });
        for (const p of Object.values(state.players)) {
          const hasMonster = p.monsterSlots.some(m => m !== null && m !== monster);
          if (hasMonster || p.id === ownerId) {
            this.applyDamage(state, p, 2, ownerId);
          }
        }
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: monster,
          cardId: 'TR-12',
          activatorId: ownerId,
          title: `Hiệu Ứng Thần Thú: ${monster.name}`,
          resultText: msg,
          icon: '🔥'
        });
      }
    }

    // Đưa quân bài vào Bãi Rác
    state.graveyard.push(monster);
    player.monsterSlots[slotIndex] = null;

    // Nếu là CT-23 (chiếm 2 slot), dọn sạch cả 2 slot
    if (monster.cardId === 'CT-23') {
      player.monsterSlots = [null, null];
    }

    // TR-07: Dũng Sĩ Thạch Sanh Cung Vàng — Khi bị tiêu diệt bởi đòn tấn công hoặc Bẫy, triệu hồi miễn phí 1 Linh Thú Cấp Thấp từ tay hoặc Bãi Rác lên sân
    if (monster.cardId === 'TR-07' && !hasDC04) {
      const emptySlot = player.monsterSlots.findIndex(s => s === null);
      if (emptySlot !== -1) {
        let lowIdx = player.hand.findIndex(c => (ALL_96_CARDS[c.cardId]?.type || c.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23');
        let summonedFrom = 'tay';
        let replacement = null;
        if (lowIdx !== -1) {
          [replacement] = player.hand.splice(lowIdx, 1);
        } else {
          const graveIdx = state.graveyard.findIndex(c => (ALL_96_CARDS[c.cardId]?.type || c.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23');
          if (graveIdx !== -1) {
            [replacement] = state.graveyard.splice(graveIdx, 1);
            summonedFrom = 'Bãi Rác';
          }
        }
        if (replacement) {
          player.monsterSlots[emptySlot] = replacement;
          const msg = `🏹 TR-07 Dũng Sĩ Thạch Sanh: Nghĩa khí triệu hồi miễn phí [${replacement.name}] từ ${summonedFrom} lên sân!`;
          battleLog.push(msg);
          state.actionLog.push({ turn: state.turnNumber, message: msg });
          GameState.pushEffectEvent(state, {
            mode: 'PASSIVE',
            category: 'PASSIVE',
            card: monster,
            cardId: 'TR-07',
            activatorId: ownerId,
            title: `Nội Tại Thần Thú: ${monster.name}`,
            resultText: msg,
            icon: '🏹'
          });
        }
      }
    }
  }

  /**
   * Trừ máu người chơi an toàn (Đồng bộ máu chung nếu chơi Team Mode)
   * Tự động kích hoạt Bẫy NQ-16 (Phút 89 Lật Kèo) nếu dính sát thương tử thần
   */
  static applyDamage(state, player, amount, sourcePlayerId = null) {
    if (!player || amount <= 0) return;

    // Kiểm tra Bẫy NQ-16: Phút 89 Lật Kèo
    const currentHp = (state.isTeamMode && state.teamHp && player.teamId)
      ? state.teamHp[player.teamId]
      : player.hp;

    if (currentHp - amount <= 0) {
      const playersToCheck = (state.isTeamMode && player.teamId)
        ? Object.values(state.players).filter(p => p.teamId === player.teamId && !p.isGhost)
        : [player];

      let nq16Owner = null;
      let nq16Idx = -1;

      for (const p of playersToCheck) {
        const idx = p.trapSlots.findIndex(t => t && t.cardId === 'NQ-16' && t.setTurnNumber < state.turnNumber);
        if (idx !== -1) {
          nq16Owner = p;
          nq16Idx = idx;
          break;
        }
      }

      if (nq16Owner && nq16Idx !== -1) {
        const trap = nq16Owner.trapSlots[nq16Idx];
        nq16Owner.trapSlots[nq16Idx] = null;
        state.graveyard.push(trap);

        if (state.isTeamMode && state.teamHp && player.teamId) {
          state.teamHp[player.teamId] = 1;
          for (const p of Object.values(state.players)) {
            if (p.teamId === player.teamId) p.hp = 1;
          }
        } else {
          player.hp = 1;
        }

        for (let i = 0; i < 2; i++) {
          if (state.drawPile.length > 0) {
            nq16Owner.hand.push(state.drawPile.pop());
          }
        }

        const msg = `🚨 BẪY LẬT [${trap.name}]! ${player.name} thoát chết thần kỳ ở 1 Điểm Nhân Phẩm! ${nq16Owner.name} bốc thêm 2 lá bài!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'TRAP',
          card: trap,
          cardId: 'NQ-16',
          activatorId: nq16Owner.id,
          title: `Bẫy Thiên Cơ: ${trap.name}`,
          resultText: msg,
          icon: '🧙‍♂️'
        });
        return;
      }
    }

    if (state.isTeamMode && state.teamHp && player.teamId) {
      const team = player.teamId;
      const oldHp = state.teamHp[team];
      const newHp = Math.max(0, oldHp - amount);
      state.teamHp[team] = newHp;
      GameState.pushDamageEvent(state, {
        targetPlayerId: player.id,
        targetPlayerName: player.name,
        amount: Math.max(1, oldHp - newHp),
        oldHp,
        newHp,
        sourcePlayerId,
        isTeamDamage: true,
        teamId: team
      });
      for (const p of Object.values(state.players)) {
        if (p.teamId === team) {
          p.hp = state.teamHp[team];
          if (p.hp === 0 && !p.isGhost) {
            GhostSystem.transformToGhost(state, p.id, sourcePlayerId);
          }
        }
      }
    } else {
      const oldHp = player.hp;
      const newHp = Math.max(0, oldHp - amount);
      player.hp = newHp;
      GameState.pushDamageEvent(state, {
        targetPlayerId: player.id,
        targetPlayerName: player.name,
        amount: Math.max(1, oldHp - newHp),
        oldHp,
        newHp,
        sourcePlayerId,
        isTeamDamage: false,
        teamId: null
      });
      if (player.hp === 0 && !player.isGhost) {
        GhostSystem.transformToGhost(state, player.id, sourcePlayerId);
      }
    }
  }

  /**
   * Hồi máu người chơi an toàn (Đồng bộ máu chung nếu chơi Team Mode)
   */
  static applyHealing(state, player, amount) {
    if (!player || amount <= 0) return;
    if (state.isTeamMode && state.teamHp && player.teamId) {
      const team = player.teamId;
      const maxHp = Math.max(20, (Object.keys(state.players).length / 2) * 10);
      state.teamHp[team] = Math.min(maxHp, state.teamHp[team] + amount);
      for (const p of Object.values(state.players)) {
        if (p.teamId === team) {
          p.hp = state.teamHp[team];
        }
      }
    } else {
      player.hp = Math.min(10, player.hp + amount);
    }
  }
}
