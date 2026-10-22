import { PHASES, GameState } from './GameState.js';
import { GhostSystem } from './GhostSystem.js';
import { BattleResolver } from './BattleResolver.js';
import { RandomUtils } from '../utils/RandomUtils.js';

export class TurnManager {
  /**
   * Bắt đầu lượt mới (Giai đoạn Hóng Hớt / DRAW Phase)
   */
  static startTurn(state) {
    const activePlayerId = state.turnOrder[state.currentTurnIndex];
    const player = state.players[activePlayerId];

    state.currentPhase = PHASES.DRAW;
    state.normalSummonUsed = false;
    state.swarmSummonUsed = false;
    state.swarmSummonUsedThisTurn = false;
    state.bonusSummonsAvailable = 0;
    state.manualDrawUsedThisTurn = false;
    state.attacksDeclaredThisTurn = [];
    state.dramaCardsUsedThisTurn = 0;
    state.stolenMonstersThisTurn = [];
    player.hasUsedAliveSkillThisTurn = false;
    player.usedFieldSkillInstanceIds = [];
    player.diplomacyPeaceTargets = [];

    for (const m of player.monsterSlots) {
      if (m) {
        m.attackedTargetsThisTurn = [];
      }
    }

    state.actionLog.push({
      turn: state.turnNumber,
      message: `--- LƯỢT ${state.turnNumber}: Đến lượt của ${player.name} ---`
    });

    if (player.isGhost) {
      GhostSystem.handleGhostTurnStart(state, activePlayerId);
      player.turnsCompleted = (player.turnsCompleted || 0) + 1;
      this.advanceToNextTurn(state);
      return;
    }

    this.drawCard(state, activePlayerId, { isNormalTurnDraw: true });
    state.manualDrawUsedThisTurn = true;
    state.turnDrawUsed = true;

    state.actionLog.push({
      turn: state.turnNumber,
      message: `🎴 ${player.name} bốc 1 lá bài của vòng này (Mỗi vòng chỉ được 1 lượt bốc bài duy nhất)`
    });

    this.processStartOfTurnEffects(state, activePlayerId);
    state.currentPhase = PHASES.MAIN;
  }

  /**
   * Rút 1 lá bài từ Chồng bài bốc, tự động tái chế Bãi Rác nếu hết bài
   */
  static drawCard(state, playerId, options = {}) {
    const player = state.players[playerId];
    if (!player) return null;

    if (state.drawPile.length === 0) {
      if (state.graveyard.length > 0) {
        const rng = new RandomUtils(state.seed + state.turnNumber);
        state.drawPile = rng.shuffle([...state.graveyard]);
        state.graveyard = [];
        state.actionLog.push({
          turn: state.turnNumber,
          message: '♻️ Chồng bài bốc đã cạn! Bãi Rác được xáo trộn để làm Chồng bài bốc mới.'
        });
      } else {
        return null;
      }
    }

    const drawnCard = state.drawPile.pop();
    player.hand.push(drawnCard);

    const isBonusDraw = !options.isNormalTurnDraw && !options.isPassiveTrigger && state.currentPhase !== PHASES.DRAW;
    if (isBonusDraw && state.turnOrder && state.turnOrder.length > 1) {
      const drawerIdx = state.turnOrder.indexOf(playerId);
      if (drawerIdx !== -1) {
        // Kiểm tra cả 2 người chơi ngồi kế bên (trái & phải) có CT-11 Chim Khách Báo Hỷ trên sân không
        const len = state.turnOrder.length;
        const neighborIds = Array.from(new Set([
          state.turnOrder[(drawerIdx + 1) % len],
          state.turnOrder[(drawerIdx - 1 + len) % len]
        ])).filter(nid => nid !== playerId);

        for (const nId of neighborIds) {
          const neighbor = state.players[nId];
          if (neighbor && !neighbor.isGhost) {
            const ct11Card = neighbor.monsterSlots.find(
              m => m && m.cardId === 'CT-11' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04')
            );
            if (ct11Card) {
              const wifiCard = this.drawCard(state, neighbor.id, { isPassiveTrigger: true });
              if (wifiCard) {
                const msg = `🐦 CT-11 Chim Khách Báo Hỷ: ${neighbor.name} thấy ${player.name} bốc thêm bài nên hưởng lộc bốc luôn 1 lá [${wifiCard.name}]!`;
                state.actionLog.push({
                  turn: state.turnNumber,
                  message: msg
                });
                GameState.pushEffectEvent(state, {
                  mode: 'PASSIVE',
                  category: 'PASSIVE',
                  card: ct11Card,
                  cardId: 'CT-11',
                  activatorId: neighbor.id,
                  title: `Nội Tại Linh Thú: ${ct11Card.name}`,
                  resultText: msg,
                  icon: '🐦'
                });
              }
            }
          }
        }
      }

      for (const p of Object.values(state.players)) {
        if (
          p.id !== playerId &&
          !p.isGhost &&
          (!state.isTeamMode || p.teamId !== player.teamId)
        ) {
          const nq15Idx = p.trapSlots.findIndex(t => t && t.cardId === 'NQ-15' && t.setTurnNumber < state.turnNumber);
          if (nq15Idx !== -1) {
            const trap = p.trapSlots[nq15Idx];
            p.trapSlots[nq15Idx] = null;
            state.graveyard.push(trap);

            this.drawCard(state, p.id, { isPassiveTrigger: true });
            this.drawCard(state, p.id, { isPassiveTrigger: true });

            const msg = `🐢 BẪY LẬT [${trap.name}]! ${p.name} được Rùa Vàng ban lộc bốc ngay 2 lá bài từ chồng bài chung!`;
            state.actionLog.push({
              turn: state.turnNumber,
              message: msg
            });
            GameState.pushEffectEvent(state, {
              mode: 'PASSIVE',
              category: 'TRAP',
              card: trap,
              cardId: 'NQ-15',
              activatorId: p.id,
              title: `Bẫy Thiên Cơ: ${trap.name}`,
              resultText: msg,
              icon: '🐢'
            });
            break;
          }
        }
      }
    }

    return drawnCard;
  }

  /**
   * Xử lý các hiệu ứng đầu lượt (TR-01, TR-12, DC-07, DH-03, DR-02...)
   */
  static processStartOfTurnEffects(state, activePlayerId) {
    const player = state.players[activePlayerId];
    if (!player) return;

    for (const m of player.monsterSlots) {
      if (m && m.statusEffects) {
        const hadFreeze = m.statusEffects.some(e => e.type === 'FREEZE');
        if (hadFreeze) {
          m.statusEffects = m.statusEffects.map(e => {
            if (e.type === 'FREEZE' && e.duration !== undefined) {
              return { ...e, duration: e.duration - 1 };
            }
            return e;
          }).filter(e => !(e.type === 'FREEZE' && e.duration !== undefined && e.duration < 0));
          if (!m.statusEffects.some(e => e.type === 'FREEZE')) {
            m.cannotAttack = false;
          }
        }
      }
    }

    const tr01Card = player.monsterSlots.find(
      m => m && m.cardId === 'TR-01' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04')
    );
    if (tr01Card) {
      let collectedCount = 0;
      const tr01Results = [];
      for (const p of Object.values(state.players)) {
        if (p.id !== activePlayerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)) {
          if (collectedCount < 2) {
            if (p.hand && p.hand.length > 0) {
              const [givenCard] = p.hand.splice(0, 1);
              player.hand.push(givenCard);
              collectedCount++;
              const msg = `👹 TR-01 Chằn Tinh đòi cống phẩm: Thu 1 lá [${givenCard.name}] từ ${p.name}!`;
              tr01Results.push(msg);
              state.actionLog.push({ turn: state.turnNumber, message: msg });
            } else {
              BattleResolver.applyDamage(state, p, 1);
              const msg = `👹 TR-01 Chằn Tinh đòi cống phẩm: ${p.name} không có bài nộp, bị phạt trừ 1 HP!`;
              tr01Results.push(msg);
              state.actionLog.push({ turn: state.turnNumber, message: msg });
              if (p.hp === 0) GhostSystem.transformToGhost(state, p.id);
            }
          } else {
            if (!p.hand || p.hand.length === 0) {
              BattleResolver.applyDamage(state, p, 1);
              const msg = `👹 TR-01 Chằn Tinh đòi cống phẩm: ${p.name} không có bài nộp, bị phạt trừ 1 HP!`;
              tr01Results.push(msg);
              state.actionLog.push({ turn: state.turnNumber, message: msg });
              if (p.hp === 0) GhostSystem.transformToGhost(state, p.id);
            }
          }
        }
      }
      if (tr01Results.length > 0) {
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: tr01Card,
          cardId: 'TR-01',
          activatorId: activePlayerId,
          title: `Nội Tại Đầu Lượt: ${tr01Card.name}`,
          resultText: tr01Results.join(' • '),
          icon: '👹'
        });
      }
    }

    const dh03Card = player.monsterSlots.find(
      m => m && m.cardId === 'DH-03' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04')
    );
    if (dh03Card) {
      const dh03Results = [];
      for (const p of Object.values(state.players)) {
        if (p.id !== activePlayerId && !p.isGhost && (!state.isTeamMode || p.teamId !== player.teamId)) {
          if (p.hand && p.hand.length > 0) {
            const [discarded] = p.hand.splice(0, 1);
            state.graveyard.push(discarded);
            const msg = `🥁 DH-03 Trống Đồng Cổ Thần: ${p.name} choáng váng, phải bỏ lá [${discarded.name}] vào Bãi Rác!`;
            dh03Results.push(msg);
            state.actionLog.push({ turn: state.turnNumber, message: msg });
          } else {
            BattleResolver.applyDamage(state, p, 1);
            const msg = `🥁 DH-03 Trống Đồng Cổ Thần: ${p.name} không còn bài bỏ, mất 1 Điểm Nhân Phẩm!`;
            dh03Results.push(msg);
            state.actionLog.push({ turn: state.turnNumber, message: msg });
            if (p.hp === 0) GhostSystem.transformToGhost(state, p.id);
          }
        }
      }
      if (dh03Results.length > 0) {
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: dh03Card,
          cardId: 'DH-03',
          activatorId: activePlayerId,
          title: `Nội Tại Đầu Lượt: ${dh03Card.name}`,
          resultText: dh03Results.join(' • '),
          icon: '🥁'
        });
      }
    }

    for (let i = 0; i < player.monsterSlots.length; i++) {
      const monster = player.monsterSlots[i];
      if (monster && monster.cardId === 'TR-12' && !(monster.equippedItems || []).some(it => it.cardId === 'DC-04')) {
        monster.statusEffects = monster.statusEffects || [];
        monster.statusEffects.push({ type: 'SELF_DECAY', powerDelta: -1 });

        const currentPower = BattleResolver.calculateMonsterPower(state, activePlayerId, i);
        const msg = `🔥 TR-12 Hỏa Kỳ Lân tụ lửa, Độ Chiến hiện tại giảm còn ${currentPower}!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: monster,
          cardId: 'TR-12',
          activatorId: activePlayerId,
          title: `Nội Tại Tụ Lửa: ${monster.name}`,
          resultText: msg,
          icon: '🔥'
        });

        if (currentPower <= 2) {
          BattleResolver.destroyMonsterToGraveyard(state, activePlayerId, i, null, []);
        }
      }
    }

    for (const m of player.monsterSlots) {
      if (m && m.equippedItems && m.equippedItems.some(it => it.cardId === 'DC-07')) {
        BattleResolver.applyDamage(state, player, 1);
        const msg = `📜 DC-07 Sổ Nam Tào Ghi Nợ: ${player.name} bị đòi nợ đầu lượt, mất 1 Điểm Nhân Phẩm!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          cardId: 'DC-07',
          activatorId: activePlayerId,
          title: 'Hiệu Ứng Pháp Bảo: Sổ Nam Tào Ghi Nợ',
          resultText: msg,
          icon: '📜'
        });
        if (player.hp === 0) {
          GhostSystem.transformToGhost(state, player.id);
          return;
        }
      }
    }

    for (const m of player.monsterSlots) {
      if (m && m.bombedByPlayerId) {
        BattleResolver.applyDamage(state, player, 1);
        const msg = `🎭 DR-02 Nội Gián Lý Thông: [${m.name}] làm tiêu hao của ${player.name} 1 Điểm Nhân Phẩm!`;
        state.actionLog.push({
          turn: state.turnNumber,
          message: msg
        });
        GameState.pushEffectEvent(state, {
          mode: 'PASSIVE',
          category: 'PASSIVE',
          card: m,
          cardId: 'DR-02',
          activatorId: m.bombedByPlayerId,
          title: `Hiệu Ứng Nội Gián: ${m.name}`,
          resultText: msg,
          icon: '🎭'
        });
        if (player.hp === 0) {
          GhostSystem.transformToGhost(state, player.id);
          return;
        }
      }
    }
  }

  /**
   * Kết thúc lượt (Giai đoạn Xả Rác / END Phase)
   */
  static endTurn(state, playerId, discardedInstanceIds = []) {
    const player = state.players[playerId];
    if (state.turnOrder[state.currentTurnIndex] !== playerId) {
      throw new Error('Chưa đến lượt của bạn');
    }

    state.currentPhase = PHASES.END;

    const limit = player.handLimit || 6;
    if (player.hand.length > limit) {
      const excess = player.hand.length - limit;
      if (discardedInstanceIds.length < excess) {
        throw new Error(`Bạn phải bỏ ít nhất ${excess} lá bài thừa vào Bãi Rác (hiện có ${player.hand.length}/${limit} lá)`);
      }

      for (const discardId of discardedInstanceIds) {
        const idx = player.hand.findIndex(c => c.instanceId === discardId);
        if (idx !== -1) {
          const [discarded] = player.hand.splice(idx, 1);
          state.graveyard.push(discarded);
          state.actionLog.push({
            turn: state.turnNumber,
            message: `${player.name} bỏ lá [${discarded.name}] vào Bãi Rác`
          });
        }
      }
    }

    const ct18Card = player.monsterSlots.find(
      m => m && m.cardId === 'CT-18' && !(m.equippedItems || []).some(it => it.cardId === 'DC-04')
    );
    if (ct18Card && state.graveyard.length > 0) {
      const topGraveCard = state.graveyard.pop();
      state.drawPile.unshift(topGraveCard);
      const msg = `🐤 CT-18 Chim Sẻ Gắp Thóc: Xếp [${topGraveCard.name}] từ đỉnh Bãi Rác xuống đáy Chồng bài bốc!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: msg
      });
      GameState.pushEffectEvent(state, {
        mode: 'PASSIVE',
        category: 'PASSIVE',
        card: ct18Card,
        cardId: 'CT-18',
        activatorId: playerId,
        title: `Nội Tại Cuối Lượt: ${ct18Card.name}`,
        resultText: msg,
        icon: '🐤'
      });
    }

    for (let i = 0; i < player.monsterSlots.length; i++) {
      const m = player.monsterSlots[i];
      if (m && m.temporaryStealUntilEndOfTurn === state.turnNumber && m.originalOwnerId) {
        const origOwner = state.players[m.originalOwnerId];
        player.monsterSlots[i] = null;
        delete m.temporaryStealUntilEndOfTurn;
        if (origOwner && !origOwner.isGhost) {
          const emptySlot = origOwner.monsterSlots.findIndex(s => s === null);
          if (emptySlot !== -1) {
            origOwner.monsterSlots[emptySlot] = m;
            const msg = `🔄 Hết lượt thu phục (DR-06): [${m.name}] quay trở về sân của ${origOwner.name}!`;
            state.actionLog.push({
              turn: state.turnNumber,
              message: msg
            });
            GameState.pushEffectEvent(state, {
              mode: 'PASSIVE',
              category: 'PASSIVE',
              card: m,
              cardId: 'DR-06',
              activatorId: origOwner.id,
              title: 'Hoàn Trả Linh Thú (DR-06)',
              resultText: msg,
              icon: '🔄'
            });
          } else {
            state.graveyard.push(m);
          }
        } else {
          state.graveyard.push(m);
        }
      }
    }

    player.turnsCompleted = (player.turnsCompleted || 0) + 1;
    if (player.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker)) {
      player.hasSummonedMonster = true;
    }

    this.advanceToNextTurn(state);
  }

  /**
   * Chuyển lượt sang người chơi tiếp theo trong vòng tròn
   */
  static advanceToNextTurn(state) {
    const nextIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    if (nextIndex === 0) {
      state.roundNumber = (state.roundNumber || 1) + 1;
      state.openingRoundActive = false;
    } else if ((state.roundNumber || 1) === 1) {
      state.openingRoundActive = true;
    }
    state.currentTurnIndex = nextIndex;
    state.turnNumber += 1;
    this.startTurn(state);
  }
}
