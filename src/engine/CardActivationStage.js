import { ALL_96_CARDS } from '../data/cards.js';
import { CardComponent } from '../ui/CardComponent.js';
import { ScreenShake } from './ScreenShake.js';
import { audioManager } from '../audio/AudioManager.js';

/**
 * Hàm định dạng chữ và làm nổi bật các từ khóa chiến thuật
 */
function highlightTacticalKeywords(text, highlightColor = '#facc15') {
  if (!text) return '';
  const keywords = [
    'Độ Chiến', 'Điểm Nhân Phẩm', 'Bãi Rác', 'Dung Hợp', 'Bẫy Thiên Cơ',
    'Bài Nghiệp Quật', 'Phép Sự Tích', 'Pháp Bảo', 'Trang Bị', 'Hồi', 'Cướp',
    'Đóng Băng', 'Hiến Tế', 'Trực Diện', 'Phản Đòn', 'Vô hiệu hóa', 'Tiêu diệt',
    'Linh Thú', 'Thần Thú', 'Anh Linh', 'Gọi Bầy', 'Cộng Hưởng'
  ];
  let formatted = text;
  for (const kw of keywords) {
    const regex = new RegExp(`(${kw})`, 'gi');
    formatted = formatted.replace(regex, `<strong style="color: ${highlightColor}; text-shadow: 0 0 10px ${highlightColor}88;">$1</strong>`);
  }
  return formatted;
}

/**
 * CardActivationStage — Hệ thống Sân Khấu Trình Diễn Kích Hoạt Thẻ Bài (Chuẩn Mobile & Desktop)
 * Quy tắc v4.5:
 * 1. CHỈ hiển thị và đọc các hiệu ứng đang thực sự kích hoạt (`hasTriggeredEffect !== false`).
 *    Nếu lá bài vừa triệu hồi không có hiệu ứng kích hoạt ngay (`hasTriggeredEffect === false`), tự động bỏ qua màn hình đọc để tiết kiệm thời gian và chỉ chạy hiệu ứng bay bài lên sân.
 * 2. Đối với TẤN CÔNG (`category === 'ATTACK'`): Chỉ đọc Đối tượng tấn công và Mục tiêu tấn công, không mở bảng chữ chắn màn hình để nhường chỗ cho hiệu ứng tấn công & hiệu ứng trừ máu trực tiếp trên bàn đấu.
 * 3. Ngay khi tắt hiển thị, lập tức mở khóa toàn bộ thao tác (`this.isShowing = false`, `this.onStateChange(false)`).
 * 4. Tự động co giãn trên màn hình điện thoại (Portrait & Landscape) không bao giờ tràn viền.
 */
export class CardActivationStage {
  constructor(spatialAnimator = null, canvasVfx = null) {
    this.animator = spatialAnimator;
    this.vfx = canvasVfx;
    this.stageEl = typeof document !== 'undefined' ? this.ensureStageElement() : null;
    this.isShowing = false;
    this.onStateChange = null;
    this.injectKeyframes();
  }

  injectKeyframes() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('card-activation-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'card-activation-keyframes';
    style.innerHTML = `
      @keyframes stageCardFloat {
        0%, 100% { transform: translateY(0px) rotateY(0deg) scale(1); }
        50% { transform: translateY(-8px) rotateY(3deg) scale(1.03); }
      }
      @keyframes stageBadgePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.06); filter: brightness(1.2); }
      }
      @keyframes stageGlowRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes animeWaveBar {
        0%, 100% { transform: scaleY(0.35); }
        50% { transform: scaleY(1.15); }
      }
      .reading-step-box {
        transition: all 0.25s ease;
      }
      .reading-step-box.active-reading {
        box-shadow: 0 0 22px rgba(250, 204, 21, 0.75) !important;
        border-color: #facc15 !important;
        background: rgba(250, 204, 21, 0.16) !important;
        transform: scale(1.01);
      }
      @media (max-width: 768px) {
        .activation-stage-overlay {
          padding: 8px !important;
          justify-content: flex-start !important;
          overflow-y: auto !important;
        }
        .activation-header-pill {
          margin-top: auto !important;
          margin-bottom: 8px !important;
          padding: 7px 12px !important;
          font-size: 12px !important;
        }
        .activation-speech-banner {
          margin-top: 10px !important;
          margin-bottom: auto !important;
          padding: 10px 14px !important;
          width: 96% !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  ensureStageElement() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('card-activation-stage-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'card-activation-stage-overlay';
      el.className = 'activation-stage-overlay';
      el.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        background: radial-gradient(circle at center, rgba(15, 23, 42, 0.90) 0%, rgba(5, 7, 15, 0.97) 100%);
        backdrop-filter: blur(10px);
        pointer-events: auto;
        opacity: 0;
        transition: opacity 0.22s ease-out;
        user-select: none;
        padding: 12px;
        overflow-y: auto;
      `;
      document.body.appendChild(el);
    }
    return el;
  }

  updateReadingStepHighlight(stepIdx) {
    if (!this.stageEl) return;
    const statusLabel = this.stageEl.querySelector('#activation-reading-progress-label');
    const step0El = this.stageEl.querySelector('#stage-step-declaration');
    const step1El = this.stageEl.querySelector('#stage-step-effect');
    const step2El = this.stageEl.querySelector('#stage-step-result');
    const badge1El = this.stageEl.querySelector('#stage-step-effect-badge');
    const badge2El = this.stageEl.querySelector('#stage-step-result-badge');

    [step0El, step1El, step2El].forEach((el, idx) => {
      if (!el) return;
      if (idx === stepIdx) {
        el.classList.add('active-reading');
      } else {
        el.classList.remove('active-reading');
      }
    });

    if (stepIdx === 0) {
      if (statusLabel) statusLabel.textContent = '🔊 ĐANG ĐỌC PHẦN 1/3: KHAI CHIÊU TÊN LÁ BÀI...';
      if (badge1El) badge1El.textContent = '⏳ Chờ đọc...';
      if (badge2El) badge2El.textContent = '⏳ Chờ đọc...';
    } else if (stepIdx === 1) {
      if (statusLabel) statusLabel.textContent = '🔊 ĐANG ĐỌC PHẦN 2/3: NỘI DUNG HIỆU ỨNG ĐANG KÍCH HOẠT...';
      if (badge1El) badge1El.textContent = '🔊 ĐANG ĐỌC HIỆU ỨNG...';
      if (badge2El) badge2El.textContent = '⏳ Chờ đọc...';
    } else if (stepIdx === 2) {
      if (statusLabel) statusLabel.textContent = '🔊 ĐANG ĐỌC PHẦN 3/3: KẾT QUẢ KHI KÍCH HOẠT...';
      if (badge1El) badge1El.textContent = '✅ Đã đọc hiệu ứng';
      if (badge2El) badge2El.textContent = '🔊 ĐANG ĐỌC KẾT QUẢ...';
    } else if (stepIdx >= 3) {
      if (statusLabel) statusLabel.textContent = '✅ ĐÃ ĐỌC XONG HIỆU ỨNG KÍCH HOẠT!';
      if (badge1El) badge1El.textContent = '✅ Hoàn tất';
      if (badge2El) badge2El.textContent = '✅ Hoàn tất';
    }
  }

  async executeBoardActionHelper(boardAction, card, cardHtml, title) {
    if (!boardAction) return;
    const cardId = card?.cardId || card?.id || '';
    if (typeof boardAction.execute === 'function') {
      await boardAction.execute();
      return;
    }
    if (!this.animator) return;

    switch (boardAction.type) {
      case 'STEAL':
        await this.animator.flyCardBetweenZones({
          fromZoneId: boardAction.fromZoneId,
          toZoneId: boardAction.toZoneId,
          cardHtml: boardAction.cardHtml || cardHtml,
          mode: 'STEAL',
          duration: 850
        });
        break;
      case 'TOLL':
        await this.animator.flyCardBetweenZones({
          fromZoneId: boardAction.fromZoneId,
          toZoneId: boardAction.toZoneId,
          cardHtml: boardAction.cardHtml || cardHtml,
          mode: 'TOLL',
          duration: 800
        });
        break;
      case 'SUMMON':
        await this.animator.flyCardBetweenZones({
          fromZoneId: boardAction.fromZoneId || 'zone-player-hand',
          toZoneId: boardAction.toZoneId,
          cardHtml: boardAction.cardHtml || cardHtml,
          mode: 'SUMMON',
          duration: 680
        });
        break;
      case 'BOMB':
        await this.animator.flyCardBetweenZones({
          fromZoneId: boardAction.fromZoneId,
          toZoneId: boardAction.toZoneId,
          cardHtml: boardAction.cardHtml || cardHtml,
          mode: 'BOMB',
          duration: 780
        });
        break;
      case 'DEFLECT':
        await this.animator.deflectAttackToThirdParty({
          attackerZoneId: boardAction.attackerZoneId,
          defenderZoneId: boardAction.defenderZoneId,
          thirdPartyZoneId: boardAction.thirdPartyZoneId,
          cardHtml: boardAction.cardHtml || cardHtml
        });
        break;
      case 'ATTACK':
        await this.animator.executeAttackStrike({
          attackerZoneId: boardAction.attackerZoneId,
          targetZoneId: boardAction.targetZoneId,
          attackType: boardAction.attackType || 'MELEE',
          cardId,
          customText: boardAction.customText || title
        });
        break;
      case 'DEFEAT':
        await this.animator.executeCardDefeat({
          zoneId: boardAction.zoneId,
          defeatType: boardAction.defeatType || 'SHATTER',
          cardId,
          card
        });
        break;
      case 'DRAW':
        await this.animator.flyCardBetweenZones({
          fromZoneId: 'zone-draw-pile',
          toZoneId: boardAction.toZoneId || 'zone-player-hand',
          cardHtml: boardAction.cardHtml || cardHtml,
          mode: 'DRAW',
          duration: 680
        });
        break;
    }
  }

  /**
   * Trình diễn kích hoạt thẻ bài:
   * - Nếu `hasTriggeredEffect === false`: Không đọc hiệu ứng không kích hoạt, chỉ chạy diễn hoạt bay bài nhanh!
   * - Nếu `category === 'ATTACK'`: Chỉ đọc đối tượng tấn công và mục tiêu tấn công, không mở bảng chữ chắn màn hình!
   * - Nếu hiệu ứng đang thực sự kích hoạt: Đọc đủ hiệu ứng đang kích hoạt rồi đóng hiển thị và mở khóa thao tác ngay lập tức!
   */
  async presentActivation({
    card,
    activatorName = '',
    category = 'DRAMA',
    title = '',
    description = '',
    triggeredEffectText = '',
    targetName = '',
    isDirectAttack = false,
    atkPower = null,
    defPower = null,
    icon = '⚡',
    holdDuration = 2400,
    hasTriggeredEffect = true,
    boardAction = null
  }) {
    const cardHtml = card ? CardComponent.renderCardHtml(card, { faceDown: false, isShowcase: true }) : '';

    // 1. Nếu hiệu ứng KHÔNG kích hoạt -> Không bật bảng đọc hiệu ứng để tránh mất thời gian!
    if (hasTriggeredEffect === false) {
      const skippedNarration = audioManager.buildYugiohNarration({
        card,
        activatorName,
        category,
        title,
        description,
        triggeredEffectText,
        targetName,
        atkPower,
        defPower,
        hasTriggeredEffect: false
      });
      audioManager.lastNarration = skippedNarration;
      audioManager.playCardPlay();
      await this.executeBoardActionHelper(boardAction, card, cardHtml, title);
      this.isShowing = false;
      if (typeof this.onStateChange === 'function') {
        this.onStateChange(false);
      }
      return skippedNarration;
    }

    // 2. Nếu là TẤN CÔNG (ATTACK) -> Chỉ đọc đối tượng tấn công và mục tiêu tấn công, kết quả thể hiện bằng hiệu ứng tấn công trên màn hình!
    if (category === 'ATTACK') {
      const atkNarration = audioManager.speakAttackDeclaration({
        card,
        attackerName: activatorName,
        targetName,
        isDirectAttack
      });
      await this.executeBoardActionHelper(boardAction, card, cardHtml, title);
      this.isShowing = false;
      if (typeof this.onStateChange === 'function') {
        this.onStateChange(false);
      }
      return atkNarration;
    }

    // 3. Hiệu ứng đang thực sự kích hoạt -> Mở sân khấu đọc hiệu ứng và mở khóa ngay khi tắt
    this.isShowing = true;
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(true);
    }

    try {
      const narration = audioManager.speakYugiohActivation({
        card,
        activatorName,
        category,
        title,
        description,
        triggeredEffectText,
        targetName,
        atkPower,
        defPower,
        hasTriggeredEffect: true,
        onSegmentChange: (segIdx) => {
          this.updateReadingStepHighlight(segIdx);
        }
      });

      if (typeof document === 'undefined' || !this.stageEl) {
        await this.executeBoardActionHelper(boardAction, card, cardHtml, title);
        return narration;
      }

      const cardId = card?.cardId || card?.id || '';
      const cardName = narration.cardName;

      let badgeColor = '#facc15';
      let badgeText = '⚡ KÍCH HOẠT HIỆU ỨNG';
      let soundType = 'skill';

      switch (category) {
        case 'DRAMA':
          badgeColor = '#ec4899';
          badgeText = '🎭 PHÁT ĐỘNG PHÉP SỰ TÍCH';
          soundType = 'fusion';
          break;
        case 'TRAP':
          badgeColor = '#a855f7';
          badgeText = '🚨 LẬT BẪY THIÊN CƠ';
          soundType = 'trap';
          break;
        case 'SUMMON':
        case 'TRIBUTE':
          badgeColor = '#3b82f6';
          badgeText = category === 'TRIBUTE' ? '👑 HIẾN TẾ KÍCH HOẠT HIỆU ỨNG' : '⚔️ KÍCH HOẠT HIỆU ỨNG TRIỆU HỒI';
          soundType = 'summon';
          break;
        case 'FUSION':
          badgeColor = '#eab308';
          badgeText = '🌀 DUNG HỢP HUYỀN THOẠI';
          soundType = 'fusion';
          break;
        case 'EQUIP':
          badgeColor = '#10b981';
          badgeText = '🛡️ KÍCH HOẠT PHÁP BẢO';
          soundType = 'equip';
          break;
        case 'PASSIVE':
          badgeColor = '#06b6d4';
          badgeText = '✨ KÍCH HOẠT HIỆU ỨNG BỊ ĐỘNG';
          soundType = 'skill';
          break;
        case 'SKILL':
          badgeColor = '#06b6d4';
          badgeText = '✨ PHÁT ĐỘNG TUYỆT KỸ CHỦ ĐỘNG';
          soundType = 'skill';
          break;
        case 'GHOST':
          badgeColor = '#14b8a6';
          badgeText = '👻 ÁM QUẺ ANH LINH';
          soundType = 'skill';
          break;
      }

      const calculatedReadingTime = Math.max(
        holdDuration || 2800,
        narration.totalExpectedDurationMs || 3800
      );

      const formattedCardEffect = highlightTacticalKeywords(narration.fullCardEffect, badgeColor);
      const formattedTriggeredEffect = highlightTacticalKeywords(narration.resultSummary || narration.triggeredEffect, '#38bdf8');

      this.stageEl.innerHTML = `
        <div class="activation-stage-burst-bg" style="
          position: absolute;
          inset: -20%;
          background: radial-gradient(circle at center, ${badgeColor}30 0%, transparent 65%);
          pointer-events: none;
          animation: stageGlowRotate 20s linear infinite;
        "></div>

        <!-- Phần 1/3: Lời Hô Khai Chiêu -->
        <div id="stage-step-declaration" class="activation-header-pill reading-step-box active-reading" style="
          margin-bottom: 14px;
          max-width: 780px;
          background: rgba(15, 23, 42, 0.96);
          border: 2px solid ${badgeColor};
          border-radius: 14px;
          padding: 9px 20px;
          color: #ffffff;
          font-family: 'Be Vietnam Pro', sans-serif;
          font-weight: 800;
          font-size: 13.5px;
          line-height: 1.4;
          box-shadow: 0 6px 24px rgba(0,0,0,0.75), 0 0 18px ${badgeColor}66;
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0;
          transform: translateY(-20px);
          transition: all 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 5;
        ">
          <div style="display: flex; align-items: center; gap: 3px; height: 20px; flex-shrink: 0;">
            <span style="width: 3px; height: 16px; background: ${badgeColor}; border-radius: 2px; animation: animeWaveBar 0.55s infinite ease-in-out;"></span>
            <span style="width: 3px; height: 22px; background: #facc15; border-radius: 2px; animation: animeWaveBar 0.42s infinite ease-in-out 0.15s;"></span>
            <span style="width: 3px; height: 14px; background: ${badgeColor}; border-radius: 2px; animation: animeWaveBar 0.65s infinite ease-in-out 0.25s;"></span>
          </div>
          <div style="text-align: left;">
            <div id="activation-reading-progress-label" style="font-size: 10.5px; color: #facc15; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;">
              🔊 ĐANG ĐỌC HIỆU ỨNG ĐANG KÍCH HOẠT (${category === 'PASSIVE' ? 'BỊ ĐỘNG' : 'CHỦ ĐỘNG'})
            </div>
            <div style="color: #fef08a;">"${narration.spokenText}"</div>
          </div>
        </div>

        <!-- Thẻ bài chính giữa (Showcase 2.5D) -->
        <div class="activation-card-wrapper" style="
          position: relative;
          transform: scale(0.65) rotateY(20deg);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          filter: drop-shadow(0 25px 40px rgba(0,0,0,0.9)) drop-shadow(0 0 35px ${badgeColor}99);
          z-index: 2;
        ">
          <div class="activation-card-inner-box" style="transform: scale(1.04); transform-origin: center center;">
            ${cardHtml}
          </div>
          <div style="
            position: absolute;
            top: -14px;
            right: -12px;
            background: ${badgeColor};
            color: #0f172a;
            font-weight: 900;
            font-size: 11.5px;
            padding: 6px 12px;
            border-radius: 999px;
            box-shadow: 0 4px 18px rgba(0,0,0,0.7);
            text-transform: uppercase;
            letter-spacing: 0.6px;
            border: 2px solid #ffffff;
            animation: stageBadgePulse 2.4s ease-in-out infinite;
            z-index: 10;
            white-space: nowrap;
          ">
            ${icon} ${badgeText}
          </div>
        </div>

        <!-- Bảng Thông Tin Hiệu Ứng Đang Kích Hoạt & Kết Quả -->
        <div class="activation-speech-banner" style="
          margin-top: 18px;
          max-width: 740px;
          width: 94%;
          background: rgba(10, 15, 29, 0.97);
          border: 3px solid ${badgeColor};
          border-radius: 16px;
          padding: 14px 20px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.92), 0 0 30px ${badgeColor}55;
          transform: translateY(30px) scale(0.94);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          text-align: left;
          z-index: 3;
          position: relative;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <span style="font-size: 18px;">${icon}</span>
              <span style="font-weight: 900; font-size: 15.5px; color: ${badgeColor}; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Montserrat', sans-serif;">
                ${title || cardName}
              </span>
            </div>
            ${cardId ? `<span style="font-family: monospace; font-size: 11.5px; font-weight: 800; background: rgba(255,255,255,0.1); color: #e2e8f0; padding: 2px 8px; border-radius: 6px; flex-shrink: 0;">${cardId}</span>` : ''}
          </div>

          <div id="stage-step-effect" class="reading-step-box" style="background: rgba(30, 41, 59, 0.75); border: 1.5px solid rgba(255,255,255,0.12); border-left: 4px solid ${badgeColor}; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="font-size: 10.5px; font-weight: 800; color: ${badgeColor}; text-transform: uppercase;">📜 NỘI DUNG HIỆU ỨNG ĐANG KÍCH HOẠT:</span>
              <span id="stage-step-effect-badge" style="font-size: 10px; font-weight: 800; color: #facc15;">⏳ Chờ đọc...</span>
            </div>
            <div class="activation-full-card-effect" style="font-size: 13px; line-height: 1.45; color: #f8fafc; font-weight: 600;">
              ${formattedCardEffect}
            </div>
          </div>

          <div id="stage-step-result" class="reading-step-box" style="background: rgba(8, 51, 68, 0.55); border: 1.5px solid rgba(255,255,255,0.12); border-left: 4px solid #38bdf8; border-radius: 8px; padding: 8px 12px; margin-bottom: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="font-size: 10.5px; font-weight: 800; color: #38bdf8; text-transform: uppercase;">⚡ KẾT QUẢ KHI KÍCH HOẠT:</span>
              <span id="stage-step-result-badge" style="font-size: 10px; font-weight: 800; color: #38bdf8;">⏳ Chờ đọc...</span>
            </div>
            <div class="activation-triggered-effect" style="font-size: 12.5px; line-height: 1.45; color: #e0f2fe; font-weight: 600;">
              ${formattedTriggeredEffect}
            </div>
          </div>

          <div style="
            margin-top: 10px;
            width: 100%;
            height: 5px;
            background: rgba(255, 255, 255, 0.12);
            border-radius: 999px;
            overflow: hidden;
            position: relative;
          ">
            <div id="activation-countdown-bar" style="
              height: 100%;
              width: 100%;
              background: linear-gradient(90deg, ${badgeColor}, #ffffff);
              transform-origin: left center;
              transform: scaleX(1);
              transition: transform ${calculatedReadingTime}ms linear;
            "></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 10.5px; color: #94a3b8; font-style: italic;">
              ⏳ Tự động đóng và mở khóa thao tác ngay sau khi đọc hết hiệu ứng
            </span>
            <button id="btn-skip-activation" style="
              background: rgba(30, 41, 59, 0.9);
              border: 1px solid rgba(250, 204, 21, 0.45);
              color: #fef08a;
              font-size: 11.5px;
              font-weight: 800;
              padding: 6px 14px;
              border-radius: 999px;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 6px;
            ">
              <span>Bỏ qua nhanh ➔</span>
              <span style="font-size: 10px; opacity: 0.85;">(Chạm / Space)</span>
            </button>
          </div>
        </div>
      `;

      this.stageEl.style.display = 'flex';
      void this.stageEl.offsetWidth;
      this.stageEl.style.opacity = '1';
      this.updateReadingStepHighlight(audioManager.currentSegmentIndex >= 0 ? audioManager.currentSegmentIndex : 0);

      ScreenShake.shake(document.getElementById('arena-root'), 4, 160);
      if (soundType === 'trap') audioManager.playTrapFlip();
      else if (soundType === 'fusion') audioManager.playFusion();
      else if (soundType === 'summon') audioManager.playCardPlay();
      else if (soundType === 'equip') audioManager.playItemEquip();
      else audioManager.playCardPlay();

      const cardWrapper = this.stageEl.querySelector('.activation-card-wrapper');
      const speechBanner = this.stageEl.querySelector('.activation-speech-banner');
      const headerPill = this.stageEl.querySelector('.activation-header-pill');
      const countdownBar = this.stageEl.querySelector('#activation-countdown-bar');
      const skipBtn = this.stageEl.querySelector('#btn-skip-activation');

      if (cardWrapper && speechBanner) {
        setTimeout(() => {
          cardWrapper.style.transform = 'scale(1) rotateY(0deg)';
          cardWrapper.style.opacity = '1';
          cardWrapper.style.animation = 'stageCardFloat 3.8s ease-in-out infinite';

          speechBanner.style.transform = 'translateY(0) scale(1)';
          speechBanner.style.opacity = '1';

          if (headerPill) {
            headerPill.style.transform = 'translateY(0)';
            headerPill.style.opacity = '1';
          }

          if (countdownBar) {
            countdownBar.style.transform = 'scaleX(0)';
          }
        }, 35);
      }

      const stageOpenedAt = Date.now();

      await new Promise((resolve) => {
        let resolved = false;
        const doResolve = (manualSkip = false) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            if (manualSkip) {
              audioManager.stopSpeaking();
            }
            resolve();
          }
        };

        const onKeyDown = (e) => {
          if (e.code === 'Space' || e.code === 'Enter') {
            if (Date.now() - stageOpenedAt < 300) return;
            e.preventDefault();
            doResolve(true);
          }
        };

        const onSkipBtnClick = (e) => {
          e.stopPropagation();
          doResolve(true);
        };

        const safetyTimerId = setTimeout(() => doResolve(false), Math.max(calculatedReadingTime + 3000, 12000));

        audioManager.waitForSpeech(calculatedReadingTime + 2800).then(() => {
          if (!resolved) {
            this.updateReadingStepHighlight(3);
            setTimeout(() => doResolve(false), 180);
          }
        });

        const cleanup = () => {
          clearTimeout(safetyTimerId);
          window.removeEventListener('keydown', onKeyDown);
          if (skipBtn) {
            skipBtn.removeEventListener('click', onSkipBtnClick);
          }
        };

        window.addEventListener('keydown', onKeyDown);
        if (skipBtn) {
          skipBtn.addEventListener('click', onSkipBtnClick);
        }
      });

      this.stageEl.style.opacity = '0';
      await new Promise(resolve => setTimeout(resolve, 140));
      this.stageEl.style.display = 'none';

      // Ngay khoảnh khắc tắt hiển thị, hạ cờ isShowing = false và thông báo mở khóa!
      this.isShowing = false;
      if (typeof this.onStateChange === 'function') {
        this.onStateChange(false);
      }

      await this.executeBoardActionHelper(boardAction, card, cardHtml, title);

      return narration;
    } finally {
      audioManager.stopSpeaking();
      this.isShowing = false;
      if (typeof this.onStateChange === 'function') {
        this.onStateChange(false);
      }
    }
  }
}
