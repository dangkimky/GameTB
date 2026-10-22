import { ALL_96_CARDS, CARD_TYPES, TRIBES } from '../data/cards.js';
import { CardComponent } from './CardComponent.js';
import { FusionSystem } from '../core/FusionSystem.js';
import { BattleResolver } from '../core/BattleResolver.js';

/**
 * ModalPanels — Quản lý các hộp thoại bật lên xem Bãi Rác, Chồng Bài Huyền Thoại (12 lá),
 * Lật Mở Xem Bài Đối Thủ (#modal-revealed-cards), Chọn Mục Tiêu Trang Bị Đạo Cụ,
 * Chọn Mục Tiêu Tấn Công, Hiến Tế, Sổ Tay 120 Lá Bài, Kỹ Năng Chủ Động, Xả Rác & Nhật Ký
 */
export class ModalPanels {
  static renderGraveyardModal(graveyardCards = []) {
    return `
      <div class="modal-overlay-panel" id="modal-graveyard">
        <div class="modal-content-box">
          <div class="modal-header-row">
            <div class="modal-title-text">🗑️ BÃI RÁC / LINH ĐÀN (${graveyardCards.length} LÁ)</div>
            <button class="modal-close-btn" data-close-modal="modal-graveyard">✕</button>
          </div>
          <div class="modal-cards-grid">
            ${graveyardCards.length > 0 ? graveyardCards.map(c => CardComponent.renderCardHtml(c)).join('') : '<p style="color: var(--text-dim); text-align: center; grid-column: 1 / -1;">Linh Đàn (Bãi Rác) hiện đang trống, chưa có lá bài nào lui về!</p>'}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Hộp thoại Lật Mở Xem Bài Của Người Chơi Khác (#modal-revealed-cards)
   * Phục vụ CT-01 (Chim Lạc Báo Tin), DH-01 (Thiên Nhãn Thuận Phong Nhĩ), DR-09 (Chiếu Chỉ Thiên Đình),
   * NV-01 (Sơn Tinh Nhãn Thông), TR-09 (Hồ Tinh Chín Đuôi), DR-07 (Hồn Trương Ba)...
   */
  static renderRevealedCardsModal(revealedView = null) {
    const view = revealedView || {
      title: '👁️ LẬT MỞ XEM BÀI ĐỐI THỦ',
      subtitle: 'Các lá bài được yêu cầu xem đã lật ngửa hoàn toàn:',
      cards: []
    };
    const cards = Array.isArray(view.cards) ? view.cards : [];

    return `
      <div class="modal-overlay-panel" id="modal-revealed-cards">
        <div class="modal-content-box" style="max-width: 880px; border-color: #06b6d4; box-shadow: 0 0 40px rgba(6, 182, 212, 0.55);">
          <div class="modal-header-row" style="border-bottom-color: rgba(6, 182, 212, 0.35);">
            <div>
              <div class="modal-title-text" style="color: #67e8f9;">${view.title || '👁️ LẬT MỞ XEM BÀI ĐỐI THỦ'}</div>
              <div style="font-size: 12.5px; color: #e0f2fe; margin-top: 3px; font-weight: 600;">
                ${view.subtitle || 'Các lá bài được yêu cầu xem đã lật ngửa hoàn toàn cho bạn kiểm tra:'}
              </div>
            </div>
            <button class="modal-close-btn" data-close-modal="modal-revealed-cards">✕</button>
          </div>

          ${cards.length === 0 ? `
            <div style="padding: 28px; text-align: center; color: #94a3b8; font-size: 13.5px; background: rgba(0,0,0,0.35); border-radius: 10px;">
              Đối thủ hiện không có lá bài nào trong vùng được soi!
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(215px, 1fr)); gap: 16px; max-height: 62vh; overflow-y: auto; padding: 8px 4px;">
              ${cards.map(c => {
                const cid = c.cardId || c.id || '';
                const cData = ALL_96_CARDS[cid] || c;
                const desc = c.description || cData.description || cData.aliveAbility || '';
                const isCaptured = Boolean(c.isCaptured);
                return `
                  <div class="revealed-card-showcase-item"
                       data-revealed-card-id="${cid}"
                       style="display: flex; flex-direction: column; align-items: center; gap: 8px; background: rgba(15, 23, 42, 0.9); border: 2px solid ${isCaptured ? '#facc15' : '#06b6d4'}; border-radius: 12px; padding: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.65); position: relative;">
                    ${isCaptured ? `
                      <div style="position: absolute; top: -10px; right: 10px; background: #facc15; color: #0f172a; font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 999px; border: 1.5px solid #fff; z-index: 20;">
                        ⚡ ĐÃ THU PHỤC VỀ TAY BẠN
                      </div>
                    ` : `
                      <div style="position: absolute; top: -10px; left: 10px; background: #0284c7; color: #fff; font-size: 9.5px; font-weight: 900; padding: 2px 8px; border-radius: 999px; border: 1px solid #bae6fd; z-index: 20;">
                        👁️ ĐÃ LẬT NGỬA
                      </div>
                    `}
                    ${CardComponent.renderCardHtml(c, { faceDown: false })}
                    <div style="width: 100%; text-align: left; background: rgba(0,0,0,0.45); padding: 8px 10px; border-radius: 8px; border-left: 3px solid ${isCaptured ? '#facc15' : '#38bdf8'};">
                      <div style="font-weight: 800; font-size: 12.5px; color: #fef08a; margin-bottom: 3px;">
                        ${cData.name || c.name} <span style="font-family: monospace; font-size: 10.5px; color: #94a3b8;">(${cid})</span>
                      </div>
                      <div style="font-size: 11.5px; color: #e2e8f0; line-height: 1.4;">
                        ${desc}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}

          <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11.5px; color: #67e8f9;">
              💡 Các lá bài này cũng đang được lật ngửa trực tiếp trên khu vực của đối thủ ngoài bàn đấu!
            </span>
            <button class="action-btn" data-close-modal="modal-revealed-cards" style="background: linear-gradient(135deg, #06b6d4, #0284c7); color: #fff; padding: 8px 20px;">
              ✅ Đã Xem Xong
            </button>
          </div>
        </div>
      </div>
    `;
  }

  static renderFusionModal(fusionCards = [], state = null, localPlayerId = 'p1') {
    return `
      <div class="modal-overlay-panel" id="modal-fusion">
        <div class="modal-content-box" style="max-width: 960px;">
          <div class="modal-header-row">
            <div class="modal-title-text">🌀 CHỒNG BÀI THẦN THÚ DUNG HỢP (${fusionCards.length} LÁ)</div>
            <button class="modal-close-btn" data-close-modal="modal-fusion">✕</button>
          </div>
          <div class="modal-cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;">
            ${fusionCards.map(c => {
              const cardId = c.cardId || c.id;
              const recipe = FusionSystem.getRecipeDescription(cardId);
              let materials = null;
              if (state && localPlayerId) {
                materials = FusionSystem.findAvailableFusionMaterials(state, localPlayerId, cardId);
              }
              const canFuse = Boolean(materials && materials.length === 2);

              return `
                <div class="fusion-card-slot-box" style="display: flex; flex-direction: column; align-items: center; gap: 8px; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; border: 1px solid rgba(217, 70, 239, 0.4);">
                  ${CardComponent.renderCardHtml(c)}
                  <div style="font-size: 11px; color: #facc15; text-align: center; font-weight: 600; line-height: 1.3;">
                    📜 ${recipe}
                  </div>
                  ${canFuse ? `
                    <button class="btn-fuse-summon"
                            data-fusion-id="${cardId}"
                            data-materials="${materials.join(',')}"
                            style="background: linear-gradient(135deg, #d946ef, #8b5cf6); color: #fff; font-weight: 800; font-size: 12px; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; box-shadow: 0 0 12px #d946ef; animation: pulseSelection 1.5s infinite alternate;">
                      🌀 DUNG HỢP NGAY!
                    </button>
                  ` : `
                    <span style="font-size: 11px; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px;">
                      🔒 Chưa đủ nguyên liệu
                    </span>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  static renderLogModal(actionLogs = []) {
    return `
      <div class="modal-overlay-panel" id="modal-log">
        <div class="modal-content-box" style="max-width: 600px;">
          <div class="modal-header-row">
            <div class="modal-title-text">📜 NHẬT KÝ ĐẠI CHIẾN</div>
            <button class="modal-close-btn" data-close-modal="modal-log">✕</button>
          </div>
          <div style="overflow-y: auto; max-height: 400px; display: flex; flex-direction: column; gap: 8px; padding-right: 8px;">
            ${actionLogs.map(log => `
              <div style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--accent-warm); font-size: 12px;">
                <span style="color: var(--accent-neon); font-weight: 700;">[Lượt ${log.turn || 1}]</span>
                <span style="color: var(--text-main); margin-left: 6px;">${log.message}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  static renderCompendiumModal(filterState = {}, isLazyPlaceholder = false) {
    if (isLazyPlaceholder) {
      return `<div class="modal-overlay-panel" id="modal-compendium"></div>`;
    }
    const activeType = filterState.type || 'ALL';
    const activeTribe = filterState.tribe || 'ALL';
    const searchQuery = (filterState.query || '').trim().toLowerCase();

    const allCards = Object.values(ALL_96_CARDS);
    const filteredCards = allCards.filter(c => {
      if (activeType !== 'ALL' && c.type !== activeType) return false;
      if (activeTribe !== 'ALL' && c.tribe !== activeTribe) return false;
      if (searchQuery) {
        const haystack = `${c.id} ${c.name} ${c.description || ''} ${c.aliveAbility || ''} ${c.ghostAbility || ''}`.toLowerCase();
        if (!haystack.includes(searchQuery)) return false;
      }
      return true;
    });

    const typeButtons = [
      { id: 'ALL', label: `Tất Cả (${allCards.length})` },
      { id: CARD_TYPES.CHARACTER, label: '👑 Đại Diện (8)' },
      { id: CARD_TYPES.LOW_MONSTER, label: '🐾 Linh Thú (32)' },
      { id: CARD_TYPES.HIGH_MONSTER, label: '🐉 Thần Thú (16)' },
      { id: CARD_TYPES.FUSION_MONSTER, label: '🌀 Dung Hợp (12)' },
      { id: CARD_TYPES.EQUIPMENT, label: '🛡️ Pháp Bảo (14)' },
      { id: CARD_TYPES.DRAMA, label: '📜 Sự Tích (16)' },
      { id: CARD_TYPES.TRAP, label: '⚠️ Bẫy (16)' },
      { id: CARD_TYPES.CURSE, label: '👻 Ám Quẻ (6)' }
    ];

    const tribeButtons = [
      { id: 'ALL', label: 'Mọi Hệ' },
      { id: TRIBES.HONG_HOT, label: '🦅 Linh Giác' },
      { id: TRIBES.QUAY_PHA, label: '🐅 Dũng Mãnh' },
      { id: TRIBES.TOC_DO, label: '🐎 Thần Tốc' },
      { id: TRIBES.AN_VA, label: '🐢 Huyền Bí' }
    ];

    return `
      <div class="modal-overlay-panel" id="modal-compendium">
        <div class="modal-content-box" style="max-width: 95vw; width: 1120px; max-height: 88vh;">
          <div class="modal-header-row">
            <div class="modal-title-text">📖 SỔ TAY 120 LÁ BÀI THẦN THOẠI & SỰ TÍCH VIỆT NAM (${filteredCards.length}/${allCards.length} LÁ)</div>
            <button class="modal-close-btn" data-close-modal="modal-compendium">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px 12px; background: rgba(0,0,0,0.35); border-radius: 8px; margin-bottom: 8px;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <input type="text"
                     id="compendium-search-input"
                     placeholder="🔍 Tìm tên thẻ, mã thẻ (VD: CT-01, Chim Lạc, Sơn Tinh, Chằn Tinh, Nỏ Thần)..."
                     value="${filterState.query || ''}"
                     style="flex: 1; min-width: 220px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(250, 204, 21, 0.4); border-radius: 6px; padding: 7px 12px; color: #fff; font-size: 12px;" />
              <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${tribeButtons.map(tb => `
                  <button class="compendium-tribe-btn"
                          data-compendium-tribe="${tb.id}"
                          style="padding: 5px 10px; font-size: 11px; font-weight: 800; border-radius: 6px; cursor: pointer; border: 1px solid ${activeTribe === tb.id ? '#facc15' : '#475569'}; background: ${activeTribe === tb.id ? '#f59e0b' : 'rgba(30,41,59,0.8)'}; color: ${activeTribe === tb.id ? '#000' : '#cbd5e1'};">
                    ${tb.label}
                  </button>
                `).join('')}
              </div>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${typeButtons.map(btn => `
                <button class="compendium-filter-btn"
                        data-compendium-type="${btn.id}"
                        style="padding: 5px 10px; font-size: 11px; font-weight: 800; border-radius: 6px; cursor: pointer; border: 1px solid ${activeType === btn.id ? '#facc15' : 'rgba(255,255,255,0.15)'}; background: ${activeType === btn.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(0,0,0,0.4)'}; color: ${activeType === btn.id ? '#000' : '#e2e8f0'};">
                  ${btn.label}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="overflow-y: auto; max-height: 60vh; padding: 12px;">
            <div class="modal-cards-grid" id="compendium-cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 14px;">
              ${filteredCards.length > 0
                ? filteredCards.map(c => CardComponent.renderCardHtml({ cardId: c.id, ...c })).join('')
                : '<p style="color: var(--text-dim); text-align: center; grid-column: 1 / -1; padding: 24px;">Không tìm thấy lá bài nào khớp với bộ lọc hiện tại.</p>'
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static renderRulesModal() {
    return `
      <div class="modal-overlay-panel" id="modal-rules">
        <div class="modal-content-box" style="max-width: 740px;">
          <div class="modal-header-row">
            <div class="modal-title-text">📖 LUẬT CHƠI ĐẠI CHIẾN THẦN THOẠI & LINH THÚ VIỆT NAM</div>
            <button class="modal-close-btn" data-close-modal="modal-rules">✕</button>
          </div>
          <div style="overflow-y: auto; max-height: 500px; display: flex; flex-direction: column; gap: 12px; font-size: 13px; line-height: 1.6; color: var(--text-main); padding-right: 8px;">
            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border-left: 3px solid var(--accent-neon);">
              <h4 style="color: var(--accent-neon); margin-bottom: 4px;">🎯 MỤC TIÊU VÁN ĐẤU</h4>
              <p>Mỗi người khởi đầu với 10 Điểm Nhân Phẩm / Linh Lực (HP). Người cuối cùng còn trụ vững (hoặc phe đồng đội còn HP) sẽ giành ngôi vị <b>Bá Chủ Thần Thoại Việt</b>!</p>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border-left: 3px solid #f97316;">
              <h4 style="color: #fb923c; margin-bottom: 4px;">🐾 CƠ CHẾ MỚI: TRIỆU HỒI GỌI BẦY & CỘNG HƯỞNG HỆ</h4>
              <p><b>• Triệu Hồi Gọi Bầy (Swarm Summon):</b> Ngoài lượt Triệu hồi thường mỗi vòng, bạn được phép <b>Gọi Bầy thêm 1 Linh Thú nữa lên sân</b> nếu trên sân bạn đã có 1 Linh Thú đồng minh hoặc khi dùng các Linh Thú có kỹ năng Gọi Bầy (CT-25 đến CT-32, Ông Đổng TR-14)!</p>
              <p><b>• Cộng Hưởng Linh Thú Cùng Hệ:</b> Khi triệu hồi 1 Linh Thú lên sân mà ô bên cạnh đã có sẵn đồng minh cùng Hệ (Linh Giác, Dũng Mãnh, Thần Tốc, Huyền Bí), Linh Thú mới ra sân được <b>+1 Độ Chiến</b> ngay lập tức!</p>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border-left: 3px solid var(--accent-warm);">
              <h4 style="color: var(--accent-warm); margin-bottom: 4px;">🔄 4 GIAI ĐOẠN TRONG LƯỢT</h4>
              <p><b>1. Hóng Hớt (DRAW):</b> Bốc 1 lá bài từ Bộ Bài Chính đầu mỗi lượt.</p>
              <p><b>2. Bày Trò (MAIN):</b> Triệu hồi thường + Triệu hồi Gọi Bầy; Hiến Tế gọi Đại Yêu/Thần Thú; Úp Bẫy Thiên Cơ; Chọn mục tiêu gắn Pháp Bảo Đạo Cụ; Dung Hợp Huyền Thoại (12 Thần Thú); Phát động Kỹ năng Sân/Đại Diện.</p>
              <p><b>3. Hỗn Chiến (BATTLE):</b> Chỉ định Linh Thú tấn công đối thủ (Lượt 1 áp dụng Hiệp Ước Hòa Bình). Sát thương tính bằng chênh lệch Độ Chiến. Đánh trực diện giới hạn tối đa 3 sát thương.</p>
              <p><b>4. Xả Rác (END):</b> Bỏ bớt bài nếu vượt quá giới hạn trên tay (Mặc định 6 lá, Mẫu Thượng Ngàn NV-05 giữ 7 lá).</p>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border-left: 3px solid #14b8a6;">
              <h4 style="color: #14b8a6; margin-bottom: 4px;">👻 CƠ CHẾ ANH LINH (HỒN MA BÁO OÁN)</h4>
              <p>Khi HP về 0, bạn hóa thành <b>Anh Linh Báo Oán</b>! Mỗi đầu lượt được kích hoạt Kỹ năng Anh Linh của Thẻ Đại Diện và rút 1 lá Bài Ám Quẻ để xoay chuyển cục diện bàn cờ.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Hộp thoại Chọn Mục Tiêu Cho Bài Đạo Cụ / Pháp Bảo
   */
  static renderEquipTargetModal(state, localPlayerId, selectedEquipInstanceId = null) {
    if (!state) return '';
    const localPlayer = state.players[localPlayerId];
    if (!localPlayer) return '';

    const equipCards = localPlayer.hand.filter(c => {
      const d = ALL_96_CARDS[c.cardId] || c;
      return (c.type || d.type) === CARD_TYPES.EQUIPMENT;
    });

    if (equipCards.length === 0) {
      return `
        <div class="modal-overlay-panel" id="modal-equip-target">
          <div class="modal-content-box" style="max-width: 520px; text-align: center;">
            <div class="modal-header-row">
              <div class="modal-title-text">🛡️ CHỌN MỤC TIÊU TRANG BỊ ĐẠO CỤ</div>
              <button class="modal-close-btn" data-close-modal="modal-equip-target">✕</button>
            </div>
            <p style="color: var(--text-dim); margin: 20px 0;">Bạn hiện không có lá Bài Đạo Cụ / Pháp Bảo nào trên tay để gắn!</p>
            <button class="action-btn" data-close-modal="modal-equip-target">Đóng</button>
          </div>
        </div>
      `;
    }

    const chosenEquip = equipCards.find(c => c.instanceId === selectedEquipInstanceId) || equipCards[0];
    const equipData = ALL_96_CARDS[chosenEquip.cardId] || chosenEquip;
    const isEnemyTarget = equipData.target === 'ENEMY';
    const powerDelta = equipData.powerBonus || 0;

    const candidatePlayers = Object.values(state.players).filter(p => {
      if (p.isGhost) return false;
      if (isEnemyTarget) {
        if (p.id === localPlayerId) return false;
        if (state.isTeamMode && p.teamId && p.teamId === localPlayer.teamId) return false;
        return p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker);
      } else {
        if (p.id === localPlayerId) return p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker);
        if (state.isTeamMode && p.teamId && p.teamId === localPlayer.teamId) {
          return p.monsterSlots.some(m => m !== null && !m.isGhostSlotMarker);
        }
        return false;
      }
    });

    return `
      <div class="modal-overlay-panel" id="modal-equip-target">
        <div class="modal-content-box" style="max-width: 740px;">
          <div class="modal-header-row">
            <div class="modal-title-text">🛡️ TRANG BỊ ĐẠO CỤ — CHỌN LÁ BÀI & MỤC TIÊU</div>
            <button class="modal-close-btn" data-close-modal="modal-equip-target">✕</button>
          </div>

          <div style="margin-bottom: 14px; background: rgba(0,0,0,0.35); padding: 12px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.35);">
            <div style="font-size: 11px; font-weight: 800; color: #34d399; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
              1. CHỌN LÁ BÀI ĐẠO CỤ / PHÁP BẢO TRÊN TAY (${equipCards.length} LÁ):
            </div>
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;">
              ${equipCards.map(eq => {
                const eqD = ALL_96_CARDS[eq.cardId] || eq;
                const isSelected = eq.instanceId === chosenEquip.instanceId;
                const targetTag = eqD.target === 'ENEMY' ? '🎯 Gắn Đối Thủ' : '🛡️ Gắn Phe Mình';
                const tagColor = eqD.target === 'ENEMY' ? '#ef4444' : '#10b981';
                return `
                  <button class="btn-select-equip-card ${isSelected ? 'active-equip' : ''}"
                          data-equip-instance-id="${eq.instanceId}"
                          style="flex: 1; min-width: 200px; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px 12px; border-radius: 8px; border: 2px solid ${isSelected ? '#10b981' : '#475569'}; background: ${isSelected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(0,0,0,0.45)'}; color: #fff; cursor: pointer; text-align: left;">
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; gap: 6px;">
                      <span style="font-weight: 800; font-size: 12.5px; color: ${isSelected ? '#6ee7b7' : '#f1f5f9'};">${eqD.name || eq.name}</span>
                      <span style="font-size: 9.5px; font-weight: 800; background: ${tagColor}; color: #fff; padding: 2px 6px; border-radius: 999px; white-space: nowrap;">${targetTag}</span>
                    </div>
                    <div style="font-size: 11px; color: #cbd5e1; line-height: 1.35;">${eqD.description || ''}</div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.35); padding: 12px; border-radius: 8px; border: 1px solid ${isEnemyTarget ? 'rgba(239, 68, 68, 0.4)' : 'rgba(52, 211, 153, 0.4)'};">
            <div style="font-size: 11px; font-weight: 800; color: ${isEnemyTarget ? '#f87171' : '#6ee7b7'}; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">
              2. CHỌN LINH THÚ MỤC TIÊU ${isEnemyTarget ? 'CỦA ĐỐI THỦ ĐỂ GẮN BÙA CHẾ NGỰ' : 'TRÊN SÂN ĐỂ TRANG BỊ'}:
            </div>

            ${candidatePlayers.length === 0 ? `
              <div style="padding: 18px; text-align: center; color: #94a3b8; font-size: 12.5px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                ⚠️ Hiện chưa có Linh Thú hợp lệ nào trên sân ${isEnemyTarget ? 'của đối thủ' : 'của bạn'} để gắn <b>${equipData.name}</b>!
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${candidatePlayers.map(p => {
                  const monsters = p.monsterSlots
                    .map((m, idx) => ({ monster: m, slot: idx }))
                    .filter(item => item.monster !== null && !item.monster.isGhostSlotMarker);

                  return `
                    <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid #334155; border-radius: 8px; padding: 10px 14px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="font-weight: 800; font-size: 13px; color: #f8fafc;">
                          ${p.id === localPlayerId ? `👑 SÂN CỦA BẠN (${p.name})` : `🎯 ${p.name}`}
                        </div>
                        <div style="font-size: 11.5px; font-weight: 800; color: #f87171;">♥ ${p.hp} HP</div>
                      </div>
                      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${monsters.map(({ monster, slot }) => {
                          const curPwr = BattleResolver.calculateMonsterPower(state, p.id, slot);
                          const nextPwr = Math.max(0, curPwr + powerDelta);
                          const eqList = monster.equippedItems || [];
                          const isFull = eqList.length >= 2;
                          const pwrText = powerDelta !== 0
                            ? `${curPwr} ➔ ${nextPwr} ⚔️`
                            : `${curPwr} ⚔️`;

                          return `
                            <button class="btn-execute-equip-target"
                                    data-equip-instance-id="${chosenEquip.instanceId}"
                                    data-target-player="${p.id}"
                                    data-target-slot="${slot}"
                                    ${isFull ? 'disabled' : ''}
                                    style="flex: 1; min-width: 220px; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; border: 1.5px solid ${isFull ? '#475569' : (isEnemyTarget ? '#ef4444' : '#10b981')}; background: ${isFull ? 'rgba(30,41,59,0.5)' : (isEnemyTarget ? 'linear-gradient(135deg, rgba(220,38,38,0.28), rgba(153,27,27,0.45))' : 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.45))')}; color: #fff; cursor: ${isFull ? 'not-allowed' : 'pointer'}; opacity: ${isFull ? '0.5' : '1'}; text-align: left;">
                              <div>
                                <div style="font-weight: 800; font-size: 12.5px; color: #fef08a;">
                                  Ô ${slot + 1}: ${monster.name}
                                </div>
                                <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
                                  🛡️ Đang mang: ${eqList.length}/2 Đạo Cụ ${isFull ? '(Đã đầy)' : '— Bấm để gắn ngay!'}
                                </div>
                              </div>
                              <span style="font-size: 13px; font-weight: 900; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 6px; color: ${powerDelta > 0 ? '#4ade80' : (powerDelta < 0 ? '#f87171' : '#fbbf24')}; white-space: nowrap;">
                                ${pwrText}
                              </span>
                            </button>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  static renderBattleTargetModal(state, localPlayerId, selectedAttackerSlot = 0) {
    if (!state) return '';
    const localPlayer = state.players[localPlayerId];
    if (!localPlayer) return '';

    const myMonsters = localPlayer.monsterSlots
      .map((m, idx) => ({ monster: m, slot: idx }))
      .filter(item => item.monster !== null && !item.monster.isGhostSlotMarker);

    if (myMonsters.length === 0) {
      return `
        <div class="modal-overlay-panel" id="modal-battle-target">
          <div class="modal-content-box" style="max-width: 500px; text-align: center;">
            <div class="modal-header-row">
              <div class="modal-title-text">⚠️ KHÔNG THỂ TẤN CÔNG</div>
              <button class="modal-close-btn" data-close-modal="modal-battle-target">✕</button>
            </div>
            <p style="color: var(--text-dim); margin: 20px 0;">Bạn không có Linh Thú nào trên sân để tuyên bố tấn công!</p>
            <button class="action-btn" data-close-modal="modal-battle-target">Đóng</button>
          </div>
        </div>
      `;
    }

    const attackerSlot = (myMonsters.some(m => m.slot === selectedAttackerSlot))
      ? selectedAttackerSlot
      : myMonsters[0].slot;

    const calcPreviewAttackPower = (slot, targetCardType = null) => {
      const m = localPlayer.monsterSlots[slot];
      if (!m) return 0;
      const baseCalc = BattleResolver.calculateMonsterPower(state, localPlayerId, slot, {
        isAttacking: true,
        targetCardType
      });
      const hasDC04 = (m.equippedItems || []).some(it => it.cardId === 'DC-04');
      const hasBarkBuffAlready = (m.statusEffects || []).some(e => e.name === 'CT02_BARK_BUFF');
      if (m.cardId === 'CT-02' && !hasDC04 && !hasBarkBuffAlready) {
        return baseCalc + 2;
      }
      return baseCalc;
    };

    const attackerPower = calcPreviewAttackPower(attackerSlot);

    const validOpponents = Object.values(state.players).filter(p => {
      if (p.id === localPlayerId || p.isGhost) return false;
      if (state.isTeamMode && p.teamId === localPlayer.teamId) return false;
      return true;
    });

    return `
      <div class="modal-overlay-panel" id="modal-battle-target">
        <div class="modal-content-box" style="max-width: 720px;">
          <div class="modal-header-row">
            <div class="modal-title-text">⚔️ TUYÊN BỐ GIAO TRANH - CHỌN MỤC TIÊU</div>
            <button class="modal-close-btn" data-close-modal="modal-battle-target">✕</button>
          </div>

          <div style="margin-bottom: 16px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border: 1px solid rgba(250, 204, 21, 0.3);">
            <div style="font-size: 11px; font-weight: 800; color: #facc15; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
              1. LINH THÚ CỦA BẠN XUẤT KÍCH:
            </div>
            <div style="display: flex; gap: 12px;">
              ${myMonsters.map(item => {
                const isSelected = item.slot === attackerSlot;
                const pwr = calcPreviewAttackPower(item.slot);
                return `
                  <button class="btn-select-attacker ${isSelected ? 'active-attacker' : ''}"
                          data-attacker-slot="${item.slot}"
                          style="flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; border: 2px solid ${isSelected ? '#facc15' : '#475569'}; background: ${isSelected ? 'rgba(250, 204, 21, 0.15)' : 'rgba(0,0,0,0.4)'}; color: #fff; cursor: pointer;">
                    <div style="text-align: left;">
                      <div style="font-weight: 800; font-size: 13px; color: ${isSelected ? '#facc15' : '#f1f5f9'};">Ô ${item.slot + 1}: ${item.monster.name}</div>
                      <div style="font-size: 11px; color: #94a3b8;">${item.monster.equippedItems?.length ? `🛡️ ${item.monster.equippedItems.length} Pháp Bảo` : 'Chưa gắn Pháp Bảo'}${item.monster.cardId === 'CT-02' && !(item.monster.equippedItems || []).some(it => it.cardId === 'DC-04') ? ' • 🐕 +2 ⚔️ Tiếng Sủa Trấn Yểm' : ''}</div>
                    </div>
                    <div style="font-size: 16px; font-weight: 900; color: #f87171; background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 6px;">
                      ${pwr} ⚔️
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
            <div style="font-size: 11px; font-weight: 800; color: #f87171; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">
              2. CHỌN MỤC TIÊU TẤN CÔNG:
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${validOpponents.map(opp => {
                const oppMonsters = opp.monsterSlots
                  .map((m, idx) => ({ monster: m, slot: idx }))
                  .filter(item => item.monster !== null && !item.monster.isGhostSlotMarker);

                const hasMonsters = oppMonsters.length > 0;
                const directDmg = Math.min(3, attackerPower);

                return `
                  <div style="background: rgba(0,0,0,0.4); border: 1px solid #334155; border-radius: 8px; padding: 10px 14px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 18px;">🎯</span>
                        <span style="font-weight: 800; font-size: 13px; color: #e2e8f0;">${opp.name}</span>
                        ${state.isTeamMode && opp.teamId ? `
                          <span style="font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 4px; background: ${opp.teamId === 'TEAM_A' ? '#ef4444' : '#3b82f6'}; color: #fff;">
                            ${opp.teamId === 'TEAM_A' ? 'PHE ĐỎ' : 'PHE XANH'}
                          </span>
                        ` : ''}
                      </div>
                      <div style="color: #f87171; font-weight: 800; font-size: 12px;">
                        ♥ ${opp.hp} HP
                      </div>
                    </div>

                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                      ${hasMonsters ? oppMonsters.map(item => {
                        const defType = ALL_96_CARDS[item.monster.cardId]?.type || item.monster.type;
                        const vsPower = calcPreviewAttackPower(attackerSlot, defType);
                        const defPower = BattleResolver.calculateMonsterPower(state, opp.id, item.slot, { isDefending: true });
                        const diff = vsPower - defPower;
                        let outcomeText = diff > 0 ? `(Thắng +${diff} dmg)` : (diff === 0 ? '(Cả 2 cùng tử trận)' : `(Thua mất ${Math.abs(diff)} HP)`);
                        let outcomeColor = diff > 0 ? '#4ade80' : (diff === 0 ? '#fbbf24' : '#f87171');

                        return `
                          <button class="btn-execute-strike"
                                  data-attacker-slot="${attackerSlot}"
                                  data-target-player="${opp.id}"
                                  data-target-slot="${item.slot}"
                                  style="flex: 1; min-width: 220px; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 6px; border: 1px solid #dc2626; background: linear-gradient(135deg, rgba(220, 38, 38, 0.25), rgba(153, 27, 27, 0.4)); color: #fff; cursor: pointer; text-align: left;">
                            <div>
                              <div style="font-weight: 700; font-size: 12px;">⚔️ Đánh [${item.monster.name}]</div>
                              <div style="font-size: 10px; color: ${outcomeColor}; font-weight: 600;">${outcomeText}</div>
                            </div>
                            <span style="font-size: 13px; font-weight: 900; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; color: #fbbf24;">
                              ${defPower} ⚔️
                            </span>
                          </button>
                        `;
                      }).join('') : `
                        <button class="btn-execute-strike direct-strike"
                                data-attacker-slot="${attackerSlot}"
                                data-target-player="${opp.id}"
                                data-target-slot="null"
                                style="flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 6px; border: 2px solid #ef4444; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; cursor: pointer; box-shadow: 0 0 12px rgba(239, 68, 68, 0.5);">
                          <div style="font-weight: 800; font-size: 13px;">
                            💥 ĐÁNH TRỰC DIỆN (Sân đối thủ đang trống!)
                          </div>
                          <div style="font-weight: 900; font-size: 13px; background: rgba(0,0,0,0.4); padding: 3px 8px; border-radius: 4px;">
                            -${directDmg} HP
                          </div>
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static renderTributeModal(state, localPlayerId) {
    if (!state) return '';
    const localPlayer = state.players[localPlayerId];
    if (!localPlayer) return '';

    const bossCards = localPlayer.hand.filter(c => {
      const d = ALL_96_CARDS[c.cardId] || c;
      return (c.type || d.type) === CARD_TYPES.HIGH_MONSTER;
    });

    const fieldMonsters = localPlayer.monsterSlots
      .map((m, idx) => ({ monster: m, slot: idx }))
      .filter(item => item.monster !== null && !item.monster.isGhostSlotMarker);

    return `
      <div class="modal-overlay-panel" id="modal-tribute-summon">
        <div class="modal-content-box" style="max-width: 650px;">
          <div class="modal-header-row">
            <div class="modal-title-text">👑 HIẾN TẾ TRIỆU HỒI ĐẠI YÊU & THẦN THÚ</div>
            <button class="modal-close-btn" data-close-modal="modal-tribute-summon">✕</button>
          </div>

          ${bossCards.length === 0 ? `
            <p style="color: var(--text-dim); text-align: center; margin: 24px 0;">
              Bạn không có lá Đại Yêu / Thần Thú (Cấp Cao) nào trên tay!
            </p>
          ` : fieldMonsters.length === 0 ? `
            <p style="color: var(--text-dim); text-align: center; margin: 24px 0;">
              Bạn cần ít nhất 1 Linh Thú trên sân của mình để làm nguyên liệu Hiến Tế!
            </p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
                <div style="font-size: 11px; font-weight: 800; color: #facc15; margin-bottom: 8px;">
                  1. CHỌN THẦN THÚ CẤP CAO TRÊN TAY MUỐN TRIỆU HỒI:
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">
                  ${bossCards.map((b, bIdx) => `
                    <div class="tribute-boss-pick ${bIdx === 0 ? 'selected' : ''}" data-boss-instance-id="${b.instanceId}" style="cursor: pointer; border: 2px solid ${bIdx === 0 ? '#facc15' : 'transparent'}; border-radius: 8px; padding: 4px; background: rgba(0,0,0,0.4);">
                      ${CardComponent.renderCardHtml(b)}
                    </div>
                  `).join('')}
                </div>
              </div>

              <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
                <div style="font-size: 11px; font-weight: 800; color: #ef4444; margin-bottom: 8px;">
                  2. CHỌN LINH THÚ TRÊN SÂN ĐỂ HIẾN TẾ:
                </div>
                <div style="display: flex; gap: 10px;">
                  ${fieldMonsters.map((fm, fmIdx) => `
                    <button class="tribute-slot-pick ${fmIdx === 0 ? 'selected' : ''}" data-tribute-slot="${fm.slot}" style="flex: 1; padding: 10px; border-radius: 6px; border: 2px solid ${fmIdx === 0 ? '#ef4444' : '#475569'}; background: ${fmIdx === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.4)'}; color: #fff; cursor: pointer; text-align: left;">
                      <div style="font-weight: 800; font-size: 12px;">Ô ${fm.slot + 1}: ${fm.monster.name}</div>
                      <div style="font-size: 11px; color: #94a3b8;">${fm.monster.basePower || fm.monster.power} ⚔️</div>
                    </button>
                  `).join('')}
                </div>
              </div>

              <button id="btn-confirm-tribute-summon"
                      style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 900; font-size: 14px; border: none; border-radius: 8px; padding: 12px; cursor: pointer; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); text-transform: uppercase;">
                👑 HIẾN TẾ TRIỆU HỒI NGAY!
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  static renderActiveSkillsModal(state, localPlayerId) {
    if (!state) return '';
    const player = state.players[localPlayerId];
    if (!player) return '';

    const charData = ALL_96_CARDS[player.characterId] || {};
    const canUseCharSkill = !player.isGhost && !player.hasUsedAliveSkillThisTurn && ['NV-01', 'NV-06', 'NV-07', 'NV-08'].includes(player.characterId);

    const activeFieldMonsters = player.monsterSlots
      .map((m, idx) => ({ monster: m, slot: idx }))
      .filter(({ monster }) => monster && !monster.isGhostSlotMarker && ['CT-13', 'TR-09', 'DH-08'].includes(monster.cardId));

    const activeMindTraps = player.trapSlots
      .map((t, idx) => ({ trap: t, slot: idx }))
      .filter(({ trap }) => trap && !trap.faceUp && trap.setTurnNumber < state.turnNumber && ['NQ-03', 'NQ-11'].includes(trap.cardId));

    return `
      <div class="modal-overlay-panel" id="modal-active-skills">
        <div class="modal-content-box" style="max-width: 680px;">
          <div class="modal-header-row">
            <div class="modal-title-text">⚡ TRUNG TÂM THẦN LỰC CHỦ ĐỘNG & BẪY TÂM LÝ</div>
            <button class="modal-close-btn" data-close-modal="modal-active-skills">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(236, 72, 153, 0.4); border-radius: 8px; padding: 12px 14px;">
              <div style="font-size: 11px; font-weight: 800; color: #f472b6; text-transform: uppercase; margin-bottom: 6px;">
                👑 KỸ NĂNG ĐẠI DIỆN THẦN THOẠI (${charData.name || player.characterId})
              </div>
              <div style="font-size: 12px; color: #e2e8f0; margin-bottom: 10px;">
                ${charData.aliveAbility || ''}
              </div>
              ${canUseCharSkill ? `
                <button class="btn-activate-char-skill"
                        style="background: linear-gradient(135deg, #ec4899, #be185d); color: #fff; font-weight: 800; font-size: 12px; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer;">
                  ⚡ KÍCH HOẠT KỸ NĂNG ĐẠI DIỆN NGAY
                </button>
              ` : `
                <span style="font-size: 11px; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 4px;">
                  ${player.hasUsedAliveSkillThisTurn ? '✅ Đã sử dụng trong lượt này' : '✨ Nội tại tự động kích hoạt khi đủ điều kiện'}
                </span>
              `}
            </div>

            <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(250, 204, 21, 0.4); border-radius: 8px; padding: 12px 14px;">
              <div style="font-size: 11px; font-weight: 800; color: #facc15; text-transform: uppercase; margin-bottom: 8px;">
                ⚔️ TUYỆT KỸ LINH THÚ TRÊN SÂN (CT-13 Quạ Thần / TR-09 Hồ Tinh / DH-08 Thạch Sanh)
              </div>
              ${activeFieldMonsters.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${activeFieldMonsters.map(({ monster, slot }) => {
                    const alreadyUsed = (player.usedFieldSkillInstanceIds || []).includes(monster.instanceId);
                    const mData = ALL_96_CARDS[monster.cardId] || monster;
                    return `
                      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(15,23,42,0.8); padding: 10px 12px; border-radius: 6px; border: 1px solid #334155;">
                        <div style="padding-right: 12px;">
                          <div style="font-weight: 800; font-size: 13px; color: #fef08a;">Ô ${slot + 1}: ${monster.name}</div>
                          <div style="font-size: 11px; color: #cbd5e1;">${mData.description || ''}</div>
                        </div>
                        ${alreadyUsed ? `
                          <span style="font-size: 11px; color: #94a3b8; white-space: nowrap;">Đã dùng lượt này</span>
                        ` : `
                          <button class="btn-activate-field-skill"
                                  data-skill-slot="${slot}"
                                  style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 900; font-size: 11.5px; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; white-space: nowrap;">
                            ⚡ PHÁT ĐỘNG CHIÊU
                          </button>
                        `}
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div style="font-size: 12px; color: #94a3b8; font-style: italic;">
                  Hiện chưa có Linh Thú mang kỹ năng kích hoạt chủ động (CT-13, TR-09, DH-08) trên sân.
                </div>
              `}
            </div>

            <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 8px; padding: 12px 14px;">
              <div style="font-size: 11px; font-weight: 800; color: #c084fc; text-transform: uppercase; margin-bottom: 8px;">
                ⚠️ LẬT BẪY TÂM LÝ (NQ-03 Mắt Thần Chử Đồng Tử / NQ-11 Nghiệp Báo Nhãn Tiền)
              </div>
              ${activeMindTraps.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${activeMindTraps.map(({ trap, slot }) => {
                    const tData = ALL_96_CARDS[trap.cardId] || trap;
                    return `
                      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(15,23,42,0.8); padding: 10px 12px; border-radius: 6px; border: 1px solid #6d28d9;">
                        <div style="padding-right: 12px;">
                          <div style="font-weight: 800; font-size: 13px; color: #e9d5ff;">Ô Bẫy ${slot + 1}: ${trap.name}</div>
                          <div style="font-size: 11px; color: #cbd5e1;">${tData.description || ''}</div>
                        </div>
                        <button class="btn-activate-mind-trap"
                                data-trap-slot="${slot}"
                                style="background: linear-gradient(135deg, #a855f7, #7e22ce); color: #fff; font-weight: 900; font-size: 11.5px; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; white-space: nowrap;">
                          🚨 LẬT BẪY PHẠT NGAY!
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div style="font-size: 12px; color: #94a3b8; font-style: italic;">
                  Chưa có Bẫy Tâm Lý (NQ-03, NQ-11) nào đã úp qua 1 lượt sẵn sàng kích hoạt.
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static renderGameOverModal(state, localPlayerId) {
    if (!state || state.gameStatus !== 'ENDED') return '';
    const players = Object.values(state.players);
    const localPlayer = state.players[localPlayerId] || players[0];

    const isWinner = state.isTeamMode
      ? (state.winnerTeamId && localPlayer.teamId === state.winnerTeamId)
      : (state.winnerId === localPlayer.id);

    const bannerTitle = isWinner
      ? '🏆 CHÚC MỪNG! BẠN ĐÃ XƯNG BÁ ĐẤU TRƯỜNG THẦN THOẠI!'
      : '👻 HẾT LINH LỰC! HẸN TÁI ĐẤU PHỤC THÙ VÁN SAU!';
    const bannerColor = isWinner ? '#facc15' : '#14b8a6';

    const sortedPlayers = [...players].sort((a, b) => {
      if (a.isGhost !== b.isGhost) return a.isGhost ? 1 : -1;
      return b.hp - a.hp;
    });

    return `
      <div class="modal-overlay-panel open" id="modal-game-over" style="z-index: 9500;">
        <div class="modal-content-box" style="max-width: 680px; border: 3px solid ${bannerColor}; box-shadow: 0 0 40px ${bannerColor}55;">
          <div style="text-align: center; padding: 10px 0 16px; border-bottom: 2px solid rgba(255,255,255,0.12);">
            <div style="font-size: 44px; margin-bottom: 6px;">${isWinner ? '👑🎉🏆' : '👻🕯️⚡'}</div>
            <div style="font-family: var(--font-display); font-size: 28px; color: ${bannerColor}; letter-spacing: 1px;">
              ${bannerTitle}
            </div>
            <div style="font-size: 13px; color: #cbd5e1; margin-top: 4px;">
              Trận đại chiến khép lại sau <b>${state.turnNumber} lượt đấu</b> • <b>${state.graveyard.length} lá bài</b> đã vào Bãi Rác
            </div>
          </div>

          <div style="margin: 16px 0; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 11px; font-weight: 800; color: #facc15; text-transform: uppercase;">
              📊 BẢNG PHONG THẦN ĐẠI CHIẾN:
            </div>
            ${sortedPlayers.map((p, idx) => {
              const charData = ALL_96_CARDS[p.characterId] || {};
              const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : '🎗️'));
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; background: ${p.id === localPlayer.id ? 'rgba(250, 204, 21, 0.15)' : 'rgba(0,0,0,0.4)'}; border: 1px solid ${p.id === localPlayer.id ? '#facc15' : '#334155'}; border-radius: 8px; padding: 10px 14px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">${medal}</span>
                    <div>
                      <div style="font-weight: 800; font-size: 13.5px; color: #fff;">
                        ${p.name} <span style="font-size: 11px; color: #94a3b8;">(${charData.name || p.characterId})</span>
                      </div>
                      <div style="font-size: 11px; color: ${p.isGhost ? '#2dd4bf' : '#4ade80'}; font-weight: 700;">
                        ${p.isGhost ? '👻 Anh Linh Báo Oán' : '👑 Trụ Vững Cuối Cùng'}
                      </div>
                    </div>
                  </div>
                  <div style="font-weight: 900; font-size: 15px; color: ${p.hp > 0 ? '#f87171' : '#94a3b8'};">
                    ♥ ${p.hp} HP
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 12px;">
            <button id="btn-rematch-game"
                    style="flex: 1; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #fff; font-weight: 900; font-size: 14px; border: none; border-radius: 8px; padding: 12px 18px; cursor: pointer; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.5);">
              🔄 TÁI ĐẤU VÁN MỚI NGAY
            </button>
            <button id="btn-gameover-home"
                    style="background: rgba(51, 65, 85, 0.9); color: #e2e8f0; font-weight: 800; font-size: 13px; border: 1px solid #64748b; border-radius: 8px; padding: 12px 18px; cursor: pointer;">
              🏠 VỀ TRANG CHỦ
            </button>
          </div>
        </div>
      </div>
    `;
  }

  static renderAchievementsModal(stats = {}, isLazyPlaceholder = false) {
    if (isLazyPlaceholder) {
      return `<div class="modal-overlay-panel" id="modal-achievements"></div>`;
    }
    const gamesPlayed = stats.gamesPlayed || 0;
    const gamesWon = stats.gamesWon || 0;
    const fusionsDone = stats.fusionsDone || 0;
    const trapsTriggered = stats.trapsTriggered || 0;
    const bossesSummoned = stats.bossesSummoned || 0;

    const badges = [
      { icon: '🐉', title: 'Truyền Nhân Lạc Hồng', desc: 'Tham gia trận đại chiến đầu tiên tại Đấu Trường Thần Thoại', unlocked: gamesPlayed >= 1 },
      { icon: '👑', title: 'Bá Chủ Bách Linh', desc: 'Giành chiến thắng chung cuộc trong 1 ván đấu', unlocked: gamesWon >= 1 },
      { icon: '🌀', title: 'Bậc Thầy Hợp Thể Tứ Linh', desc: 'Triệu hồi thành công Thần Thú Huyền Thoại Dung Hợp', unlocked: fusionsDone >= 1 },
      { icon: '🚨', title: 'Thiên Cơ Bất Khả Lộ', desc: 'Lật Bẫy Thiên Cơ phản đòn đối thủ thành công', unlocked: trapsTriggered >= 1 },
      { icon: '🪓', title: 'Hàng Phục Đại Yêu', desc: 'Hiến tế triệu hồi Đại Yêu / Thần Thú Cấp Cao lên sân', unlocked: bossesSummoned >= 1 },
      { icon: '🔥', title: 'Thần Thoại Bất Bại', desc: 'Chiến thắng từ 3 ván đấu trở lên', unlocked: gamesWon >= 3 }
    ];

    return `
      <div class="modal-overlay-panel" id="modal-achievements">
        <div class="modal-content-box" style="max-width: 660px;">
          <div class="modal-header-row">
            <div class="modal-title-text">🏆 HỒ SƠ & THÀNH TỰU THẦN THOẠI</div>
            <button class="modal-close-btn" data-close-modal="modal-achievements">✕</button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px;">
            <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(250,204,21,0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 20px; font-weight: 900; color: #facc15;">${gamesPlayed}</div>
              <div style="font-size: 10.5px; color: #cbd5e1;">Trận Đã Đấu</div>
            </div>
            <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(74,222,128,0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 20px; font-weight: 900; color: #4ade80;">${gamesWon}</div>
              <div style="font-size: 10.5px; color: #cbd5e1;">Trận Thắng</div>
            </div>
            <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(217,70,239,0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 20px; font-weight: 900; color: #e879f9;">${fusionsDone}</div>
              <div style="font-size: 10.5px; color: #cbd5e1;">Lần Dung Hợp</div>
            </div>
            <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(248,113,113,0.3); border-radius: 8px; padding: 10px; text-align: center;">
              <div style="font-size: 20px; font-weight: 900; color: #f87171;">${bossesSummoned}</div>
              <div style="font-size: 10.5px; color: #cbd5e1;">Thần Thú Gọi</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${badges.map(b => `
              <div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; background: ${b.unlocked ? 'rgba(250, 204, 21, 0.14)' : 'rgba(0,0,0,0.3)'}; border: 1.5px solid ${b.unlocked ? '#facc15' : '#334155'}; opacity: ${b.unlocked ? '1' : '0.6'};">
                <div style="font-size: 26px;">${b.icon}</div>
                <div>
                  <div style="font-weight: 800; font-size: 12.5px; color: ${b.unlocked ? '#fef08a' : '#94a3b8'};">
                    ${b.title} ${b.unlocked ? '✅' : '🔒'}
                  </div>
                  <div style="font-size: 11px; color: #cbd5e1; line-height: 1.35;">${b.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  static renderAudioSettingsModal(audioManager) {
    if (!audioManager) return '';
    return `
      <div class="modal-overlay-panel" id="modal-audio-settings">
        <div class="modal-content-box" style="max-width: 500px;">
          <div class="modal-header-row">
            <div class="modal-title-text">🔊 BẢNG ĐIỀU KHIỂN ÂM THANH</div>
            <button class="modal-close-btn" data-close-modal="modal-audio-settings">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px; padding: 8px 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 10px 14px; border-radius: 8px;">
              <span style="font-weight: 700; color: #e2e8f0;">Trạng thái Tổng:</span>
              <button id="btn-audio-mute-toggle" style="padding: 6px 14px; border-radius: 6px; font-weight: 800; cursor: pointer; border: none; background: ${audioManager.isMuted ? '#ef4444' : '#10b981'}; color: #fff;">
                ${audioManager.isMuted ? '🔇 ĐANG TẮT TIẾNG' : '🔊 ĐANG BẬT ÂM'}
              </button>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
                  <span>Hiệu ứng SFX:</span>
                  <span id="label-vol-sfx">${Math.round(audioManager.volumes.sfx * 100)}%</span>
                </div>
                <input type="range" id="slider-vol-sfx" min="0" max="1" step="0.05" value="${audioManager.volumes.sfx}" style="width: 100%;">
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
                  <span>Nhạc nền Ambient:</span>
                  <span id="label-vol-music">${Math.round(audioManager.volumes.music * 100)}%</span>
                </div>
                <input type="range" id="slider-vol-music" min="0" max="1" step="0.05" value="${audioManager.volumes.music}" style="width: 100%;">
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
                  <span>Giọng hô chiêu Voice:</span>
                  <span id="label-vol-voice">${Math.round(audioManager.volumes.voice * 100)}%</span>
                </div>
                <input type="range" id="slider-vol-voice" min="0" max="1" step="0.05" value="${audioManager.volumes.voice}" style="width: 100%;">
              </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 12px 14px; border-radius: 8px;">
              <div style="font-size: 11px; font-weight: 800; color: #facc15; margin-bottom: 8px; text-transform: uppercase;">
                🎵 Thử Âm Thanh Trực Tiếp:
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button class="tool-btn btn-test-sound" data-sound="draw" style="font-size: 11px;">🎴 Thử Bốc Bài</button>
                <button class="tool-btn btn-test-sound" data-sound="attack" style="font-size: 11px;">💥 Thử Va Chạm</button>
                <button class="tool-btn btn-test-sound" data-sound="trap" style="font-size: 11px;">⚠️ Thử Lật Bẫy</button>
                <button class="tool-btn btn-test-sound" data-sound="fusion" style="font-size: 11px;">🌀 Thử Dung Hợp</button>
                <button class="tool-btn btn-test-sound" data-sound="explosion" style="font-size: 11px;">💣 Thử Nổ Lửa</button>
                <button class="tool-btn btn-test-sound" data-sound="voice" style="font-size: 11px;">🗣️ Thử Giọng Hô</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static renderDiscardModal(state, localPlayerId) {
    if (!state) return '';
    const player = state.players[localPlayerId];
    if (!player) return '';

    const limit = player.handLimit || 6;
    const excessCount = Math.max(0, player.hand.length - limit);

    return `
      <div class="modal-overlay-panel" id="modal-discard-selection">
        <div class="modal-content-box" style="max-width: 700px;">
          <div class="modal-header-row">
            <div class="modal-title-text" style="color: #ef4444;">🗑️ XẢ BÀI CUỐI LƯỢT (QUÁ GIỚI HẠN BÀI)</div>
            <button class="modal-close-btn" data-close-modal="modal-discard-selection">✕</button>
          </div>

          <div style="margin: 12px 0; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); padding: 12px 16px; border-radius: 8px;">
            <div style="font-weight: 800; font-size: 13px; color: #fecaca; margin-bottom: 4px;">
              ⚠️ Bạn đang cầm ${player.hand.length}/${limit} lá bài trên tay!
            </div>
            <div style="font-size: 12px; color: #cbd5e1;">
              Luật đấu trường yêu cầu bạn phải chọn đúng <b style="color: #facc15;">${excessCount} lá bài thừa</b> để chuyển vào Bãi Rác trước khi nhường lượt cho người kế tiếp.
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; max-height: 50vh; overflow-y: auto; padding: 4px;">
            ${player.hand.map(c => `
              <div class="discard-card-select-box"
                   data-discard-instance-id="${c.instanceId}"
                   style="cursor: pointer; border: 2px solid transparent; border-radius: 8px; padding: 4px; background: rgba(0,0,0,0.3); transition: all 0.2s ease;">
                ${CardComponent.renderCardHtml(c)}
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <button id="btn-confirm-discard-endturn"
                    data-needed="${excessCount}"
                    style="padding: 12px 20px; border-radius: 8px; border: none; font-weight: 900; font-size: 13px; cursor: not-allowed; background: #475569; color: #94a3b8; text-transform: uppercase;">
              🗑️ ĐÃ CHỌN (0/${excessCount}) — BỎ RÁC & HẾT LƯỢT
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
