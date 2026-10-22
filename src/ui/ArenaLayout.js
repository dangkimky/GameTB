import { ALL_96_CARDS } from '../data/cards.js';
import { CardComponent } from './CardComponent.js';
import { ActionCueManager } from '../engine/ActionCueManager.js';

/**
 * ArenaLayout — Quản lý bố cục không gian bàn đấu hỗ trợ từ 2 đến 6 người chơi
 * Định danh rõ ràng tất cả các data-zone-id để phục vụ diễn hoạt bay bài
 * Hỗ trợ đầy đủ cả giao diện Máy Tính (Desktop Spatial Arc) và Điện Thoại (Mobile Adaptive Strip & Touch Dock)
 */
export class ArenaLayout {
  static getSeatStyles(numPlayers) {
    switch (numPlayers) {
      case 2:
        return [
          { top: '8px', left: '50%', transform: 'translateX(-50%)' }
        ];
      case 3:
        return [
          { top: '8px', left: '26%', transform: 'translateX(-50%)' },
          { top: '8px', left: '74%', transform: 'translateX(-50%)' }
        ];
      case 4:
        return [
          { top: '42%', left: '20px', transform: 'translateY(-50%)' },
          { top: '8px', left: '50%', transform: 'translateX(-50%)' },
          { top: '42%', right: '20px', transform: 'translateY(-50%)' }
        ];
      case 5:
        return [
          { top: '52%', left: '15px', transform: 'translateY(-50%)' },
          { top: '8px', left: '30%', transform: 'translateX(-50%)' },
          { top: '8px', left: '70%', transform: 'translateX(-50%)' },
          { top: '52%', right: '15px', transform: 'translateY(-50%)' }
        ];
      case 6:
      default:
        return [
          { top: '52%', left: '15px', transform: 'translateY(-50%)' },
          { top: '8px', left: '24%', transform: 'translateX(-50%)' },
          { top: '8px', left: '50%', transform: 'translateX(-50%)' },
          { top: '8px', left: '76%', transform: 'translateX(-50%)' },
          { top: '52%', right: '15px', transform: 'translateY(-50%)' }
        ];
    }
  }

  static renderArenaHtml(state, localPlayerId = 'p1', options = {}) {
    const players = Object.values(state.players);
    const localPlayer = state.players[localPlayerId] || players[0];
    const opponents = players.filter(p => p.id !== localPlayer.id);
    const isMobileLayout = Boolean(options?.isMobileLayout);

    const seatStyles = this.getSeatStyles(players.length);

    // 1. Render các trạm của đối thủ
    const opponentsHtml = opponents.map((opp, idx) => {
      const posStyle = seatStyles[idx] || { top: '30px', left: '50%' };
      const styleStr = Object.entries(posStyle).map(([k, v]) => `${k}:${v}`).join(';');
      const isCurrentTurn = state.turnOrder[state.currentTurnIndex] === opp.id;
      const charData = ALL_96_CARDS[opp.characterId] || {};
      const revealExpiry = state.revealedHands && state.revealedHands[opp.id];
      const isHandRevealed = Boolean(revealExpiry && (revealExpiry === true || revealExpiry > Date.now()));

      return `
        <div class="player-station ${isCurrentTurn ? 'active-turn' : ''} ${opp.isGhost ? 'ghost-mode' : ''}"
             id="station-${opp.id}"
             data-player-id="${opp.id}"
             style="${styleStr};">
          <div class="station-header">
            <div class="station-avatar-box">
              <span style="font-size: 20px;">${opp.isGhost ? '👻' : '👑'}</span>
            </div>
            <div class="station-meta-info">
              <div style="display: flex; align-items: center; gap: 4px;">
                <span class="station-player-name">${opp.name} (${charData.name || ''})</span>
                ${state.isTeamMode && opp.teamId ? `
                  <span style="font-size: 8.5px; font-weight: 800; padding: 1px 4px; border-radius: 4px; background: ${opp.teamId === 'TEAM_A' ? '#ef4444' : '#3b82f6'}; color: #fff;">${opp.teamId === 'TEAM_A' ? 'PHE ĐỎ' : 'PHE XANH'}</span>
                ` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div class="hp-badge-container" data-zone-id="zone-player-${opp.id}-hp">
                  <span class="hp-heart-icon">♥</span>
                  <span class="hp-text-value">${opp.hp} HP</span>
                </div>
                <span data-zone-id="zone-player-${opp.id}-hand" style="font-size: 10px; color: #facc15; font-weight: 800; background: rgba(0,0,0,0.45); padding: 1px 6px; border-radius: 8px;">
                  🃏 ${opp.hand.length}
                </span>
              </div>
            </div>
          </div>

          <!-- Nếu bài trên tay đối thủ đang bị yêu cầu xem (CT-01, DH-01, NV-01...), LẬT NGỬA toàn bộ lá bài ngay trên bàn cho người chơi xem! -->
          ${isHandRevealed && opp.hand.length > 0 ? `
            <div class="opponent-revealed-hand-strip"
                 data-revealed-player="${opp.id}"
                 style="background: rgba(6, 182, 212, 0.22); border: 1.5px solid #06b6d4; border-radius: 8px; padding: 5px 6px; margin: 2px 0; box-shadow: 0 0 16px rgba(6, 182, 212, 0.45);">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 9px; font-weight: 900; color: #67e8f9; text-transform: uppercase;">
                  👁️ BÀI ĐÃ LẬT NGỬA (${opp.hand.length} LÁ):
                </span>
                <button class="btn-open-revealed-hand"
                        data-reveal-player-id="${opp.id}"
                        style="background: #06b6d4; color: #082f49; border: none; border-radius: 4px; font-size: 8.5px; font-weight: 900; padding: 1px 5px; cursor: pointer;">
                  🔍 Phóng to
                </button>
              </div>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;">
                ${opp.hand.map(c => CardComponent.renderCardHtml(c, { faceDown: false, customClass: 'revealed-opponent-hand-card' })).join('')}
              </div>
            </div>
          ` : ''}

          <div class="station-field-slots">
            <!-- Hàng Ô Linh Thú (Monster Slots) -->
            <div class="monster-slots-row">
              <div class="field-slot-dropzone" id="slot-${opp.id}-monster-0" data-zone-id="zone-player-${opp.id}-monster-0">
                ${opp.monsterSlots[0] ? CardComponent.renderCardHtml(opp.monsterSlots[0]) : '<span class="slot-placeholder-label">Linh Thú</span>'}
              </div>
              <div class="field-slot-dropzone" id="slot-${opp.id}-monster-1" data-zone-id="zone-player-${opp.id}-monster-1">
                ${opp.monsterSlots[1] ? CardComponent.renderCardHtml(opp.monsterSlots[1]) : '<span class="slot-placeholder-label">Linh Thú</span>'}
              </div>
            </div>

            <!-- Hàng Ô Bẫy Thiên Cơ (Trap Slots): Khi bị soi bởi NV-01 hoặc DR-09 sẽ lật ngửa mặt trước cho người chơi xem -->
            <div class="trap-slots-row">
              ${opp.trapSlots.map((trap, tIdx) => {
                const isRevealedByPeek = Boolean(state.revealedTraps && state.revealedTraps[`${opp.id}_${tIdx}`]);
                return `
                  <div class="field-slot-dropzone ${isRevealedByPeek ? 'revealed-trap-slot' : ''}"
                       id="slot-${opp.id}-trap-${tIdx}"
                       data-zone-id="zone-player-${opp.id}-trap-${tIdx}"
                       style="${isRevealedByPeek ? 'border-color: #38bdf8; box-shadow: 0 0 12px rgba(56, 189, 248, 0.6); position: relative;' : ''}">
                    ${trap ? `
                      ${CardComponent.renderCardHtml(trap, { faceDown: !trap.faceUp && !isRevealedByPeek })}
                      ${isRevealedByPeek ? `
                        <div style="position: absolute; top: -7px; left: 50%; transform: translateX(-50%); background: #0284c7; color: #fff; font-size: 7.5px; font-weight: 900; padding: 1px 5px; border-radius: 999px; border: 1px solid #bae6fd; z-index: 15; white-space: nowrap;">
                          👁️ ĐÃ LẬT SOI
                        </div>
                      ` : ''}
                    ` : '<span class="slot-placeholder-label">Bẫy Úp</span>'}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 2. Render Cụm Chồng Bài Trung Tâm (Center Decks Hub)
    const centerDecksHtml = `
      <div class="center-decks-hub">
        <!-- Chồng Bài Bốc -->
        <div class="deck-slot" id="btn-draw-pile" data-zone-id="zone-draw-pile" title="Bốc Bài (Click để bốc trong lượt của bạn)">
          <div class="deck-mini-card">
            <div class="card-back-design" style="width: 100%; height: 100%; border: none;">
              <span style="font-size: 24px;">🎴</span>
            </div>
            <div class="deck-count-badge">${state.drawPile.length}</div>
          </div>
          <span class="deck-label-title">BÀI BỐC</span>
        </div>

        <!-- Bãi Rác (Graveyard) -->
        <div class="deck-slot" id="btn-open-graveyard" data-zone-id="zone-graveyard" title="Bãi Rác / Linh Đàn (Click để mở xem các lá bài đã bỏ)">
          <div class="deck-mini-card" style="background: rgba(0,0,0,0.6); border-color: #64748b;">
            <span style="font-size: 26px;">🗑️</span>
            <div class="deck-count-badge" style="background: #64748b;">${state.graveyard.length}</div>
          </div>
          <span class="deck-label-title">BÃI RÁC</span>
        </div>

        <!-- Chồng Bài Huyền Thoại (Fusion Deck) -->
        <div class="deck-slot" id="btn-open-fusion" data-zone-id="zone-fusion-deck" title="Huyền Thoại Dung Hợp (Click để xem 12 công thức ghép)">
          <div class="deck-mini-card" style="background: linear-gradient(135deg, #78350f, #581c87); border-color: #f59e0b;">
            <span style="font-size: 26px;">🌀</span>
            <div class="deck-count-badge" style="background: #f59e0b; color: #000;">${state.fusionDeck.length}</div>
          </div>
          <span class="deck-label-title">DUNG HỢP</span>
        </div>

        <!-- Chồng Bài Ám Quẻ (Curse Deck) -->
        <div class="deck-slot" id="btn-open-curse" data-zone-id="zone-amque-deck" title="Bài Ám Quẻ Tâm Linh">
          <div class="deck-mini-card" style="background: rgba(13, 148, 136, 0.4); border-color: #14b8a6;">
            <span style="font-size: 26px;">👻</span>
            <div class="deck-count-badge" style="background: #14b8a6;">${state.curseDeck.length}</div>
          </div>
          <span class="deck-label-title">ÁM QUẺ</span>
        </div>
      </div>
    `;

    // 3. Render Sân của Bạn (Local Player Field)
    const localCharData = ALL_96_CARDS[localPlayer.characterId] || {};
    const localFieldHtml = `
      <div class="player-station local-player-station" id="station-${localPlayer.id}" style="position: static; margin-bottom: 6px; border-color: var(--accent-warm);">
        <div class="station-header">
          <div class="station-avatar-box">
            <span style="font-size: 20px;">${localPlayer.isGhost ? '👻' : '👑'}</span>
          </div>
          <div class="station-meta-info">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span class="station-player-name" style="max-width: none;">BẠN: ${localPlayer.name} (${localCharData.name || ''})</span>
              ${state.isTeamMode && localPlayer.teamId ? `
                <span style="font-size: 8.5px; font-weight: 800; padding: 1px 4px; border-radius: 4px; background: ${localPlayer.teamId === 'TEAM_A' ? '#ef4444' : '#3b82f6'}; color: #fff;">${localPlayer.teamId === 'TEAM_A' ? 'PHE ĐỎ' : 'PHE XANH'}</span>
              ` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <div class="hp-badge-container" data-zone-id="zone-player-${localPlayer.id}-hp">
                <span class="hp-heart-icon">♥</span>
                <span class="hp-text-value">${localPlayer.hp} HP</span>
              </div>
              ${(state.bonusSummonsAvailable || 0) > 0 ? `
                <span style="font-size: 10px; background: #f59e0b; color: #000; font-weight: 900; padding: 1px 6px; border-radius: 8px;">
                  +${state.bonusSummonsAvailable} Lượt Triệu Hồi
                </span>
              ` : ''}
              ${!state.swarmSummonUsed ? `
                <span style="font-size: 10px; background: rgba(249, 115, 22, 0.25); border: 1px solid #f97316; color: #fed7aa; font-weight: 800; padding: 1px 6px; border-radius: 8px;">
                  🐾 Còn Lượt Gọi Bầy
                </span>
              ` : ''}
              ${state.lastRevealedView && state.lastRevealedView.cards?.length > 0 ? `
                <button id="btn-open-last-revealed"
                        style="background: linear-gradient(135deg, #06b6d4, #0284c7); color: #fff; border: 1px solid #bae6fd; border-radius: 8px; font-size: 10px; font-weight: 800; padding: 2px 8px; cursor: pointer;">
                  👁️ Xem Bài Đã Lật (${state.lastRevealedView.cards.length})
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="station-field-slots local-station-field-slots">
          <!-- 2 Ô Linh Thú của Bạn -->
          <div class="monster-slots-row">
            <div class="field-slot-dropzone" id="slot-${localPlayer.id}-monster-0" data-zone-id="zone-player-${localPlayer.id}-monster-0">
              ${localPlayer.monsterSlots[0] ? CardComponent.renderCardHtml(localPlayer.monsterSlots[0]) : '<span class="slot-placeholder-label">Ô Chiến Thần 1</span>'}
            </div>
            <div class="field-slot-dropzone" id="slot-${localPlayer.id}-monster-1" data-zone-id="zone-player-${localPlayer.id}-monster-1">
              ${localPlayer.monsterSlots[1] ? CardComponent.renderCardHtml(localPlayer.monsterSlots[1]) : '<span class="slot-placeholder-label">Ô Chiến Thần 2</span>'}
            </div>
          </div>

          <!-- 2 hoặc 3 Ô Nghiệp Quật của Bạn -->
          <div class="trap-slots-row">
            ${localPlayer.trapSlots.map((trap, tIdx) => `
              <div class="field-slot-dropzone" id="slot-${localPlayer.id}-trap-${tIdx}" data-zone-id="zone-player-${localPlayer.id}-trap-${tIdx}">
                ${trap ? CardComponent.renderCardHtml(trap, { faceDown: false }) : `<span class="slot-placeholder-label">Ô Bẫy ${tIdx + 1}</span>`}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // 4. Render Bài Trên Tay của Bạn (Xòe quạt trên Desktop, Trượt ngang cảm ứng trên Điện Thoại)
    const totalHand = localPlayer.hand.length;
    const handCardsHtml = localPlayer.hand.map((c, idx) => {
      const angle = (idx - (totalHand - 1) / 2) * 5;
      const translateY = Math.abs(idx - (totalHand - 1) / 2) * 4;
      return `
        <div class="hand-card-wrapper"
             style="transform: rotate(${angle}deg) translateY(${translateY}px); z-index: ${idx + 1};">
          ${CardComponent.renderCardHtml(c)}
        </div>
      `;
    }).join('');

    // 5. Render Thanh Thao Tác (Action Toolbar)
    const isMyTurn = state.turnOrder[state.currentTurnIndex] === localPlayer.id;
    const isActionLocked = Boolean(options?.isActionLocked);
    const canAct = isMyTurn && !isActionLocked;
    const selectedHandInstanceId = typeof options === 'string' ? options : (options?.selectedHandInstanceId || null);
    const suggestedActionId = canAct ? ActionCueManager.getSuggestedAction(state, localPlayer.id, selectedHandInstanceId) : null;

    const toolbarHtml = `
      <div class="action-toolbar" data-action-locked="${isActionLocked ? 'true' : 'false'}">
        ${isActionLocked ? `
          <div id="action-lock-indicator" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(245, 158, 11, 0.2); border: 1px solid #facc15; color: #fef08a; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 999px;">
            <span>🔒</span>
            <span>ĐANG XỬ LÝ HIỆU ỨNG...</span>
          </div>
        ` : ''}
        <button class="action-btn ${suggestedActionId === 'btn-action-summon' ? 'suggested-glow' : ''}" id="btn-action-summon" ${!canAct ? 'disabled' : ''}>⚔️ Triệu Hồi</button>
        <button class="action-btn ${suggestedActionId === 'btn-action-swarm' ? 'suggested-glow' : ''}" id="btn-action-swarm" ${!canAct || state.swarmSummonUsed ? 'disabled' : ''} style="background: linear-gradient(135deg, #f97316, #ea580c); color: #fff;" title="Triệu hồi Gọi Bầy: Gọi thêm 1 Linh Thú lên sân khi bạn đã có đồng minh trên sân hoặc dùng Linh Thú Gọi Bầy!">🐾 Gọi Bầy</button>
        <button class="action-btn ${suggestedActionId === 'btn-action-tribute' ? 'suggested-glow' : ''}" id="btn-action-tribute" ${!canAct ? 'disabled' : ''}>👑 Hiến Tế</button>
        <button class="action-btn ${suggestedActionId === 'btn-action-fusion' ? 'suggested-glow' : ''}" id="btn-action-fusion" ${!canAct ? 'disabled' : ''}>🌀 Dung Hợp</button>
        <button class="action-btn ${suggestedActionId === 'btn-action-equip' ? 'suggested-glow' : ''}" id="btn-action-equip" ${!canAct ? 'disabled' : ''} style="background: linear-gradient(135deg, #10b981, #059669); color: #fff;">🛡️ Trang Bị</button>
        <button class="action-btn ${suggestedActionId === 'btn-action-drama' ? 'suggested-glow' : ''}" id="btn-action-drama" ${!canAct ? 'disabled' : ''}>🎭 Dùng Phép</button>
        <button class="action-btn ${suggestedActionId === 'btn-action-trap' ? 'suggested-glow' : ''}" id="btn-action-trap" ${!canAct ? 'disabled' : ''}>⚠️ Úp Bẫy</button>
        <button class="action-btn" id="btn-action-skill" ${!canAct ? 'disabled' : ''} style="background: linear-gradient(135deg, #a855f7, #7e22ce); color: #fff;" title="Kích hoạt Kỹ năng Đại Diện Thần Thoại, Tuyệt kỹ Linh Thú trên sân hoặc Bẫy Tâm Lý">⚡ Kỹ Năng</button>
        <button class="action-btn" id="btn-action-draw" ${!canAct || state.manualDrawUsedThisTurn ? 'disabled' : ''} style="background: linear-gradient(135deg, #06b6d4, #0891b2); color: #fff;" title="${state.manualDrawUsedThisTurn ? 'Đã bốc thêm trong lượt này rồi' : 'Bốc thêm 1 lá bài trong lượt'}">🎴 Bốc Thêm</button>
        <button class="action-btn discard-btn" id="btn-action-discard" ${!canAct ? 'disabled' : ''} style="background: linear-gradient(135deg, #475569, #334155); color: #cbd5e1; border: 1px solid #64748b;" title="Bỏ lá bài đang chọn trên tay vào Bãi Rác">🗑️ Bỏ Rác</button>
        <button class="action-btn battle-btn ${suggestedActionId === 'btn-action-attack' ? 'suggested-glow' : ''}" id="btn-action-attack" ${!canAct || ((state.turnNumber === 1 || state.openingRoundActive) && !state.allowFirstTurnAttack) ? 'disabled' : ''} title="${(state.turnNumber === 1 || state.openingRoundActive) && !state.allowFirstTurnAttack ? 'Hiệp Ước Hòa Bình: Vòng bày trò đầu tiên không thể tấn công để bảo đảm công bằng!' : 'Tuyên bố tấn công'}">💥 TẤN CÔNG</button>
        <button class="action-btn end-btn ${suggestedActionId === 'btn-action-endturn' ? 'suggested-glow' : ''}" id="btn-action-endturn" ${!canAct ? 'disabled' : ''}>⏩ Hết Lượt</button>
      </div>
    `;

    return `
      <div id="arena-root" class="${isMobileLayout ? 'mobile-layout-active' : ''}">
        <div class="arena-background-scenery"></div>

        <!-- Top Bar -->
        <div class="arena-top-bar">
          <div class="game-logo-badge">
            <span>🐉</span> ĐẠI CHIẾN THẦN THOẠI & LINH THÚ VIỆT
          </div>

          <div class="turn-phase-tracker">
            <div class="turn-counter-pill">LƯỢT ${state.turnNumber}</div>
            <div class="phase-pill-list">
              <div class="phase-pill ${state.currentPhase === 'DRAW' ? 'active' : ''}">1. Hóng Hớt</div>
              <div class="phase-pill ${state.currentPhase === 'MAIN' ? 'active' : ''}">2. Bày Trò</div>
              <div class="phase-pill ${state.currentPhase === 'BATTLE' ? 'active' : ''}">3. Hỗn Chiến</div>
              <div class="phase-pill ${state.currentPhase === 'END' ? 'active' : ''}">4. Xả Rác</div>
            </div>
          </div>

          <div class="quick-tools-bar">
            <button class="tool-btn" id="btn-toggle-mobile-view" style="background: rgba(6, 182, 212, 0.22); border-color: rgba(6, 182, 212, 0.6); color: #a5f3fc;" title="Chuyển đổi giao diện tối ưu cho Điện Thoại và Máy Tính">
              ${isMobileLayout ? '📱 Chế Độ ĐT' : '🖥️ Tự Động / ĐT'}
            </button>
            <button class="tool-btn" id="btn-toggle-party-mode" style="background: rgba(217, 70, 239, 0.2); border-color: rgba(217, 70, 239, 0.5); color: #f5d0fe;" title="Chuyển đổi Chế độ Party (Mic/Tương tác) và Chill (Tự động)">
              ${options?.isPartyMode ? '🎉 Party Mode' : '☕ Chill Mode'}
            </button>
            <button class="tool-btn" id="btn-toggle-sound" style="background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.5);">${options?.isMuted ? '🔇 Tắt Âm' : '🔊 Âm Thanh'}</button>
            <button class="tool-btn" id="btn-open-compendium">🃏 120 Thẻ</button>
            <button class="tool-btn" id="btn-toggle-log">📜 Nhật Ký</button>
            <button class="tool-btn" id="btn-toggle-rules">📖 Luật Chơi</button>
            <button class="tool-btn" id="btn-back-to-home" style="background: rgba(239, 68, 68, 0.25); border-color: rgba(239, 68, 68, 0.6); color: #fecaca;">🏠 Trang Chủ</button>
          </div>
        </div>

        <!-- Banner Thông Báo Diễn Biến Nổi Bật -->
        <div id="action-announcement-banner" class="action-announcement-banner">
          <span class="banner-badge-icon" id="banner-badge-icon">⚡</span>
          <div class="banner-content-text">
            <div class="banner-title-line" id="banner-title-line">THÔNG BÁO</div>
            <div class="banner-desc-line" id="banner-desc-line">Diễn biến trận đấu...</div>
          </div>
        </div>

        <!-- Arena Stage: Hoàn toàn thông thoáng không bị che khuất -->
        <div class="arena-stage">
          <div class="opponents-container">
            ${opponentsHtml}
          </div>
        </div>

        <!-- Cụm Chồng Bài Góc Dưới (Bài bốc, Bãi rác, Dung hợp, Ám quẻ) -->
        ${centerDecksHtml}

        <!-- Local Player Bottom Area -->
        <div class="local-player-board">
          ${localFieldHtml}
          <div class="hand-fan-container" id="zone-player-hand" data-zone-id="zone-player-${localPlayer.id}-hand">
            ${handCardsHtml}
          </div>
          ${toolbarHtml}
        </div>

        <!-- Lớp Phủ Diễn Hoạt Sàn Đấu (Animation Motion Layer) -->
        <div id="arena-motion-layer"></div>
      </div>
    `;
  }
}
