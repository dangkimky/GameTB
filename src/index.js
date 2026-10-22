import { GameEngine } from './core/GameEngine.js';
import { TurnManager } from './core/TurnManager.js';
import { BattleResolver } from './core/BattleResolver.js';
import { FusionSystem } from './core/FusionSystem.js';
import { BotBrain } from './core/BotBrain.js';
import { ArenaLayout } from './ui/ArenaLayout.js';
import { CardComponent } from './ui/CardComponent.js';
import { CardInspectorDrawer } from './ui/CardInspectorDrawer.js';
import { ModalPanels } from './ui/ModalPanels.js';
import { HomeLobby } from './ui/HomeLobby.js';
import { ALL_96_CARDS, CARD_TYPES } from './data/cards.js';
import { GameState, PHASES } from './core/GameState.js';
import { audioManager } from './audio/AudioManager.js';
import { SpatialBoardAnimator } from './engine/SpatialBoardAnimator.js';
import { CanvasVFXEngine } from './engine/CanvasVFXEngine.js';
import { CardActivationStage } from './engine/CardActivationStage.js';
import { ActionSequencer } from './engine/ActionSequencer.js';
import { partyModeToggle } from './party/PartyModeToggle.js';
import { GameClient } from './net/GameClient.js';

/**
 * GameApp — Bộ điều phối chính của trò chơi (Phiên bản v4.5):
 * 1. Mở khóa thao tác tức thì 100% ngay khi tắt hiển thị hiệu ứng (Sửa triệt để lỗi microtask trong ActionSequencer & runLockedAction).
 * 2. Chỉ đọc các hiệu ứng đang thực sự kích hoạt (`hasTriggeredEffect === true`), bỏ qua không đọc các hiệu ứng không kích hoạt để tránh mất thời gian.
 * 3. Đối với việc Tấn Công: Chỉ đọc Đối tượng tấn công và Mục tiêu tấn công, kết quả giao tranh thể hiện trực tiếp trên màn hình bằng hiệu ứng tấn công.
 * 4. Hiệu ứng Trừ Máu Đặc Sắc & Rõ Ràng (`presentDamageEvents` -> `executeHpDamageEffect`).
 * 5. Giao diện tự động thích ứng hoàn hảo trên cả Điện Thoại (Portrait & Landscape, Touch Hand Dock, Bottom-Sheet Inspector) lẫn Máy Tính, kèm nút chuyển đổi nhanh `#btn-toggle-mobile-view`.
 * 6. Hỗ trợ Chơi Chung Online / LAN qua WebSocket (`GameClient`).
 */
export class GameApp {
  constructor() {
    this.currentScreen = 'LOBBY'; // 'LOBBY' | 'ARENA'
    this.state = null;
    this.localPlayerId = 'p1';
    this.selectedHandInstanceId = null;
    this.selectedFieldSlotIndex = null;
    this.isBotThinking = false;
    this.isActionLocked = false;
    this.sequencer = new ActionSequencer();

    this.isOnlineMatch = false;
    this.netClient = null;
    this.onlineLobbyState = null;
    this.onlineRoomList = [];
    this.onlineSelectedCharId = 'NV-01';
    this.onlineIsPublic = true;
    this.onlineNumPlayers = 4;
    this.onlineIsTeamMode = false;
    this.isMultiplayerModalOpen = false;
    this.onlinePlayerName = 'Thủ Lĩnh Lạc Việt';
    this.onlineWsUrl = '';
    this.onlineRoomCode = '';

    this.manualMobileOverride = null;
    this.isMobileLayout = this.detectMobileViewport();

    this.compendiumFilter = {
      type: 'ALL',
      tribe: 'ALL',
      query: ''
    };

    this.playerStats = this.loadStats();

    this.vfx = typeof window !== 'undefined' ? new CanvasVFXEngine() : null;
    this.animator = typeof window !== 'undefined' ? new SpatialBoardAnimator(this.vfx) : null;
    this.activationStage = new CardActivationStage(this.animator, this.vfx);

    if (this.activationStage) {
      this.activationStage.onStateChange = (active) => {
        if (!active && !this.isActionLocked) {
          this.updateToolbarLockVisual(false);
        } else {
          this.updateToolbarLockVisual(active || this.isActionLocked);
        }
      };
    }

    this.roomConfig = {
      playerName: 'Bạn (Thủ Lĩnh)',
      characterId: 'NV-01',
      numPlayers: 4,
      isTeamMode: true,
      fillBots: true
    };

    this.inspectingCard = null;
    this.inspectingOptions = {};
    this.announcementTimeout = null;

    this.selectedBattleAttackerSlot = 0;
    this.selectedTributeBossInstanceId = null;
    this.selectedTributeSlot = 0;
    this.selectedEquipInstanceId = null;
  }

  /**
   * Nhận diện thông minh kích thước màn hình điện thoại / máy tính bảng cảm ứng
   */
  detectMobileViewport() {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth || 1024;
    const h = window.innerHeight || 768;
    return w <= 860 || (h <= 540 && w > h);
  }

  /**
   * Bật/tắt chủ động Chế độ Giao diện Điện Thoại
   */
  toggleMobileLayoutMode() {
    this.isMobileLayout = !this.isMobileLayout;
    this.manualMobileOverride = this.isMobileLayout;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('mobile-view-forced', this.isMobileLayout);
    }
    this.render();
    this.showActionAnnouncement(
      this.isMobileLayout ? '📱 CHẾ ĐỘ ĐIỆN THOẠI!' : '🖥️ CHẾ ĐỘ MÁY TÍNH!',
      this.isMobileLayout
        ? 'Đã bật bố cục tối ưu cho màn hình cảm ứng điện thoại (Trạm đối thủ trượt ngang & Bảng chi tiết Bottom-Sheet)!'
        : 'Đã chuyển về bố cục bàn đấu không gian rộng trên máy tính!',
      this.isMobileLayout ? '📱' : '🖥️',
      2200
    );
    return this.isMobileLayout;
  }

  /**
   * Hiển thị thông báo lỗi / trạng thái ngay trong Modal Chơi Chung Online (thay thế hoàn toàn alert)
   */
  showMultiplayerToast(message) {
    if (typeof document !== 'undefined') {
      const toastEl = document.getElementById('multiplayer-status-toast');
      if (toastEl) {
        toastEl.textContent = `⚠️ ${message}`;
        toastEl.style.display = 'block';
      }
    }
    this.showActionAnnouncement('⚠️ THÔNG BÁO KẾT NỐI', message, '⚠️', 2800);
  }

  /**
   * Kiểm tra xem hệ thống có đang thực sự bận đọc hiệu ứng hay diễn hoạt không
   */
  isBusy() {
    return Boolean(
      this.isActionLocked ||
      (this.activationStage && this.activationStage.isShowing) ||
      (this.sequencer && this.sequencer.isAnimating)
    );
  }

  /**
   * Mở khóa ngay lập tức toàn bộ cờ chặn thao tác và kích hoạt lại các nút trên thanh công cụ
   */
  unlockAllActionsNow() {
    audioManager.stopSpeaking();
    if (this.activationStage) {
      this.activationStage.isShowing = false;
    }
    if (this.sequencer && this.sequencer.queue.length === 0) {
      this.sequencer.isAnimating = false;
    }
    this.isActionLocked = false;
    this.updateToolbarLockVisual(false);
  }

  /**
   * Trình diễn hiệu ứng trừ máu đặc sắc và rõ ràng cho từng sự kiện mất máu vừa xảy ra
   */
  async presentDamageEvents(damageEvents = []) {
    if (!Array.isArray(damageEvents) || damageEvents.length === 0 || !this.animator) return;
    for (const dmgEv of damageEvents) {
      if (dmgEv && dmgEv.amount > 0) {
        await this.animator.executeHpDamageEffect({
          targetPlayerId: dmgEv.targetPlayerId,
          targetPlayerName: dmgEv.targetPlayerName,
          amount: dmgEv.amount,
          oldHp: dmgEv.oldHp,
          newHp: dmgEv.newHp
        });
      }
    }
  }

  /**
   * Thực thi hành động có khóa tạm thời trong lúc đọc/diễn hoạt và MỞ KHÓA 100% NGAY LẬP TỨC khi tắt hiển thị
   */
  async runLockedAction(actionFn) {
    if (
      !this.isActionLocked &&
      (!this.activationStage || !this.activationStage.isShowing) &&
      (!this.sequencer || !this.sequencer.isAnimating)
    ) {
      this.updateToolbarLockVisual(false);
    }

    if (this.isBusy()) {
      return false;
    }

    this.isActionLocked = true;
    this.updateToolbarLockVisual(true);
    const revealCountBefore = (this.state?.revealedCardsQueue || []).length;

    try {
      await this.sequencer.enqueue(async () => {
        await actionFn();
      });
      return true;
    } finally {
      this.unlockAllActionsNow();
      if (this.currentScreen === 'ARENA' && this.state) {
        this.render();
        this.unlockAllActionsNow();
        const newReveals = (this.state.revealedCardsQueue || []).slice(revealCountBefore);
        if (newReveals.length > 0 && typeof document !== 'undefined') {
          document.getElementById('modal-revealed-cards')?.classList.add('open');
        }
      }
    }
  }

  /**
   * Chỉ đọc các hiệu ứng bị động đang thực sự kích hoạt (`hasTriggeredEffect !== false`)
   */
  async presentPassiveEffectNotifications(events = [], excludePrimaryCardId = null) {
    if (!Array.isArray(events) || events.length === 0) return;

    const passiveEvents = events.filter(ev => ev && ev.mode === 'PASSIVE' && ev.hasTriggeredEffect !== false);

    for (const ev of passiveEvents) {
      const cardObj = ev.card || ALL_96_CARDS[ev.cardId] || { id: ev.cardId, name: ev.cardName };
      this.showActionAnnouncement(
        `✨ ${ev.title || `HIỆU ỨNG BỊ ĐỘNG: ${ev.cardName}`}`,
        ev.resultText || ev.effectText || 'Hiệu ứng bị động đã kích hoạt!',
        ev.icon || '✨',
        2200
      );

      // Chỉ mở bảng đọc khi là Bẫy Thiên Cơ (TRAP), Ám Quẻ (GHOST) hoặc Kỹ năng Bị Động độc lập thực sự kích hoạt
      if (this.activationStage && (ev.cardId !== excludePrimaryCardId || ['TRAP', 'GHOST'].includes(ev.category))) {
        await this.activationStage.presentActivation({
          card: cardObj,
          activatorName: ev.activatorName || 'Người chơi',
          category: ev.category || 'PASSIVE',
          title: ev.title || `Hiệu Ứng Bị Động: ${ev.cardName}`,
          description: ev.effectText || ALL_96_CARDS[ev.cardId]?.description || '',
          triggeredEffectText: ev.resultText || '',
          icon: ev.icon || '✨',
          holdDuration: 2000,
          hasTriggeredEffect: true
        });
      }
    }
  }

  updateToolbarLockVisual(locked) {
    if (typeof document === 'undefined') return;
    const toolbar = document.querySelector('.action-toolbar');
    if (toolbar) {
      toolbar.setAttribute('data-action-locked', locked ? 'true' : 'false');
    }
    if (locked) {
      document.querySelectorAll('.action-toolbar .action-btn').forEach(btn => {
        btn.setAttribute('disabled', 'disabled');
      });
    } else {
      const lockBadge = document.getElementById('action-lock-indicator');
      if (lockBadge) lockBadge.remove();

      const isMyTurn = this.state && this.state.turnOrder[this.state.currentTurnIndex] === this.localPlayerId;
      if (isMyTurn) {
        document.querySelectorAll('.action-toolbar .action-btn').forEach(btn => {
          const btnId = btn.id;
          if (btnId === 'btn-action-swarm' && this.state.swarmSummonUsed) return;
          if (btnId === 'btn-action-draw' && this.state.manualDrawUsedThisTurn) return;
          if (
            btnId === 'btn-action-attack' &&
            (this.state.turnNumber === 1 || this.state.openingRoundActive) &&
            !this.state.allowFirstTurnAttack
          ) {
            return;
          }
          btn.removeAttribute('disabled');
        });
      }
    }
  }

  loadStats() {
    const defaults = { gamesPlayed: 0, gamesWon: 0, fusionsDone: 0, trapsTriggered: 0, bossesSummoned: 0 };
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('xom_bat_on_stats');
        if (raw) return { ...defaults, ...JSON.parse(raw) };
      }
    } catch (e) {}
    return defaults;
  }

  saveStats() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('xom_bat_on_stats', JSON.stringify(this.playerStats));
      }
    } catch (e) {}
  }

  incrementStat(key) {
    this.playerStats[key] = (this.playerStats[key] || 0) + 1;
    this.saveStats();
  }

  init() {
    try {
      this.isMobileLayout = this.detectMobileViewport();
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('mobile-view-forced', this.isMobileLayout);
      }
      this.render();
      this.bindEvents();
      console.log('🎮 Đại Chiến Thần Thoại & Linh Thú Việt v4.5 (Mobile & Desktop) đã sẵn sàng!');
    } catch (err) {
      console.error('Khởi tạo game thất bại:', err);
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.innerHTML = `
          <div style="padding: 24px; color: #f87171; font-family: sans-serif; background: #1e1138; margin: 30px; border-radius: 12px; border: 2px solid #ef4444; max-width: 800px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
            <h2 style="color: #facc15; margin-bottom: 12px;">⚠️ Lỗi Khởi Tạo Đấu Trường</h2>
            <p style="color: #e2e8f0; margin-bottom: 12px;">Đã xảy ra sự cố trong quá trình nạp dữ liệu ban đầu:</p>
            <pre style="background: rgba(0,0,0,0.5); padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 13px;">${err.stack || err.message}</pre>
          </div>
        `;
      }
    }
  }

  render() {
    if (typeof document === 'undefined') return;
    const appEl = document.getElementById('app');
    if (!appEl) return;

    if (this.currentScreen === 'LOBBY') {
      const homeHtml = HomeLobby.renderHomeHtml(this.onlineLobbyState, {
        roomList: this.onlineRoomList || [],
        selectedCharId: this.onlineSelectedCharId || 'NV-01',
        isPublicRoom: this.onlineIsPublic !== undefined ? this.onlineIsPublic : true,
        numPlayers: this.onlineNumPlayers || 4,
        isTeamMode: Boolean(this.onlineIsTeamMode),
        localPlayerId: this.netClient ? this.netClient.playerId : null,
        playerName: this.onlinePlayerName || 'Thủ Lĩnh Lạc Việt',
        wsUrl: this.onlineWsUrl || null,
        isModalOpen: this.isMultiplayerModalOpen || false
      });
      const drawerHtml = CardInspectorDrawer.renderDrawerHtml();
      // Lazy placeholder cho modals nặng: chỉ render chi tiết 120 thẻ khi người chơi bấm mở modal
      const compendiumModalHtml = ModalPanels.renderCompendiumModal(this.compendiumFilter, true);
      const achievementsModalHtml = ModalPanels.renderAchievementsModal(this.playerStats, true);
      const rulesModalHtml = ModalPanels.renderRulesModal();

      appEl.innerHTML = `
        ${homeHtml}
        ${drawerHtml}
        ${compendiumModalHtml}
        ${achievementsModalHtml}
        ${rulesModalHtml}
      `;
      return;
    }

    // Màn hình SÀN ĐẤU (ARENA)
    const arenaHtml = ArenaLayout.renderArenaHtml(this.state, this.localPlayerId, {
      selectedHandInstanceId: this.selectedHandInstanceId,
      isMuted: audioManager.isMuted,
      isPartyMode: partyModeToggle.isPartyMode(),
      isActionLocked: this.isBusy(),
      isMobileLayout: this.isMobileLayout
    });
    const drawerHtml = CardInspectorDrawer.renderDrawerHtml();
    const graveyardModalHtml = ModalPanels.renderGraveyardModal(this.state.graveyard);
    const revealedCardsModalHtml = ModalPanels.renderRevealedCardsModal(this.state.lastRevealedView);
    const fusionModalHtml = ModalPanels.renderFusionModal(this.state.fusionDeck, this.state, this.localPlayerId);
    const equipTargetModalHtml = ModalPanels.renderEquipTargetModal(this.state, this.localPlayerId, this.selectedEquipInstanceId || this.selectedHandInstanceId);
    const battleTargetModalHtml = ModalPanels.renderBattleTargetModal(this.state, this.localPlayerId, this.selectedBattleAttackerSlot || 0);
    const tributeModalHtml = ModalPanels.renderTributeModal(this.state, this.localPlayerId);
    const activeSkillsModalHtml = ModalPanels.renderActiveSkillsModal(this.state, this.localPlayerId);
    const discardModalHtml = ModalPanels.renderDiscardModal(this.state, this.localPlayerId);
    const audioSettingsModalHtml = ModalPanels.renderAudioSettingsModal(audioManager);
    const logModalHtml = ModalPanels.renderLogModal(this.state.actionLog);
    const compendiumModalHtml = ModalPanels.renderCompendiumModal(this.compendiumFilter);
    const achievementsModalHtml = ModalPanels.renderAchievementsModal(this.playerStats);
    const rulesModalHtml = ModalPanels.renderRulesModal();
    const gameOverModalHtml = ModalPanels.renderGameOverModal(this.state, this.localPlayerId);

    appEl.innerHTML = `
      ${arenaHtml}
      ${drawerHtml}
      ${graveyardModalHtml}
      ${revealedCardsModalHtml}
      ${fusionModalHtml}
      ${equipTargetModalHtml}
      ${battleTargetModalHtml}
      ${tributeModalHtml}
      ${activeSkillsModalHtml}
      ${discardModalHtml}
      ${audioSettingsModalHtml}
      ${logModalHtml}
      ${compendiumModalHtml}
      ${achievementsModalHtml}
      ${rulesModalHtml}
      ${gameOverModalHtml}
    `;

    if (this.selectedHandInstanceId) {
      const selectedEl = document.querySelector(`[data-instance-id="${this.selectedHandInstanceId}"]`);
      if (selectedEl) selectedEl.classList.add('selected');
    }

    if (this.inspectingCard) {
      CardInspectorDrawer.inspectCard(this.inspectingCard, this.inspectingOptions);
    }
  }

  // ==========================================
  // KẾT NỐI CHƠI CHUNG ONLINE / LAN (WEBSOCKET)
  // ==========================================

  async ensureNetClient(wsUrl) {
    let targetUrl = wsUrl;
    if (!targetUrl) {
      const inputEl = document.getElementById('input-online-ws-url');
      if (inputEl && inputEl.value && inputEl.value.trim()) {
        targetUrl = inputEl.value.trim();
      } else if (this.onlineWsUrl && this.onlineWsUrl.trim()) {
        targetUrl = this.onlineWsUrl.trim();
      }
    }

    if (this.netClient && this.netClient.ws && this.netClient.ws.readyState === 1) {
      return this.netClient;
    }

    this.netClient = new GameClient(targetUrl);
    this.netClient.on('onLobbyUpdate', (lobbyInfo) => {
      this.onlineLobbyState = lobbyInfo;
      this.isMultiplayerModalOpen = true;
      if (this.netClient.playerId) {
        this.localPlayerId = this.netClient.playerId;
      }
      if (this.currentScreen === 'LOBBY') {
        this.render();
      }
    });
    this.netClient.on('onRoomList', (roomList) => {
      this.onlineRoomList = Array.isArray(roomList) ? roomList : [];
      this.updatePublicRoomListDom();
    });
    this.netClient.on('onRoomLeft', () => {
      this.onlineLobbyState = null;
      if (this.netClient) {
        this.netClient.getRoomList();
      }
      if (this.currentScreen === 'LOBBY') {
        this.render();
      }
    });
    this.netClient.on('onStateUpdate', (newState) => {
      this.isOnlineMatch = true;
      if (this.netClient.playerId) {
        this.localPlayerId = this.netClient.playerId;
      }
      this.state = newState;
      this.currentScreen = 'ARENA';
      this.unlockAllActionsNow();
      this.render();
    });
    this.netClient.on('onError', (errMsg) => {
      // Khi WebSocket gặp sự cố (Render đang cold-start hoặc rớt mạng), lập tức gọi HTTP REST API
      this.netClient.fetchRoomListHttp().catch(() => {});
    });

    try {
      await this.netClient.connect();
      this.netClient.getRoomList();
    } catch (err) {
      // Tải danh sách phòng qua HTTP REST fallback ngay lập tức
      const rooms = await this.netClient.fetchRoomListHttp();
      if (!rooms) {
        this.showMultiplayerToast('Máy chủ Cloud Render đang khởi động (cold-start), vui lòng bấm "Làm Mới" sau vài giây...');
      }
    }
    return this.netClient;
  }

  updatePublicRoomListDom() {
    const container = document.getElementById('online-public-rooms-container');
    const titleEl = document.querySelector('.online-rooms-title');
    if (titleEl) {
      titleEl.innerHTML = `📋 PHÒNG CÔNG CỘNG (${this.onlineRoomList.length})`;
    }
    if (!container) return;

    if (this.onlineRoomList.length === 0) {
      container.innerHTML = `
        <div class="room-empty-notice">
          Không có phòng công cộng nào đang chờ.<br>
          👉 Hãy bấm <b>"Tạo Phòng Online Mới"</b> bên cạnh để mở phòng đầu tiên!
        </div>
      `;
      return;
    }

    container.innerHTML = this.onlineRoomList.map(r => `
      <div class="room-card-item">
        <div class="room-item-info">
          <div class="room-item-title">
            <span>👑 ${r.hostName || 'Chủ Phòng'}</span>
            <span style="font-family: monospace; font-size: 11px; color: #facc15;">[${r.roomId}]</span>
          </div>
          <div class="room-item-meta">
            <span class="badge-players-count">👥 ${r.currentPlayers}/${r.maxPlayers} người</span>
            <span class="badge-mode ${r.isTeamMode ? 'badge-mode-team' : 'badge-mode-ffa'}">
              ${r.isTeamMode ? 'Đấu Phe' : 'Tự Do'}
            </span>
          </div>
        </div>
        <button class="btn-join-room-direct" data-room-id="${r.roomId}">
          VÀO PHÒNG 👉
        </button>
      </div>
    `).join('');
  }

  async handleCreateOnlineRoom() {
    const nameInput = document.getElementById('input-online-player-name');
    const wsInput = document.getElementById('input-online-ws-url');
    const hostName = nameInput ? nameInput.value.trim() || 'Chủ Phòng' : (this.onlinePlayerName || 'Chủ Phòng');
    const wsUrl = wsInput ? wsInput.value.trim() : undefined;
    this.onlinePlayerName = hostName;

    try {
      const client = await this.ensureNetClient(wsUrl);
      client.createRoom({
        hostName,
        maxPlayers: this.onlineNumPlayers || 4,
        characterId: this.onlineSelectedCharId || 'NV-01',
        isTeamMode: Boolean(this.onlineIsTeamMode),
        isPublic: this.onlineIsPublic !== undefined ? Boolean(this.onlineIsPublic) : true,
        fillBots: true
      });
    } catch (err) {
      this.showMultiplayerToast('Không thể kết nối tới Máy chủ WebSocket (' + (wsUrl || 'ws://localhost:3333') + '). Hãy chạy lệnh "npm start" trong thư mục game trước!');
    }
  }

  async handleJoinOnlineRoom() {
    const nameInput = document.getElementById('input-online-player-name');
    const wsInput = document.getElementById('input-online-ws-url');
    const codeInput = document.getElementById('input-online-room-code');
    const playerName = nameInput ? nameInput.value.trim() || 'Hàng Xóm' : (this.onlinePlayerName || 'Hàng Xóm');
    const wsUrl = wsInput ? wsInput.value.trim() : undefined;
    const roomId = codeInput ? codeInput.value.trim().toUpperCase() : (this.onlineRoomCode || '');
    this.onlinePlayerName = playerName;

    if (!roomId) {
      this.showMultiplayerToast('Vui lòng nhập Mã Phòng (VD: XOM-8A2F) do Chủ phòng gửi hoặc bấm Vào Phòng từ danh sách!');
      return;
    }

    try {
      const client = await this.ensureNetClient(wsUrl);
      client.joinRoom({
        roomId,
        playerName,
        characterId: this.onlineSelectedCharId || null
      });
    } catch (err) {
      this.showMultiplayerToast('Không thể kết nối tới Máy chủ WebSocket (' + (wsUrl || 'ws://localhost:3333') + '). Hãy kiểm tra lại địa chỉ máy chủ!');
    }
  }

  async handleJoinRoomById(roomId) {
    if (!roomId) return;
    const nameInput = document.getElementById('input-online-player-name');
    const wsInput = document.getElementById('input-online-ws-url');
    const playerName = nameInput ? nameInput.value.trim() || 'Hàng Xóm' : (this.onlinePlayerName || 'Hàng Xóm');
    const wsUrl = wsInput ? wsInput.value.trim() : undefined;
    this.onlinePlayerName = playerName;

    try {
      const client = await this.ensureNetClient(wsUrl);
      client.joinRoom({
        roomId,
        playerName,
        characterId: this.onlineSelectedCharId || null
      });
    } catch (err) {
      this.showMultiplayerToast('Không thể kết nối tới phòng ' + roomId + ': ' + (err.message || err));
    }
  }

  handleLeaveOnlineRoom() {
    if (this.netClient) {
      this.netClient.leaveRoom();
    }
    this.onlineLobbyState = null;
    this.isMultiplayerModalOpen = true;
    if (this.netClient) {
      this.netClient.getRoomList();
    }
    if (this.currentScreen === 'LOBBY') {
      this.render();
    }
  }

  bindEvents() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    const unlockAudio = () => {
      audioManager.ensureAudio();
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    window.addEventListener('resize', () => {
      if (this.manualMobileOverride === null) {
        const detected = this.detectMobileViewport();
        if (detected !== this.isMobileLayout) {
          this.isMobileLayout = detected;
          if (typeof document !== 'undefined' && document.body) {
            document.body.classList.toggle('mobile-view-forced', this.isMobileLayout);
          }
          if (this.currentScreen === 'ARENA') {
            this.render();
          }
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.inspectingCard = null;
        CardInspectorDrawer.close();
        document.querySelectorAll('.modal-overlay-panel.open').forEach(m => m.classList.remove('open'));
      }
    });

    appEl.addEventListener('click', (e) => {
      const target = e.target;
      audioManager.ensureAudio();

      // Cho phép click vào nhãn khóa #action-lock-indicator để cưỡng bức mở khóa ngay nếu người chơi muốn thao tác nhanh
      if (target.closest('#action-lock-indicator')) {
        this.unlockAllActionsNow();
        this.render();
        return;
      }

      if (target.closest('#btn-toggle-mobile-view')) {
        this.toggleMobileLayoutMode();
        return;
      }

      // ==========================================
      // A. SỰ KIỆN TẠI MÀN HÌNH TRANG CHỦ (LOBBY)
      // ==========================================
      if (target.closest('#btn-quick-play') || target.closest('#btn-rematch-game')) {
        this.startQuickPlay();
        return;
      }

      if (target.closest('#btn-open-create-room')) {
        const modal = document.getElementById('room-settings-modal');
        if (modal) modal.style.display = 'flex';
        return;
      }

      if (target.closest('#btn-close-room-modal')) {
        const modal = document.getElementById('room-settings-modal');
        if (modal) modal.style.display = 'none';
        return;
      }

      if (target.closest('#btn-open-multiplayer-modal')) {
        this.isMultiplayerModalOpen = true;
        const modal = document.getElementById('multiplayer-online-modal');
        if (modal) {
          modal.style.display = 'flex';
        } else {
          this.render();
        }
        const wsInput = document.getElementById('input-online-ws-url');
        const customUrl = wsInput ? wsInput.value.trim() : undefined;
        this.ensureNetClient(customUrl).then(c => c.getRoomList()).catch(() => {});
        return;
      }

      if (target.closest('#btn-close-multiplayer-modal')) {
        if (this.onlineLobbyState && this.netClient) {
          this.netClient.leaveRoom();
        }
        this.onlineLobbyState = null;
        this.isMultiplayerModalOpen = false;
        const modal = document.getElementById('multiplayer-online-modal');
        if (modal) modal.style.display = 'none';
        return;
      }

      if (target.closest('#btn-online-leave-room')) {
        this.handleLeaveOnlineRoom();
        return;
      }

      if (target.closest('#btn-refresh-rooms')) {
        const wsInput = document.getElementById('input-online-ws-url');
        const customUrl = wsInput ? wsInput.value.trim() : undefined;
        const refreshBtn = document.getElementById('btn-refresh-rooms');
        if (refreshBtn) refreshBtn.textContent = '⏳ Đang tải...';

        this.ensureNetClient(customUrl).then(c => {
          c.getRoomList();
          setTimeout(() => { if (refreshBtn) refreshBtn.textContent = '🔄 Làm Mới'; }, 600);
        }).catch(() => {
          if (refreshBtn) refreshBtn.textContent = '🔄 Làm Mới';
          this.showMultiplayerToast('Máy chủ Cloud Render đang khởi động, vui lòng thử lại sau vài giây...');
        });
        return;
      }

      const joinDirectBtn = target.closest('.btn-join-room-direct');
      if (joinDirectBtn) {
        const roomId = joinDirectBtn.getAttribute('data-room-id');
        this.handleJoinRoomById(roomId);
        return;
      }

      const roomTypePill = target.closest('#online-room-type-options .option-pill-btn');
      if (roomTypePill) {
        const roomType = roomTypePill.getAttribute('data-room-type');
        this.onlineIsPublic = (roomType === 'public');
        document.querySelectorAll('#online-room-type-options .option-pill-btn').forEach(p => p.classList.remove('active'));
        roomTypePill.classList.add('active');
        return;
      }

      const onlineNumPill = target.closest('#online-num-players-options .option-pill-btn');
      if (onlineNumPill) {
        this.onlineNumPlayers = parseInt(onlineNumPill.getAttribute('data-num'), 10) || 4;
        document.querySelectorAll('#online-num-players-options .option-pill-btn').forEach(p => p.classList.remove('active'));
        onlineNumPill.classList.add('active');
        return;
      }

      const onlineModePill = target.closest('#online-mode-options .option-pill-btn');
      if (onlineModePill) {
        this.onlineIsTeamMode = (onlineModePill.getAttribute('data-mode') === 'team');
        document.querySelectorAll('#online-mode-options .option-pill-btn').forEach(p => p.classList.remove('active'));
        onlineModePill.classList.add('active');
        return;
      }

      const onlineCharPick = target.closest('.online-char-pick');
      if (onlineCharPick) {
        const charId = onlineCharPick.getAttribute('data-char-id');
        if (charId) {
          this.onlineSelectedCharId = charId;
          this.roomConfig.characterId = charId;
          document.querySelectorAll('.online-char-pick').forEach(c => c.classList.remove('active'));
          onlineCharPick.classList.add('active');
        }
        return;
      }

      const roomCharPickFree = target.closest('.room-char-pick.free');
      if (roomCharPickFree) {
        const charId = roomCharPickFree.getAttribute('data-char-id');
        if (charId && this.netClient) {
          this.netClient.selectCharacter(charId);
        }
        return;
      }

      const roomCharPickTaken = target.closest('.room-char-pick.taken');
      if (roomCharPickTaken) {
        this.showMultiplayerToast('Thẻ Đại Diện này đã có người chơi khác chọn trong phòng, vui lòng chọn thẻ còn trống!');
        return;
      }

      if (target.closest('#btn-online-toggle-ready')) {
        if (this.netClient && this.onlineLobbyState) {
          const myPlayer = this.onlineLobbyState.players.find(p => p.id === this.netClient.playerId);
          const currentReady = myPlayer ? Boolean(myPlayer.isReady) : false;
          this.netClient.setReady(!currentReady);
        }
        return;
      }

      if (target.closest('#btn-online-create-room')) {
        this.handleCreateOnlineRoom();
        return;
      }

      if (target.closest('#btn-online-join-room')) {
        this.handleJoinOnlineRoom();
        return;
      }

      if (target.closest('#btn-online-start-with-bots')) {
        if (this.netClient) {
          this.netClient.send('START_GAME', { fillBots: true, isTeamMode: this.onlineIsTeamMode });
        }
        return;
      }

      if (target.closest('#btn-online-start-human-only')) {
        if (this.netClient) {
          this.netClient.send('START_GAME', { fillBots: false, isTeamMode: this.onlineIsTeamMode });
        }
        return;
      }

      const charChoice = target.closest('.char-choice-card');
      if (charChoice) {
        document.querySelectorAll('.char-choice-card').forEach(c => c.classList.remove('active'));
        charChoice.classList.add('active');
        this.roomConfig.characterId = charChoice.getAttribute('data-char-id');
        return;
      }

      const numPill = target.closest('#num-players-options .option-pill-btn');
      if (numPill) {
        document.querySelectorAll('#num-players-options .option-pill-btn').forEach(p => p.classList.remove('active'));
        numPill.classList.add('active');
        this.roomConfig.numPlayers = parseInt(numPill.getAttribute('data-num'), 10);
        return;
      }

      const modePill = target.closest('#mode-options .option-pill-btn');
      if (modePill) {
        document.querySelectorAll('#mode-options .option-pill-btn').forEach(p => p.classList.remove('active'));
        modePill.classList.add('active');
        this.roomConfig.isTeamMode = (modePill.getAttribute('data-mode') === 'team');
        return;
      }

      if (target.closest('#btn-start-custom-game')) {
        const nameInput = document.getElementById('input-player-name');
        if (nameInput) this.roomConfig.playerName = nameInput.value.trim() || 'Bạn (Thủ Lĩnh)';
        const botCheck = document.getElementById('check-fill-bots');
        if (botCheck) this.roomConfig.fillBots = botCheck.checked;

        this.startCustomGame();
        return;
      }

      if (target.closest('#btn-open-compendium')) {
        this.refreshCompendiumModal();
        return;
      }

      if (target.closest('#btn-open-achievements')) {
        const achModal = document.getElementById('modal-achievements');
        if (achModal) {
          achModal.outerHTML = ModalPanels.renderAchievementsModal(this.playerStats, false);
          document.getElementById('modal-achievements')?.classList.add('open');
        }
        return;
      }

      const compTypeBtn = target.closest('.compendium-filter-btn');
      if (compTypeBtn) {
        this.compendiumFilter.type = compTypeBtn.getAttribute('data-compendium-type') || 'ALL';
        this.refreshCompendiumModal();
        return;
      }

      const compTribeBtn = target.closest('.compendium-tribe-btn');
      if (compTribeBtn) {
        this.compendiumFilter.tribe = compTribeBtn.getAttribute('data-compendium-tribe') || 'ALL';
        this.refreshCompendiumModal();
        return;
      }

      // ==========================================
      // B. SỰ KIỆN TẠI MÀN HÌNH SÀN ĐẤU (ARENA)
      // ==========================================
      if (target.closest('#btn-back-to-home') || target.closest('#btn-gameover-home')) {
        this.unlockAllActionsNow();
        this.isBotThinking = false;
        this.isOnlineMatch = false;
        this.onlineLobbyState = null;
        this.currentScreen = 'LOBBY';
        this.inspectingCard = null;
        this.render();
        return;
      }

      if (target.closest('#btn-open-last-revealed')) {
        document.getElementById('modal-revealed-cards')?.classList.add('open');
        return;
      }

      const openRevHandBtn = target.closest('.btn-open-revealed-hand');
      if (openRevHandBtn) {
        const revPid = openRevHandBtn.getAttribute('data-reveal-player-id');
        const targetP = this.state?.players?.[revPid];
        if (targetP) {
          GameState.pushRevealedCardsEvent(this.state, {
            viewerId: this.localPlayerId,
            targetPlayerId: revPid,
            targetPlayerName: targetP.name,
            revealType: 'HAND',
            title: `👁️ BÀI ĐÃ LẬT NGỬA CỦA ${targetP.name.toUpperCase()}`,
            subtitle: `Toàn bộ ${targetP.hand.length} lá bài trên tay của ${targetP.name} đang được lật ngửa:`,
            cards: [...targetP.hand]
          });
          this.render();
          document.getElementById('modal-revealed-cards')?.classList.add('open');
        }
        return;
      }

      if (target.closest('#btn-toggle-party-mode')) {
        const newMode = partyModeToggle.toggle();
        if (this.state) this.state.partyMode = (newMode === 'PARTY');
        audioManager.playCardPlay();
        this.showActionAnnouncement(
          newMode === 'PARTY' ? '🎉 CHẾ ĐỘ PARTY MODE!' : '☕ CHẾ ĐỘ CHILL MODE!',
          newMode === 'PARTY'
            ? 'Đã bật tương tác giọng nói / Microphone cho các thẻ bài!'
            : 'Đã bật tự động kích hoạt kỹ năng mà không cần mở Microphone!',
          newMode === 'PARTY' ? '🎉' : '☕',
          2200
        );
        this.render();
        return;
      }

      // Click vào Thẻ Bài Trên Tay
      const handCardEl = target.closest('.hand-card-wrapper .card-item');
      if (handCardEl) {
        if (this.isBusy()) return;
        const instanceId = handCardEl.getAttribute('data-instance-id');
        const cardId = handCardEl.getAttribute('data-card-id');
        this.selectedHandInstanceId = (this.selectedHandInstanceId === instanceId) ? null : instanceId;

        const player = this.state.players[this.localPlayerId];
        const cardInstance = player.hand.find(c => c.instanceId === instanceId) || ALL_96_CARDS[cardId];
        if (cardInstance && this.selectedHandInstanceId) {
          this.inspectingCard = cardInstance;
          this.inspectingOptions = { isHandCard: true };
        } else {
          this.inspectingCard = null;
          CardInspectorDrawer.close();
        }

        this.render();
        return;
      }

      // Click vào Thẻ Bài Bất Kỳ Khác
      const anyCardEl = target.closest('.card-item:not(.hand-card-wrapper .card-item)');
      if (anyCardEl && !target.closest('.tribute-boss-pick') && !target.closest('.discard-card-select-box')) {
        if (this.isBusy()) return;
        const isFaceDown = anyCardEl.getAttribute('data-is-facedown') === 'true';
        const isOpponent = !!anyCardEl.closest('.opponents-container');
        if (isFaceDown && isOpponent) {
          const zoneEl = anyCardEl.closest('[data-zone-id*="-trap-"]');
          if (zoneEl) {
            const match = zoneEl.getAttribute('data-zone-id').match(/zone-player-(.+)-trap-(\d+)/);
            if (match) {
              const oppId = match[1];
              const trapIdx = parseInt(match[2], 10);
              const targetTrap = this.state.players[oppId]?.trapSlots[trapIdx];
              const localPlayer = this.state.players[this.localPlayerId];

              if (localPlayer && localPlayer.characterId === 'NV-01' && !localPlayer.isGhost && !localPlayer.hasUsedAliveSkillThisTurn && this.state.turnOrder[this.state.currentTurnIndex] === this.localPlayerId && targetTrap) {
                try {
                  GameEngine.activateCharacterSkill(this.state, this.localPlayerId, { targetPlayerId: oppId, trapSlotIndex: trapIdx });
                  const fullTrapData = ALL_96_CARDS[targetTrap.cardId] || targetTrap;
                  this.inspectingCard = fullTrapData;
                  this.inspectingOptions = { isHandCard: false, specialBadge: '👀 NỘI TẠI SƠN TINH: ĐÃ LẬT SOI BẪY' };
                  CardInspectorDrawer.inspectCard(this.inspectingCard, this.inspectingOptions);
                  audioManager.playTrapFlip();
                  this.showActionAnnouncement(
                    '⛰️ SƠN TINH NHÃN THÔNG!',
                    `Đã lật ngửa bẫy úp của đối thủ là [${fullTrapData.name}]!`,
                    '⛰️',
                    2400
                  );
                  this.render();
                  document.getElementById('modal-revealed-cards')?.classList.add('open');
                  return;
                } catch (err) {
                  this.showActionAnnouncement('⚠️ KHÔNG THỂ SOI BẪY', err.message, '⚠️', 2400);
                  return;
                }
              }
            }
          }

          this.showActionAnnouncement(
            '🔒 BẪY ÚP BÍ MẬT!',
            'Đây là Bẫy Thiên Cơ đang úp của đối thủ! Hãy dùng kỹ năng Sơn Tinh (NV-01) hoặc bài Chiếu Chỉ Thiên Đình (DR-09) để lật soi.',
            '🔒',
            2400
          );
          return;
        }

        const instanceId = anyCardEl.getAttribute('data-instance-id');
        const cardId = anyCardEl.getAttribute('data-card-id');

        let liveCard = null;
        let isOwnFieldCard = false;
        let fieldSlotIndex = null;

        if (instanceId && this.state && this.state.players) {
          for (const p of Object.values(this.state.players)) {
            const mIdx = p.monsterSlots?.findIndex(m => m && m.instanceId === instanceId);
            if (mIdx !== undefined && mIdx !== -1) {
              liveCard = p.monsterSlots[mIdx];
              if (p.id === this.localPlayerId) {
                isOwnFieldCard = true;
                fieldSlotIndex = mIdx;
              }
              break;
            }
            const foundTrap = p.trapSlots?.find(t => t && t.instanceId === instanceId);
            if (foundTrap) {
              liveCard = foundTrap;
              break;
            }
            const foundHand = p.hand?.find(h => h && h.instanceId === instanceId);
            if (foundHand) {
              liveCard = foundHand;
              break;
            }
          }
        }

        if (!liveCard && this.state) {
          liveCard = this.state.graveyard?.find(c => c && c.instanceId === instanceId) ||
                     this.state.fusionDeck?.find(c => c && (c.instanceId === instanceId || c.cardId === cardId));
        }

        const cardToInspect = liveCard || (cardId && ALL_96_CARDS[cardId] ? { ...ALL_96_CARDS[cardId], cardId } : null);
        if (cardToInspect) {
          this.inspectingCard = cardToInspect;
          this.inspectingOptions = { isHandCard: false, isOwnFieldCard, fieldSlotIndex };
          CardInspectorDrawer.inspectCard(this.inspectingCard, this.inspectingOptions);
        }
        return;
      }

      if (target.closest('#inspector-close-btn')) {
        this.inspectingCard = null;
        CardInspectorDrawer.close();
        return;
      }

      const quickActionBtn = target.closest('[data-quick-action]');
      if (quickActionBtn) {
        if (this.isBusy()) return;
        const actionType = quickActionBtn.getAttribute('data-quick-action');
        const instanceId = quickActionBtn.getAttribute('data-instance-id');
        this.selectedHandInstanceId = instanceId;
        this.inspectingCard = null;
        CardInspectorDrawer.close();
        if (actionType === 'summon') this.handleSummon();
        else if (actionType === 'swarm') this.handleSwarmSummon();
        else if (actionType === 'tribute') this.handleOpenTributeModal();
        else if (actionType === 'trap') this.handleSetTrap();
        else if (actionType === 'drama') this.handleUseDrama(instanceId);
        else if (actionType === 'equip') this.handleOpenEquipModal(instanceId);
        else if (actionType === 'discard') this.handleDiscardCard(instanceId);
        return;
      }

      if (target.closest('#btn-action-summon')) {
        this.handleSummon();
        return;
      }

      if (target.closest('#btn-action-swarm')) {
        this.handleSwarmSummon();
        return;
      }

      if (target.closest('#btn-action-trap')) {
        this.handleSetTrap();
        return;
      }

      if (target.closest('#btn-action-equip')) {
        this.handleOpenEquipModal(this.selectedHandInstanceId);
        return;
      }

      const equipCardPickBtn = target.closest('.btn-select-equip-card');
      if (equipCardPickBtn) {
        this.selectedEquipInstanceId = equipCardPickBtn.getAttribute('data-equip-instance-id');
        this.selectedHandInstanceId = this.selectedEquipInstanceId;
        this.render();
        if (typeof document !== 'undefined') document.getElementById('modal-equip-target')?.classList.add('open');
        return;
      }

      const equipTargetBtn = target.closest('.btn-execute-equip-target');
      if (equipTargetBtn) {
        const eqInstId = equipTargetBtn.getAttribute('data-equip-instance-id');
        const tPlayer = equipTargetBtn.getAttribute('data-target-player');
        const tSlot = parseInt(equipTargetBtn.getAttribute('data-target-slot'), 10);
        this.executeEquipWithTarget(eqInstId, tPlayer, tSlot);
        return;
      }

      if (target.closest('#btn-action-drama')) {
        this.handleUseDrama();
        return;
      }

      if (target.closest('#btn-action-skill')) {
        if (this.isBusy()) return;
        document.getElementById('modal-active-skills')?.classList.add('open');
        return;
      }

      if (target.closest('.btn-activate-char-skill')) {
        this.handleActivateCharacterSkill();
        return;
      }

      const fieldSkillBtn = target.closest('.btn-activate-field-skill');
      if (fieldSkillBtn) {
        const slotIdx = parseInt(fieldSkillBtn.getAttribute('data-skill-slot'), 10);
        this.handleActivateFieldSkill(slotIdx);
        return;
      }

      const mindTrapBtn = target.closest('.btn-activate-mind-trap');
      if (mindTrapBtn) {
        const trapSlot = parseInt(mindTrapBtn.getAttribute('data-trap-slot'), 10);
        this.handleActivateMindTrap(trapSlot);
        return;
      }

      if (target.closest('#btn-action-tribute')) {
        if (this.isBusy()) return;
        this.handleOpenTributeModal();
        return;
      }

      const bossPickEl = target.closest('.tribute-boss-pick');
      if (bossPickEl) {
        document.querySelectorAll('.tribute-boss-pick').forEach(el => {
          el.style.borderColor = 'transparent';
          el.classList.remove('selected');
        });
        bossPickEl.style.borderColor = '#facc15';
        bossPickEl.classList.add('selected');
        this.selectedTributeBossInstanceId = bossPickEl.getAttribute('data-boss-instance-id');
        return;
      }

      const slotPickEl = target.closest('.tribute-slot-pick');
      if (slotPickEl) {
        document.querySelectorAll('.tribute-slot-pick').forEach(el => {
          el.style.borderColor = '#475569';
          el.style.background = 'rgba(0,0,0,0.4)';
          el.classList.remove('selected');
        });
        slotPickEl.style.borderColor = '#ef4444';
        slotPickEl.style.background = 'rgba(239,68,68,0.2)';
        slotPickEl.classList.add('selected');
        this.selectedTributeSlot = parseInt(slotPickEl.getAttribute('data-tribute-slot'), 10);
        return;
      }

      if (target.closest('#btn-confirm-tribute-summon')) {
        const bossId = this.selectedTributeBossInstanceId;
        const slotIdx = this.selectedTributeSlot;
        this.handleExecuteTributeSummon(bossId, slotIdx);
        return;
      }

      if (target.closest('#btn-action-draw') || target.closest('#btn-draw-pile')) {
        if (this.isBusy()) return;
        this.handleDrawCard();
        return;
      }

      if (target.closest('#btn-action-discard')) {
        if (this.isBusy()) return;
        this.handleDiscardCard();
        return;
      }

      if (target.closest('#btn-toggle-sound')) {
        audioManager.ensureAudio();
        document.getElementById('modal-audio-settings')?.classList.add('open');
        return;
      }

      if (target.closest('#btn-audio-mute-toggle')) {
        audioManager.ensureAudio();
        const isMuted = audioManager.toggleMute();
        const btn = document.getElementById('btn-audio-mute-toggle');
        if (btn) {
          btn.textContent = isMuted ? '🔇 ĐANG TẮT TIẾNG' : '🔊 ĐANG BẬT ÂM';
          btn.style.background = isMuted ? '#ef4444' : '#10b981';
        }
        if (!isMuted) audioManager.playCardPlay();
        return;
      }

      const testSoundBtn = target.closest('.btn-test-sound');
      if (testSoundBtn) {
        const sType = testSoundBtn.getAttribute('data-sound');
        audioManager.testSound(sType);
        return;
      }

      if (target.closest('#btn-action-attack')) {
        if (this.isBusy()) return;
        this.handleAttack();
        return;
      }

      const attackerPickBtn = target.closest('.btn-select-attacker');
      if (attackerPickBtn) {
        const aSlot = parseInt(attackerPickBtn.getAttribute('data-attacker-slot'), 10);
        this.selectedBattleAttackerSlot = aSlot;
        this.render();
        document.getElementById('modal-battle-target')?.classList.add('open');
        return;
      }

      const strikeBtn = target.closest('.btn-execute-strike');
      if (strikeBtn) {
        const aSlot = parseInt(strikeBtn.getAttribute('data-attacker-slot'), 10);
        const tPlayer = strikeBtn.getAttribute('data-target-player');
        const rawTSlot = strikeBtn.getAttribute('data-target-slot');
        const tSlot = rawTSlot === 'null' ? null : parseInt(rawTSlot, 10);
        this.executeAttackWithTarget(aSlot, tPlayer, tSlot);
        return;
      }

      if (target.closest('#btn-action-endturn')) {
        if (this.isBusy()) return;
        this.handleEndTurn();
        return;
      }

      if (target.closest('#btn-open-graveyard')) {
        document.getElementById('modal-graveyard')?.classList.add('open');
        return;
      }
      if (target.closest('#btn-open-fusion') || target.closest('#btn-action-fusion')) {
        if (this.isBusy()) return;
        document.getElementById('modal-fusion')?.classList.add('open');
        return;
      }

      const fuseBtn = target.closest('.btn-fuse-summon');
      if (fuseBtn) {
        const fusionId = fuseBtn.getAttribute('data-fusion-id');
        const materialsStr = fuseBtn.getAttribute('data-materials') || '';
        const materials = materialsStr.split(',').filter(Boolean);
        this.handleExecuteFusion(fusionId, materials);
        return;
      }

      if (target.closest('#btn-toggle-log')) {
        document.getElementById('modal-log')?.classList.add('open');
        return;
      }
      if (target.closest('#btn-toggle-rules')) {
        document.getElementById('modal-rules')?.classList.add('open');
        return;
      }

      const discardBox = target.closest('.discard-card-select-box');
      if (discardBox) {
        const cardInstId = discardBox.getAttribute('data-discard-instance-id');
        const player = this.state.players[this.localPlayerId];
        const limit = player ? (player.handLimit || 6) : 6;
        const needed = Math.max(0, (player?.hand?.length || 0) - limit);
        this.selectedDiscardIds = this.selectedDiscardIds || [];

        const foundIdx = this.selectedDiscardIds.indexOf(cardInstId);
        if (foundIdx !== -1) {
          this.selectedDiscardIds.splice(foundIdx, 1);
          discardBox.style.border = '2px solid transparent';
          discardBox.style.background = 'rgba(0,0,0,0.3)';
        } else {
          if (this.selectedDiscardIds.length < needed) {
            this.selectedDiscardIds.push(cardInstId);
            discardBox.style.border = '2px solid #ef4444';
            discardBox.style.background = 'rgba(239, 68, 68, 0.3)';
          }
        }

        const confirmBtn = document.getElementById('btn-confirm-discard-endturn');
        if (confirmBtn) {
          const selectedCount = this.selectedDiscardIds.length;
          if (selectedCount === needed) {
            confirmBtn.disabled = false;
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.style.background = '#ef4444';
            confirmBtn.style.color = '#ffffff';
            confirmBtn.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.6)';
            confirmBtn.textContent = `🗑️ XÁC NHẬN BỎ ${needed} LÁ & HẾT LƯỢT`;
          } else {
            confirmBtn.disabled = true;
            confirmBtn.style.cursor = 'not-allowed';
            confirmBtn.style.background = '#475569';
            confirmBtn.style.color = '#94a3b8';
            confirmBtn.style.boxShadow = 'none';
            confirmBtn.textContent = `🗑️ ĐÃ CHỌN (${selectedCount}/${needed}) — BỎ RÁC & HẾT LƯỢT`;
          }
        }
        return;
      }

      if (target.closest('#btn-confirm-discard-endturn')) {
        if (this.isBusy()) return;
        const player = this.state.players[this.localPlayerId];
        const limit = player ? (player.handLimit || 6) : 6;
        const needed = Math.max(0, (player?.hand?.length || 0) - limit);
        if (this.selectedDiscardIds && this.selectedDiscardIds.length === needed) {
          if (this.isOnlineMatch && this.netClient) {
            this.netClient.sendAction('END_TURN', { discardedInstanceIds: this.selectedDiscardIds });
            this.selectedDiscardIds = [];
            return;
          }
          try {
            GameEngine.endTurn(this.state, this.localPlayerId, this.selectedDiscardIds);
            this.selectedDiscardIds = [];
            this.selectedHandInstanceId = null;
            this.inspectingCard = null;
            CardInspectorDrawer.close();
            audioManager.playGraveyardSend();
            this.render();
            this.checkAndRunBotTurn();
          } catch (err) {
            this.showActionAnnouncement('⚠️ CHƯA THỂ HẾT LƯỢT', err.message, '⚠️', 2600);
          }
        }
        return;
      }

      if (target.closest('[data-close-modal]')) {
        const modalId = target.closest('[data-close-modal]').getAttribute('data-close-modal');
        document.getElementById(modalId)?.classList.remove('open');
        return;
      }

      // Trên điện thoại: Chạm ra ngoài Bottom-Sheet Inspector sẽ tự động đóng bảng chi tiết để thông thoáng tầm nhìn
      if (this.inspectingCard && !target.closest('#card-inspector-drawer') && !target.closest('.action-toolbar')) {
        this.inspectingCard = null;
        CardInspectorDrawer.close();
      }
    });

    appEl.addEventListener('input', (e) => {
      const target = e.target;
      if (target.id === 'input-online-player-name') {
        this.onlinePlayerName = target.value;
        return;
      }
      if (target.id === 'input-online-ws-url') {
        this.onlineWsUrl = target.value;
        return;
      }
      if (target.id === 'input-online-room-code') {
        this.onlineRoomCode = target.value;
        return;
      }
      if (target.id === 'compendium-search-input') {
        this.compendiumFilter.query = target.value;
        this.refreshCompendiumModal(true);
        return;
      }
      if (target.id === 'slider-vol-sfx') {
        const val = parseFloat(target.value);
        audioManager.setVolume('sfx', val);
        const lbl = document.getElementById('label-vol-sfx');
        if (lbl) lbl.textContent = Math.round(val * 100) + '%';
      } else if (target.id === 'slider-vol-music') {
        const val = parseFloat(target.value);
        audioManager.setVolume('music', val);
        const lbl = document.getElementById('label-vol-music');
        if (lbl) lbl.textContent = Math.round(val * 100) + '%';
      } else if (target.id === 'slider-vol-voice') {
        const val = parseFloat(target.value);
        audioManager.setVolume('voice', val);
        const lbl = document.getElementById('label-vol-voice');
        if (lbl) lbl.textContent = Math.round(val * 100) + '%';
      }
    });
  }

  refreshCompendiumModal(preserveInputFocus = false) {
    const existingModal = document.getElementById('modal-compendium');
    if (!existingModal) return;
    const temp = document.createElement('div');
    temp.innerHTML = ModalPanels.renderCompendiumModal(this.compendiumFilter);
    const newModal = temp.firstElementChild;
    if (newModal) {
      newModal.classList.add('open');
      existingModal.replaceWith(newModal);
      if (preserveInputFocus) {
        const input = document.getElementById('compendium-search-input');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    }
  }

  startQuickPlay() {
    const playerConfigs = [
      { id: 'p1', name: 'Bạn (Sơn Tinh)', characterId: 'NV-01', teamId: 'TEAM_A', isBot: false },
      { id: 'p2', name: 'Thủy Tinh (Bot)', characterId: 'NV-02', teamId: 'TEAM_B', isBot: true },
      { id: 'p3', name: 'Thánh Gióng (Bot)', characterId: 'NV-03', teamId: 'TEAM_A', isBot: true },
      { id: 'p4', name: 'Chử Đồng Tử (Bot)', characterId: 'NV-04', teamId: 'TEAM_B', isBot: true }
    ];

    this.unlockAllActionsNow();
    this.isBotThinking = false;
    this.isOnlineMatch = false;
    this.localPlayerId = 'p1';
    this.selectedHandInstanceId = null;
    this.selectedEquipInstanceId = null;
    this.state = GameEngine.initGame({
      playerConfigs,
      isTeamMode: true,
      strictAutoDraw: true
    });
    this.state.currentPhase = PHASES.MAIN;
    this.incrementStat('gamesPlayed');

    audioManager.ensureAudio();
    audioManager.startAmbientMusic();
    audioManager.playCardPlay();

    this.currentScreen = 'ARENA';
    this.render();
    this.checkAndRunBotTurn();
  }

  startCustomGame() {
    const botPool = [
      { name: 'Thủy Tinh (Bot)', characterId: 'NV-02' },
      { name: 'Thánh Gióng (Bot)', characterId: 'NV-03' },
      { name: 'Chử Đồng Tử (Bot)', characterId: 'NV-04' },
      { name: 'Mẫu Thượng Ngàn (Bot)', characterId: 'NV-05' },
      { name: 'Lạc Long Quân (Bot)', characterId: 'NV-06' },
      { name: 'Tổ Mẫu Âu Cơ (Bot)', characterId: 'NV-07' },
      { name: 'Cóc Kiện Trời (Bot)', characterId: 'NV-08' },
      { name: 'Sơn Tinh (Bot)', characterId: 'NV-01' }
    ];

    const playerConfigs = [];
    playerConfigs.push({
      id: 'p1',
      name: this.roomConfig.playerName,
      characterId: this.roomConfig.characterId,
      teamId: 'TEAM_A',
      isBot: false
    });

    for (let i = 2; i <= this.roomConfig.numPlayers; i++) {
      const botTemplate = botPool[(i - 2) % botPool.length];
      const teamId = (i % 2 === 1) ? 'TEAM_A' : 'TEAM_B';
      playerConfigs.push({
        id: `p${i}`,
        name: botTemplate.name,
        characterId: botTemplate.characterId,
        teamId: this.roomConfig.isTeamMode ? teamId : null,
        isBot: true
      });
    }

    this.unlockAllActionsNow();
    this.isBotThinking = false;
    this.isOnlineMatch = false;
    this.localPlayerId = 'p1';
    this.selectedHandInstanceId = null;
    this.selectedEquipInstanceId = null;
    this.state = GameEngine.initGame({
      playerConfigs,
      isTeamMode: this.roomConfig.isTeamMode,
      strictAutoDraw: true
    });
    this.state.currentPhase = PHASES.MAIN;
    this.incrementStat('gamesPlayed');

    audioManager.ensureAudio();
    audioManager.startAmbientMusic();
    audioManager.playCardPlay();

    this.currentScreen = 'ARENA';
    this.render();
    this.checkAndRunBotTurn();
  }

  showActionAnnouncement(title, desc, icon = '⚡', duration = 2200) {
    if (typeof document === 'undefined') return;
    const bannerEl = document.getElementById('action-announcement-banner');
    if (!bannerEl) return;

    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
      this.announcementTimeout = null;
    }

    bannerEl.innerHTML = `
      <span class="banner-badge-icon">${icon}</span>
      <div class="banner-content-text">
        <div class="banner-title-line">${title}</div>
        <div class="banner-desc-line">${desc}</div>
      </div>
    `;
    bannerEl.classList.remove('show');
    void bannerEl.offsetWidth;
    bannerEl.classList.add('show');

    this.announcementTimeout = setTimeout(() => {
      bannerEl.classList.remove('show');
      this.announcementTimeout = null;
    }, duration);
  }

  checkGameOverAchievement() {
    if (!this.state || this.state.gameStatus !== 'ENDED' || this.state._statsRecorded) return;
    this.state._statsRecorded = true;
    const localPlayer = this.state.players[this.localPlayerId];
    const isWin = this.state.isTeamMode
      ? (this.state.winnerTeamId && localPlayer?.teamId === this.state.winnerTeamId)
      : (this.state.winnerId === this.localPlayerId);
    if (isWin) {
      this.incrementStat('gamesWon');
      audioManager.speakCallout('Chúc mừng chiến thắng!');
    }
  }

  async checkAndRunBotTurn() {
    if (this.isOnlineMatch) return;
    if (!this.state || this.isBotThinking || this.state.gameStatus === 'ENDED') {
      this.checkGameOverAchievement();
      return;
    }

    const currentPlayerId = this.state.turnOrder[this.state.currentTurnIndex];
    const currentPlayer = this.state.players[currentPlayerId];

    if (currentPlayer && currentPlayer.isBot && !currentPlayer.isGhost) {
      this.isBotThinking = true;
      this.render();

      try {
        let dmgCursor = (this.state.damageEvents || []).length;

        await BotBrain.executeTurnAnimated(this.state, currentPlayerId, async (step) => {
          this.isActionLocked = true;
          this.updateToolbarLockVisual(true);
          try {
            const stepDamages = (this.state.damageEvents || []).slice(dmgCursor);
            dmgCursor = (this.state.damageEvents || []).length;

            if (step.type === 'ATTACK' && step.card) {
              const targetPlayer = this.state.players[step.targetPlayerId];
              const isDirectAttack = !step.defenderCard;
              const targetName = step.defenderCard
                ? `${step.defenderCard.name}`
                : (targetPlayer?.name || 'Đối thủ');

              // 1. Đối với tấn công: Chỉ đọc đối tượng tấn công và mục tiêu tấn công!
              audioManager.speakAttackDeclaration({
                card: step.card,
                attackerName: currentPlayer.name,
                targetName,
                isDirectAttack
              });

              const attackerZoneId = `zone-player-${currentPlayerId}-monster-${step.attackerSlot ?? 0}`;
              const targetZoneId = (step.targetSlot !== null && step.targetSlot !== undefined)
                ? `zone-player-${step.targetPlayerId}-monster-${step.targetSlot}`
                : `zone-player-${step.targetPlayerId}-hp`;

              // 2. Thể hiện kết quả bằng hiệu ứng tấn công trên màn hình
              if (this.animator) {
                await this.animator.executeCinematicAttack({
                  attackerZoneId,
                  targetZoneId,
                  attackerCard: step.card,
                  defenderCard: step.defenderCard || null,
                  targetPlayerName: targetPlayer?.name || 'Đối thủ',
                  atkPower: step.atkPower || 0,
                  defPower: step.defPower,
                  damageDealt: step.battleResult?.damageDealt || 0,
                  attackerDestroyed: Boolean(step.battleResult?.attackerDestroyed),
                  defenderDestroyed: Boolean(step.battleResult?.defenderDestroyed)
                });
              }

              // 3. Hiển thị hiệu ứng trừ máu đặc sắc trên màn hình
              if (stepDamages.length > 0) {
                await this.presentDamageEvents(stepDamages);
              }

              this.showActionAnnouncement(step.title, step.desc, '💥', 2000);
              this.checkGameOverAchievement();
              return;
            }

            if (this.activationStage && step.card) {
              let cat = 'SUMMON';
              if (step.type === 'TRIBUTE') cat = 'TRIBUTE';
              else if (step.type === 'DRAMA') cat = 'DRAMA';
              else if (step.type === 'TRAP') cat = 'TRAP';
              else if (step.type === 'FUSION') cat = 'FUSION';
              else if (step.type === 'EQUIP') cat = 'EQUIP';
              else if (step.type === 'SKILL') cat = 'SKILL';

              const activeEv = (step.effectEvents || []).find(ev => ev.mode === 'ACTIVE');
              const hasTriggeredEffect = activeEv ? Boolean(activeEv.hasTriggeredEffect) : true;

              await this.activationStage.presentActivation({
                card: step.card,
                activatorName: currentPlayer.name,
                category: cat,
                title: step.title,
                description: ALL_96_CARDS[step.card.cardId]?.description || '',
                triggeredEffectText: step.desc,
                icon: step.icon || '⚡',
                holdDuration: 2000,
                hasTriggeredEffect
              });
            } else if (step.type === 'TRAP_SET') {
              audioManager.playTrapFlip();
            }

            if (stepDamages.length > 0) {
              await this.presentDamageEvents(stepDamages);
            }

            this.showActionAnnouncement(step.title, step.desc, step.icon || '⚡', 1800);
            this.checkGameOverAchievement();
          } finally {
            this.unlockAllActionsNow();
            this.render();
          }
        }, 380);
        this.checkGameOverAchievement();
      } catch (err) {
        console.error('Lỗi khi Bot thực thi lượt:', err);
      } finally {
        this.isBotThinking = false;
        this.unlockAllActionsNow();
        this.render();
        this.checkAndRunBotTurn();
      }
    }
  }

  handleDrawCard() {
    if (!this.state || this.isBusy()) return;
    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('MANUAL_DRAW', {});
      return;
    }
    const currentPlayerId = this.state.turnOrder[this.state.currentTurnIndex];
    if (currentPlayerId !== this.localPlayerId) {
      this.showActionAnnouncement('⏳ CHƯA ĐẾN LƯỢT', 'Chưa đến lượt của bạn để bốc bài!', '⏳', 2000);
      return;
    }
    if (this.state.manualDrawUsedThisTurn) {
      this.showActionAnnouncement(
        '🎴 ĐÃ BỐC BÀI VÒNG NÀY',
        'Mỗi vòng chơi chỉ được đúng 1 lượt bốc bài duy nhất! Hãy dùng hiệu ứng thẻ nếu muốn bốc thêm.',
        '🎴',
        2400
      );
      return;
    }

    const player = this.state.players[this.localPlayerId];
    const drawnCard = TurnManager.drawCard(this.state, this.localPlayerId, { isNormalTurnDraw: true });
    if (drawnCard) {
      this.state.manualDrawUsedThisTurn = true;
      this.state.turnDrawUsed = true;
      this.state.actionLog.push({
        turn: this.state.turnNumber,
        message: `🎴 ${player.name} bốc 1 lá bài của vòng này: [${drawnCard.name}]!`
      });
      audioManager.playDrawCard();

      if (this.animator) {
        this.animator.flyCardBetweenZones({
          fromZoneId: 'zone-draw-pile',
          toZoneId: `zone-player-${this.localPlayerId}-hand`,
          cardHtml: CardComponent.renderCardHtml(drawnCard),
          mode: 'DRAW',
          duration: 700
        });
      }

      this.showActionAnnouncement(
        '🎴 BỐC BÀI CỦA VÒNG',
        `Bạn vừa bốc: [${drawnCard.name}]!`,
        '🎴',
        2000
      );
      this.render();
    } else {
      this.showActionAnnouncement('⚠️ HẾT BÀI', 'Chồng bài bốc và Bãi rác đều đã cạn!', '⚠️', 2200);
    }
  }

  async handleSummon() {
    if (this.isBusy()) return;
    if (!this.selectedHandInstanceId) {
      this.showActionAnnouncement('⚔️ CHỌN THẺ TRƯỚC', 'Vui lòng click chọn 1 lá Linh Thú Cấp Thấp trên tay trước!', '⚔️', 2200);
      return;
    }

    const player = this.state.players[this.localPlayerId];
    const card = player.hand.find(c => c.instanceId === this.selectedHandInstanceId);
    if (!card) return;

    if (card.cardId === 'TR-14' && !this.state.swarmSummonUsed) {
      return this.handleSwarmSummon();
    }

    if (this.state.normalSummonUsed && (this.state.bonusSummonsAvailable || 0) <= 0 && !this.state.swarmSummonUsed) {
      return this.handleSwarmSummon();
    }

    const emptySlot = player.monsterSlots.findIndex(s => s === null);
    if (emptySlot === -1) {
      this.showActionAnnouncement('⚠️ ĐẦY Ô LINH THÚ', 'Cả 2 Ô Linh Thú của bạn đều đã có quân bài!', '⚠️', 2200);
      return;
    }

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('NORMAL_SUMMON', { cardInstanceId: card.instanceId, slotIndex: emptySlot });
      this.selectedHandInstanceId = null;
      return;
    }

    await this.runLockedAction(async () => {
      try {
        const cardData = ALL_96_CARDS[card.cardId] || card;
        const targetZoneId = `zone-player-${this.localPlayerId}-monster-${emptySlot}`;
        const logCountBefore = this.state.actionLog.length;
        const evBefore = (this.state.effectEvents || []).length;

        GameEngine.normalSummon(this.state, this.localPlayerId, card.instanceId, emptySlot);

        const newLogs = this.state.actionLog.slice(logCountBefore).map(l => l.message).join(' • ');
        const newEvents = (this.state.effectEvents || []).slice(evBefore);
        const activeEv = newEvents.find(ev => ev.mode === 'ACTIVE');
        const hasTriggeredEffect = activeEv ? Boolean(activeEv.hasTriggeredEffect) : false;

        this.selectedHandInstanceId = null;
        this.inspectingCard = null;
        CardInspectorDrawer.close();

        // Chỉ đọc hiệu ứng nếu lá bài thực sự kích hoạt hiệu ứng khi triệu hồi (hasTriggeredEffect === true)
        if (this.activationStage) {
          await this.activationStage.presentActivation({
            card,
            activatorName: player.name,
            category: 'SUMMON',
            title: `Triệu Hồi: ${card.name}`,
            description: cardData.description || 'Linh Thú xuất trận!',
            triggeredEffectText: newLogs,
            icon: '⚔️',
            holdDuration: 2000,
            hasTriggeredEffect,
            boardAction: {
              type: 'SUMMON',
              fromZoneId: `zone-player-${this.localPlayerId}-hand`,
              toZoneId: targetZoneId,
              cardHtml: CardComponent.renderCardHtml(card)
            }
          });
        }

        const trapOrExternalPassives = newEvents.filter(ev => ev.mode === 'PASSIVE' && ['TRAP', 'GHOST'].includes(ev.category));
        await this.presentPassiveEffectNotifications(trapOrExternalPassives, card.cardId);

        this.showActionAnnouncement(
          '⚔️ TRIỆU HỒI LINH THÚ!',
          newLogs || `Đã triệu hồi [${card.name}] lên sân!`,
          '⚔️',
          2000
        );
      } catch (err) {
        this.showActionAnnouncement('⚠️ KHÔNG THỂ TRIỆU HỒI', err.message, '⚠️', 2400);
      }
    });
  }

  /**
   * Triệu hồi Gọi Bầy (Swarm Summon)
   */
  async handleSwarmSummon() {
    if (this.isBusy()) return;
    if (!this.selectedHandInstanceId) {
      this.showActionAnnouncement('🐾 CHỌN LINH THÚ TRƯỚC', 'Vui lòng click chọn 1 lá Linh Thú trên tay để Triệu Hồi Gọi Bầy!', '🐾', 2200);
      return;
    }

    const player = this.state.players[this.localPlayerId];
    const card = player.hand.find(c => c.instanceId === this.selectedHandInstanceId);
    if (!card) return;

    const emptySlot = player.monsterSlots.findIndex(s => s === null);
    if (emptySlot === -1) {
      this.showActionAnnouncement('⚠️ ĐẦY Ô LINH THÚ', 'Cả 2 Ô Linh Thú của bạn đều đã có quân bài!', '⚠️', 2200);
      return;
    }

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('SWARM_SUMMON', { cardInstanceId: card.instanceId, slotIndex: emptySlot });
      this.selectedHandInstanceId = null;
      return;
    }

    await this.runLockedAction(async () => {
      try {
        const cardData = ALL_96_CARDS[card.cardId] || card;
        const targetZoneId = `zone-player-${this.localPlayerId}-monster-${emptySlot}`;
        const logCountBefore = this.state.actionLog.length;
        const evBefore = (this.state.effectEvents || []).length;

        GameEngine.swarmSummon(this.state, this.localPlayerId, card.instanceId, emptySlot);

        const newLogs = this.state.actionLog.slice(logCountBefore).map(l => l.message).join(' • ');
        const newEvents = (this.state.effectEvents || []).slice(evBefore);
        const activeEv = newEvents.find(ev => ev.mode === 'ACTIVE');
        const hasTriggeredEffect = activeEv ? Boolean(activeEv.hasTriggeredEffect) : false;

        this.selectedHandInstanceId = null;
        this.inspectingCard = null;
        CardInspectorDrawer.close();

        if (this.activationStage) {
          await this.activationStage.presentActivation({
            card,
            activatorName: player.name,
            category: 'SUMMON',
            title: `Gọi Bầy: ${card.name}`,
            description: cardData.description || 'Linh Thú tiếp viện xuất trận!',
            triggeredEffectText: newLogs,
            icon: '🐾',
            holdDuration: 2000,
            hasTriggeredEffect,
            boardAction: {
              type: 'SUMMON',
              fromZoneId: `zone-player-${this.localPlayerId}-hand`,
              toZoneId: targetZoneId,
              cardHtml: CardComponent.renderCardHtml(card)
            }
          });
        }

        const trapOrExternalPassives = newEvents.filter(ev => ev.mode === 'PASSIVE' && ['TRAP', 'GHOST'].includes(ev.category));
        await this.presentPassiveEffectNotifications(trapOrExternalPassives, card.cardId);

        this.showActionAnnouncement(
          '🐾 GỌI BẦY LINH THÚ!',
          newLogs || `Đã gọi bầy [${card.name}] lên sân!`,
          '🐾',
          2000
        );
      } catch (err) {
        this.showActionAnnouncement('⚠️ KHÔNG THỂ GỌI BẦY', err.message, '⚠️', 2400);
      }
    });
  }

  async handleSetTrap() {
    if (this.isBusy()) return;
    if (!this.selectedHandInstanceId) {
      this.showActionAnnouncement('⚠️ CHỌN BẪY TRƯỚC', 'Vui lòng click chọn 1 lá Bẫy Thiên Cơ trên tay trước!', '⚠️', 2200);
      return;
    }

    const player = this.state.players[this.localPlayerId];
    const card = player.hand.find(c => c.instanceId === this.selectedHandInstanceId);
    if (!card) return;

    const emptyTrap = player.trapSlots.findIndex(s => s === null);
    if (emptyTrap === -1) {
      this.showActionAnnouncement('⚠️ ĐẦY Ô BẪY', 'Tất cả các Ô Bẫy của bạn đều đã có bài úp!', '⚠️', 2200);
      return;
    }

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('SET_TRAP', { trapCardInstanceId: card.instanceId, trapSlotIndex: emptyTrap });
      this.selectedHandInstanceId = null;
      return;
    }

    await this.runLockedAction(async () => {
      try {
        const targetZoneId = `zone-player-${this.localPlayerId}-trap-${emptyTrap}`;

        if (this.animator) {
          await this.animator.flyCardBetweenZones({
            fromZoneId: `zone-player-${this.localPlayerId}-hand`,
            toZoneId: targetZoneId,
            cardHtml: CardComponent.renderCardHtml(card, { faceDown: true }),
            mode: 'SUMMON',
            duration: 620
          });
        }

        GameEngine.setTrap(this.state, this.localPlayerId, card.instanceId, emptyTrap);
        audioManager.playTrapFlip();
        this.selectedHandInstanceId = null;
        this.inspectingCard = null;
        CardInspectorDrawer.close();
        this.showActionAnnouncement(
          '⚠️ ÚP BẪY THIÊN CƠ!',
          `Bạn đã bí mật úp [${card.name}] vào Ô Bẫy ${emptyTrap + 1}!`,
          '⚠️',
          1800
        );
      } catch (err) {
        this.showActionAnnouncement('⚠️ KHÔNG THỂ ÚP BẪY', err.message, '⚠️', 2400);
      }
    });
  }

  handleOpenEquipModal(instanceId = null) {
    if (!this.state || this.isBusy()) return;
    const player = this.state.players[this.localPlayerId];
    const equipCards = player.hand.filter(c => {
      const d = ALL_96_CARDS[c.cardId] || c;
      return (c.type || d.type) === CARD_TYPES.EQUIPMENT;
    });

    if (equipCards.length === 0) {
      this.showActionAnnouncement('🛡️ CHƯA CÓ ĐẠO CỤ', 'Bạn không có lá Bài Đạo Cụ / Pháp Bảo nào trên tay để trang bị!', '🛡️', 2200);
      return;
    }

    const preferredId = instanceId || this.selectedHandInstanceId;
    const matchedEquip = equipCards.find(c => c.instanceId === preferredId) || equipCards[0];
    this.selectedEquipInstanceId = matchedEquip.instanceId;
    this.selectedHandInstanceId = matchedEquip.instanceId;

    this.render();
    if (typeof document !== 'undefined') document.getElementById('modal-equip-target')?.classList.add('open');
  }

  async executeEquipWithTarget(equipInstanceId, targetPlayerId, targetSlotIndex) {
    if (this.isBusy()) return;
    if (typeof document !== 'undefined') document.getElementById('modal-equip-target')?.classList.remove('open');

    const player = this.state.players[this.localPlayerId];
    const card = player.hand.find(c => c.instanceId === equipInstanceId);
    if (!card) return;

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('EQUIP_ITEM', {
        equipCardInstanceId: card.instanceId,
        targetPlayerId,
        targetSlotIndex
      });
      this.selectedHandInstanceId = null;
      this.selectedEquipInstanceId = null;
      return;
    }

    const cardData = ALL_96_CARDS[card.cardId] || card;

    await this.runLockedAction(async () => {
      try {
        const logCountBefore = this.state.actionLog.length;
        const evBefore = (this.state.effectEvents || []).length;
        GameEngine.equipItem(this.state, this.localPlayerId, card.instanceId, targetPlayerId, targetSlotIndex);
        const newLogs = this.state.actionLog.slice(logCountBefore).map(l => l.message).join(' • ');
        const newEvents = (this.state.effectEvents || []).slice(evBefore);

        this.selectedHandInstanceId = null;
        this.selectedEquipInstanceId = null;
        this.inspectingCard = null;
        CardInspectorDrawer.close();

        // Chỉ mở bảng đọc khi Pháp Bảo có hiệu ứng kích hoạt ngay lúc gắn (cộng/trừ Độ Chiến, hồi máu, bốc bài, bắn tên, khóa kỹ năng)
        const immediateEquips = ['DC-01', 'DC-02', 'DC-04', 'DC-06', 'DC-07', 'DC-08', 'DC-10', 'DC-11', 'DC-12', 'DC-13', 'DC-14'];
        const hasImmediateEquipEffect = immediateEquips.includes(card.cardId);

        if (this.activationStage) {
          await this.activationStage.presentActivation({
            card,
            activatorName: player.name,
            category: 'EQUIP',
            title: `Trang Bị: ${card.name}`,
            description: cardData.description || 'Gắn Pháp Bảo bổ trợ!',
            triggeredEffectText: newLogs,
            icon: '🛡️',
            holdDuration: 2000,
            hasTriggeredEffect: hasImmediateEquipEffect,
            boardAction: {
              type: 'TOLL',
              fromZoneId: `zone-player-${this.localPlayerId}-hand`,
              toZoneId: `zone-player-${targetPlayerId}-monster-${targetSlotIndex}`,
              cardHtml: CardComponent.renderCardHtml(card)
            }
          });
        }

        await this.presentPassiveEffectNotifications(newEvents, card.cardId);

        this.showActionAnnouncement(
          '🛡️ TRANG BỊ PHÁP BẢO!',
          newLogs || `Đã gắn [${card.name}] thành công!`,
          '🛡️',
          2000
        );
      } catch (err) {
        this.showActionAnnouncement('⚠️ KHÔNG THỂ GẮN PHÁP BẢO', err.message, '⚠️', 2400);
      }
    });
  }

  async handleEquipItem(instanceId = null, targetPlayerId = null, targetSlotIndex = null) {
    if (this.isBusy()) return;
    if (targetPlayerId !== null && targetSlotIndex !== null) {
      const eqId = instanceId || this.selectedHandInstanceId || this.selectedEquipInstanceId;
      return this.executeEquipWithTarget(eqId, targetPlayerId, targetSlotIndex);
    }
    this.handleOpenEquipModal(instanceId);
  }

  async handleUseDrama(instanceId = null) {
    if (this.isBusy()) return;
    const targetInstanceId = instanceId || this.selectedHandInstanceId;
    if (!targetInstanceId) {
      this.showActionAnnouncement('🎭 CHỌN BÀI SỰ TÍCH', 'Vui lòng click chọn 1 lá Phép Sự Tích (Drama) trên tay trước!', '🎭', 2200);
      return;
    }

    const player = this.state.players[this.localPlayerId];
    const card = player.hand.find(c => c.instanceId === targetInstanceId);
    if (!card) return;

    const cardData = ALL_96_CARDS[card.cardId] || card;
    if (cardData.type !== CARD_TYPES.DRAMA) {
      this.showActionAnnouncement('⚠️ SAI LOẠI BÀI', 'Lá bài này không phải là Phép Sự Tích (Drama)!', '⚠️', 2200);
      return;
    }

    const validOpponents = Object.values(this.state.players).filter(p => {
      if (p.id === this.localPlayerId || p.isGhost) return false;
      if (this.state.isTeamMode && p.teamId === player.teamId) return false;
      return true;
    });

    const targetParams = {};
    if (validOpponents.length > 0) {
      let chosenOpp = validOpponents[0];
      if (card.cardId === 'DR-06' || card.cardId === 'DR-10') {
        chosenOpp = validOpponents.find(p => p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker)) || chosenOpp;
      } else if (card.cardId === 'DR-09') {
        chosenOpp = validOpponents.find(p => p.trapSlots.some(t => t !== null)) || chosenOpp;
      } else if (card.cardId === 'DR-02') {
        chosenOpp = validOpponents.find(p => p.monsterSlots.some(s => s === null)) || chosenOpp;
      } else if (card.cardId === 'DR-07') {
        chosenOpp = [...validOpponents].sort((a, b) => b.hand.length - a.hand.length)[0] || chosenOpp;
      }
      targetParams.targetPlayerId = chosenOpp.id;
      if (chosenOpp.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker)) {
        targetParams.targetSlotIndex = chosenOpp.monsterSlots.findIndex(m => m !== null && !m.isGhostSlotMarker);
      }
    }

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('USE_DRAMA', { dramaCardInstanceId: card.instanceId, targetParams });
      this.selectedHandInstanceId = null;
      return;
    }

    await this.runLockedAction(async () => {
      try {
        const logCountBefore = this.state.actionLog.length;
        const evBefore = (this.state.effectEvents || []).length;
        const myEmptySlotBefore = player.monsterSlots.findIndex(m => m === null);

        GameEngine.useDrama(this.state, this.localPlayerId, card.instanceId, targetParams);
        const newLogs = this.state.actionLog.slice(logCountBefore).map(l => l.message).join(' • ');
        const newEvents = (this.state.effectEvents || []).slice(evBefore);

        this.selectedHandInstanceId = null;
        this.inspectingCard = null;
        CardInspectorDrawer.close();

        if (this.activationStage) {
          let boardAction = null;
          if (card.cardId === 'DR-06' && targetParams.targetPlayerId) {
            const targetSlot = targetParams.targetSlotIndex ?? 0;
            boardAction = {
              type: 'STEAL',
              fromZoneId: `zone-player-${targetParams.targetPlayerId}-monster-${targetSlot}`,
              toZoneId: `zone-player-${this.localPlayerId}-monster-${myEmptySlotBefore !== -1 ? myEmptySlotBefore : 0}`
            };
          } else if (targetParams.targetPlayerId) {
            boardAction = {
              type: 'TOLL',
              fromZoneId: `zone-player-${this.localPlayerId}-hand`,
              toZoneId: `station-${targetParams.targetPlayerId}`
            };
          }

          await this.activationStage.presentActivation({
            card,
            activatorName: player.name,
            category: 'DRAMA',
            title: `Sự Tích: ${card.name}`,
            description: cardData.description || 'Kích hoạt phép thuật sự tích!',
            triggeredEffectText: newLogs,
            icon: '🎭',
            holdDuration: 2000,
            hasTriggeredEffect: true,
            boardAction
          });
        }

        await this.presentPassiveEffectNotifications(newEvents, card.cardId);

        this.showActionAnnouncement(
          '🎭 PHÉP SỰ TÍCH KÍCH HOẠT!',
          newLogs || `Đã phát động [${card.name}]!`,
          '🎭',
          2000
        );
        this.checkGameOverAchievement();
      } catch (err) {
        this.showActionAnnouncement('⚠️ KHÔNG THỂ DÙNG PHÉP', err.message, '⚠️', 2400);
      }
    });
  }

  async handleActivateCharacterSkill() {
    if (!this.state || this.isBusy()) return;
    if (this.isOnlineMatch && this.netClient) {
      document.getElementById('modal-active-skills')?.classList.remove('open');
      this.netClient.sendAction('ACTIVATE_CHARACTER_SKILL', {});
      return;
    }
    await this.runLockedAction(async () => {
      try {
        const player = this.state.players[this.localPlayerId];
        const charData = ALL_96_CARDS[player.characterId] || { id: player.characterId, name: 'Đại Diện Thần Thoại' };
        const logCountBefore = this.state.actionLog.length;
        const evBefore = (this.state.effectEvents || []).length;

        GameEngine.activateCharacterSkill(this.state, this.localPlayerId);
        document.getElementById('modal-active-skills')?.classList.remove('open');

        const newLogs = this.state.actionLog.slice(logCountBefore).map(l => l.message).join(' • ');
        const newEvents = (this.state.effectEvents || []).slice(evBefore);

        if (this.activationStage) {
          await this.activationStage.presentActivation({
            card: charData,
            activatorName: player.name,
            category: 'SKILL',
            title: `Thần Lực: ${charData.name}`,
            description: charData.aliveAbility || '',
            triggeredEffectText: newLogs,
            icon: '👑',
            holdDuration: 2000,
            hasTriggeredEffect: true
          });
        }

        await this.presentPassiveEffectNotifications(newEvents, player.characterId);

        this.showActionAnnouncement('👑 KỸ NĂNG ĐẠI DIỆN!', newLogs || 'Đã kích hoạt kỹ năng Đại Diện!', '👑', 2000);
      } catch (err) {
        this.showActionAnnouncement('⚠️ CHƯA THỂ KÍCH HOẠT', err.message, '⚠️', 2400);
      }
    });
  }

  async handleActivateFieldSkill(slotIndex) {
    if (!this.state || this.isBusy()) return;
    document.getElementById('modal-active-skills')?.classList.remove('open');
    CardInspectorDrawer.close();
    this.inspectingCard = null;

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('ACTIVATE_FIELD_SKILL', { slotIndex });
      return;
    }

    await this.runLockedAction(async () => {
      try {
        const player = this.state.players[this.localPlayerId];
        const monster = player.monsterSlots[slotIndex];
        const logCountBefore = this.state.actionLog.length;
        const evBefore = (this.state.effectEvents || []).length;

        GameEngine.activateFieldSkill(this.state, this.localPlayerId, slotIndex);
        const newLogs = this.state.actionLog.slice(logCountBefore).map(l => l.message).join(' • ');
        const newEvents = (this.state.effectEvents || []).slice(evBefore);

        if (this.activationStage && monster) {
          const mData = ALL_96_CARDS[monster.cardId] || monster;
          await this.activationStage.presentActivation({
            card: monster,
            activatorName: player.name,
            category: 'SKILL',
            title: `Tuyệt Kỹ: ${monster.name}`,
            description: mData.description || '',
            triggeredEffectText: newLogs,
            icon: '⚡',
            holdDuration: 2000,
            hasTriggeredEffect: true
          });
        }

        await this.presentPassiveEffectNotifications(newEvents, monster?.cardId);

        this.showActionAnnouncement('⚡ TUYỆT KỸ LINH THÚ!', newLogs || 'Đã phát động kỹ năng Linh Thú!', '⚡', 2000);
      } catch (err) {
        this.showActionAnnouncement('⚠️ KHÔNG THỂ DÙNG KỸ NĂNG', err.message, '⚠️', 2400);
      }
    });
  }

  async handleActivateMindTrap(trapSlotIndex) {
    if (!this.state || this.isBusy()) return;
    document.getElementById('modal-active-skills')?.classList.remove('open');

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('ACTIVATE_TRAP', { trapSlotIndex });
      return;
    }

    await this.runLockedAction(async () => {
      try {
        const player = this.state.players[this.localPlayerId];
        const logCountBefore = this.state.actionLog.length;
        const trap = GameEngine.activateTrap(this.state, this.localPlayerId, trapSlotIndex);
        this.incrementStat('trapsTriggered');

        const newLogs = this.state.actionLog.slice(logCountBefore).map(l => l.message).join(' • ');

        if (this.activationStage && trap) {
          const tData = ALL_96_CARDS[trap.cardId] || trap;
          await this.activationStage.presentActivation({
            card: trap,
            activatorName: player.name,
            category: 'TRAP',
            title: `Lật Bẫy: ${trap.name}`,
            description: tData.description || '',
            triggeredEffectText: newLogs,
            icon: '🚨',
            holdDuration: 2000,
            hasTriggeredEffect: true
          });
        }

        this.showActionAnnouncement('🚨 BẪY TÂM LÝ LẬT NGỬA!', newLogs || 'Bẫy tâm lý đã lật!', '🚨', 2000);
        this.checkGameOverAchievement();
      } catch (err) {
        this.showActionAnnouncement('⚠️ CHƯA THỂ LẬT BẪY', err.message, '⚠️', 2400);
      }
    });
  }

  handleDiscardCard(instanceId = null) {
    if (this.isBusy()) return;
    const targetInstanceId = instanceId || this.selectedHandInstanceId;
    if (!targetInstanceId) {
      this.showActionAnnouncement('🗑️ CHỌN BÀI CẦN BỎ', 'Vui lòng click chọn 1 lá bài trên tay để bỏ vào Bãi Rác!', '🗑️', 2200);
      return;
    }

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('DISCARD_CARD', { cardInstanceId: targetInstanceId });
      this.selectedHandInstanceId = null;
      return;
    }

    const player = this.state.players[this.localPlayerId];
    const cardIdx = player.hand.findIndex(c => c.instanceId === targetInstanceId);
    if (cardIdx === -1) return;

    const [card] = player.hand.splice(cardIdx, 1);
    this.state.graveyard.push(card);

    this.state.actionLog.push({
      turn: this.state.turnNumber,
      message: `🗑️ ${player.name} đã chủ động bỏ lá bài [${card.name}] vào Bãi Rác.`
    });

    audioManager.playGraveyardSend();
    this.showActionAnnouncement('🗑️ BỎ BÀI VÀO BÃI RÁC', `Đã chuyển [${card.name}] vào Bãi Rác!`, '🗑️', 1800);

    this.selectedHandInstanceId = null;
    this.inspectingCard = null;
    CardInspectorDrawer.close();
    this.render();
  }

  handleAttack(preferredAttackerSlot = null) {
    if (!this.state || this.isBusy()) return;
    const player = this.state.players[this.localPlayerId];
    const availableMonsters = player.monsterSlots
      .map((m, idx) => ({ monster: m, slot: idx }))
      .filter(item => item.monster !== null && !item.monster.isGhostSlotMarker);

    if (availableMonsters.length === 0) {
      this.showActionAnnouncement('⚠️ CHƯA CÓ LINH THÚ', 'Bạn không có Linh Thú nào trên sân để tuyên bố tấn công!', '⚠️', 2200);
      return;
    }

    if (preferredAttackerSlot !== null) {
      this.selectedBattleAttackerSlot = preferredAttackerSlot;
    } else if (!availableMonsters.some(m => m.slot === this.selectedBattleAttackerSlot)) {
      this.selectedBattleAttackerSlot = availableMonsters[0].slot;
    }

    this.render();
    document.getElementById('modal-battle-target')?.classList.add('open');
  }

  async executeAttackWithTarget(attackerSlot, targetPlayerId, targetSlotIndex) {
    if (this.isBusy()) return;
    document.getElementById('modal-battle-target')?.classList.remove('open');

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('DECLARE_ATTACK', {
        attackerSlotIndex: attackerSlot,
        targetPlayerId,
        targetSlotIndex,
        options: { barkSuccess: true, singSuccess: true }
      });
      return;
    }

    const player = this.state.players[this.localPlayerId];
    const attackerCard = player.monsterSlots[attackerSlot];
    if (!attackerCard) return;

    const attackerSnapshot = JSON.parse(JSON.stringify(attackerCard));
    const targetOpponent = this.state.players[targetPlayerId];
    if (!targetOpponent) return;

    const targetMonsters = targetOpponent.monsterSlots
      .map((m, idx) => ({ monster: m, slotIndex: idx }))
      .filter(item => item.monster !== null && !item.monster.isGhostSlotMarker);

    let resolvedDefSlot = targetSlotIndex;
    const tr08Entry = targetMonsters.find(
      m => m.monster.cardId === 'TR-08' && !(m.monster.equippedItems || []).some(it => it.cardId === 'DC-04')
    );
    if (tr08Entry) {
      resolvedDefSlot = tr08Entry.slotIndex;
    } else if ((resolvedDefSlot === null || resolvedDefSlot === undefined || !targetOpponent.monsterSlots[resolvedDefSlot]) && targetMonsters.length > 0) {
      resolvedDefSlot = targetMonsters[0].slotIndex;
    }

    const defenderSnapshot = (resolvedDefSlot !== null && resolvedDefSlot !== undefined && targetOpponent.monsterSlots[resolvedDefSlot])
      ? JSON.parse(JSON.stringify(targetOpponent.monsterSlots[resolvedDefSlot]))
      : null;

    const preAtkPower = BattleResolver.calculateMonsterPower(this.state, this.localPlayerId, attackerSlot, {
      isAttacking: true,
      targetPlayerId
    });
    const preDefPower = defenderSnapshot
      ? BattleResolver.calculateMonsterPower(this.state, targetPlayerId, resolvedDefSlot, { isDefending: true })
      : null;

    await this.runLockedAction(async () => {
      try {
        const res = GameEngine.declareAttack(this.state, this.localPlayerId, attackerSlot, targetPlayerId, targetSlotIndex, {
          barkSuccess: true,
          singSuccess: true
        });

        const finalDefSlot = res.resolvedTargetSlot !== undefined ? res.resolvedTargetSlot : resolvedDefSlot;
        const isDirectAttack = res.type === 'DIRECT_ATTACK' || !defenderSnapshot;
        const attackerZoneId = `zone-player-${this.localPlayerId}-monster-${attackerSlot}`;
        const targetZoneId = (!isDirectAttack && finalDefSlot !== null && finalDefSlot !== undefined)
          ? `zone-player-${targetPlayerId}-monster-${finalDefSlot}`
          : `zone-player-${targetPlayerId}-hp`;

        const targetDisplayName = (!isDirectAttack && defenderSnapshot)
          ? `${defenderSnapshot.name}`
          : targetOpponent.name;

        // 1. Đối với việc Tấn Công: Chỉ đọc Đối tượng tấn công và Mục tiêu tấn công!
        audioManager.speakAttackDeclaration({
          card: attackerSnapshot,
          attackerName: player.name,
          targetName: targetDisplayName,
          isDirectAttack
        });

        // 2. Nếu có Bẫy Thiên Cơ lật lên phản đòn, trình diễn Bẫy đang kích hoạt
        if (res.trapTriggered && this.activationStage) {
          const { trap, activatorName, effectType } = res.trapTriggered;
          let trapBoardAction = null;
          if (effectType === 'REFLECT' && this.animator) {
            trapBoardAction = {
              execute: async () => {
                await this.animator.deflectAttackToThirdParty({
                  attackerZoneId,
                  defenderZoneId: targetZoneId,
                  thirdPartyZoneId: attackerZoneId,
                  cardHtml: CardComponent.renderCardHtml(attackerSnapshot)
                });
              }
            };
          } else if (effectType === 'TOLL' && this.animator) {
            trapBoardAction = {
              type: 'TOLL',
              fromZoneId: `zone-player-${this.localPlayerId}-hand`,
              toZoneId: `station-${res.trapTriggered.activatorId}`
            };
          } else if (effectType === 'STEAL' && this.animator) {
            trapBoardAction = {
              type: 'STEAL',
              fromZoneId: `zone-player-${this.localPlayerId}-hand`,
              toZoneId: `station-${res.trapTriggered.activatorId}`
            };
          }

          await this.activationStage.presentActivation({
            card: trap,
            activatorName: activatorName || 'Đối Thủ',
            category: 'TRAP',
            title: `Bẫy Lật: ${trap.name}`,
            description: ALL_96_CARDS[trap.cardId]?.description || 'Bẫy Thiên Cơ kích hoạt!',
            triggeredEffectText: res.logs[res.logs.length - 1] || '',
            icon: '🚨',
            holdDuration: 2000,
            hasTriggeredEffect: true,
            boardAction: trapBoardAction
          });
        }

        // 3. Kết quả giao tranh được thể hiện trực tiếp trên màn hình bằng hiệu ứng tấn công!
        if (this.animator) {
          await this.animator.executeCinematicAttack({
            attackerZoneId,
            targetZoneId,
            attackerCard: attackerSnapshot,
            defenderCard: isDirectAttack ? null : defenderSnapshot,
            targetPlayerName: targetOpponent.name,
            atkPower: res.atkPower ?? preAtkPower,
            defPower: res.defPower ?? preDefPower,
            damageDealt: res.damageDealt || 0,
            attackerDestroyed: Boolean(res.attackerDestroyed),
            defenderDestroyed: Boolean(res.defenderDestroyed)
          });
        }

        if (targetOpponent.hp <= 0 && targetOpponent.isGhost && this.animator) {
          await this.animator.executeCardDefeat({
            zoneId: `station-${targetPlayerId}`,
            defeatType: 'GHOST'
          });
        }

        this.showActionAnnouncement(
          '⚔️ KẾT QUẢ GIAO TRANH!',
          res.logs[res.logs.length - 1] || 'Đòn tấn công đã giáng xuống đối thủ!',
          '💥',
          2200
        );
        this.checkGameOverAchievement();
      } catch (err) {
        this.showActionAnnouncement('⚠️ KHÔNG THỂ TẤN CÔNG', err.message, '⚠️', 2400);
      }
    });
  }

  handleOpenTributeModal() {
    if (!this.state || this.isBusy()) return;
    const player = this.state.players[this.localPlayerId];
    const bossCards = player.hand.filter(c => {
      const d = ALL_96_CARDS[c.cardId] || c;
      return (c.type || d.type) === CARD_TYPES.HIGH_MONSTER;
    });
    if (bossCards.length === 0) {
      this.showActionAnnouncement('👑 CHƯA CÓ THẦN THÚ CẤP CAO', 'Bạn không có lá Đại Yêu / Thần Thú Cấp Cao nào trên tay để Hiến Tế!', '👑', 2200);
      return;
    }
    const hasFieldMonsters = player.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker);
    if (!hasFieldMonsters) {
      this.showActionAnnouncement('⚠️ CẦN NGUYÊN LIỆU HIẾN TẾ', 'Bạn cần ít nhất 1 Linh Thú trên sân của mình để làm nguyên liệu Hiến Tế!', '⚠️', 2200);
      return;
    }

    this.selectedTributeBossInstanceId = bossCards[0].instanceId;
    this.selectedTributeSlot = player.monsterSlots.findIndex(m => m !== null && !m.isGhostSlotMarker);
    this.render();
    document.getElementById('modal-tribute-summon')?.classList.add('open');
  }

  async handleExecuteTributeSummon(bossInstanceId, tributeSlotIndex) {
    if (this.isBusy()) return;
    if (!bossInstanceId) {
      this.showActionAnnouncement('👑 CHỌN THẦN THÚ', 'Vui lòng chọn 1 lá Thần Thú Cấp Cao trên tay để triệu hồi!', '👑', 2200);
      return;
    }
    document.getElementById('modal-tribute-summon')?.classList.remove('open');

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('TRIBUTE_SUMMON', { bossCardInstanceId: bossInstanceId, tributeSlotIndex });
      this.selectedHandInstanceId = null;
      return;
    }

    await this.runLockedAction(async () => {
      try {
        const player = this.state.players[this.localPlayerId];
        const bossInHand = player.hand.find(c => c.instanceId === bossInstanceId);
        const bossData = bossInHand ? (ALL_96_CARDS[bossInHand.cardId] || bossInHand) : null;
        const logCountBefore = this.state.actionLog.length;
        const evBefore = (this.state.effectEvents || []).length;

        const boss = GameEngine.tributeSummon(this.state, this.localPlayerId, bossInstanceId, tributeSlotIndex);
        this.incrementStat('bossesSummoned');
        const newLogs = this.state.actionLog.slice(logCountBefore).map(l => l.message).join(' • ');
        const newEvents = (this.state.effectEvents || []).slice(evBefore);
        const activeEv = newEvents.find(ev => ev.mode === 'ACTIVE');
        const hasTriggeredEffect = activeEv ? Boolean(activeEv.hasTriggeredEffect) : false;

        this.selectedHandInstanceId = null;
        this.inspectingCard = null;
        CardInspectorDrawer.close();

        if (this.activationStage && boss) {
          await this.activationStage.presentActivation({
            card: boss,
            activatorName: player.name,
            category: 'TRIBUTE',
            title: `Hiến Tế: ${boss.name}`,
            description: bossData?.description || 'Đại Yêu / Thần Thú giáng thế!',
            triggeredEffectText: newLogs,
            icon: '👑',
            holdDuration: 2000,
            hasTriggeredEffect,
            boardAction: {
              type: 'SUMMON',
              fromZoneId: `zone-player-${this.localPlayerId}-hand`,
              toZoneId: `zone-player-${this.localPlayerId}-monster-${tributeSlotIndex}`,
              cardHtml: CardComponent.renderCardHtml(boss)
            }
          });
        }

        const trapOrExternalPassives = newEvents.filter(ev => ev.mode === 'PASSIVE' && (['TRAP', 'GHOST'].includes(ev.category) || ev.cardId === 'CT-24'));
        await this.presentPassiveEffectNotifications(trapOrExternalPassives, boss?.cardId);

        this.showActionAnnouncement(
          '👑 HIẾN TẾ TRIỆU HỒI!',
          newLogs || `Triệu hồi Thần Thú [${boss.name}]!`,
          '👑',
          2200
        );
      } catch (err) {
        this.showActionAnnouncement('⚠️ KHÔNG THỂ HIẾN TẾ', err.message, '⚠️', 2400);
      }
    });
  }

  async handleExecuteFusion(fusionId, materialIds) {
    if (!this.state || this.isBusy()) return;
    document.getElementById('modal-fusion')?.classList.remove('open');

    if (this.isOnlineMatch && this.netClient) {
      this.netClient.sendAction('FUSION_SUMMON', { fusionCardId: fusionId, materialInstanceIds: materialIds });
      this.selectedHandInstanceId = null;
      return;
    }

    await this.runLockedAction(async () => {
      try {
        const fusionCardData = ALL_96_CARDS[fusionId];
        const player = this.state.players[this.localPlayerId];
        const logCountBefore = this.state.actionLog.length;
        const evBefore = (this.state.effectEvents || []).length;

        const newMonster = GameEngine.executeFusionSummon(this.state, this.localPlayerId, fusionId, materialIds);
        this.incrementStat('fusionsDone');
        const newLogs = this.state.actionLog.slice(logCountBefore).map(l => l.message).join(' • ');
        const newEvents = (this.state.effectEvents || []).slice(evBefore);
        const activeEv = newEvents.find(ev => ev.mode === 'ACTIVE');
        const hasTriggeredEffect = activeEv ? Boolean(activeEv.hasTriggeredEffect) : false;

        this.selectedHandInstanceId = null;
        this.inspectingCard = null;
        CardInspectorDrawer.close();

        if (this.activationStage && fusionCardData) {
          await this.activationStage.presentActivation({
            card: newMonster || fusionCardData,
            activatorName: player.name,
            category: 'FUSION',
            title: `Dung Hợp: ${fusionCardData.name}`,
            description: fusionCardData.description || 'Dung hợp sức mạnh thần thoại!',
            triggeredEffectText: newLogs,
            icon: '🌀',
            holdDuration: 2000,
            hasTriggeredEffect
          });
        }

        if (this.animator) {
          const resSlot = player.monsterSlots.findIndex(m => m && m.instanceId === newMonster.instanceId);
          await this.animator.fusionVortex({
            material1ZoneId: `zone-player-${this.localPlayerId}-hand`,
            material2ZoneId: `zone-player-${this.localPlayerId}-monster-0`,
            resultZoneId: `zone-player-${this.localPlayerId}-monster-${resSlot !== -1 ? resSlot : 0}`,
            fusionCardHtml: CardComponent.renderCardHtml(newMonster)
          });
        }

        const trapOrExternalPassives = newEvents.filter(ev => ev.mode === 'PASSIVE' && ['TRAP', 'GHOST'].includes(ev.category));
        await this.presentPassiveEffectNotifications(trapOrExternalPassives, fusionId);

        this.showActionAnnouncement(
          '🌀 DUNG HỢP HUYỀN THOẠI!',
          newLogs || `Triệu hồi [${newMonster.name}] (${newMonster.basePower} ⚔️)!`,
          '🌀',
          2200
        );
        this.checkGameOverAchievement();
      } catch (err) {
        this.showActionAnnouncement('⚠️ KHÔNG THỂ DUNG HỢP', err.message, '⚠️', 2400);
      }
    });
  }

  handleEndTurn() {
    if (this.isBusy()) return;
    try {
      const player = this.state.players[this.localPlayerId];
      const limit = player ? (player.handLimit || 6) : 6;
      if (player && player.hand.length > limit) {
        this.selectedDiscardIds = [];
        this.render();
        const discardModal = document.getElementById('modal-discard-selection');
        if (discardModal) {
          discardModal.classList.add('open');
          audioManager.playCardPlay();
          return;
        }
      }

      if (this.isOnlineMatch && this.netClient) {
        this.netClient.sendAction('END_TURN', { discardedInstanceIds: [] });
        return;
      }

      this.unlockAllActionsNow();
      const evBefore = (this.state.effectEvents || []).length;
      const dmgBefore = (this.state.damageEvents || []).length;
      GameEngine.endTurn(this.state, this.localPlayerId, []);
      const newEvents = (this.state.effectEvents || []).slice(evBefore);
      const newDamages = (this.state.damageEvents || []).slice(dmgBefore);
      audioManager.playCardPlay();
      this.selectedHandInstanceId = null;
      this.selectedDiscardIds = [];
      this.inspectingCard = null;
      CardInspectorDrawer.close();
      this.render();
      if (newDamages.length > 0) {
        this.presentDamageEvents(newDamages);
      }
      if (newEvents.length > 0) {
        const lastEv = newEvents[newEvents.length - 1];
        this.showActionAnnouncement(
          `✨ ${lastEv.title || 'HIỆU ỨNG BỊ ĐỘNG'}`,
          lastEv.resultText || lastEv.effectText,
          lastEv.icon || '✨',
          2000
        );
      }
      this.checkAndRunBotTurn();
    } catch (err) {
      this.showActionAnnouncement('⚠️ CHƯA THỂ HẾT LƯỢT', err.message, '⚠️', 2400);
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
    app.init();
    window.gameApp = app;
  });
}
