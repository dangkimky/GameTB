import { ALL_96_CARDS, CARD_TYPES } from '../data/cards.js';
import { PHASES } from './GameState.js';
import { GameEngine } from './GameEngine.js';
import { BattleResolver } from './BattleResolver.js';
import { FusionSystem } from './FusionSystem.js';

/**
 * BotBrain — Bộ não AI cho Đối thủ Máy (Smart Bot)
 * Biết tự động Triệu hồi, Gọi Bầy (Swarm Summon), Hiến tế gọi Trùm, Dung Hợp, Úp Bẫy, Gắn Trang Bị, Tung Phép Sự Tích và Tấn công thông minh
 */
export class BotBrain {
  static BOT_VOICES = {
    'NV-01': ['Bắt đầu lượt hành động.'],
    'NV-02': ['Bắt đầu lượt hành động.'],
    'NV-03': ['Bắt đầu lượt hành động.'],
    'NV-04': ['Bắt đầu lượt hành động.'],
    'NV-05': ['Bắt đầu lượt hành động.'],
    'NV-06': ['Bắt đầu lượt hành động.'],
    'NV-07': ['Bắt đầu lượt hành động.'],
    'NV-08': ['Bắt đầu lượt hành động.']
  };

  static getRandomVoice(characterId) {
    const voices = this.BOT_VOICES[characterId] || ['Bắt đầu lượt hành động.'];
    return voices[0];
  }

  static isOpeningPeaceTurn(state, bot, hadMonsterAtTurnStart) {
    if (state.turnNumber === 1) return true;
    if (state.openingRoundActive) return true;
    if ((bot.turnsCompleted || 0) === 0 && !hadMonsterAtTurnStart) return true;
    return false;
  }

  static isTargetUnpreparedPlayer(state, opp, hadMonsterAtTurnStart) {
    if (!opp) return false;
    const oppHasMonsterNow = opp.monsterSlots.some(s => s !== null && !s.isGhostSlotMarker);
    if (oppHasMonsterNow) {
      opp.hasSummonedMonster = true;
      return false;
    }
    if (opp.hasSummonedMonster) return false;

    if (state.openingRoundActive || (opp.turnsCompleted || 0) > 0 || !hadMonsterAtTurnStart) {
      return true;
    }
    return false;
  }

  /**
   * Tự động đưa ra quyết định và thực thi lượt đi cho Bot máy (Đồng bộ)
   */
  static executeTurn(state, botPlayerId) {
    const logs = [];
    const bot = state.players[botPlayerId];
    if (!bot || bot.isGhost) return { actionsExecuted: [], logs: [] };

    const hadMonsterAtTurnStart = bot.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker);
    const isOpeningPeace = this.isOpeningPeaceTurn(state, bot, hadMonsterAtTurnStart);
    const canHarmOpponentsNow = !isOpeningPeace && Object.values(state.players).some(p => {
      if (p.id === botPlayerId || p.isGhost) return false;
      if (state.isTeamMode && p.teamId === bot.teamId) return false;
      if (this.isTargetUnpreparedPlayer(state, p, hadMonsterAtTurnStart)) return false;
      return true;
    });

    for (const p of Object.values(state.players)) {
      if (p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker)) {
        p.hasSummonedMonster = true;
      }
    }

    logs.push(`[${bot.name}] bắt đầu lượt.`);

    // 1.1. Kích hoạt kỹ năng Đại Diện NV-07 hoặc NV-08
    if (!bot.hasUsedAliveSkillThisTurn && ['NV-07', 'NV-08'].includes(bot.characterId)) {
      try {
        GameEngine.activateCharacterSkill(state, botPlayerId);
        logs.push(`${bot.name} phát động thần lực Đại Diện [${bot.characterId}]!`);
      } catch (e) {}
    }

    // 1.2. Dung Hợp Thần Thú Huyền Thoại
    if (state.fusionDeck && state.fusionDeck.length > 0) {
      for (const fusionCard of [...state.fusionDeck]) {
        const fId = fusionCard.cardId || fusionCard.id;
        if (['DH-07', 'DH-11', 'DH-03'].includes(fId) && !canHarmOpponentsNow) continue;
        const materials = FusionSystem.findAvailableFusionMaterials(state, botPlayerId, fId);
        if (materials && materials.length === 2) {
          try {
            const newFusion = GameEngine.executeFusionSummon(state, botPlayerId, fId, materials);
            logs.push(`${bot.name} dung hợp triệu hồi [${newFusion.name}]!`);
            break;
          } catch (e) {}
        }
      }
    }

    // 1.3. Hiến tế triệu hồi Đại Yêu / Thần Thú Cấp Cao
    if (!state.normalSummonUsed || (state.bonusSummonsAvailable || 0) > 0) {
      const bossCards = bot.hand.filter(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return (c.type || d.type) === CARD_TYPES.HIGH_MONSTER && c.cardId !== 'TR-14' && (!['TR-01', 'TR-12'].includes(c.cardId) || canHarmOpponentsNow);
      });
      const validTributeSlots = bot.monsterSlots
        .map((m, idx) => ({ m, idx }))
        .filter(({ m }) => m !== null && !m.isGhostSlotMarker && !(m.equippedItems || []).some(it => it.cardId === 'DC-07'));

      if (bossCards.length > 0 && validTributeSlots.length > 0) {
        let minPower = Infinity;
        let tributeSlot = validTributeSlots[0].idx;
        validTributeSlots.forEach(({ m, idx }) => {
          const p = m.power !== undefined ? m.power : (m.basePower || 0);
          if (p < minPower) {
            minPower = p;
            tributeSlot = idx;
          }
        });
        const chosenBoss = bossCards[0];
        try {
          GameEngine.tributeSummon(state, botPlayerId, chosenBoss.instanceId, tributeSlot);
          logs.push(`${bot.name} hiến tế triệu hồi Thần Thú [${chosenBoss.name}]!`);
        } catch (e) {}
      }
    }

    // 1.4. Triệu hồi thường Linh Thú Cấp Thấp
    while (!state.normalSummonUsed || (state.bonusSummonsAvailable || 0) > 0) {
      const emptyMonsterSlot = bot.monsterSlots.findIndex(s => s === null);
      if (emptyMonsterSlot === -1) break;

      const lowMonsters = bot.hand.filter(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return (c.type || d.type) === CARD_TYPES.LOW_MONSTER;
      });

      if (lowMonsters.length === 0) break;

      lowMonsters.sort((a, b) => {
        const pa = a.power !== undefined ? a.power : (a.basePower || ALL_96_CARDS[a.cardId]?.power || 0);
        const pb = b.power !== undefined ? b.power : (b.basePower || ALL_96_CARDS[b.cardId]?.power || 0);
        return pb - pa;
      });

      const chosenCard = lowMonsters[0];
      try {
        GameEngine.normalSummon(state, botPlayerId, chosenCard.instanceId, emptyMonsterSlot);
        logs.push(`${bot.name} triệu hồi ${chosenCard.name}`);
      } catch (e) {
        break;
      }
    }

    // 1.5. Triệu hồi Gọi Bầy (Swarm Summon)
    if (!state.swarmSummonUsed) {
      const emptySlotForSwarm = bot.monsterSlots.findIndex(s => s === null);
      if (emptySlotForSwarm !== -1) {
        const swarmCandidates = bot.hand.filter(c => {
          const d = ALL_96_CARDS[c.cardId] || c;
          return d.freeSwarmSummon || c.cardId === 'TR-14';
        });
        if (swarmCandidates.length > 0) {
          try {
            const swarmCard = GameEngine.swarmSummon(state, botPlayerId, swarmCandidates[0].instanceId, emptySlotForSwarm);
            logs.push(`${bot.name} gọi bầy tiếp viện [${swarmCard.name}]!`);
          } catch (e) {}
        }
      }
    }

    // 1.6. Úp Bẫy Thiên Cơ
    const emptyTrapSlot = bot.trapSlots.findIndex(s => s === null);
    if (emptyTrapSlot !== -1) {
      const trapCard = bot.hand.find(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return (c.type || d.type) === CARD_TYPES.TRAP;
      });

      if (trapCard) {
        try {
          GameEngine.setTrap(state, botPlayerId, trapCard.instanceId, emptyTrapSlot);
          logs.push(`${bot.name} úp 1 lá Bẫy Thiên Cơ bí ẩn`);
        } catch (e) {}
      }
    }

    // 1.7. Gắn Pháp Bảo (Trang Bị)
    const equipCards = bot.hand.filter(c => {
      const d = ALL_96_CARDS[c.cardId] || c;
      return (c.type || d.type) === CARD_TYPES.EQUIPMENT;
    });
    for (const eqCard of equipCards) {
      const eqData = ALL_96_CARDS[eqCard.cardId] || eqCard;
      if (eqCard.cardId === 'DC-14' && !canHarmOpponentsNow) continue;
      if (eqData.target === 'ENEMY') {
        if (!canHarmOpponentsNow) continue;
        const validOpponents = Object.values(state.players).filter(p => {
          if (p.id === botPlayerId || p.isGhost) return false;
          if (state.isTeamMode && p.teamId === bot.teamId) return false;
          return p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker);
        });
        if (validOpponents.length > 0) {
          const opp = validOpponents[0];
          const slotIdx = opp.monsterSlots.findIndex(m => m !== null && !m.isGhostSlotMarker);
          try {
            GameEngine.equipItem(state, botPlayerId, eqCard.instanceId, opp.id, slotIdx);
            logs.push(`${bot.name} gắn Pháp Bảo ${eqCard.name} lên linh thú của ${opp.name}`);
          } catch (e) {}
        }
      } else {
        const mySlotIdx = bot.monsterSlots.findIndex(m => m !== null && !m.isGhostSlotMarker);
        if (mySlotIdx !== -1) {
          try {
            GameEngine.equipItem(state, botPlayerId, eqCard.instanceId, botPlayerId, mySlotIdx);
            logs.push(`${bot.name} trang bị [${eqCard.name}]`);
          } catch (e) {}
        }
      }
    }

    // 1.8. Phát động Kỹ năng Chủ Động trên sân
    if (!isOpeningPeace) {
      for (let sIdx = 0; sIdx < bot.monsterSlots.length; sIdx++) {
        const m = bot.monsterSlots[sIdx];
        if (!m || m.isGhostSlotMarker) continue;
        if (['CT-13', 'TR-09', 'DH-08'].includes(m.cardId)) {
          try {
            const skillRes = GameEngine.activateFieldSkill(state, botPlayerId, sIdx);
            if (skillRes) {
              logs.push(`${bot.name} kích hoạt kỹ năng chủ động của [${m.name}]!`);
            }
          } catch (e) {}
        }
      }
    }

    // 1.9. Tung Phép Sự Tích (Drama)
    const OFFENSIVE_DRAMAS = ['DR-01', 'DR-02', 'DR-06', 'DR-10', 'DR-11'];
    const dramaCards = bot.hand.filter(c => {
      const d = ALL_96_CARDS[c.cardId] || c;
      return (c.type || d.type) === CARD_TYPES.DRAMA;
    });
    for (const drama of dramaCards) {
      const validOpponents = Object.values(state.players).filter(p => {
        if (p.id === botPlayerId || p.isGhost) return false;
        if (state.isTeamMode && p.teamId === bot.teamId) return false;
        if (OFFENSIVE_DRAMAS.includes(drama.cardId) && this.isTargetUnpreparedPlayer(state, p, hadMonsterAtTurnStart)) {
          return false;
        }
        return true;
      });
      if (OFFENSIVE_DRAMAS.includes(drama.cardId) && (isOpeningPeace || validOpponents.length === 0)) {
        continue;
      }
      const targetParams = {};
      if (validOpponents.length > 0) {
        targetParams.targetPlayerId = validOpponents[0].id;
        const sIdx = validOpponents[0].monsterSlots.findIndex(m => m !== null);
        if (sIdx !== -1) targetParams.targetSlotIndex = sIdx;
      }
      try {
        GameEngine.useDrama(state, botPlayerId, drama.instanceId, targetParams);
        logs.push(`${bot.name} phát động Sự Tích [${drama.name}]!`);
      } catch (e) {}
    }

    // 2. GIAI ĐOẠN BATTLE (GIAO TRANH)
    const attackableOpponentsExist = Object.values(state.players).some(p => {
      if (p.id === botPlayerId || p.isGhost) return false;
      if (state.isTeamMode && p.teamId === bot.teamId) return false;
      if (this.isTargetUnpreparedPlayer(state, p, hadMonsterAtTurnStart)) return false;
      return true;
    });

    if (isOpeningPeace || !attackableOpponentsExist) {
      const peaceReason = isOpeningPeace
        ? `🕊️ [${bot.name}]: Tuân thủ Hiệp Ước Hòa Bình Lượt 1, bỏ qua Giai đoạn Tấn Công.`
        : `🕊️ [${bot.name}]: Bảo hộ lượt bày trò đầu — Chưa tấn công khi người chơi chưa triệu hồi Chiến Thần nào!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: peaceReason
      });
      logs.push(peaceReason);
    } else {
      state.currentPhase = PHASES.BATTLE;

      for (let slotIdx = 0; slotIdx < bot.monsterSlots.length; slotIdx++) {
        const monster = bot.monsterSlots[slotIdx];
        if (!monster || monster.isGhostSlotMarker || monster.cannotAttack || monster.cardId === 'CT-10') continue;

        const maxAttacks = (monster.cardId === 'TR-04' || monster.cardId === 'DH-11') ? 2 : 1;
        for (let atkCount = 0; atkCount < maxAttacks; atkCount++) {
          const currentMonster = bot.monsterSlots[slotIdx];
          if (!currentMonster || currentMonster.isGhostSlotMarker) break;
          const usedAttacks = state.attacksDeclaredThisTurn.filter(
            id => id === currentMonster.instanceId || id === `${botPlayerId}_${slotIdx}`
          ).length;
          if (usedAttacks >= maxAttacks) break;

          const dc10OwnerId = (currentMonster.equippedItems || []).find(it => it.cardId === 'DC-10')?.equippedByPlayerId;
          const validOpponents = Object.values(state.players).filter(p => {
            if (p.id === botPlayerId || p.isGhost) return false;
            if (state.isTeamMode && p.teamId === bot.teamId) return false;
            if (bot.diplomacyPeaceTargets?.includes(p.id)) return false;
            if (currentMonster.bombedByPlayerId === p.id) return false;
            if (dc10OwnerId && dc10OwnerId === p.id) return false;
            if (this.isTargetUnpreparedPlayer(state, p, hadMonsterAtTurnStart)) return false;
            return true;
          });

          if (validOpponents.length === 0) break;

          let targetOpponent = validOpponents.find(opp => {
            return opp.monsterSlots.every(s => s === null || s.isGhostSlotMarker);
          });

          let targetMonsterSlot = null;

          if (!targetOpponent) {
            const myPower = BattleResolver.calculateMonsterPower(state, botPlayerId, slotIdx, { isAttacking: true });
            for (const opp of validOpponents) {
              for (let oppSlot = 0; oppSlot < opp.monsterSlots.length; oppSlot++) {
                const oppMonster = opp.monsterSlots[oppSlot];
                if (!oppMonster || oppMonster.isGhostSlotMarker) continue;

                const oppPower = BattleResolver.calculateMonsterPower(state, opp.id, oppSlot, { isDefending: true });

                if (myPower >= oppPower) {
                  targetOpponent = opp;
                  targetMonsterSlot = oppSlot;
                  break;
                }
              }
              if (targetOpponent) break;
            }
          }

          if (targetOpponent) {
            try {
              const res = GameEngine.declareAttack(state, botPlayerId, slotIdx, targetOpponent.id, targetMonsterSlot);
              logs.push(...res.logs);
            } catch (e) {
              break;
            }
          } else {
            break;
          }
        }
      }
    }

    // 3. GIAI ĐOẠN END (KẾT THÚC LƯỢT)
    try {
      const handLimit = bot.handLimit || 6;
      let discardIds = [];
      if (bot.hand.length > handLimit) {
        const excess = bot.hand.length - handLimit;
        const sorted = [...bot.hand].sort((a, b) => {
          const getVal = (c) => {
            const data = ALL_96_CARDS[c.cardId] || c;
            if (data.type === CARD_TYPES.HIGH_MONSTER && !bot.monsterSlots.some(m => m !== null)) return 1;
            if (data.type === CARD_TYPES.LOW_MONSTER) return 10 + (c.power || data.power || 0);
            if (data.type === CARD_TYPES.TRAP) return 15;
            if (data.type === CARD_TYPES.DRAMA) return 12;
            return 5;
          };
          return getVal(a) - getVal(b);
        });
        discardIds = sorted.slice(0, excess).map(c => c.instanceId);
      }
      GameEngine.endTurn(state, botPlayerId, discardIds);
      logs.push(`${bot.name} kết thúc lượt.${discardIds.length > 0 ? ` (Đã bỏ ${discardIds.length} lá bài thừa)` : ''}`);
    } catch (e) {}

    return { logs };
  }

  /**
   * Thực thi lượt đi của Bot theo từng bước tuần tự có diễn hoạt và thu thập đầy đủ kết quả kích hoạt hiệu ứng
   */
  static async executeTurnAnimated(state, botPlayerId, onStepCallback, delayMs = 600) {
    const bot = state.players[botPlayerId];
    if (!bot || bot.isGhost) return;

    const wait = (ms) => new Promise(res => setTimeout(res, ms));
    const hadMonsterAtTurnStart = bot.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker);
    const isOpeningPeace = this.isOpeningPeaceTurn(state, bot, hadMonsterAtTurnStart);
    const canHarmOpponentsNow = !isOpeningPeace && Object.values(state.players).some(p => {
      if (p.id === botPlayerId || p.isGhost) return false;
      if (state.isTeamMode && p.teamId === bot.teamId) return false;
      if (this.isTargetUnpreparedPlayer(state, p, hadMonsterAtTurnStart)) return false;
      return true;
    });

    for (const p of Object.values(state.players)) {
      if (p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker)) {
        p.hasSummonedMonster = true;
      }
    }

    // BƯỚC 0: KỸ NĂNG ĐẠI DIỆN NV-07 / NV-08
    if (!bot.hasUsedAliveSkillThisTurn && ['NV-07', 'NV-08'].includes(bot.characterId)) {
      try {
        const charCard = ALL_96_CARDS[bot.characterId];
        const logBefore = state.actionLog.length;
        const evBefore = (state.effectEvents || []).length;
        GameEngine.activateCharacterSkill(state, botPlayerId);
        const newLogs = state.actionLog.slice(logBefore).map(l => l.message).join(' • ');
        const newEvents = (state.effectEvents || []).slice(evBefore);
        if (onStepCallback && charCard) {
          await onStepCallback({
            type: 'SKILL',
            card: charCard,
            title: `✨ THẦN LỰC: ${charCard.name}`,
            desc: newLogs || `${bot.name} phát động kỹ năng Đại Diện [${charCard.name}]!`,
            effectEvents: newEvents,
            icon: '✨',
            state
          });
          await wait(delayMs);
        }
      } catch (e) {}
    }

    // BƯỚC 1: DUNG HỢP HUYỀN THOẠI
    if (state.fusionDeck && state.fusionDeck.length > 0) {
      for (const fusionCard of [...state.fusionDeck]) {
        const fId = fusionCard.cardId || fusionCard.id;
        if (['DH-07', 'DH-11', 'DH-03'].includes(fId) && !canHarmOpponentsNow) continue;
        const materials = FusionSystem.findAvailableFusionMaterials(state, botPlayerId, fId);
        if (materials && materials.length === 2) {
          try {
            const logBefore = state.actionLog.length;
            const evBefore = (state.effectEvents || []).length;
            const newFusion = GameEngine.executeFusionSummon(state, botPlayerId, fId, materials);
            const newLogs = state.actionLog.slice(logBefore).map(l => l.message).join(' • ');
            const newEvents = (state.effectEvents || []).slice(evBefore);
            const targetSlot = bot.monsterSlots.findIndex(m => m && m.instanceId === newFusion.instanceId);
            if (onStepCallback) {
              await onStepCallback({
                type: 'FUSION',
                card: newFusion,
                slotIndex: targetSlot !== -1 ? targetSlot : 0,
                title: `🌀 DUNG HỢP: ${newFusion.name}`,
                desc: newLogs || `${bot.name} dung hợp [${newFusion.name}] (${newFusion.basePower} ⚔️)!`,
                effectEvents: newEvents,
                icon: '🌀',
                state
              });
              await wait(delayMs);
            }
            break;
          } catch (e) {}
        }
      }
    }

    // BƯỚC 2: HIẾN TẾ TRIỆU HỒI TRÙM
    if (!state.normalSummonUsed || (state.bonusSummonsAvailable || 0) > 0) {
      const bossCards = bot.hand.filter(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return (c.type || d.type) === CARD_TYPES.HIGH_MONSTER && c.cardId !== 'TR-14' && (!['TR-01', 'TR-12'].includes(c.cardId) || canHarmOpponentsNow);
      });
      const validTributeSlots = bot.monsterSlots
        .map((m, idx) => ({ m, idx }))
        .filter(({ m }) => m !== null && !m.isGhostSlotMarker && !(m.equippedItems || []).some(it => it.cardId === 'DC-07'));
      if (bossCards.length > 0 && validTributeSlots.length > 0) {
        let minPower = Infinity;
        let tributeSlot = validTributeSlots[0].idx;
        validTributeSlots.forEach(({ m, idx }) => {
          const p = m.power !== undefined ? m.power : (m.basePower || 0);
          if (p < minPower) {
            minPower = p;
            tributeSlot = idx;
          }
        });
        const chosenBoss = bossCards[0];
        try {
          const logBefore = state.actionLog.length;
          const evBefore = (state.effectEvents || []).length;
          const bossCard = GameEngine.tributeSummon(state, botPlayerId, chosenBoss.instanceId, tributeSlot);
          const newLogs = state.actionLog.slice(logBefore).map(l => l.message).join(' • ');
          const newEvents = (state.effectEvents || []).slice(evBefore);
          const bossData = ALL_96_CARDS[bossCard.cardId] || bossCard;
          if (onStepCallback) {
            await onStepCallback({
              type: 'TRIBUTE',
              card: bossCard,
              slotIndex: tributeSlot,
              title: `👑 HIẾN TẾ: ${bossCard.name}`,
              desc: newLogs || `${bot.name} gọi Thần Thú [${bossCard.name}] (${bossData.power || bossCard.basePower} ⚔️)!`,
              effectEvents: newEvents,
              icon: '👑',
              state
            });
            await wait(delayMs);
          }
        } catch (e) {}
      }
    }

    // BƯỚC 3: TRIỆU HỒI LINH THÚ CẤP THẤP
    while (!state.normalSummonUsed || (state.bonusSummonsAvailable || 0) > 0) {
      const emptyMonsterSlot = bot.monsterSlots.findIndex(s => s === null);
      if (emptyMonsterSlot === -1) break;

      const lowMonsters = bot.hand.filter(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return (c.type || d.type) === CARD_TYPES.LOW_MONSTER;
      });

      if (lowMonsters.length === 0) break;

      lowMonsters.sort((a, b) => {
        const pa = a.power !== undefined ? a.power : (a.basePower || ALL_96_CARDS[a.cardId]?.power || 0);
        const pb = b.power !== undefined ? b.power : (b.basePower || ALL_96_CARDS[b.cardId]?.power || 0);
        return pb - pa;
      });

      const chosenCard = lowMonsters[0];
      try {
        const logBefore = state.actionLog.length;
        const evBefore = (state.effectEvents || []).length;
        GameEngine.normalSummon(state, botPlayerId, chosenCard.instanceId, emptyMonsterSlot);
        const newLogs = state.actionLog.slice(logBefore).map(l => l.message).join(' • ');
        const newEvents = (state.effectEvents || []).slice(evBefore);
        const cardData = ALL_96_CARDS[chosenCard.cardId] || chosenCard;
        if (onStepCallback) {
          await onStepCallback({
            type: 'SUMMON',
            card: chosenCard,
            slotIndex: emptyMonsterSlot,
            title: `⚔️ TRIỆU HỒI: ${chosenCard.name}`,
            desc: newLogs || `${bot.name} triệu hồi [${chosenCard.name}] (${cardData.power || chosenCard.basePower} ⚔️)!`,
            effectEvents: newEvents,
            icon: '⚔️',
            state
          });
          await wait(delayMs);
        }
      } catch (e) {
        break;
      }
    }

    // BƯỚC 3B: TRIỆU HỒI GỌI BẦY (SWARM SUMMON)
    if (!state.swarmSummonUsed) {
      const emptySlotForSwarm = bot.monsterSlots.findIndex(s => s === null);
      if (emptySlotForSwarm !== -1) {
        const swarmCandidates = bot.hand.filter(c => {
          const d = ALL_96_CARDS[c.cardId] || c;
          return d.freeSwarmSummon || c.cardId === 'TR-14';
        });
        if (swarmCandidates.length > 0) {
          try {
            const logBefore = state.actionLog.length;
            const evBefore = (state.effectEvents || []).length;
            const swarmCard = GameEngine.swarmSummon(state, botPlayerId, swarmCandidates[0].instanceId, emptySlotForSwarm);
            const newLogs = state.actionLog.slice(logBefore).map(l => l.message).join(' • ');
            const newEvents = (state.effectEvents || []).slice(evBefore);
            const cardData = ALL_96_CARDS[swarmCard.cardId] || swarmCard;
            if (onStepCallback) {
              await onStepCallback({
                type: 'SUMMON',
                card: swarmCard,
                slotIndex: emptySlotForSwarm,
                title: `🐾 GỌI BẦY: ${swarmCard.name}`,
                desc: newLogs || `${bot.name} gọi bầy tiếp viện [${swarmCard.name}] (${cardData.power || swarmCard.basePower} ⚔️)!`,
                effectEvents: newEvents,
                icon: '🐾',
                state
              });
              await wait(delayMs);
            }
          } catch (e) {}
        }
      }
    }

    // BƯỚC 4: ÚP BÀI BẪY THIÊN CƠ
    const emptyTrapSlot = bot.trapSlots.findIndex(s => s === null);
    if (emptyTrapSlot !== -1) {
      const trapCard = bot.hand.find(c => {
        const d = ALL_96_CARDS[c.cardId] || c;
        return (c.type || d.type) === CARD_TYPES.TRAP;
      });

      if (trapCard) {
        try {
          GameEngine.setTrap(state, botPlayerId, trapCard.instanceId, emptyTrapSlot);
          if (onStepCallback) {
            await onStepCallback({
              type: 'TRAP_SET',
              trapSlot: emptyTrapSlot,
              title: '⚠️ ÚP BẪY THIÊN CƠ',
              desc: `${bot.name} úp 1 lá Bẫy Thiên Cơ xuống sân.`,
              icon: '⚠️',
              state
            });
            await wait(delayMs);
          }
        } catch (e) {}
      }
    }

    // BƯỚC 5: GẮN PHÁP BẢO
    const equipCards = bot.hand.filter(c => {
      const d = ALL_96_CARDS[c.cardId] || c;
      return (c.type || d.type) === CARD_TYPES.EQUIPMENT;
    });
    for (const eqCard of equipCards) {
      const eqData = ALL_96_CARDS[eqCard.cardId] || eqCard;
      if (eqCard.cardId === 'DC-14' && !canHarmOpponentsNow) continue;
      if (eqData.target === 'ENEMY') {
        if (!canHarmOpponentsNow) continue;
        const validOpponents = Object.values(state.players).filter(p => {
          if (p.id === botPlayerId || p.isGhost) return false;
          if (state.isTeamMode && p.teamId === bot.teamId) return false;
          return p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker);
        });
        if (validOpponents.length > 0) {
          const opp = validOpponents[0];
          const slotIdx = opp.monsterSlots.findIndex(m => m !== null && !m.isGhostSlotMarker);
          try {
            const logBefore = state.actionLog.length;
            const evBefore = (state.effectEvents || []).length;
            GameEngine.equipItem(state, botPlayerId, eqCard.instanceId, opp.id, slotIdx);
            const newLogs = state.actionLog.slice(logBefore).map(l => l.message).join(' • ');
            const newEvents = (state.effectEvents || []).slice(evBefore);
            if (onStepCallback) {
              await onStepCallback({
                type: 'EQUIP',
                card: eqCard,
                targetPlayerId: opp.id,
                targetSlot: slotIdx,
                title: `🛡️ GẮN PHÁP BẢO: ${eqCard.name}`,
                desc: newLogs || `${bot.name} gắn [${eqCard.name}] lên Linh Thú của ${opp.name}!`,
                effectEvents: newEvents,
                icon: '🛡️',
                state
              });
              await wait(delayMs);
            }
          } catch (e) {}
        }
      } else {
        const mySlotIdx = bot.monsterSlots.findIndex(m => m !== null && !m.isGhostSlotMarker);
        if (mySlotIdx !== -1) {
          try {
            const logBefore = state.actionLog.length;
            const evBefore = (state.effectEvents || []).length;
            GameEngine.equipItem(state, botPlayerId, eqCard.instanceId, botPlayerId, mySlotIdx);
            const newLogs = state.actionLog.slice(logBefore).map(l => l.message).join(' • ');
            const newEvents = (state.effectEvents || []).slice(evBefore);
            if (onStepCallback) {
              await onStepCallback({
                type: 'EQUIP',
                card: eqCard,
                targetPlayerId: botPlayerId,
                targetSlot: mySlotIdx,
                title: `🛡️ PHÁP BẢO: ${eqCard.name}`,
                desc: newLogs || `${bot.name} trang bị [${eqCard.name}]!`,
                effectEvents: newEvents,
                icon: '🛡️',
                state
              });
              await wait(delayMs);
            }
          } catch (e) {}
        }
      }
    }

    // BƯỚC 6: KÍCH HOẠT KỸ NĂNG CHỦ ĐỘNG TRÊN SÂN
    if (!isOpeningPeace) {
      for (let sIdx = 0; sIdx < bot.monsterSlots.length; sIdx++) {
        const m = bot.monsterSlots[sIdx];
        if (!m || m.isGhostSlotMarker) continue;
        if (['CT-13', 'TR-09', 'DH-08'].includes(m.cardId)) {
          try {
            const logBefore = state.actionLog.length;
            const evBefore = (state.effectEvents || []).length;
            GameEngine.activateFieldSkill(state, botPlayerId, sIdx);
            const newLogs = state.actionLog.slice(logBefore).map(l => l.message).join(' • ');
            const newEvents = (state.effectEvents || []).slice(evBefore);
            if (onStepCallback) {
              await onStepCallback({
                type: 'SKILL',
                card: m,
                slotIndex: sIdx,
                title: `⚡ KỸ NĂNG: ${m.name}`,
                desc: newLogs || `${bot.name} kích hoạt kỹ năng của [${m.name}]!`,
                effectEvents: newEvents,
                icon: '⚡',
                state
              });
              await wait(delayMs);
            }
          } catch (e) {}
        }
      }
    }

    // BƯỚC 7: TUNG PHÉP SỰ TÍCH
    const OFFENSIVE_DRAMAS = ['DR-01', 'DR-02', 'DR-06', 'DR-10', 'DR-11'];
    const dramaCards = bot.hand.filter(c => {
      const d = ALL_96_CARDS[c.cardId] || c;
      return (c.type || d.type) === CARD_TYPES.DRAMA;
    });
    for (const drama of dramaCards) {
      const validOpponents = Object.values(state.players).filter(p => {
        if (p.id === botPlayerId || p.isGhost) return false;
        if (state.isTeamMode && p.teamId === bot.teamId) return false;
        if (OFFENSIVE_DRAMAS.includes(drama.cardId) && this.isTargetUnpreparedPlayer(state, p, hadMonsterAtTurnStart)) {
          return false;
        }
        return true;
      });
      if (OFFENSIVE_DRAMAS.includes(drama.cardId) && (isOpeningPeace || validOpponents.length === 0)) {
        continue;
      }
      const targetParams = {};
      if (validOpponents.length > 0) {
        targetParams.targetPlayerId = validOpponents[0].id;
        const sIdx = validOpponents[0].monsterSlots.findIndex(m => m !== null);
        if (sIdx !== -1) targetParams.targetSlotIndex = sIdx;
      }
      try {
        const logBefore = state.actionLog.length;
        const evBefore = (state.effectEvents || []).length;
        GameEngine.useDrama(state, botPlayerId, drama.instanceId, targetParams);
        const newLogs = state.actionLog.slice(logBefore).map(l => l.message).join(' • ');
        const newEvents = (state.effectEvents || []).slice(evBefore);
        if (onStepCallback) {
          await onStepCallback({
            type: 'DRAMA',
            card: drama,
            targetPlayerId: targetParams.targetPlayerId,
            title: `🎭 SỰ TÍCH: ${drama.name}`,
            desc: newLogs || `${bot.name} dùng [${drama.name}]!`,
            effectEvents: newEvents,
            icon: '🎭',
            state
          });
          await wait(delayMs);
        }
      } catch (e) {}
    }

    // BƯỚC 8: GIAO TRANH (BATTLE PHASE)
    const attackableOpponentsExist = Object.values(state.players).some(p => {
      if (p.id === botPlayerId || p.isGhost) return false;
      if (state.isTeamMode && p.teamId === bot.teamId) return false;
      if (this.isTargetUnpreparedPlayer(state, p, hadMonsterAtTurnStart)) return false;
      return true;
    });

    if (isOpeningPeace || !attackableOpponentsExist) {
      const peaceMsg = isOpeningPeace
        ? `🕊️ [${bot.name}]: Tuân thủ Hiệp Ước Hòa Bình Lượt 1, bỏ qua Giai đoạn Tấn Công.`
        : `🕊️ [${bot.name}]: Bảo hộ lượt bày trò đầu — Chưa tấn công khi người chơi chưa triệu hồi Chiến Thần nào!`;
      state.actionLog.push({
        turn: state.turnNumber,
        message: peaceMsg
      });
      if (onStepCallback) {
        await onStepCallback({
          type: 'PEACE',
          title: '🕊️ HIỆP ƯỚC HÒA BÌNH LƯỢT ĐẦU',
          desc: peaceMsg,
          icon: '🕊️',
          state
        });
        await wait(500);
      }
    } else {
      state.currentPhase = PHASES.BATTLE;
      for (let slotIdx = 0; slotIdx < bot.monsterSlots.length; slotIdx++) {
        const monster = bot.monsterSlots[slotIdx];
        if (!monster || monster.isGhostSlotMarker || monster.cannotAttack || monster.cardId === 'CT-10') continue;

        const maxAttacks = (monster.cardId === 'TR-04' || monster.cardId === 'DH-11') ? 2 : 1;
        for (let atkCount = 0; atkCount < maxAttacks; atkCount++) {
          const currentMonster = bot.monsterSlots[slotIdx];
          if (!currentMonster || currentMonster.isGhostSlotMarker) break;
          const usedAttacks = state.attacksDeclaredThisTurn.filter(
            id => id === currentMonster.instanceId || id === `${botPlayerId}_${slotIdx}`
          ).length;
          if (usedAttacks >= maxAttacks) break;

          const dc10OwnerId = (currentMonster.equippedItems || []).find(it => it.cardId === 'DC-10')?.equippedByPlayerId;
          const validOpponents = Object.values(state.players).filter(p => {
            if (p.id === botPlayerId || p.isGhost) return false;
            if (state.isTeamMode && p.teamId === bot.teamId) return false;
            if (bot.diplomacyPeaceTargets?.includes(p.id)) return false;
            if (currentMonster.bombedByPlayerId === p.id) return false;
            if (dc10OwnerId && dc10OwnerId === p.id) return false;
            if (this.isTargetUnpreparedPlayer(state, p, hadMonsterAtTurnStart)) return false;
            return true;
          });

          if (validOpponents.length === 0) break;

          let targetOpponent = validOpponents.find(opp => opp.monsterSlots.every(s => s === null || s.isGhostSlotMarker));
          let targetMonsterSlot = null;

          if (!targetOpponent) {
            const myPower = BattleResolver.calculateMonsterPower(state, botPlayerId, slotIdx, { isAttacking: true });
            for (const opp of validOpponents) {
              for (let oppSlot = 0; oppSlot < opp.monsterSlots.length; oppSlot++) {
                const oppMonster = opp.monsterSlots[oppSlot];
                if (!oppMonster || oppMonster.isGhostSlotMarker) continue;

                const oppPower = BattleResolver.calculateMonsterPower(state, opp.id, oppSlot, { isDefending: true });

                if (myPower >= oppPower) {
                  targetOpponent = opp;
                  targetMonsterSlot = oppSlot;
                  break;
                }
              }
              if (targetOpponent) break;
            }
          }

          if (targetOpponent) {
            try {
              const attackerSnapshot = JSON.parse(JSON.stringify(currentMonster));
              const resolvedDefSlot = targetMonsterSlot !== null
                ? targetMonsterSlot
                : targetOpponent.monsterSlots.findIndex(m => m !== null && !m.isGhostSlotMarker);
              const defenderSnapshot = (resolvedDefSlot !== -1 && targetOpponent.monsterSlots[resolvedDefSlot])
                ? JSON.parse(JSON.stringify(targetOpponent.monsterSlots[resolvedDefSlot]))
                : null;
              const preAtkPower = BattleResolver.calculateMonsterPower(state, botPlayerId, slotIdx, { isAttacking: true });
              const preDefPower = (resolvedDefSlot !== -1 && defenderSnapshot)
                ? BattleResolver.calculateMonsterPower(state, targetOpponent.id, resolvedDefSlot, { isDefending: true })
                : null;

              const evBefore = (state.effectEvents || []).length;
              const res = GameEngine.declareAttack(state, botPlayerId, slotIdx, targetOpponent.id, targetMonsterSlot);
              const newEvents = (state.effectEvents || []).slice(evBefore);
              if (onStepCallback) {
                await onStepCallback({
                  type: 'ATTACK',
                  card: attackerSnapshot,
                  attackerPlayerId: botPlayerId,
                  attackerSlot: slotIdx,
                  targetPlayerId: targetOpponent.id,
                  targetSlot: defenderSnapshot ? resolvedDefSlot : null,
                  defenderCard: defenderSnapshot,
                  atkPower: res.atkPower ?? preAtkPower,
                  defPower: res.defPower ?? preDefPower,
                  battleResult: res,
                  effectEvents: newEvents,
                  title: `💥 ${attackerSnapshot.name} TẤN CÔNG ${defenderSnapshot ? `[${defenderSnapshot.name}]` : targetOpponent.name}!`,
                  desc: res.logs.join(' • '),
                  icon: '💥',
                  state
                });
                await wait(delayMs);
              }
            } catch (e) {
              break;
            }
          } else {
            break;
          }
        }
      }
    }

    // BƯỚC 9: HẾT LƯỢT
    try {
      const handLimit = bot.handLimit || 6;
      let discardIds = [];
      if (bot.hand.length > handLimit) {
        const excess = bot.hand.length - handLimit;
        const sorted = [...bot.hand].sort((a, b) => {
          const getVal = (c) => {
            const data = ALL_96_CARDS[c.cardId] || c;
            if (data.type === CARD_TYPES.HIGH_MONSTER && !bot.monsterSlots.some(m => m !== null)) return 1;
            if (data.type === CARD_TYPES.LOW_MONSTER) return 10 + (c.power || data.power || 0);
            if (data.type === CARD_TYPES.TRAP) return 15;
            if (data.type === CARD_TYPES.DRAMA) return 12;
            return 5;
          };
          return getVal(a) - getVal(b);
        });
        discardIds = sorted.slice(0, excess).map(c => c.instanceId);
      }
      const evBefore = (state.effectEvents || []).length;
      GameEngine.endTurn(state, botPlayerId, discardIds);
      const newEvents = (state.effectEvents || []).slice(evBefore);
      if (onStepCallback) {
        await onStepCallback({
          type: 'END_TURN',
          title: '⏩ KẾT THÚC LƯỢT',
          desc: `${bot.name} hoàn thành lượt đi.${discardIds.length > 0 ? ` (Bỏ ${discardIds.length} lá bài thừa)` : ''}`,
          effectEvents: newEvents,
          icon: '⏩',
          state
        });
        await wait(350);
      }
    } catch (e) {}
  }
}
