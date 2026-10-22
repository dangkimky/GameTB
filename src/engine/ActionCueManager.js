import { ALL_96_CARDS, CARD_TYPES } from '../data/cards.js';
import { PHASES } from '../core/GameState.js';

export class ActionCueManager {
  /**
   * Phân tích trạng thái sàn đấu và xác định nút hành động nên làm sáng để gợi ý người chơi
   */
  static getSuggestedAction(state, localPlayerId, selectedHandInstanceId = null) {
    if (!state || !localPlayerId) return null;

    const isMyTurn = state.turnOrder[state.currentTurnIndex] === localPlayerId;
    if (!isMyTurn) return null;

    const player = state.players[localPlayerId];
    if (!player || player.isGhost) return null;

    const hasEmptyMonsterSlot = player.monsterSlots.some(s => s === null);
    const hasEmptyTrapSlot = player.trapSlots.some(s => s === null);
    const hasMonsterOnBoard = player.monsterSlots.some(s => s !== null && !s.isGhostSlotMarker);
    const canNormalSummon = !state.normalSummonUsed || (state.bonusSummonsAvailable > 0);

    // 1. Nếu người chơi đang chọn 1 lá bài cụ thể trên tay
    if (selectedHandInstanceId) {
      const card = player.hand.find(c => c.instanceId === selectedHandInstanceId);
      if (card) {
        const cardData = ALL_96_CARDS[card.cardId] || card;
        const type = card.type || cardData.type;

        if (type === CARD_TYPES.LOW_MONSTER) {
          if (canNormalSummon && hasEmptyMonsterSlot) {
            return 'btn-action-summon';
          }
          if (!state.swarmSummonUsedThisTurn && hasEmptyMonsterSlot && card.cardId !== 'CT-23') {
            return 'btn-action-swarm';
          }
        } else if (type === CARD_TYPES.TRAP) {
          if (hasEmptyTrapSlot) {
            return 'btn-action-trap';
          }
        } else if (type === CARD_TYPES.DRAMA) {
          return 'btn-action-drama';
        } else if (type === CARD_TYPES.EQUIPMENT) {
          return 'btn-action-equip';
        } else if (type === CARD_TYPES.HIGH_MONSTER) {
          if (canNormalSummon && hasMonsterOnBoard) {
            return 'btn-action-tribute';
          }
          if (card.cardId === 'TR-14' && !state.swarmSummonUsedThisTurn && hasEmptyMonsterSlot) {
            return 'btn-action-swarm';
          }
        }
      }
    }

    // 2. Gợi ý theo giai đoạn (Phase) nếu chưa chọn thẻ cụ thể
    if (state.currentPhase === PHASES.MAIN || state.currentPhase === PHASES.DRAW) {
      const hasLowMonsterInHand = player.hand.some(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return (c.type || d.type) === CARD_TYPES.LOW_MONSTER;
      });

      if (canNormalSummon && hasEmptyMonsterSlot && hasLowMonsterInHand) {
        return 'btn-action-summon';
      }

      // Nếu đã triệu hồi thường mà vẫn còn lượt Gọi Bầy (swarmSummon) và còn ô trống + Linh Thú trên tay -> Gợi ý Gọi Bầy!
      const hasSwarmableInHand = player.hand.some(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return ((c.type || d.type) === CARD_TYPES.LOW_MONSTER && c.cardId !== 'CT-23') || c.cardId === 'TR-14';
      });
      if (!state.swarmSummonUsedThisTurn && hasEmptyMonsterSlot && hasSwarmableInHand && hasMonsterOnBoard) {
        return 'btn-action-swarm';
      }

      const hasTrapInHand = player.hand.some(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return (c.type || d.type) === CARD_TYPES.TRAP;
      });

      if (hasEmptyTrapSlot && hasTrapInHand) {
        return 'btn-action-trap';
      }

      const canAttackMonster = player.monsterSlots.some((m, idx) => {
        if (!m || m.isGhostSlotMarker || m.cannotAttack || m.cardId === 'CT-10') return false;
        const maxAtk = ['TR-04', 'DH-11'].includes(m.cardId) ? 2 : 1;
        const usedAtk = state.attacksDeclaredThisTurn.filter(id => id === m.instanceId || id === `${localPlayerId}_${idx}`).length;
        return usedAtk < maxAtk;
      });

      if (canAttackMonster && ((state.turnNumber > 1 && !state.openingRoundActive) || state.allowFirstTurnAttack)) {
        return 'btn-action-attack';
      }

      return 'btn-action-endturn';
    }

    if (state.currentPhase === PHASES.BATTLE) {
      const availableMonsterSlot = player.monsterSlots.findIndex((m, idx) => {
        if (!m || m.isGhostSlotMarker || m.cannotAttack || m.cardId === 'CT-10') return false;
        const maxAtk = ['TR-04', 'DH-11'].includes(m.cardId) ? 2 : 1;
        const usedAtk = state.attacksDeclaredThisTurn.filter(id => id === m.instanceId || id === `${localPlayerId}_${idx}`).length;
        return usedAtk < maxAtk;
      });

      if (availableMonsterSlot !== -1) {
        return 'btn-action-attack';
      }

      return 'btn-action-endturn';
    }

    if (state.currentPhase === PHASES.END) {
      return 'btn-action-endturn';
    }

    return null;
  }
}
