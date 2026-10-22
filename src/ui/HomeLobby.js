import { getCardArtSvg } from '../data/cardImages.js';

export const CHARACTER_META = [
  { id: 'NV-01', name: 'Sơn Tinh', title: 'Tản Viên Sơn Thánh', skillHint: '👁️ Soi bẫy đối thủ' },
  { id: 'NV-02', name: 'Thủy Tinh', title: 'Chúa Tể Biển Khơi', skillHint: '🌊 Rút bài khi dùng Phép' },
  { id: 'NV-03', name: 'Thánh Gióng', title: 'Phù Đổng Thiên Vương', skillHint: '🛡️ Giảm sát thương trực diện' },
  { id: 'NV-04', name: 'Chử Đồng Tử', title: 'Tiên Ông Đầm Dạ Trạch', skillHint: '🏰 Úp tối đa 3 Bẫy Thiên Cơ' },
  { id: 'NV-05', name: 'Mẫu Thượng Ngàn', title: 'Chúa Sơn Lâm', skillHint: '🍃 Giữ tối đa 7 lá trên tay' },
  { id: 'NV-06', name: 'Lạc Long Quân', title: 'Long Vương Đất Việt', skillHint: '🤝 Nhận cống phẩm giao hảo' },
  { id: 'NV-07', name: 'Tổ Mẫu Âu Cơ', title: 'Bọc Trăm Trứng', skillHint: '🥚 Hồi sinh Linh Thú cấp thấp' },
  { id: 'NV-08', name: 'Cóc Kiện Trời', title: 'Cậu Ông Trời', skillHint: '⚡ Thêm lượt Triệu Hồi & Bốc bài' }
];

/**
 * HomeLobby — Màn hình Trang Chủ, Tạo Phòng Tùy Chọn & Trung Tâm Chơi Chung Online / LAN
 * Hỗ trợ tương thích 100% trên cả Điện Thoại (Mobile Portrait & Landscape) và Máy Tính
 */
export class HomeLobby {
  static renderHomeHtml(onlineLobbyState = null, options = {}) {
    const {
      roomList = [],
      selectedCharId = 'NV-01',
      isPublicRoom = true,
      numPlayers = 4,
      isTeamMode = false,
      localPlayerId = null,
      playerName = 'Thủ Lĩnh Lạc Việt',
      wsUrl = null,
      isModalOpen = false
    } = options;

    const defaultWsUrl = (typeof window !== 'undefined' && window.location && window.location.host && !window.location.protocol.startsWith('file'))
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
      : 'ws://localhost:3333';

    const currentWsUrl = wsUrl || defaultWsUrl;

    // Bản đồ người chơi đang giữ Thẻ Đại Diện trong phòng
    const takenCharsMap = {};
    if (onlineLobbyState && onlineLobbyState.players) {
      for (const p of onlineLobbyState.players) {
        if (p.characterId) {
          takenCharsMap[p.characterId] = {
            id: p.id,
            name: p.name,
            isMe: localPlayerId ? p.id === localPlayerId : p.isHost
          };
        }
      }
    }

    const localPlayer = onlineLobbyState && onlineLobbyState.players
      ? onlineLobbyState.players.find(p => localPlayerId ? p.id === localPlayerId : p.isHost)
      : null;

    return `
      <div class="home-lobby-root">
        <div class="lobby-backdrop-fx"></div>

        <!-- Header & Logo -->
        <div class="lobby-header">
          <div class="lobby-logo-title">ĐẠI CHIẾN THẦN THOẠI VIỆT</div>
          <div class="lobby-tagline">Chiến Thuật Thẻ Bài Linh Thú, Sự Tích & Thần Thoại Dân Gian Việt Nam (120 Mã Thẻ • 184 Lá Bài)</div>
        </div>

        <!-- 3 Thẻ Đại Diện Hero Showcase 3D -->
        <div class="lobby-hero-showcase">
          <div class="hero-card-preview" title="NV-01: Sơn Tinh — Thần Núi Tản Viên">
            ${getCardArtSvg('NV-01')}
          </div>
          <div class="hero-card-preview" title="NV-03: Thánh Gióng — Phù Đổng Thiên Vương">
            ${getCardArtSvg('NV-03')}
          </div>
          <div class="hero-card-preview" title="NV-06: Lạc Long Quân — Huyết Thống Rồng Tiên">
            ${getCardArtSvg('NV-06')}
          </div>
        </div>

        <!-- Nhóm Nút Hành Động Trang Chủ -->
        <div class="lobby-menu-group">
          <button class="lobby-main-btn btn-quick-play" id="btn-quick-play">
            ⚡ CHƠI NHANH VỚI BOT (4 NGƯỜI)
          </button>
          <button class="lobby-main-btn btn-create-room" id="btn-open-create-room">
            🏠 TÙY CHỌN TẠO PHÒNG & CHIA PHE
          </button>
          <button class="lobby-main-btn" id="btn-open-multiplayer-modal" style="background: linear-gradient(135deg, #06b6d4, #0284c7); color: #fff; border-color: #bae6fd;">
            🌐 CHƠI CHUNG ONLINE / LAN (DANH SÁCH PHÒNG)
          </button>
          <div style="display: flex; gap: 10px; width: 100%; flex-wrap: wrap;">
            <button class="lobby-main-btn btn-view-cards" id="btn-open-compendium" style="flex: 1; min-width: 145px; font-size: 13px; padding: 12px 12px;">
              📖 SỔ TAY 120 LÁ BÀI
            </button>
            <button class="lobby-main-btn btn-view-cards" id="btn-open-achievements" style="flex: 1; min-width: 145px; font-size: 13px; padding: 12px 12px; border-color: rgba(250, 204, 21, 0.5); color: #fef08a;">
              🏆 THÀNH TỰU THẦN THOẠI
            </button>
          </div>
        </div>

        <!-- Footer Info -->
        <div style="font-size: 11px; color: var(--text-dim); text-align: center; margin-top: 10px; position: relative; z-index: 2;">
          Đại Chiến Thần Thoại & Linh Thú Việt v4.5 • Chuẩn Giao Diện Điện Thoại & Máy Tính • Chơi Chung Online / LAN
        </div>

        <!-- Modal Tùy Chọn Tạo Phòng (Offline / Bot / Chia Phe) -->
        <div id="room-settings-modal" class="room-modal-overlay" style="display: none;">
          <div class="room-modal-box">
            <div class="room-modal-header">
              <div class="room-modal-title">🏠 TÙY CHỌN TẠO PHÒNG</div>
              <button class="inspector-close-btn" id="btn-close-room-modal">✕</button>
            </div>

            <div class="form-group-block">
              <label class="form-label-title">👤 Tên của bạn</label>
              <input type="text" id="input-player-name" class="form-input-text" value="Bạn (Thủ Lĩnh)" maxlength="20" />
            </div>

            <div class="form-group-block">
              <label class="form-label-title">👑 Chọn Thẻ Đại Diện Thần Thoại (8 Nhân Vật)</label>
              <div class="character-select-grid">
                ${CHARACTER_META.map(char => `
                  <div class="char-choice-card ${char.id === selectedCharId ? 'active' : ''}" data-char-id="${char.id}">
                    <div style="width: 44px; height: 44px;">${getCardArtSvg(char.id)}</div>
                    <div class="char-choice-name">${char.name}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="form-group-block">
              <label class="form-label-title">👥 Số lượng người chơi</label>
              <div class="options-pills-row" id="num-players-options">
                <div class="option-pill-btn ${numPlayers === 2 ? 'active' : ''}" data-num="2">2 Người</div>
                <div class="option-pill-btn ${numPlayers === 3 ? 'active' : ''}" data-num="3">3 Người</div>
                <div class="option-pill-btn ${numPlayers === 4 ? 'active' : ''}" data-num="4">4 Người</div>
                <div class="option-pill-btn ${numPlayers === 5 ? 'active' : ''}" data-num="5">5 Người</div>
                <div class="option-pill-btn ${numPlayers === 6 ? 'active' : ''}" data-num="6">6 Người</div>
              </div>
            </div>

            <div class="form-group-block">
              <label class="form-label-title">⚔️ Chế độ thi đấu</label>
              <div class="options-pills-row" id="mode-options">
                <div class="option-pill-btn ${isTeamMode ? 'active' : ''}" data-mode="team">🛡️ Đấu Phe (2v2/3v3 Máu Chung)</div>
                <div class="option-pill-btn ${!isTeamMode ? 'active' : ''}" data-mode="ffa">💥 Đại Chiến Tự Do (FFA)</div>
              </div>
            </div>

            <div class="form-group-block" style="flex-direction: row; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: var(--radius-sm);">
              <div>
                <div style="font-size: 13px; font-weight: 800; color: #fef08a;">🤖 Lấp đầy bằng Bot AI Thần Thoại</div>
                <div style="font-size: 11px; color: var(--text-muted);">Bot biết Gọi Bầy, Cộng Hưởng Hệ, Dung Hợp & Phối hợp đồng đội</div>
              </div>
              <input type="checkbox" id="check-fill-bots" checked style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--accent-neon); flex-shrink: 0;" />
            </div>

            <button class="btn-launch-game" id="btn-start-custom-game">
              🚀 VÀO ĐẤU TRƯỜNG NGAY
            </button>
          </div>
        </div>

        <!-- Modal Chơi Chung Online / LAN, Danh Sách Phòng & Phòng Chờ -->
        <div id="multiplayer-online-modal" class="room-modal-overlay" style="display: ${onlineLobbyState || isModalOpen ? 'flex' : 'none'};">
          <div class="room-modal-box" style="max-width: 780px;">
            <div class="room-modal-header">
              <div class="room-modal-title" style="color: #67e8f9;">🌐 CHƠI CHUNG ONLINE / LAN (WEBSOCKET)</div>
              <button class="inspector-close-btn" id="btn-close-multiplayer-modal" title="Đóng modal">✕</button>
            </div>

            <div id="multiplayer-status-toast" style="display: none; background: rgba(239, 68, 68, 0.22); border: 1.5px solid #ef4444; color: #fecaca; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700;"></div>

            ${onlineLobbyState ? `
              <!-- ======================================================== -->
              <!-- GIAO DIỆN PHÒNG CHỜ (KHI ĐÃ TẠO HOẶC VÀO PHÒNG ONLINE) -->
              <!-- ======================================================== -->
              <div style="background: rgba(6, 182, 212, 0.16); border: 2px solid #06b6d4; border-radius: 12px; padding: 14px; text-align: center;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 12px; color: #bae6fd; font-weight: 700;">MÃ PHÒNG CỦA BẠN:</span>
                  <span style="font-family: monospace; font-size: 26px; font-weight: 900; color: #facc15; letter-spacing: 3px; background: rgba(0,0,0,0.5); padding: 2px 12px; border-radius: 6px; border: 1px dashed #facc15;">
                    ${onlineLobbyState.roomId}
                  </span>
                  <span class="badge-mode ${onlineLobbyState.isPublic ? 'badge-players-count' : 'badge-mode-ffa'}">
                    ${onlineLobbyState.isPublic ? '🌐 Công Cộng' : '🔒 Riêng Tư'}
                  </span>
                  <span class="badge-mode ${onlineLobbyState.isTeamMode ? 'badge-mode-team' : 'badge-mode-ffa'}">
                    ${onlineLobbyState.isTeamMode ? '🛡️ Đấu Phe' : '💥 Tự Do (FFA)'}
                  </span>
                </div>
                <div style="font-size: 12px; color: #e2e8f0; margin-top: 6px;">
                  Đang chờ người chơi (${onlineLobbyState.players.length}/${onlineLobbyState.maxPlayers} người) • Gửi mã phòng cho bạn bè cùng vào!
                </div>
              </div>

              <!-- Danh sách người chơi trong phòng -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="font-size: 12.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">👥 Danh sách thành viên trong phòng:</div>
                ${onlineLobbyState.players.map(p => {
                  const charInfo = CHARACTER_META.find(c => c.id === p.characterId) || { name: p.characterId || 'Sơn Tinh' };
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.45); padding: 10px 14px; border-radius: 8px; border: 1px solid #334155;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px;">${getCardArtSvg(p.characterId || 'NV-01')}</div>
                        <div>
                          <div style="font-weight: 800; color: #fff;">
                            ${p.isHost ? '👑 ' : '👤 '}${p.name}
                            ${(localPlayerId && p.id === localPlayerId) ? '<span style="color: #38bdf8; font-size: 11px;">(Bạn)</span>' : ''}
                          </div>
                          <div style="font-size: 11px; color: #facc15;">
                            ${charInfo.name} • ${charInfo.skillHint || ''}
                          </div>
                        </div>
                      </div>
                      <span style="font-size: 11px; font-weight: 800; color: ${p.isReady ? '#4ade80' : '#fbbf24'}; background: rgba(0,0,0,0.4); padding: 4px 8px; border-radius: 6px;">
                        ${p.isReady ? '✅ Sẵn Sàng' : '⏳ Đang Chuẩn Bị'}
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Khu vực Đổi Thẻ Đại Diện Trực Tiếp Trong Phòng Chờ -->
              <div class="form-group-block" style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label-title" style="margin: 0; color: #fef08a;">
                    👑 ĐỔI THẺ ĐẠI DIỆN CỦA BẠN (Không trùng với người chơi khác):
                  </label>
                  <span style="font-size: 11px; color: #94a3b8;">Bấm vào thẻ trống để đổi ngay</span>
                </div>
                <div class="character-select-grid">
                  ${CHARACTER_META.map(char => {
                    const holder = takenCharsMap[char.id];
                    let cardClass = 'char-choice-card room-char-pick free';
                    let badgeHtml = '<span class="char-choice-badge badge-char-free">⚡ Chọn Thẻ Này</span>';

                    if (holder) {
                      if (holder.isMe) {
                        cardClass = 'char-choice-card room-char-pick mine';
                        badgeHtml = '<span class="char-choice-badge badge-char-mine">👑 Bạn Đang Chọn</span>';
                      } else {
                        cardClass = 'char-choice-card room-char-pick taken';
                        badgeHtml = `<span class="char-choice-badge badge-char-taken" title="Đã có người chọn">🔒 ${holder.name}</span>`;
                      }
                    }

                    return `
                      <div class="${cardClass}" data-char-id="${char.id}" title="${char.name} — ${char.title}">
                        <div style="width: 40px; height: 40px;">${getCardArtSvg(char.id)}</div>
                        <div class="char-choice-name">${char.name}</div>
                        ${badgeHtml}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Hàng nút hành động phòng chờ & NÚT THOÁT RA -->
              <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px;">
                ${localPlayer && localPlayer.isHost ? `
                  <button class="btn-launch-game" id="btn-online-start-with-bots" style="flex: 2; min-width: 200px; background: linear-gradient(135deg, #f59e0b, #ef4444); font-size: 13.5px; padding: 12px;">
                    🚀 BẮT ĐẦU TRẬN ĐẤU (LẤP ĐẦY BOT)
                  </button>
                  <button class="btn-launch-game" id="btn-online-start-human-only" style="flex: 1.5; min-width: 170px; background: linear-gradient(135deg, #10b981, #059669); font-size: 13.5px; padding: 12px;">
                    👥 CHỈ NGƯỜI THẬT
                  </button>
                ` : `
                  <button class="btn-launch-game" id="btn-online-toggle-ready" style="flex: 2; min-width: 180px; background: linear-gradient(135deg, #10b981, #059669); font-size: 14px; padding: 12px;">
                    ${localPlayer && localPlayer.isReady ? '⏳ HỦY SẴN SÀNG' : '✅ SẴN SÀNG GIAO CHIẾN'}
                  </button>
                `}
                <button class="btn-leave-room" id="btn-online-leave-room" style="flex: 1; min-width: 150px;">
                  🚪 RỜI PHÒNG / THOÁT RA
                </button>
              </div>
            ` : `
              <!-- ======================================================== -->
              <!-- GIAO DIỆN CHỌN TÊN, THẺ ĐẠI DIỆN & DANH SÁCH PHÒNG LIVE -->
              <!-- ======================================================== -->

              <!-- Thông tin người chơi & Chọn Thẻ Đại Diện -->
              <div class="online-form-grid">
                <div class="form-group-block">
                  <label class="form-label-title">👤 Tên hiển thị của bạn</label>
                  <input type="text" id="input-online-player-name" class="form-input-text" value="${playerName || 'Thủ Lĩnh Lạc Việt'}" maxlength="20" placeholder="Nhập tên của bạn" />
                </div>
                <div class="form-group-block">
                  <label class="form-label-title">🌐 Địa chỉ Máy chủ (WebSocket)</label>
                  <input type="text" id="input-online-ws-url" class="form-input-text" value="${currentWsUrl}" placeholder="ws://localhost:3333" />
                </div>
              </div>

              <!-- CHỌN THẺ ĐẠI DIỆN THẦN THOẠI TRƯỚC KHI VÀO / TẠO PHÒNG -->
              <div class="form-group-block" style="background: rgba(0,0,0,0.3); padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(6, 182, 212, 0.25);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label class="form-label-title" style="margin: 0; color: #fef08a;">
                    👑 Chọn Thẻ Đại Diện Của Bạn (8 Thần Thoại Việt):
                  </label>
                  <span style="font-size: 11px; color: #38bdf8;">Thẻ đã chọn sẽ được dùng khi tạo / vào phòng</span>
                </div>
                <div class="character-select-grid" id="online-character-select-grid">
                  ${CHARACTER_META.map(char => `
                    <div class="char-choice-card online-char-pick ${char.id === selectedCharId ? 'active' : ''}" data-char-id="${char.id}" title="${char.name} — ${char.title}">
                      <div style="width: 40px; height: 40px;">${getCardArtSvg(char.id)}</div>
                      <div class="char-choice-name">${char.name}</div>
                      <div style="font-size: 9.5px; color: #94a3b8; text-align: center;">${char.skillHint}</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- 2 Cột: TẠO PHÒNG / NHẬP MÃ (BÊN TRÁI) & DANH SÁCH PHÒNG CÔNG CỘNG (BÊN PHẢI) -->
              <div class="online-actions-grid">
                <!-- Cột Trái: Tạo Phòng Mới hoặc Nhập Mã Riêng Tư -->
                <div style="display: flex; flex-direction: column; gap: 12px; background: rgba(0,0,0,0.35); padding: 12px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1);">
                  <div>
                    <div style="font-weight: 900; font-size: 13.5px; color: #facc15; margin-bottom: 4px;">
                      ➕ 1. TẠO PHÒNG MỚI
                    </div>
                    
                    <!-- Chế độ phòng: Công Cộng vs Riêng Tư -->
                    <div style="margin-top: 6px;">
                      <div style="font-size: 11px; color: #cbd5e1; font-weight: 700; margin-bottom: 3px;">Loại phòng:</div>
                      <div class="options-pills-row" id="online-room-type-options">
                        <div class="option-pill-btn ${isPublicRoom ? 'active' : ''}" data-room-type="public">
                          🌐 Công Cộng (Hiện trên danh sách)
                        </div>
                        <div class="option-pill-btn ${!isPublicRoom ? 'active' : ''}" data-room-type="private">
                          🔒 Riêng Tư (Chỉ vào bằng Mã)
                        </div>
                      </div>
                    </div>

                    <!-- Số người chơi -->
                    <div style="margin-top: 6px;">
                      <div style="font-size: 11px; color: #cbd5e1; font-weight: 700; margin-bottom: 3px;">Số lượng người:</div>
                      <div class="options-pills-row" id="online-num-players-options">
                        <div class="option-pill-btn ${numPlayers === 2 ? 'active' : ''}" data-num="2">2 Người</div>
                        <div class="option-pill-btn ${numPlayers === 3 ? 'active' : ''}" data-num="3">3 Người</div>
                        <div class="option-pill-btn ${numPlayers === 4 ? 'active' : ''}" data-num="4">4 Người</div>
                        <div class="option-pill-btn ${numPlayers === 6 ? 'active' : ''}" data-num="6">6 Người</div>
                      </div>
                    </div>

                    <!-- Chế độ thi đấu -->
                    <div style="margin-top: 6px;">
                      <div style="font-size: 11px; color: #cbd5e1; font-weight: 700; margin-bottom: 3px;">Thể thức:</div>
                      <div class="options-pills-row" id="online-mode-options">
                        <div class="option-pill-btn ${isTeamMode ? 'active' : ''}" data-mode="team">🛡️ Đấu Phe (Máu Chung)</div>
                        <div class="option-pill-btn ${!isTeamMode ? 'active' : ''}" data-mode="ffa">💥 Tự Do (FFA)</div>
                      </div>
                    </div>

                    <button class="btn-launch-game" id="btn-online-create-room" style="font-size: 13px; padding: 11px; width: 100%; margin-top: 8px;">
                      ➕ TẠO PHÒNG ONLINE MỚI
                    </button>
                  </div>

                  <!-- Nhập Mã Vào Phòng Riêng Tư -->
                  <div style="border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 10px;">
                    <div style="font-weight: 900; font-size: 13px; color: #67e8f9; margin-bottom: 4px;">
                      🔑 2. NHẬP MÃ PHÒNG RIÊNG TƯ
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <input type="text" id="input-online-room-code" class="form-input-text" placeholder="Mã: XOM-8A2F" style="flex: 1; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; font-size: 12.5px;" />
                      <button class="btn-launch-game" id="btn-online-join-room" style="background: linear-gradient(135deg, #06b6d4, #0284c7); font-size: 12.5px; padding: 8px 14px; white-space: nowrap;">
                        VÀO THEO MÃ
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Cột Phải: Danh Sách Phòng Công Cộng Đang Chờ (LIVE) -->
                <div class="online-rooms-section">
                  <div class="online-rooms-header">
                    <div class="online-rooms-title">
                      📋 PHÒNG CÔNG CỘNG (${roomList.length})
                    </div>
                    <button class="btn-refresh-rooms" id="btn-refresh-rooms">
                      🔄 Làm Mới
                    </button>
                  </div>

                  <div class="online-rooms-list" id="online-public-rooms-container">
                    ${roomList.length === 0 ? `
                      <div class="room-empty-notice">
                        Không có phòng công cộng nào đang chờ.<br>
                        👉 Hãy bấm <b>"Tạo Phòng Online Mới"</b> bên cạnh để mở phòng đầu tiên!
                      </div>
                    ` : `
                      ${roomList.map(r => `
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
                      `).join('')}
                    `}
                  </div>
                </div>
              </div>
            `}

            <!-- Khung Hướng Dẫn Chi Tiết Cách Đưa Game Lên Mạng & Chơi Chung -->
            <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(250, 204, 21, 0.35); border-radius: 10px; padding: 10px 14px; font-size: 11.5px; line-height: 1.5; color: #e2e8f0;">
              <div style="font-weight: 900; color: #facc15; font-size: 12.5px; margin-bottom: 4px;">
                📋 HƯỚNG DẪN CHƠI CHUNG ONLINE & LAN:
              </div>
              <p><b>• Cùng Wi-Fi / LAN:</b> Mở Terminal chạy <code>npm start</code>, trình duyệt điện thoại/máy tính mở link LAN (VD: <code>http://192.168.1.15:3333</code>) để thấy phòng và vào chơi trực tiếp 1-click!</p>
              <p style="margin-top: 3px;"><b>• Qua Internet tức thì:</b> Chạy thêm lệnh <code>npx cloudflared tunnel --url http://localhost:3333</code> để lấy link công khai gửi cho bạn bè ở bất cứ đâu.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
