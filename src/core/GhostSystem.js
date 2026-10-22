import { ALL_96_CARDS } from '../data/cards.js';
import { GameState } from './GameState.js';

export class GhostSystem {
  /**
   * Biến người chơi về 0 HP thành Hồn Ma Báo Oán
   */
  static transformToGhost(state, playerId, killerPlayerId = null) {
    const player = state.players[playerId];
    if (!player || player.isGhost || player.hp > 0) return;

    player.isGhost = true;
    if (killerPlayerId) {
      player.killedByPlayerId = killerPlayerId;
    }
    const charData = ALL_96_CARDS[player.characterId] || { name: 'Hồn Ma Anh Linh' };

    const msg = `👻 ${player.name} đã hóa thành ANH LINH BÁO OÁN (${charData.name})!`;
    state.actionLog.push({
      turn: state.turnNumber,
      message: msg
    });
    GameState.pushEffectEvent(state, {
      mode: 'PASSIVE',
      category: 'GHOST',
      card: charData,
      cardId: player.characterId,
      activatorId: playerId,
      title: `Hóa Thành Anh Linh: ${charData.name}`,
      effectText: charData.ghostAbility || '',
      resultText: msg,
      icon: '👻'
    });

    for (let i = 0; i < player.monsterSlots.length; i++) {
      const monster = player.monsterSlots[i];
      if (monster) {
        if (monster.equippedItems) {
          state.graveyard.push(...monster.equippedItems);
        }
        if (!monster.isGhostSlotMarker) {
          state.graveyard.push(monster);
        }
        player.monsterSlots[i] = null;
      }
    }

    for (let i = 0; i < player.trapSlots.length; i++) {
      const trap = player.trapSlots[i];
      if (trap) {
        state.graveyard.push(trap);
        player.trapSlots[i] = null;
      }
    }

    while (player.hand.length > 0) {
      state.graveyard.push(player.hand.pop());
    }

    this.checkWinner(state);
  }

  /**
   * Kiểm tra điều kiện thắng: Người chơi hoặc Phe cuối cùng còn sống (isGhost === false)
   */
  static checkWinner(state) {
    const alivePlayers = Object.values(state.players).filter(p => !p.isGhost);

    if (state.isTeamMode) {
      const aliveTeams = new Set(alivePlayers.map(p => p.teamId).filter(Boolean));
      if (aliveTeams.size === 1) {
        state.gameStatus = 'ENDED';
        const winningTeam = Array.from(aliveTeams)[0];
        state.winnerTeamId = winningTeam;
        state.winnerId = alivePlayers[0]?.id || null;
        state.actionLog.push({
          turn: state.turnNumber,
          message: `🏆 PHE CHIẾN THẮNG! ${winningTeam === 'TEAM_A' ? 'PHE ĐỎ (TEAM A)' : 'PHE XANH (TEAM B)'} đã thống lĩnh Đấu Trường Thần Thoại!`
        });
        return state.winnerId;
      }
      if (aliveTeams.size === 0) {
        state.gameStatus = 'ENDED';
        state.winnerId = null;
        state.actionLog.push({
          turn: state.turnNumber,
          message: '⚖️ BẤT PHÂN THẮNG BẠI! Cả hai phe đều đã hóa thành Anh Linh!'
        });
        return null;
      }
      return null;
    }

    if (alivePlayers.length === 1) {
      state.gameStatus = 'ENDED';
      state.winnerId = alivePlayers[0].id;
      state.actionLog.push({
        turn: state.turnNumber,
        message: `🏆 CHIẾN THẮNG TUYỆT ĐỐI! ${alivePlayers[0].name} là Truyền Nhân Thần Thoại Duy Nhất trụ vững!`
      });
      return alivePlayers[0].id;
    }

    if (alivePlayers.length === 0) {
      state.gameStatus = 'ENDED';
      state.winnerId = null;
      state.actionLog.push({
        turn: state.turnNumber,
        message: '⚖️ TRẬN ĐẤU HÒA! Tất cả người chơi đều đã hóa thành Anh Linh!'
      });
      return null;
    }

    return null;
  }

  /**
   * Xử lý lượt của Hồn Ma:
   * 1. Kích hoạt Kỹ năng Anh Linh riêng của Thẻ Đại Diện (NV-01 -> NV-08 Mặt Sau)
   * 2. Rút 1 lá Bài Ám Quẻ (AQ-01 -> AQ-06), kích hoạt và trả lại đáy chồng
   */
  static handleGhostTurnStart(state, ghostPlayerId, targetParams = {}) {
    const ghost = state.players[ghostPlayerId];
    if (!ghost || !ghost.isGhost) return null;

    const log = [];

    this.executeCharacterGhostAbility(state, ghostPlayerId, targetParams, log);

    if (state.curseDeck.length === 0) {
      return { curseCard: null, logs: log };
    }

    const curseCard = state.curseDeck.shift();
    const curseData = ALL_96_CARDS[curseCard.id] || curseCard;

    log.push(`👻 Anh Linh ${ghost.name} rút lá Ám Quẻ: [${curseData.name}] — ${curseData.description}`);

    const curseLogs = [];
    this.executeCurseEffect(state, ghostPlayerId, curseCard.id, targetParams, curseLogs);
    log.push(...curseLogs);

    for (const msg of log) {
      state.actionLog.push({ turn: state.turnNumber, message: msg });
    }

    GameState.pushEffectEvent(state, {
      mode: 'PASSIVE',
      category: 'GHOST',
      card: curseData,
      cardId: curseCard.id,
      activatorId: ghostPlayerId,
      title: `Ám Quẻ Anh Linh: ${curseData.name}`,
      effectText: curseData.description || '',
      resultText: curseLogs.join(' • ') || curseData.description,
      icon: '👻'
    });

    state.curseDeck.push(curseCard);

    return {
      curseCard,
      logs: log
    };
  }

  /**
   * Thực thi Kỹ năng Mặt Sau (Hồn Ma Anh Linh) của 8 Thẻ Đại Diện (NV-01 -> NV-08)
   */
  static executeCharacterGhostAbility(state, ghostId, targetParams = {}, logs = []) {
    const ghost = state.players[ghostId];
    const livingPlayers = Object.values(state.players).filter(p => !p.isGhost);
    if (!ghost || livingPlayers.length === 0) return;

    const charData = ALL_96_CARDS[ghost.characterId] || { id: ghost.characterId, name: 'Anh Linh' };
    let triggeredMsg = '';

    switch (ghost.characterId) {
      case 'NV-01': {
        const richest = [...livingPlayers].sort((a, b) => b.hp - a.hp)[0];
        if (richest && richest.hand.length > 0) {
          state.revealedHands = state.revealedHands || {};
          state.revealedHands[richest.id] = Date.now() + 30000;
          const revealedCard = richest.hand[0];
          triggeredMsg = `👻 [Anh Linh Sơn Tinh NV-01]: Soi sáng bắt ${richest.name} lật ngửa công khai lá bài [${revealedCard.name}]!`;
          logs.push(triggeredMsg);
          GameState.pushRevealedCardsEvent(state, {
            viewerId: ghostId,
            targetPlayerId: richest.id,
            targetPlayerName: richest.name,
            sourceCardId: 'NV-01',
            sourceCardName: charData.name,
            revealType: 'HAND',
            title: `👻 ANH LINH SƠN TINH — LẬT NGỬA BÀI CỦA ${richest.name.toUpperCase()}`,
            subtitle: `Bài trên tay của ${richest.name} đã bị Anh Linh Sơn Tinh bắt lật ngửa cho cả bàn xem:`,
            cards: [...richest.hand]
          });
        }
        break;
      }

      case 'NV-02': {
        const beneficiary = targetParams.beneficiaryId
          ? state.players[targetParams.beneficiaryId]
          : [...livingPlayers].sort((a, b) => a.hp - b.hp)[0];
        if (beneficiary && !beneficiary.isGhost && state.drawPile.length > 0) {
          const bonusCard = state.drawPile.pop();
          beneficiary.hand.push(bonusCard);
          triggeredMsg = `👻 [Anh Linh Thủy Tinh NV-02]: Ban nước biển khơi giúp ${beneficiary.name} bốc thêm 1 lá bài!`;
          logs.push(triggeredMsg);
        }
        break;
      }

      case 'NV-03': {
        for (const p of livingPlayers) {
          const monster = p.monsterSlots.find(m => m !== null && !m.isGhostSlotMarker);
          if (monster) {
            monster.statusEffects = monster.statusEffects || [];
            monster.statusEffects.push({ type: 'DEBUFF', powerDelta: -1, durationTurns: 1 });
            triggeredMsg = `👻 [Anh Linh Thánh Gióng NV-03]: Uy vũ làm [${monster.name}] của ${p.name} bị -1 Độ Chiến!`;
            logs.push(triggeredMsg);
            break;
          }
        }
        break;
      }

      case 'NV-04': {
        const playersWithTraps = livingPlayers.filter(p => p.trapSlots.some(t => t !== null && !t.faceUp));
        if (playersWithTraps.length >= 2) {
          const pA = playersWithTraps[0];
          const pB = playersWithTraps[1];
          const idxA = pA.trapSlots.findIndex(t => t !== null && !t.faceUp);
          const idxB = pB.trapSlots.findIndex(t => t !== null && !t.faceUp);
          if (idxA !== -1 && idxB !== -1) {
            const temp = pA.trapSlots[idxA];
            pA.trapSlots[idxA] = pB.trapSlots[idxB];
            pB.trapSlots[idxB] = temp;
            triggeredMsg = `👻 [Anh Linh Chử Đồng Tử NV-04]: Hóa phép tráo đổi 2 lá Bẫy Thiên Cơ đang úp giữa ${pA.name} và ${pB.name}!`;
            logs.push(triggeredMsg);
          }
        }
        break;
      }

      case 'NV-05': {
        if (state.graveyard.length > 0) {
          const poorest = [...livingPlayers].sort((a, b) => a.hp - b.hp)[0];
          if (poorest) {
            const giftedCard = state.graveyard.pop();
            poorest.hand.push(giftedCard);
            triggeredMsg = `👻 [Anh Linh Mẫu Thượng Ngàn NV-05]: Ban lộc lá [${giftedCard.name}] từ Bãi Rác lên tay cho ${poorest.name}!`;
            logs.push(triggeredMsg);
          }
        }
        break;
      }

      case 'NV-06': {
        if (livingPlayers.length >= 2) {
          state.ghostDiplomacyPair = [livingPlayers[0].id, livingPlayers[1].id];
          triggeredMsg = `👻 [Anh Linh Lạc Long Quân NV-06]: Khích lệ ${livingPlayers[0].name} và ${livingPlayers[1].name} so tài (+1 Độ Chiến khi đánh nhau)!`;
          logs.push(triggeredMsg);
        }
        break;
      }

      case 'NV-07': {
        const poorest = [...livingPlayers].sort((a, b) => a.hp - b.hp)[0];
        if (poorest) {
          poorest.hp = Math.min(state.isTeamMode ? 20 : 10, poorest.hp + 1);
          if (state.isTeamMode && state.teamHp && poorest.teamId) {
            state.teamHp[poorest.teamId] = poorest.hp;
            for (const p of Object.values(state.players)) {
              if (p.teamId === poorest.teamId) p.hp = poorest.hp;
            }
          }
          triggeredMsg = `👻 [Anh Linh Tổ Mẫu Âu Cơ NV-07]: Phù hộ hồi +1 Điểm Nhân Phẩm cho ${poorest.name}!`;
          logs.push(triggeredMsg);
        }
        break;
      }

      case 'NV-08': {
        let strongestMonster = null;
        let ownerName = '';
        let maxP = -1;
        for (const p of livingPlayers) {
          for (const m of p.monsterSlots) {
            if (m && !m.isGhostSlotMarker) {
              const pwr = m.basePower || m.power || 0;
              if (pwr > maxP) {
                maxP = pwr;
                strongestMonster = m;
                ownerName = p.name;
              }
            }
          }
        }
        if (strongestMonster) {
          strongestMonster.statusEffects = strongestMonster.statusEffects || [];
          strongestMonster.statusEffects.push({ type: 'DEBUFF', powerDelta: -1, durationTurns: 1 });
          triggeredMsg = `👻 [Anh Linh Cóc Tía NV-08]: Gọi sấm sét làm [${strongestMonster.name}] của ${ownerName} giảm -1 Độ Chiến!`;
          logs.push(triggeredMsg);
        }
        break;
      }
    }

    if (triggeredMsg) {
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'GHOST',
        card: charData,
        cardId: ghost.characterId,
        activatorId: ghostId,
        title: `Kỹ Năng Anh Linh: ${charData.name}`,
        effectText: charData.ghostAbility || '',
        resultText: triggeredMsg,
        icon: '👻'
      });
    }
  }

  /**
   * Thực thi cụ thể 6 hiệu ứng Bài Ám Quẻ (AQ-01 -> AQ-06)
   */
  static executeCurseEffect(state, ghostId, curseId, targetParams = {}, logs = []) {
    const ghost = state.players[ghostId];
    const livingPlayers = Object.values(state.players).filter(p => !p.isGhost);

    switch (curseId) {
      case 'AQ-01': {
        const sorted = [...livingPlayers].sort((a, b) => b.hp - a.hp);
        const target = sorted.find(p => p.trapSlots.some(t => t !== null)) || sorted[0];
        if (target) {
          const trapIndex = target.trapSlots.findIndex(t => t !== null);
          if (trapIndex !== -1) {
            const discarded = target.trapSlots[trapIndex];
            target.trapSlots[trapIndex] = null;
            state.graveyard.push(discarded);
            logs.push(`AQ-01: ${target.name} bị gió bấc đầu đình cuốn bay 1 lá Bẫy úp [${discarded.name}] vào Bãi Rác!`);
          }
        }
        break;
      }

      case 'AQ-02': {
        if (livingPlayers.length >= 2) {
          const sorted = [...livingPlayers].sort((a, b) => b.hp - a.hp);
          const highest = sorted[0];
          const lowest = sorted[sorted.length - 1];
          if (highest.hand.length > 0 && lowest.hand.length > 0) {
            const cardH = highest.hand.pop();
            const cardL = lowest.hand.pop();
            highest.hand.push(cardL);
            lowest.hand.push(cardH);
            logs.push(`AQ-02: Hoán đổi 1 lá bài trên tay giữa ${highest.name} và ${lowest.name}!`);
          }
        }
        break;
      }

      case 'AQ-03': {
        for (const p of livingPlayers) {
          for (const m of p.monsterSlots) {
            if (m && (m.basePower >= 5 || ALL_96_CARDS[m.cardId]?.power >= 5)) {
              m.statusEffects = m.statusEffects || [];
              m.statusEffects.push({ type: 'DEBUFF', powerDelta: -1, durationTurns: 1 });
              logs.push(`AQ-03: ${m.name} của ${p.name} bị sương mù núi Tản làm giảm -1 Độ Chiến!`);
            }
          }
        }
        break;
      }

      case 'AQ-04': {
        const killerId = targetParams.killerId || ghost?.killedByPlayerId || livingPlayers[0]?.id;
        const target = state.players[killerId];
        if (target && !target.isGhost) {
          if (target.hand.length > 0) {
            const discarded = target.hand.pop();
            const otherLiving = livingPlayers.find(p => p.id !== target.id);
            if (otherLiving && targetParams.giveToNeighbor) {
              otherLiving.hand.push(discarded);
              logs.push(`AQ-04: ${target.name} bị oan hồn đòi nợ, phải nộp 1 lá bài sang cho ${otherLiving.name}!`);
            } else {
              state.graveyard.push(discarded);
              logs.push(`AQ-04: ${target.name} phải nộp 1 lá bài vì bị oan hồn đòi nợ!`);
            }
          } else {
            target.hp = Math.max(0, target.hp - 1);
            logs.push(`AQ-04: ${target.name} không còn bài nên bị trừ 1 Điểm Nhân Phẩm!`);
          }
        }
        break;
      }

      case 'AQ-05': {
        const targetId = targetParams.favoritePlayerId || livingPlayers[0]?.id;
        const target = state.players[targetId];
        if (target) {
          for (const m of target.monsterSlots) {
            if (m) {
              m.statusEffects = m.statusEffects || [];
              m.statusEffects.push({ type: 'BUFF', powerDelta: 2, durationTurns: 1 });
              logs.push(`AQ-05: Anh Linh Tổ Tiên phù hộ cho ${m.name} của ${target.name} được +2 Độ Chiến!`);
            }
          }
        }
        break;
      }

      case 'AQ-06': {
        for (const p of livingPlayers) {
          for (const m of p.monsterSlots) {
            if (m && m.equippedItems && m.equippedItems.length > 0) {
              const stolenEquip = m.equippedItems.pop();
              state.graveyard.push(stolenEquip);
              logs.push(`AQ-06: Ma Xó Bếp Lò gỡ mất Pháp Bảo [${stolenEquip.name}] trên sân ${p.name}!`);
              return;
            }
          }
        }
        break;
      }
    }
  }
}
