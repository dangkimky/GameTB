import { ALL_96_CARDS, CARD_TYPES, TRIBES } from '../data/cards.js';

export class FusionSystem {
  /**
   * Kiểm tra xem người chơi có đủ nguyên liệu để Dung Hợp lá Thần Thú Huyền Thoại tương ứng không
   */
  static canFusionSummon(state, playerId, fusionCardId, materialInstanceIds = []) {
    const fusionCard = ALL_96_CARDS[fusionCardId];
    if (!fusionCard || fusionCard.type !== CARD_TYPES.FUSION_MONSTER) {
      return { valid: false, reason: 'Thẻ bài không phải là Thần Thú Dung Hợp' };
    }

    const player = state.players[playerId];
    if (!player) return { valid: false, reason: 'Người chơi không tồn tại' };

    const emptySlotIndex = player.monsterSlots.findIndex(s => s === null);
    const materialsOnFieldCount = materialInstanceIds.filter(id =>
      player.monsterSlots.some(m => m && m.instanceId === id)
    ).length;

    if (emptySlotIndex === -1 && materialsOnFieldCount === 0) {
      return { valid: false, reason: 'Sân của bạn không còn Ô Linh Thú trống' };
    }

    const availableCards = [
      ...player.monsterSlots.filter(m => m !== null && !m.isGhostSlotMarker),
      ...player.hand
    ];

    const selectedMaterials = materialInstanceIds
      .map(id => availableCards.find(c => c.instanceId === id))
      .filter(Boolean);

    if (selectedMaterials.length !== 2) {
      return { valid: false, reason: 'Cần đúng 2 nguyên liệu để Dung Hợp' };
    }

    const [mat1, mat2] = selectedMaterials;
    const cardData1 = ALL_96_CARDS[mat1.cardId] || mat1;
    const cardData2 = ALL_96_CARDS[mat2.cardId] || mat2;
    const type1 = mat1.type || cardData1.type;
    const type2 = mat2.type || cardData2.type;
    const tribe1 = mat1.tribe || cardData1.tribe;
    const tribe2 = mat2.tribe || cardData2.tribe;

    switch (fusionCardId) {
      case 'DH-01': // 2 Linh Thú hệ Linh Giác (Hóng Hớt)
        if (
          tribe1 === TRIBES.HONG_HOT &&
          tribe2 === TRIBES.HONG_HOT &&
          type1 === CARD_TYPES.LOW_MONSTER &&
          type2 === CARD_TYPES.LOW_MONSTER
        ) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần 2 Linh Thú Cấp Thấp hệ Linh Giác (Hóng Hớt)' };

      case 'DH-02': { // CT-02 + CT-12
        const ids02 = [mat1.cardId, mat2.cardId].sort();
        if (ids02[0] === 'CT-02' && ids02[1] === 'CT-12') {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần Khuyển Thần Đá (CT-02) và Chó Phú Quốc (CT-12)' };
      }

      case 'DH-03': { // 1 Dũng Mãnh (Quậy Phá) + 1 Pháp Bảo Đạo Cụ
        const hasQuayPha = (tribe1 === TRIBES.QUAY_PHA) || (tribe2 === TRIBES.QUAY_PHA);
        const hasEquip = (type1 === CARD_TYPES.EQUIPMENT) || (type2 === CARD_TYPES.EQUIPMENT);
        if (hasQuayPha && hasEquip) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần 1 Linh Thú hệ Dũng Mãnh (Quậy Phá) và 1 Pháp Bảo Đạo Cụ' };
      }

      case 'DH-04': // 2 Linh Thú hệ Thần Tốc (Tốc Độ)
        if (
          tribe1 === TRIBES.TOC_DO &&
          tribe2 === TRIBES.TOC_DO &&
          type1 === CARD_TYPES.LOW_MONSTER &&
          type2 === CARD_TYPES.LOW_MONSTER
        ) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần 2 Linh Thú Cấp Thấp hệ Thần Tốc (Tốc Độ)' };

      case 'DH-05': // 2 Linh Thú hệ Huyền Bí (Ăn Vạ)
        if (
          tribe1 === TRIBES.AN_VA &&
          tribe2 === TRIBES.AN_VA &&
          type1 === CARD_TYPES.LOW_MONSTER &&
          type2 === CARD_TYPES.LOW_MONSTER
        ) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần 2 Linh Thú Cấp Thấp hệ Huyền Bí (Ăn Vạ)' };

      case 'DH-06': { // TR-01 + 1 Linh Thú bất kỳ
        const hasTR01 = (mat1.cardId === 'TR-01') || (mat2.cardId === 'TR-01');
        const hasAnotherMonster = (
          [CARD_TYPES.LOW_MONSTER, CARD_TYPES.HIGH_MONSTER].includes(type1) &&
          [CARD_TYPES.LOW_MONSTER, CARD_TYPES.HIGH_MONSTER].includes(type2)
        );
        if (hasTR01 && hasAnotherMonster) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần Chằn Tinh Núi Đá (TR-01) và 1 Linh Thú bất kỳ' };
      }

      case 'DH-07': { // 1 Linh Thú của mình + 1 Linh Thú vừa thu phục/mượn từ đối thủ trong lượt này
        const isMat1Stolen = mat1.wasStolenTurn === state.turnNumber;
        const isMat2Stolen = mat2.wasStolenTurn === state.turnNumber;
        if ((isMat1Stolen && !isMat2Stolen) || (!isMat1Stolen && isMat2Stolen)) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần 1 Linh Thú của bạn và 1 Linh Thú vừa mượn từ đối thủ trong lượt này' };
      }

      case 'DH-08': { // CT-03 + CT-13
        const ids08 = [mat1.cardId, mat2.cardId].sort();
        if (ids08[0] === 'CT-03' && ids08[1] === 'CT-13') {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần Ngựa Sắt Phù Đổng (CT-03) và Quạ Thần Cắp Ngọc (CT-13)' };
      }

      case 'DH-09': { // Tứ Linh Hội Tụ: 2 Linh Thú Cấp Thấp khác Hệ đang đứng trên sân
        if (
          materialsOnFieldCount === 2 &&
          type1 === CARD_TYPES.LOW_MONSTER &&
          type2 === CARD_TYPES.LOW_MONSTER &&
          tribe1 &&
          tribe2 &&
          tribe1 !== tribe2
        ) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần 2 Linh Thú Cấp Thấp thuộc 2 Hệ khác nhau đang đứng trên sân' };
      }

      case 'DH-10': { // Kim Long Hóa Rồng: 1 Linh Giác (HONG_HOT) + 1 Thần Tốc (TOC_DO) trên sân
        const tribes10 = [tribe1, tribe2].sort();
        const expected10 = [TRIBES.HONG_HOT, TRIBES.TOC_DO].sort();
        if (
          materialsOnFieldCount === 2 &&
          type1 === CARD_TYPES.LOW_MONSTER &&
          type2 === CARD_TYPES.LOW_MONSTER &&
          tribes10[0] === expected10[0] &&
          tribes10[1] === expected10[1]
        ) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần 1 Linh Thú hệ Linh Giác + 1 hệ Thần Tốc đang đứng trên sân' };
      }

      case 'DH-11': { // Thánh Gióng Cưỡi Ngựa Sắt: 1 Trùm Cấp Cao (HIGH_MONSTER) trên sân + 1 Pháp Bảo Đạo Cụ (EQUIPMENT)
        const hasBossOnField = player.monsterSlots.some(
          m => m && (m.instanceId === mat1.instanceId || m.instanceId === mat2.instanceId) && ((m.type || ALL_96_CARDS[m.cardId]?.type) === CARD_TYPES.HIGH_MONSTER)
        );
        const hasEquip11 = (type1 === CARD_TYPES.EQUIPMENT) || (type2 === CARD_TYPES.EQUIPMENT);
        if (hasBossOnField && hasEquip11) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần 1 Đại Yêu / Thần Thú Cấp Cao trên sân và 1 Pháp Bảo Đạo Cụ' };
      }

      case 'DH-12': { // Sơn Tinh Dâng Núi: 1 Dũng Mãnh (QUAY_PHA) + 1 Huyền Bí (AN_VA) trên sân
        const tribes12 = [tribe1, tribe2].sort();
        const expected12 = [TRIBES.QUAY_PHA, TRIBES.AN_VA].sort();
        if (
          materialsOnFieldCount === 2 &&
          type1 === CARD_TYPES.LOW_MONSTER &&
          type2 === CARD_TYPES.LOW_MONSTER &&
          tribes12[0] === expected12[0] &&
          tribes12[1] === expected12[1]
        ) {
          return { valid: true };
        }
        return { valid: false, reason: 'Cần 1 Linh Thú hệ Dũng Mãnh + 1 hệ Huyền Bí đang đứng trên sân' };
      }

      default:
        return { valid: false, reason: 'Công thức Dung Hợp chưa xác định' };
    }
  }

  /**
   * Thực hiện triệu hồi Dung Hợp: Tiêu thụ 2 nguyên liệu và rước thẻ Huyền Thoại từ Chồng Huyền Thoại lên sân
   */
  static executeFusionSummon(state, playerId, fusionCardId, materialInstanceIds = []) {
    const check = this.canFusionSummon(state, playerId, fusionCardId, materialInstanceIds);
    if (!check.valid) {
      throw new Error(check.reason);
    }

    const player = state.players[playerId];
    const fusionData = ALL_96_CARDS[fusionCardId];
    let stolenMaterialVictimId = null;

    for (const matId of materialInstanceIds) {
      const slotIndex = player.monsterSlots.findIndex(m => m && m.instanceId === matId);
      if (slotIndex !== -1) {
        const [removed] = player.monsterSlots.splice(slotIndex, 1, null);
        if (removed.stolenFromPlayerId || removed.originalOwnerId) {
          stolenMaterialVictimId = removed.stolenFromPlayerId || removed.originalOwnerId;
        }
        if (removed.cardId === 'CT-23') {
          player.monsterSlots = [null, null];
        }
        if (removed.equippedItems) {
          state.graveyard.push(...removed.equippedItems);
        }
        state.graveyard.push(removed);
      } else {
        const handIndex = player.hand.findIndex(c => c.instanceId === matId);
        if (handIndex !== -1) {
          const [removed] = player.hand.splice(handIndex, 1);
          if (removed.stolenFromPlayerId || removed.originalOwnerId) {
            stolenMaterialVictimId = removed.stolenFromPlayerId || removed.originalOwnerId;
          }
          state.graveyard.push(removed);
        }
      }
    }

    const targetSlotIndex = player.monsterSlots.findIndex(s => s === null);
    if (targetSlotIndex === -1) {
      throw new Error('Lỗi logic: Không tìm thấy ô trống sau khi tiêu thụ nguyên liệu Dung Hợp');
    }

    if (state.fusionDeck) {
      const fIdx = state.fusionDeck.findIndex(c => (c.cardId || c.id) === fusionCardId);
      if (fIdx !== -1) {
        state.fusionDeck.splice(fIdx, 1);
      }
    }

    const newFusionMonster = {
      instanceId: `fusion-${Date.now()}-${fusionCardId}`,
      cardId: fusionCardId,
      name: fusionData.name,
      type: CARD_TYPES.FUSION_MONSTER,
      basePower: fusionData.power,
      equippedItems: [],
      statusEffects: [],
      isFusion: true,
      stolenMaterialVictimId: stolenMaterialVictimId || state.lastStolenFromPlayerId || null
    };

    player.monsterSlots[targetSlotIndex] = newFusionMonster;

    state.actionLog.push({
      turn: state.turnNumber,
      message: `🌀 DUNG HỢP THẦN THOẠI! ${player.name} triệu hồi ${fusionData.name} (${fusionData.power} ⚔️)!`
    });

    return newFusionMonster;
  }

  /**
   * Lấy mô tả công thức nguyên liệu chuẩn của 12 thẻ Huyền Thoại Dung Hợp
   */
  static getRecipeDescription(fusionCardId) {
    switch (fusionCardId) {
      case 'DH-01': return '2 Linh Thú Cấp Thấp hệ Linh Giác (Hóng Hớt)';
      case 'DH-02': return 'CT-02 (Khuyển Thần Đá) + CT-12 (Chó Phú Quốc)';
      case 'DH-03': return '1 Linh Thú hệ Dũng Mãnh + 1 Pháp Bảo Đạo Cụ';
      case 'DH-04': return '2 Linh Thú Cấp Thấp hệ Thần Tốc (Tốc Độ)';
      case 'DH-05': return '2 Linh Thú Cấp Thấp hệ Huyền Bí (Ăn Vạ)';
      case 'DH-06': return 'TR-01 (Chằn Tinh) + 1 Linh Thú bất kỳ';
      case 'DH-07': return '1 Linh Thú sân nhà + 1 Linh Thú vừa thu phục';
      case 'DH-08': return 'CT-03 (Ngựa Sắt) + CT-13 (Quạ Thần)';
      case 'DH-09': return '2 Linh Thú Cấp Thấp khác Hệ trên sân';
      case 'DH-10': return '1 Linh Thú hệ Linh Giác + 1 hệ Thần Tốc trên sân';
      case 'DH-11': return '1 Đại Yêu / Trùm Cấp Cao trên sân + 1 Pháp Bảo';
      case 'DH-12': return '1 Linh Thú hệ Dũng Mãnh + 1 hệ Huyền Bí trên sân';
      default: return '2 nguyên liệu thần thoại';
    }
  }

  /**
   * Tự động quét tìm cặp nguyên liệu hợp lệ trên tay hoặc trên sân người chơi
   */
  static findAvailableFusionMaterials(state, playerId, fusionCardId) {
    const player = state.players[playerId];
    if (!player) return null;

    const availableCards = [
      ...player.monsterSlots.filter(m => m !== null && !m.isGhostSlotMarker),
      ...player.hand
    ];

    for (let i = 0; i < availableCards.length; i++) {
      for (let j = i + 1; j < availableCards.length; j++) {
        const mat1 = availableCards[i];
        const mat2 = availableCards[j];
        const check = this.canFusionSummon(state, playerId, fusionCardId, [mat1.instanceId, mat2.instanceId]);
        if (check.valid) {
          return [mat1.instanceId, mat2.instanceId];
        }
      }
    }
    return null;
  }
}
