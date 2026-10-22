import { ALL_96_CARDS, CARD_TYPES } from '../data/cards.js';

export class ChainResolver {
  /**
   * Kiểm tra xem một lá Bài Nghiệp Quật có đủ điều kiện lật lên hay không
   */
  static canActivateTrap(state, playerId, trapSlotIndex, triggerContext = {}) {
    const player = state.players[playerId];
    if (!player) return false;

    const trapEntry = player.trapSlots[trapSlotIndex];
    if (!trapEntry || trapEntry.faceUp) return false;

    // QUY TẮC CỐT LÕI: Bẫy mới úp trong lượt này không được lật ngay
    if (trapEntry.setTurnNumber >= state.turnNumber) {
      return false;
    }

    // TR-11 Hacker Đánh Sập Mạng: cấm nhìn hoặc lật bẫy trong Main Phase
    const hasTR11 = Object.values(state.players).some(p =>
      p.monsterSlots.some(m => m && m.cardId === 'TR-11')
    );
    if (hasTR11 && state.currentPhase === 'MAIN') {
      return false;
    }

    const cardData = ALL_96_CARDS[trapEntry.cardId];
    if (!cardData || cardData.type !== CARD_TYPES.TRAP) return false;

    // Kiểm tra trigger tương ứng
    switch (cardData.id) {
      case 'NQ-01': // Gương Phản Đòn: Khi bị tuyên bố tấn công
        return triggerContext.type === 'DECLARED_ATTACK' && triggerContext.targetId === playerId;

      case 'NQ-02': // Ăn Vạ Giữa Đường: Khi Chiến Thần của mình bị tiêu diệt
        return triggerContext.type === 'MONSTER_DESTROYED' && triggerContext.ownerId === playerId;

      case 'NQ-03': // Nhìn Gì Mà Nhìn: Bất kỳ lúc nào trong lượt người khác
        return state.turnOrder[state.currentTurnIndex] !== playerId;

      case 'NQ-04': // Đổ Vỏ: Khi sắp mất Điểm Nhân Phẩm
        return triggerContext.type === 'ABOUT_TO_TAKE_DAMAGE' && triggerContext.targetId === playerId;

      case 'NQ-05': // Camera Hành Trình: Khi đối thủ dùng Drama hoặc lật Bẫy (kể cả NQ-05 khác)
        return triggerContext.type === 'SPELL_OR_TRAP_ACTIVATED' && triggerContext.activatorId !== playerId;

      case 'NQ-06': // Vỏ Quýt Dày: Khi Chiến Thần của mình bị tấn công
        return triggerContext.type === 'MONSTER_ATTACKED' && triggerContext.defenderId === playerId;

      case 'NQ-07': // Giả Chết Bắt Quạ: Khi bị đánh trực diện
        return triggerContext.type === 'DIRECT_ATTACK' && triggerContext.targetId === playerId;

      case 'NQ-08': // Mách Mẹ: Khi bị Trùm hoặc Dung Hợp tấn công
        return (
          triggerContext.type === 'DECLARED_ATTACK' &&
          triggerContext.targetId === playerId &&
          ['HIGH_MONSTER', 'FUSION_MONSTER'].includes(triggerContext.attackerCardType)
        );

      case 'NQ-09': // Cúp Nước: Khi đối thủ vừa triệu hồi Chiến Thần
        return triggerContext.type === 'MONSTER_SUMMONED' && triggerContext.summonerId !== playerId;

      case 'NQ-10': // Thu Phí Qua Đường: Khi bất kỳ ai tuyên bố tấn công
        return triggerContext.type === 'DECLARED_ATTACK';

      case 'NQ-11': // Cười Người...: Khi đối thủ cười hoặc chế giễu
        return triggerContext.type === 'LAUGH_DETECTED' || triggerContext.type === 'OPPONENT_PROVOKE';

      case 'NQ-12': // Đánh Tráo Khái Niệm: Khi Chiến Thần bị tấn công
        return triggerContext.type === 'MONSTER_ATTACKED' && triggerContext.defenderId === playerId;

      case 'NQ-13': // Hàng Giả Hàng Nhái: Khi bị cướp bài
        return triggerContext.type === 'CARD_STOLEN' && triggerContext.victimId === playerId;

      case 'NQ-14': // Đồng Quy Vu Tận: Khi thua giao tranh
        return triggerContext.type === 'BATTLE_LOST' && triggerContext.loserId === playerId;

      case 'NQ-15': // Nói Có Sách: Khi đối thủ bốc thêm bài ngoài lượt
        return triggerContext.type === 'BONUS_DRAW' && triggerContext.drawerId !== playerId;

      case 'NQ-16': // Phút 89: Khi máu sắp về 0
        return triggerContext.type === 'LETHAL_DAMAGE' && triggerContext.targetId === playerId;

      default:
        return false;
    }
  }

  /**
   * Thêm một hành động kích hoạt bẫy hoặc phép vào Chain Stack (Ngăn xếp chuỗi phản đòn)
   */
  static addToChain(state, { activatorId, cardInstance, sourceSlotIndex, triggerContext = {}, targetParams = {} }) {
    const chainLinkNumber = state.chainStack.length + 1;
    state.chainStack.push({
      chainLink: chainLinkNumber,
      activatorId,
      cardInstance,
      sourceSlotIndex,
      triggerContext,
      targetParams,
      isNegated: false
    });

    state.actionLog.push({
      turn: state.turnNumber,
      message: `[Chain Link ${chainLinkNumber}] ${state.players[activatorId].name} kích hoạt: ${cardInstance.name}!`
    });

    return chainLinkNumber;
  }

  /**
   * Giải quyết chuỗi phản đòn theo nguyên tắc LIFO (Lá kích hoạt sau cùng giải quyết trước)
   */
  static resolveChain(state, effectResolverCallback) {
    const resolutionLogs = [];

    // Lặp từ phần tử trên cùng của stack xuống đáy
    while (state.chainStack.length > 0) {
      const topLink = state.chainStack.pop();

      if (topLink.isNegated) {
        resolutionLogs.push(`[Chain Link ${topLink.chainLink}] ${topLink.cardInstance.name} đã bị vô hiệu hóa!`);
        state.graveyard.push(topLink.cardInstance);
        continue;
      }

      resolutionLogs.push(`[Chain Link ${topLink.chainLink}] Giải quyết hiệu ứng: ${topLink.cardInstance.name}`);

      // Thực thi callback hiệu ứng cụ thể
      if (typeof effectResolverCallback === 'function') {
        effectResolverCallback(state, topLink, resolutionLogs);
      }

      // Đưa lá bài đã giải quyết vào Bãi Rác
      state.graveyard.push(topLink.cardInstance);
    }

    return resolutionLogs;
  }
}
