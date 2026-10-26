import { GameEngine } from '../src/core/GameEngine.js';
import { TurnManager } from '../src/core/TurnManager.js';
import { BotBrain } from '../src/core/BotBrain.js';

/**
 * Nếu đến lượt của Bot trong phòng chơi chung, Server tự động điều khiển Bot đánh
 */
export function runBotTurnsIfNeeded(room) {
  if (!room || !room.gameState || room.gameState.gameStatus === 'ENDED') return;
  let safetyCounter = 0;
  while (safetyCounter < 8 && room.gameState.gameStatus !== 'ENDED') {
    const activeId = room.gameState.turnOrder[room.gameState.currentTurnIndex];
    const activePlayer = room.gameState.players[activeId];
    if (activePlayer && activePlayer.isBot && !activePlayer.isGhost) {
      BotBrain.executeTurn(room.gameState, activeId);
      safetyCounter++;
    } else {
      break;
    }
  }
}

/**
 * Áp dụng một hành động trong trận của người chơi lên trạng thái phòng (ném lỗi nếu không hợp lệ)
 */
export function applyGameAction(room, playerId, actionType, params = {}) {
  const state = room.gameState;
  if (!state || room.status !== 'IN_GAME') {
    throw new Error('Trận đấu chưa bắt đầu');
  }

  switch (actionType) {
    case 'NORMAL_SUMMON':
      GameEngine.normalSummon(state, playerId, params.cardInstanceId, params.slotIndex);
      break;
    case 'SWARM_SUMMON':
      GameEngine.swarmSummon(state, playerId, params.cardInstanceId, params.slotIndex);
      break;
    case 'TRIBUTE_SUMMON':
      GameEngine.tributeSummon(state, playerId, params.bossCardInstanceId, params.tributeSlotIndex);
      break;
    case 'FUSION_SUMMON':
      GameEngine.fusionSummon(state, playerId, params.fusionCardId, params.materialInstanceIds);
      break;
    case 'EQUIP_ITEM':
      GameEngine.equipItem(state, playerId, params.equipCardInstanceId, params.targetPlayerId, params.targetSlotIndex);
      break;
    case 'USE_DRAMA':
      GameEngine.useDrama(state, playerId, params.dramaCardInstanceId, params.targetParams);
      break;
    case 'SET_TRAP':
      GameEngine.setTrap(state, playerId, params.trapCardInstanceId, params.trapSlotIndex);
      break;
    case 'ACTIVATE_TRAP':
      GameEngine.activateTrap(state, playerId, params.trapSlotIndex, params.triggerContext || {});
      break;
    case 'ACTIVATE_FIELD_SKILL':
      GameEngine.activateFieldSkill(state, playerId, params.slotIndex, params.targetParams || {});
      break;
    case 'ACTIVATE_CHARACTER_SKILL':
      GameEngine.activateCharacterSkill(state, playerId, params.targetParams || {});
      break;
    case 'DECLARE_ATTACK':
      GameEngine.declareAttack(state, playerId, params.attackerSlotIndex, params.targetPlayerId, params.targetSlotIndex, params.options);
      break;
    case 'MANUAL_DRAW':
      if (!state.manualDrawUsedThisTurn) {
        TurnManager.drawCard(state, playerId, { isNormalTurnDraw: true });
        state.manualDrawUsedThisTurn = true;
      }
      break;
    case 'DISCARD_CARD': {
      const p = state.players[playerId];
      if (p) {
        const idx = p.hand.findIndex(c => c.instanceId === params.cardInstanceId);
        if (idx !== -1) {
          const [disc] = p.hand.splice(idx, 1);
          state.graveyard.push(disc);
        }
      }
      break;
    }
    case 'END_TURN':
      GameEngine.endTurn(state, playerId, params.discardedInstanceIds || []);
      runBotTurnsIfNeeded(room);
      break;
    default:
      throw new Error(`Hành động không hợp lệ: ${actionType}`);
  }

  room.resetTurnTimer();
}
