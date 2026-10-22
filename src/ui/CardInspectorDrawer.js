import { ALL_96_CARDS, CARD_TYPES } from '../data/cards.js';
import { getCardArtSvg } from '../data/cardImages.js';

/**
 * CardInspectorDrawer — Quản lý Bảng Trượt Xem Chi Tiết Lá Bài (Side Drawer)
 * Hiển thị đầy đủ hiệu ứng, Giai thoại Thần Thoại & Sự Tích Việt Nam và các nút hành động nhanh (kể cả Triệu Hồi Gọi Bầy)
 */
export class CardInspectorDrawer {
  static renderDrawerHtml() {
    return `
      <div id="card-inspector-drawer" class="card-inspector-drawer" aria-hidden="true">
        <div class="inspector-header">
          <div id="inspector-type-pill" class="inspector-type-pill">LINH THÚ</div>
          <button id="inspector-close-btn" class="inspector-close-btn" title="Đóng (ESC)">✕</button>
        </div>
        <div class="inspector-body" id="inspector-body">
          <!-- Nội dung chi tiết lá bài sẽ được render động ở đây -->
        </div>
      </div>
    `;
  }

  static inspectCard(cardInstance, options = {}) {
    if (typeof document === 'undefined') return;
    const drawer = document.getElementById('card-inspector-drawer');
    const body = document.getElementById('inspector-body');
    const typePill = document.getElementById('inspector-type-pill');
    if (!drawer || !body) return;

    const cardId = cardInstance.cardId || cardInstance.id || '';
    const cardData = ALL_96_CARDS[cardId] || cardInstance || {};
    const type = cardInstance.type || cardData.type || CARD_TYPES.LOW_MONSTER;
    const tribe = cardInstance.tribe || cardData.tribe || '';
    const power = cardInstance.power !== undefined ? cardInstance.power : (cardInstance.basePower || cardData.power);
    const isGhost = options.isGhost || false;
    const isHandCard = options.isHandCard || false;
    const isOwnFieldCard = options.isOwnFieldCard || false;
    const fieldSlotIndex = options.fieldSlotIndex ?? null;

    if (typePill) {
      typePill.textContent = this.getTypeLabel(type, tribe);
      typePill.style.background = this.getTypeColor(type, tribe);
    }

    const lore = this.getCardLore(cardId, cardData);

    const equips = cardInstance.equippedItems || [];
    let equipsSectionHtml = '';
    if (equips.length > 0) {
      equipsSectionHtml = `
        <div class="inspector-section-card" style="border-color: #10b981; background: rgba(6, 78, 59, 0.22); margin-top: 12px;">
          <div class="inspector-section-title" style="color: #34d399; display: flex; align-items: center; justify-content: space-between;">
            <span><span>🛡️</span> PHÁP BẢO TRANG BỊ ĐANG MANG (${equips.length})</span>
            <span style="font-size: 11px; color: #a7f3d0; font-weight: 700;">ĐÃ GẮN</span>
          </div>
          <div class="inspector-equips-list" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
            ${equips.map(eq => {
              const eqData = ALL_96_CARDS[eq.cardId] || eq;
              const bonusPower = eqData.powerBonus || eq.powerBonus || (eqData.power !== undefined ? `+${eqData.power}` : '');
              return `
                <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid #10b981; border-radius: 8px; padding: 10px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 800; color: #6ee7b7; font-size: 13.5px;">🛡️ ${eqData.name || eq.name}</span>
                    <span style="background: #10b981; color: #022c22; font-weight: 900; font-size: 11px; padding: 2px 8px; border-radius: 999px;">
                      ${eq.cardId || eqData.id || ''} ${bonusPower ? `| ⚔️ ${bonusPower}` : ''}
                    </span>
                  </div>
                  <div style="font-size: 12px; color: #f1f5f9; line-height: 1.5; font-weight: 500;">
                    ${eqData.description || eq.description || 'Gắn lên Linh Thú để tăng cường chỉ số và ban thêm hiệu ứng chiến đấu.'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else if ([CARD_TYPES.LOW_MONSTER, CARD_TYPES.HIGH_MONSTER, CARD_TYPES.FUSION_MONSTER].includes(type)) {
      equipsSectionHtml = `
        <div class="inspector-section-card" style="border-color: rgba(255,255,255,0.12); opacity: 0.85; margin-top: 12px;">
          <div class="inspector-section-title" style="color: #94a3b8; font-size: 12px;">
            <span>🛡️</span> PHÁP BẢO ĐẠO CỤ
          </div>
          <div style="font-size: 12px; color: #64748b; font-style: italic; margin-top: 4px;">
            Linh Thú này chưa gắn Pháp Bảo nào.
          </div>
        </div>
      `;
    }

    const hasActiveFieldSkill = ['CT-13', 'TR-09', 'DH-08'].includes(cardId);
    const canSwarmThisCard = (type === CARD_TYPES.LOW_MONSTER && cardId !== 'CT-23') || cardId === 'TR-14';

    body.innerHTML = `
      <!-- Khung Artwork SVG phóng to -->
      <div class="inspector-art-stage">
        <img class="inspector-art-img"
             src="assets/cards/${cardId}${isGhost ? '_ghost' : ''}.png"
             alt="${cardData.name || cardInstance.name || 'Thẻ Bài'}"
             onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';"
             onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';"
             style="display:none;" />
        <div class="inspector-art-fallback" style="width:100%; height:100%;">
          ${getCardArtSvg(cardId, isGhost)}
        </div>
      </div>

      <!-- Tiêu Đề & Chỉ Số -->
      <div class="inspector-title-block">
        <div class="inspector-card-name">${cardData.name || cardInstance.name || 'Thẻ Bài'}</div>
        <div class="inspector-meta-row">
          <span class="inspector-code-badge">${cardId}</span>
          ${power !== undefined && power !== null ? `
            <span class="inspector-power-badge">⚔️ ĐỘ CHIẾN: ${power}</span>
          ` : ''}
        </div>
      </div>

      <!-- Khung Kỹ Năng / Hiệu Ứng -->
      <div class="inspector-section-card">
        <div class="inspector-section-title">
          <span>⚡</span> HIỆU ỨNG CHI TIẾT
        </div>
        <div class="inspector-section-text">
          ${cardData.description || cardData.aliveAbility || 'Không có hiệu ứng đặc biệt.'}
        </div>
        ${cardData.ghostAbility ? `
          <div class="inspector-section-title" style="margin-top: 8px; color: var(--accent-teal);">
            <span>👻</span> KỸ NĂNG ANH LINH (HỒN MA)
          </div>
          <div class="inspector-section-text" style="color: #a7f3d0;">
            ${cardData.ghostAbility}
          </div>
        ` : ''}
      </div>

      <!-- Khung Trang Bị Đang Mang & Chức Năng Chi Tiết -->
      ${equipsSectionHtml}

      <!-- Khung Lore Giai Thoại Sự Tích & Thần Thoại Việt Nam -->
      <div class="inspector-lore-box">
        "${lore}"
      </div>

      <!-- Nút Kích Hoạt Nhanh nếu là Linh Thú trên sân có kỹ năng chủ động -->
      ${isOwnFieldCard && hasActiveFieldSkill && fieldSlotIndex !== null ? `
        <div class="inspector-actions-group">
          <button class="inspector-action-btn btn-activate-field-skill" data-skill-slot="${fieldSlotIndex}" style="background: linear-gradient(135deg, #a855f7, #7e22ce); color: #fff; border-color: #c084fc;">
            ⚡ Phát Động Tuyệt Kỹ Sân Đấu
          </button>
        </div>
      ` : ''}

      <!-- Nút Thao Tác Nhanh (Nếu là bài trên tay của người chơi) -->
      ${isHandCard ? `
        <div class="inspector-actions-group">
          ${type === CARD_TYPES.LOW_MONSTER ? `
            <button class="inspector-action-btn btn-summon" data-quick-action="summon" data-instance-id="${cardInstance.instanceId}">
              ⚔️ Triệu Hồi Lên Sân
            </button>
          ` : ''}
          ${canSwarmThisCard ? `
            <button class="inspector-action-btn btn-swarm" data-quick-action="swarm" data-instance-id="${cardInstance.instanceId}" style="background: linear-gradient(135deg, #f97316, #ea580c); color: #fff;">
              🐾 Triệu Hồi Gọi Bầy (Thêm Quân!)
            </button>
          ` : ''}
          ${type === CARD_TYPES.HIGH_MONSTER ? `
            <button class="inspector-action-btn btn-summon" data-quick-action="tribute" data-instance-id="${cardInstance.instanceId}">
              👑 Hiến Tế Triệu Hồi Thần Thú
            </button>
          ` : ''}
          ${type === CARD_TYPES.TRAP ? `
            <button class="inspector-action-btn btn-trap" data-quick-action="trap" data-instance-id="${cardInstance.instanceId}">
              ⚠️ Úp Vào Ô Bẫy
            </button>
          ` : ''}
          ${type === CARD_TYPES.DRAMA ? `
            <button class="inspector-action-btn btn-drama" data-quick-action="drama" data-instance-id="${cardInstance.instanceId}">
              🎭 Tung Bài Drama / Sự Tích
            </button>
          ` : ''}
          ${type === CARD_TYPES.EQUIPMENT ? `
            <button class="inspector-action-btn btn-equip" data-quick-action="equip" data-instance-id="${cardInstance.instanceId}" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; border-color: #34d399;">
              🛡️ Gắn Trang Bị / Pháp Bảo
            </button>
          ` : ''}
          <button class="inspector-action-btn btn-discard" data-quick-action="discard" data-instance-id="${cardInstance.instanceId}" style="background: linear-gradient(135deg, #64748b, #475569); color: #fff; border-color: #94a3b8;">
            🗑️ Bỏ Vào Bãi Rác
          </button>
        </div>
      ` : ''}
    `;

    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }

  static close() {
    if (typeof document === 'undefined') return;
    const drawer = document.getElementById('card-inspector-drawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
  }

  static getTypeLabel(type, tribe) {
    const tribeName = {
      HONG_HOT: 'LINH GIÁC (HÓNG HỚT)',
      QUAY_PHA: 'DŨNG MÃNH (QUẬY PHÁ)',
      TOC_DO: 'THẦN TỐC (TỐC ĐỘ)',
      AN_VA: 'HUYỀN BÍ (ĂN VẠ)'
    }[tribe] || '';

    switch (type) {
      case CARD_TYPES.CHARACTER: return `THẺ ĐẠI DIỆN THẦN THOẠI ${tribeName ? '— ' + tribeName : ''}`;
      case CARD_TYPES.LOW_MONSTER: return `LINH THÚ DÂN GIAN ${tribeName ? '— ' + tribeName : ''}`;
      case CARD_TYPES.HIGH_MONSTER: return 'ĐẠI YÊU & THẦN THÚ CẤP CAO';
      case CARD_TYPES.FUSION_MONSTER: return 'HUYỀN THOẠI DUNG HỢP';
      case CARD_TYPES.EQUIPMENT: return 'PHÁP BẢO CỔ TÍCH (ĐẠO CỤ)';
      case CARD_TYPES.DRAMA: return 'PHÉP SỰ TÍCH DÂN GIAN (DRAMA)';
      case CARD_TYPES.TRAP: return 'BẪY THIÊN CƠ (NGHIỆP QUẬT)';
      case CARD_TYPES.CURSE: return 'BÀI ÁM QUẺ TÂM LINH (HỒN MA)';
      default: return 'THẺ BÀI THẦN THOẠI VIỆT';
    }
  }

  static getTypeColor(type, tribe) {
    switch (type) {
      case CARD_TYPES.HIGH_MONSTER: return '#ef4444';
      case CARD_TYPES.FUSION_MONSTER: return '#d946ef';
      case CARD_TYPES.EQUIPMENT: return '#10b981';
      case CARD_TYPES.DRAMA: return '#3b82f6';
      case CARD_TYPES.TRAP: return '#8b5cf6';
      case CARD_TYPES.CURSE: return '#0d9488';
      default:
        if (tribe === 'HONG_HOT') return '#06b6d4';
        if (tribe === 'QUAY_PHA') return '#f43f5e';
        if (tribe === 'TOC_DO') return '#eab308';
        if (tribe === 'AN_VA') return '#a855f7';
        return '#f59e0b';
    }
  }

  static getCardLore(cardId, cardData) {
    const loreMap = {
      'NV-01': 'Thần Tản Viên Sơn Thánh cai quản muôn loài vùng núi Ba Vì, tay cầm sách ước hô mưa gọi gió, dâng núi cao vạn trượng chặn đứng hồng thủy.',
      'NV-02': 'Vị thần biển cả oai hùng dâng nước sông Hồng cuồn cuộn vì mối tình truyền kiếp với công chúa Mỵ Nương.',
      'NV-03': 'Phù Đổng Thiên Vương vươn vai lớn nhanh như thổi, cưỡi Ngựa Sắt phun lửa nhổ bụi tre ngà đánh tan giặc ngoại xâm rồi bay về trời.',
      'NV-04': 'Một trong Tứ Bất Tử Việt Nam, từ chàng trai nghèo bên bãi sông Hồng nên duyên cùng Tiên Dung công chúa, dựng lâu đài hóa phép trong một đêm.',
      'NV-05': 'Thánh Mẫu cai quản đại ngàn rừng xanh, ban phát lộc rừng, thảo dược linh thiêng và che chở cho muôn thú bốn phương.',
      'NV-06': 'Đức Long Quân nòi Rồng kết duyên cùng Tiên nữ Âu Cơ sinh ra bọc trăm trứng, khởi nguồn truyền thuyết Con Rồng Cháu Tiên của dân tộc Việt.',
      'NV-07': 'Tổ Mẫu Âu Cơ hiền từ dẫn 50 người con lên núi lập nghiệp, luôn dang tay hồi sinh và che chở cho bầy linh thú quê hương.',
      'NV-08': 'Chú Cóc Tía gan dạ dẫn đầu đoàn cua, gấu, cọp, ong, cáo vượt thiên môn đánh trống Thiên Lôi kiện Ông Trời làm mưa cứu muôn loài.',
      'CT-01': 'Chim Lạc sải cánh trên mặt trống đồng Đông Sơn ngàn năm, biểu tượng cho khát vọng bay cao và nhãn quan thấu suốt trời đất của người Việt cổ.',
      'CT-02': 'Khuyển Thần Đá ngồi canh cổng làng truyền đời, chỉ cần cất tiếng sủa vang rền là tà ma ngoại đạo đều khiếp vía.',
      'CT-03': 'Ngựa Sắt Phù Đổng đúc bằng gang thép, bụng chứa lửa thiêng, hí vang một tiếng là phóng vút qua vạn dặm chiến trường.',
      'CT-04': 'Cóc Tía là cậu Ông Trời, hễ ai động vào là nghiến răng gọi sấm sét giáng trả ngay tức khắc.',
      'CT-12': 'Chó Phú Quốc xoáy lưng thần tốc, nổi tiếng thông minh, trung thành và gan dạ bậc nhất miền biển đảo phương Nam.',
      'CT-14': 'Cá Chép kiên trì vượt qua ba đợt sóng dữ Vũ Môn Quan để hóa thành Rồng Vàng bay lượn trên chín tầng mây.',
      'CT-20': 'Gà chín cựa gáy vang gọi mặt trời mọc, sính lễ linh thiêng chỉ có ở vùng đất Tổ Phong Châu trong truyền thuyết Sơn Tinh - Thủy Tinh.',
      'CT-23': 'Voi chín ngà sừng sững như bức tường đồng vách sắt giữa đại ngàn, che chắn toàn bộ trận địa trước mọi đòn tấn công.',
      'CT-25': 'Đàn Chim Lạc Hồng vỗ cánh gọi bầy tiếp viện, mở màn cho lối chơi triệu hồi liên hoàn áp đảo bàn đấu.',
      'CT-27': 'Sao La — Kỳ lân châu Á quý hiếm ẩn mình nơi dãy Trường Sơn hùng vĩ, mang lại sinh khí và sức mạnh gắn kết cho cả đàn.',
      'TR-01': 'Chằn Tinh mình trăn khổng lồ sống lâu năm trong hang đá, phép thuật biến hóa khôn lường, từng đại chiến kinh thiên động địa với Thạch Sanh.',
      'TR-02': 'Đàn Đáy Thần của Thạch Sanh ngân lên khúc nhạc "Tịch tình tang" khiến quân sĩ mười tám nước chư hầu bủn rủn chân tay, buông vũ khí xin hàng.',
      'TR-05': 'Thần Kim Quy rẽ sóng hồ Lục Thủy hiện lên trao móng rùa thần chế tạo Nỏ Liên Châu và đón nhận Gươm Thần Thuận Thiên.',
      'TR-12': 'Hỏa Kỳ Lân giáng thế cùng ngọn lửa tam muội rực cháy, sẵn sàng nổ tung thiêu rụi toàn bộ chiến trường.',
      'DH-01': 'Hội đồng Tứ Bất Tử của tín ngưỡng dân gian Việt Nam (Tản Viên Sơn Thánh, Phù Đổng Thiên Vương, Chử Đồng Tử, Thánh Mẫu Liễu Hạnh) hội tụ thần thông.',
      'DH-02': 'Song Khuyển Thần (Khuyển Đá Cổ Thạch & Chó Xoáy Phú Quốc) hợp thể, cất tiếng sủa vang trời càn quét nhiều đối thủ cùng lúc.',
      'DH-03': 'Trống Đồng Ngọc Lũ ngàn năm ngân vang âm hưởng hào hùng của văn hóa Đông Sơn, làm chấn động tâm can mọi kẻ địch.',
      'DH-04': 'Cá Chép Vượt Vũ Môn lột xác thành Long Mã Đằng Vân cưỡi mây đạp gió, đánh thẳng vào bản thể đối phương.',
      'DH-09': 'Long - Lân - Quy - Phụng (Tứ Linh Hội Tụ) kết tinh linh khí bốn phương, dễ dàng triệu hồi chỉ với 2 Linh Thú khác hệ bất kỳ!',
      'DC-01': 'Nỏ Thần Liên Châu gắn vuốt rùa vàng của Thần Kim Quy, mỗi phát bắn phóng ra hàng vạn mũi tên đồng.',
      'DC-02': 'Mai Rùa Kim Quy cứng tựa kim cương, bảo vệ chủ nhân sống sót thần kỳ trước đòn đánh chí mạng.',
      'DR-15': 'Câu thần chú "Khắc nhập, khắc nhập!" từ Sự Tích Cây Tre Trăm Đốt gọi ngay 2 Linh Thú đồng loạt xuất trận và kết nối sức mạnh.',
      'NQ-01': 'Gương Bát Quái trấn trạch treo trước hiên nhà, phản chiếu toàn bộ tà khí và đòn sát phạt dội ngược về phía kẻ ra tay.'
    };

    return loreMap[cardId] || cardData.flavorText || 'Một hình tượng linh thú, thần tích và văn hóa dân gian đặc sắc trong kho tàng Thần Thoại Việt Nam.';
  }
}
