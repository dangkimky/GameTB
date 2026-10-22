import { getCardArtSvg } from '../data/cardImages.js';

/**
 * HomeLobby — Màn hình Trang Chủ, Tạo Phòng Tùy Chọn & Trung Tâm Chơi Chung Online / LAN
 * Hỗ trợ tương thích 100% trên cả Điện Thoại (Mobile Portrait & Landscape) và Máy Tính
 */
export class HomeLobby {
  static renderHomeHtml(onlineLobbyState = null) {
    const defaultWsUrl = (typeof window !== 'undefined' && window.location && window.location.host && !window.location.protocol.startsWith('file'))
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
      : 'ws://localhost:3333';

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
            🌐 CHƠI CHUNG ONLINE / LAN (MÃ PHÒNG)
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
                <div class="char-choice-card active" data-char-id="NV-01">
                  <div style="width: 44px; height: 44px;">${getCardArtSvg('NV-01')}</div>
                  <div class="char-choice-name">Sơn Tinh</div>
                </div>
                <div class="char-choice-card" data-char-id="NV-02">
                  <div style="width: 44px; height: 44px;">${getCardArtSvg('NV-02')}</div>
                  <div class="char-choice-name">Thủy Tinh</div>
                </div>
                <div class="char-choice-card" data-char-id="NV-03">
                  <div style="width: 44px; height: 44px;">${getCardArtSvg('NV-03')}</div>
                  <div class="char-choice-name">Thánh Gióng</div>
                </div>
                <div class="char-choice-card" data-char-id="NV-04">
                  <div style="width: 44px; height: 44px;">${getCardArtSvg('NV-04')}</div>
                  <div class="char-choice-name">Chử Đồng Tử</div>
                </div>
                <div class="char-choice-card" data-char-id="NV-05">
                  <div style="width: 44px; height: 44px;">${getCardArtSvg('NV-05')}</div>
                  <div class="char-choice-name">Mẫu Thượng Ngàn</div>
                </div>
                <div class="char-choice-card" data-char-id="NV-06">
                  <div style="width: 44px; height: 44px;">${getCardArtSvg('NV-06')}</div>
                  <div class="char-choice-name">Lạc Long Quân</div>
                </div>
                <div class="char-choice-card" data-char-id="NV-07">
                  <div style="width: 44px; height: 44px;">${getCardArtSvg('NV-07')}</div>
                  <div class="char-choice-name">Tổ Mẫu Âu Cơ</div>
                </div>
                <div class="char-choice-card" data-char-id="NV-08">
                  <div style="width: 44px; height: 44px;">${getCardArtSvg('NV-08')}</div>
                  <div class="char-choice-name">Cóc Kiện Trời</div>
                </div>
              </div>
            </div>

            <div class="form-group-block">
              <label class="form-label-title">👥 Số lượng người chơi</label>
              <div class="options-pills-row" id="num-players-options">
                <div class="option-pill-btn" data-num="2">2 Người</div>
                <div class="option-pill-btn" data-num="3">3 Người</div>
                <div class="option-pill-btn active" data-num="4">4 Người</div>
                <div class="option-pill-btn" data-num="5">5 Người</div>
                <div class="option-pill-btn" data-num="6">6 Người</div>
              </div>
            </div>

            <div class="form-group-block">
              <label class="form-label-title">⚔️ Chế độ thi đấu</label>
              <div class="options-pills-row" id="mode-options">
                <div class="option-pill-btn active" data-mode="team">🛡️ Đấu Phe (2v2/3v3 Máu Chung)</div>
                <div class="option-pill-btn" data-mode="ffa">💥 Đại Chiến Tự Do (FFA)</div>
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

        <!-- Modal Chơi Chung Online / LAN & Hướng Dẫn Cài Đặt Server -->
        <div id="multiplayer-online-modal" class="room-modal-overlay" style="display: ${onlineLobbyState ? 'flex' : 'none'};">
          <div class="room-modal-box" style="max-width: 680px;">
            <div class="room-modal-header">
              <div class="room-modal-title" style="color: #67e8f9;">🌐 CHƠI CHUNG ONLINE / LAN (WEBSOCKET)</div>
              <button class="inspector-close-btn" id="btn-close-multiplayer-modal">✕</button>
            </div>

            <div id="multiplayer-status-toast" style="display: none; background: rgba(239, 68, 68, 0.22); border: 1.5px solid #ef4444; color: #fecaca; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700;"></div>

            ${onlineLobbyState ? `
              <!-- Giao diện Phòng Chờ Khi Đã Tạo Hoặc Vào Phòng Online -->
              <div style="background: rgba(6, 182, 212, 0.16); border: 2px solid #06b6d4; border-radius: 12px; padding: 14px; text-align: center;">
                <div style="font-size: 12px; color: #bae6fd; font-weight: 700;">MÃ PHÒNG CỦA BẠN (GỬI MÃ NÀY CHO BẠN BÈ NHẬP VÀO):</div>
                <div style="font-family: monospace; font-size: 28px; font-weight: 900; color: #facc15; letter-spacing: 3px; margin: 6px 0;">
                  ${onlineLobbyState.roomId}
                </div>
                <div style="font-size: 12px; color: #e2e8f0;">
                  Đang chờ người chơi (${onlineLobbyState.players.length}/${onlineLobbyState.maxPlayers} người)...
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${onlineLobbyState.players.map(p => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.45); padding: 10px 14px; border-radius: 8px; border: 1px solid #334155;">
                    <div style="font-weight: 800; color: #fff;">
                      ${p.isHost ? '👑 ' : '👤 '}${p.name} <span style="color: #facc15; font-size: 11.5px;">(${p.characterId || 'NV-01'})</span>
                    </div>
                    <span style="font-size: 11px; font-weight: 800; color: ${p.isReady ? '#4ade80' : '#fbbf24'};">
                      ${p.isReady ? '✅ Sẵn Sàng' : '⏳ Đang chuẩn bị'}
                    </span>
                  </div>
                `).join('')}
              </div>

              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn-launch-game" id="btn-online-start-with-bots" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #f59e0b, #ef4444);">
                  🚀 BẮT ĐẦU TRẬN ĐẤU (LẤP ĐẦY CHỖ TRỐNG BẰNG BOT)
                </button>
                <button class="btn-launch-game" id="btn-online-start-human-only" style="flex: 1; min-width: 180px; background: linear-gradient(135deg, #10b981, #059669);">
                  👥 BẮT ĐẦU (CHỈ NGƯỜI THẬT)
                </button>
              </div>
            ` : `
              <!-- Form Tạo Phòng / Vào Phòng Online -->
              <div class="online-form-grid">
                <div class="form-group-block">
                  <label class="form-label-title">👤 Tên hiển thị của bạn</label>
                  <input type="text" id="input-online-player-name" class="form-input-text" value="Thủ Lĩnh Lạc Việt" maxlength="20" />
                </div>
                <div class="form-group-block">
                  <label class="form-label-title">🌐 Địa chỉ Máy chủ (WebSocket)</label>
                  <input type="text" id="input-online-ws-url" class="form-input-text" value="${defaultWsUrl}" />
                </div>
              </div>

              <div class="online-actions-grid" style="background: rgba(0,0,0,0.35); padding: 14px; border-radius: 10px; border: 1px solid rgba(6, 182, 212, 0.35);">
                <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
                  <div>
                    <div style="font-weight: 900; font-size: 13.5px; color: #facc15; margin-bottom: 4px;">1️⃣ CHỦ PHÒNG TẠO PHÒNG MỚI</div>
                    <div style="font-size: 11.5px; color: #cbd5e1; line-height: 1.4;">Tạo phòng mới để nhận Mã Phòng (VD: <b>XOM-8A2F</b>) gửi cho bạn bè cùng vào trên điện thoại / máy tính.</div>
                  </div>
                  <button class="btn-launch-game" id="btn-online-create-room" style="font-size: 13px; padding: 11px;">
                    ➕ TẠO PHÒNG ONLINE MỚI
                  </button>
                </div>

                <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
                  <div>
                    <div style="font-weight: 900; font-size: 13.5px; color: #67e8f9; margin-bottom: 4px;">2️⃣ BẠN BÈ NHẬP MÃ VÀO PHÒNG</div>
                    <input type="text" id="input-online-room-code" class="form-input-text" placeholder="Nhập mã: VD XOM-8A2F" style="width: 100%; text-transform: uppercase; font-weight: 800; letter-spacing: 1px;" />
                  </div>
                  <button class="btn-launch-game" id="btn-online-join-room" style="background: linear-gradient(135deg, #06b6d4, #0284c7); font-size: 13px; padding: 11px;">
                    🔑 VÀO PHÒNG THEO MÃ
                  </button>
                </div>
              </div>
            `}

            <!-- Khung Hướng Dẫn Chi Tiết Cách Đưa Game Lên Mạng & Chơi Chung -->
            <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(250, 204, 21, 0.35); border-radius: 10px; padding: 12px 14px; font-size: 12px; line-height: 1.55; color: #e2e8f0;">
              <div style="font-weight: 900; color: #facc15; font-size: 13px; margin-bottom: 6px;">
                📋 HƯỚNG DẪN ĐƯA GAME LÊN MẠNG & CHƠI CHUNG VỚI BẠN BÈ:
              </div>
              <p><b>• Cách 1 — Chơi chung trên Điện Thoại qua Wi-Fi / LAN:</b> Giải nén gói code, mở Terminal chạy <code>npm install</code> rồi <code>npm start</code>. Server sẽ hiện địa chỉ LAN (VD: <code>http://192.168.1.15:3333</code>). Mọi người cùng Wi-Fi mở link đó trên trình duyệt điện thoại / laptop để tạo & nhập Mã Phòng chơi chung!</p>
              <p style="margin-top: 5px;"><b>• Cách 2 — Mở phòng chơi Online qua Internet tức thì từ máy bạn:</b> Khi đang chạy <code>npm start</code>, mở thêm 1 cửa sổ Terminal và chạy <code>npx cloudflared tunnel --url http://localhost:3333</code> (hoặc <code>ngrok http 3333</code>). Gửi đường link <code>https://....trycloudflare.com</code> cho bạn bè ở bất cứ đâu cùng vào chơi!</p>
              <p style="margin-top: 5px;"><b>• Cách 3 — Đưa lên Cloud miễn phí 24/7 (Render.com / Railway.app):</b> Đẩy thư mục giải nén lên GitHub, tạo Web Service trên Render/Railway với Build Command <code>npm install</code> và Start Command <code>npm start</code>.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
