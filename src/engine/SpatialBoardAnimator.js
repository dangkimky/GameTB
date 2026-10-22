import { ScreenShake } from './ScreenShake.js';
import { CanvasVFXEngine } from './CanvasVFXEngine.js';
import { CardComponent } from '../ui/CardComponent.js';
import { audioManager } from '../audio/AudioManager.js';

/**
 * SpatialBoardAnimator — Hệ thống diễn hoạt lá bài bay giữa các tọa độ thực,
 * hiệu ứng điện ảnh tấn công đúng mục tiêu, phá hủy lá bài & Hiệu ứng Trừ Máu Đặc Sắc (60FPS)
 */
export class SpatialBoardAnimator {
  constructor(canvasVfxEngine = null) {
    this.vfx = canvasVfxEngine || (typeof window !== 'undefined' ? new CanvasVFXEngine() : null);
    this.layer = typeof document !== 'undefined'
      ? (document.getElementById('arena-motion-layer') || this.createMotionLayer())
      : null;
  }

  createMotionLayer() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('arena-motion-layer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'arena-motion-layer';
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;perspective:1200px;';
      document.body.appendChild(el);
    }
    return el;
  }

  ensureLayer() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('arena-motion-layer');
    if (!el) {
      el = this.createMotionLayer();
    }
    this.layer = el;
    return el;
  }

  getZoneElement(zoneId) {
    if (typeof document === 'undefined' || !zoneId) return null;
    return document.querySelector(`[data-zone-id="${zoneId}"]`) || document.getElementById(zoneId);
  }

  getZoneRect(zoneId) {
    if (typeof document === 'undefined') {
      return { left: 400, top: 300, width: 110, height: 154 };
    }
    const el = this.getZoneElement(zoneId);
    if (!el) {
      return {
        left: window.innerWidth / 2 - 55,
        top: window.innerHeight / 2 - 77,
        width: 110,
        height: 154
      };
    }
    return el.getBoundingClientRect();
  }

  /**
   * HIỆU ỨNG TRỪ MÁU ĐẶC SẮC & RÕ RÀNG (Spectacular HP Loss / Damage Effect)
   * 1. Chớp viền đỏ cảnh báo toàn màn hình (#hp-damage-screen-vignette)
   * 2. Chớp đỏ & rung lắc mạnh tại Trạm người chơi (#station-...) và Huy hiệu HP ([data-zone-id="zone-player-...-hp"])
   * 3. Bắn sóng xung kích đỏ, hạt mảnh vỡ tim 💔 trên Canvas VFX
   * 4. Hiển thị Bảng Nổi Trừ Máu Cực Lớn: "-X ĐIỂM NHÂN PHẨM! (oldHp ♥ ➔ newHp ♥)"
   */
  async executeHpDamageEffect({
    targetPlayerId,
    targetPlayerName = 'Người chơi',
    amount = 1,
    oldHp = null,
    newHp = null
  } = {}) {
    if (!amount || amount <= 0) return { targetPlayerId, amount: 0 };

    const hpZoneId = `zone-player-${targetPlayerId}-hp`;
    const stationId = `station-${targetPlayerId}`;
    const hpRect = this.getZoneRect(hpZoneId);
    const x = hpRect.left + hpRect.width / 2;
    const y = hpRect.top + hpRect.height / 2;

    audioManager.playHpDamage(amount);

    if (this.vfx) {
      this.vfx.spawnBloodDamageBurst(x, y, amount, targetPlayerName, oldHp, newHp);
    }

    const layer = this.ensureLayer();
    if (!layer || typeof document === 'undefined') {
      return { targetPlayerId, targetPlayerName, amount, oldHp, newHp };
    }

    // 1. Hiệu ứng Chớp Viền Đỏ Toàn Màn Hình (Screen Crimson Vignette Pulse)
    const vignette = document.createElement('div');
    vignette.className = 'hp-damage-screen-vignette';
    vignette.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 950;
      background: radial-gradient(circle at center, transparent 42%, rgba(220, 38, 38, 0.55) 100%);
      box-shadow: inset 0 0 110px rgba(239, 68, 68, 0.92);
      opacity: 0;
    `;
    layer.appendChild(vignette);

    if (vignette.animate) {
      vignette.animate([
        { opacity: 0 },
        { opacity: 1, offset: 0.18 },
        { opacity: 0.75, offset: 0.45 },
        { opacity: 0 }
      ], { duration: 680, easing: 'ease-out', fill: 'forwards' });
    }

    // 2. Làm sáng đỏ rực & rung lắc Trạm của người bị trừ máu và Huy hiệu HP
    const stationEl = document.getElementById(stationId);
    const hpBadgeEl = this.getZoneElement(hpZoneId);

    if (stationEl) {
      const prevBorder = stationEl.style.borderColor;
      const prevShadow = stationEl.style.boxShadow;
      stationEl.style.borderColor = '#ef4444';
      stationEl.style.boxShadow = '0 0 38px rgba(239, 68, 68, 0.95), inset 0 0 28px rgba(239, 68, 68, 0.55)';
      if (stationEl.animate) {
        stationEl.animate([
          { transform: 'translate3d(0,0,0) scale(1)' },
          { transform: 'translate3d(-10px, 4px, 0) scale(1.04)', offset: 0.2 },
          { transform: 'translate3d(10px, -4px, 0) scale(1.04)', offset: 0.4 },
          { transform: 'translate3d(-7px, 2px, 0) scale(1.02)', offset: 0.6 },
          { transform: 'translate3d(5px, -2px, 0) scale(1.01)', offset: 0.8 },
          { transform: 'translate3d(0,0,0) scale(1)' }
        ], { duration: 480, easing: 'ease-in-out' });
      }
      setTimeout(() => {
        stationEl.style.borderColor = prevBorder;
        stationEl.style.boxShadow = prevShadow;
      }, 720);
    }

    if (hpBadgeEl) {
      const prevBg = hpBadgeEl.style.background;
      hpBadgeEl.style.background = 'linear-gradient(135deg, #ef4444, #991b1b)';
      hpBadgeEl.style.boxShadow = '0 0 24px #ef4444';
      if (hpBadgeEl.animate) {
        hpBadgeEl.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.48)', offset: 0.3 },
          { transform: 'scale(0.92)', offset: 0.65 },
          { transform: 'scale(1)' }
        ], { duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
      }
      setTimeout(() => {
        hpBadgeEl.style.background = prevBg;
        hpBadgeEl.style.boxShadow = '';
      }, 720);
    }

    // 3. Bảng Nổi Sát Thương Trừ Máu Cực Rõ Ràng (Floating Pop-Art HP Damage Callout)
    const callout = document.createElement('div');
    callout.className = 'floating-hp-damage-callout';
    const safeLeft = Math.max(130, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1000) - 130, x));
    const safeTop = Math.max(70, Math.min((typeof window !== 'undefined' ? window.innerHeight : 700) - 90, y));
    const hpTransitionHtml = (oldHp !== null && newHp !== null)
      ? `<div style="font-size: 12px; font-weight: 900; color: #fef08a; margin-top: 2px;">♥ ${oldHp} HP ➔ ${newHp} HP</div>`
      : '';

    callout.style.cssText = `
      position: fixed;
      left: ${safeLeft}px;
      top: ${safeTop}px;
      transform: translate(-50%, -50%) scale(0.4);
      background: linear-gradient(135deg, rgba(185, 28, 28, 0.97), rgba(69, 10, 10, 0.98));
      border: 3px solid #facc15;
      border-radius: 16px;
      padding: 10px 20px;
      text-align: center;
      box-shadow: 0 14px 36px rgba(0,0,0,0.92), 0 0 35px rgba(239, 68, 68, 0.95);
      z-index: 980;
      pointer-events: none;
      white-space: nowrap;
    `;
    callout.innerHTML = `
      <div style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 900; color: #fecaca; letter-spacing: 0.8px; text-transform: uppercase;">
        💔 ${targetPlayerName} MẤT MÁU!
      </div>
      <div style="font-family: 'Bangers', 'Montserrat', sans-serif; font-size: 28px; font-weight: 900; color: #ffffff; text-shadow: 2px 2px 0 #000, 0 0 18px #ef4444; letter-spacing: 1px; line-height: 1.15;">
        💥 -${amount} ĐIỂM NHÂN PHẨM!
      </div>
      ${hpTransitionHtml}
    `;
    layer.appendChild(callout);

    ScreenShake.shake(document.getElementById('arena-root'), Math.min(20, 8 + amount * 4), 380);

    if (callout.animate) {
      await callout.animate([
        { transform: 'translate(-50%, -30%) scale(0.35)', opacity: 0 },
        { transform: 'translate(-50%, -65%) scale(1.22)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -75%) scale(1.06)', opacity: 1, offset: 0.72 },
        { transform: 'translate(-50%, -105%) scale(0.92)', opacity: 0 }
      ], { duration: 920, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }).finished;
    } else {
      await new Promise(r => setTimeout(r, 450));
    }

    callout.remove();
    vignette.remove();

    return { targetPlayerId, targetPlayerName, amount, oldHp, newHp };
  }

  /**
   * Diễn hoạt lá bài bay theo đường cong Parabol giữa 2 vùng tọa độ
   */
  async flyCardBetweenZones({ fromZoneId, toZoneId, cardHtml, mode = 'STEAL', duration = 850 }) {
    const layer = this.ensureLayer();
    if (!layer) return;

    const startRect = this.getZoneRect(fromZoneId);
    const endRect = this.getZoneRect(toZoneId);

    const flyer = document.createElement('div');
    flyer.innerHTML = cardHtml;
    flyer.style.cssText = `
      position: fixed;
      left: ${startRect.left}px;
      top: ${startRect.top}px;
      width: 110px;
      height: 154px;
      transform-origin: center center;
      will-change: transform, left, top;
      filter: drop-shadow(0 15px 30px rgba(0,0,0,0.85));
      z-index: 500;
    `;
    layer.appendChild(flyer);

    if (mode === 'STEAL' && flyer.animate) {
      await flyer.animate([
        { transform: 'translateY(0) scale(1) rotate(0deg)' },
        { transform: 'translateY(-25px) scale(1.18) rotate(-10deg)', offset: 0.35 },
        { transform: 'translateY(-30px) scale(1.22) rotate(10deg)', offset: 0.7 },
        { transform: 'translateY(-20px) scale(1.15) rotate(0deg)' }
      ], { duration: 360, easing: 'ease-in-out' }).finished;
    }

    const midX = (startRect.left + endRect.left) / 2;
    const midY = Math.min(startRect.top, endRect.top) - 150;

    const keyframes = [
      {
        left: `${startRect.left}px`,
        top: `${startRect.top}px`,
        transform: 'translate3d(0,0,0) scale(1) rotateY(0deg) rotateZ(0deg)'
      },
      {
        left: `${midX}px`,
        top: `${midY}px`,
        transform: `translate3d(0,0,140px) scale(1.34) rotateY(${mode === 'STEAL' ? 180 : 0}deg) rotateZ(-8deg)`,
        offset: 0.5
      },
      {
        left: `${endRect.left}px`,
        top: `${endRect.top}px`,
        transform: 'translate3d(0,0,0) scale(1) rotateY(360deg) rotateZ(0deg)'
      }
    ];

    if (flyer.animate) {
      const anim = flyer.animate(keyframes, {
        duration,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards'
      });
      await anim.finished;

      await flyer.animate([
        { transform: 'scale(1.12) rotate(3deg)' },
        { transform: 'scale(0.97) rotate(-1deg)' },
        { transform: 'scale(1) rotate(0deg)' }
      ], { duration: 200, easing: 'ease-out' }).finished;
    }

    if (this.vfx) {
      const impactText = mode === 'STEAL' ? '⚡ CUỖM BÀI!' : (mode === 'BOMB' ? '🔥 BÙM! BOM HÀNG!' : (mode === 'TOLL' ? '💰 NỘP THUẾ!' : '🎴 BỐC BÀI!'));
      const impactColor = mode === 'STEAL' ? '#facc15' : (mode === 'BOMB' ? '#ef4444' : '#38bdf8');
      this.vfx.spawnParticles(endRect.left + 55, endRect.top + 77, impactColor, 32, impactText);
    }
    ScreenShake.shake(document.getElementById('arena-root'), 6, 200);

    flyer.remove();
  }

  /**
   * Diễn hoạt Đòn Tấn Công bị Bẫy Nghiệp Quật bẻ lái sang Người Chơi Thứ 3
   */
  async deflectAttackToThirdParty({ attackerZoneId, defenderZoneId, thirdPartyZoneId, cardHtml }) {
    const layer = this.ensureLayer();
    if (!layer) return;

    const atkRect = this.getZoneRect(attackerZoneId);
    const defRect = this.getZoneRect(defenderZoneId);
    const thirdRect = this.getZoneRect(thirdPartyZoneId);

    const flyer = document.createElement('div');
    flyer.innerHTML = cardHtml;
    flyer.style.cssText = `position:fixed;left:${atkRect.left}px;top:${atkRect.top}px;width:110px;height:154px;z-index:200;filter:drop-shadow(0 15px 30px rgba(0,0,0,0.85));`;
    layer.appendChild(flyer);

    if (flyer.animate) {
      await flyer.animate([
        { left: `${atkRect.left}px`, top: `${atkRect.top}px`, transform: 'scale(1) rotate(0deg)' },
        { left: `${defRect.left}px`, top: `${defRect.top}px`, transform: 'scale(1.3) rotate(14deg)' }
      ], { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }).finished;
    }

    if (this.vfx) {
      this.vfx.spawnParticles(defRect.left + 55, defRect.top + 55, '#c084fc', 48, '🪞 Ơ KÌA?! PHẢN ĐÒN!');
    }
    await ScreenShake.shake(document.getElementById('arena-root'), 10, 260);

    if (flyer.animate) {
      await flyer.animate([
        { left: `${defRect.left}px`, top: `${defRect.top}px`, transform: 'scale(1.3) rotate(14deg)' },
        { left: `${thirdRect.left}px`, top: `${thirdRect.top}px`, transform: 'scale(1.15) rotate(-360deg)' }
      ], { duration: 600, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)', fill: 'forwards' }).finished;
    }

    if (this.vfx) {
      this.vfx.spawnParticles(thirdRect.left + 55, thirdRect.top + 55, '#f43f5e', 50, '💥 ĐÒN PHẢN DỘI NGƯỢC!');
    }
    await ScreenShake.shake(document.getElementById('arena-root'), 14, 340);

    flyer.remove();
  }

  /**
   * Diễn hoạt Vòng Xoáy Hợp Thể Dung Hợp Huyền Thoại
   */
  async fusionVortex({ material1ZoneId, material2ZoneId, resultZoneId, fusionCardHtml }) {
    const layer = this.ensureLayer();
    if (!layer) return;

    const resRect = this.getZoneRect(resultZoneId);
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    if (this.vfx) {
      this.vfx.spawnParticles(centerX, centerY, '#d946ef', 60, '🌀 VÒNG XOÁY DUNG HỢP!');
    }

    const legendFlyer = document.createElement('div');
    legendFlyer.innerHTML = fusionCardHtml;
    legendFlyer.style.cssText = `
      position: fixed;
      left: ${centerX - 80}px;
      top: ${centerY - 110}px;
      width: 160px;
      height: 220px;
      z-index: 300;
      filter: drop-shadow(0 0 35px #d946ef) drop-shadow(0 20px 40px rgba(0,0,0,0.9));
    `;
    layer.appendChild(legendFlyer);

    if (legendFlyer.animate) {
      await legendFlyer.animate([
        { transform: 'scale(0.2) rotate(180deg)', opacity: 0 },
        { transform: 'scale(2.3) rotate(360deg)', opacity: 1, offset: 0.55 },
        { transform: 'scale(2.1) rotate(360deg)', opacity: 1, offset: 0.75 },
        {
          left: `${resRect.left}px`,
          top: `${resRect.top}px`,
          width: '110px',
          height: '154px',
          transform: 'scale(1) rotate(0deg)',
          opacity: 1
        }
      ], { duration: 1200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }).finished;
    }

    ScreenShake.shake(document.getElementById('arena-root'), 15, 420);
    legendFlyer.remove();
  }

  /**
   * Diễn hoạt Đòn Đánh Tấn Công theo Chủ Đề
   */
  async executeAttackStrike({
    attackerZoneId,
    targetZoneId,
    attackType = 'MELEE',
    cardId = '',
    customText = null,
    attackerCard = null,
    cardHtml = null
  }) {
    const atkRect = this.getZoneRect(attackerZoneId);
    const tarRect = this.getZoneRect(targetZoneId);

    const atkX = atkRect.left + atkRect.width / 2;
    const atkY = atkRect.top + atkRect.height / 2;
    const tarX = tarRect.left + tarRect.width / 2;
    const tarY = tarRect.top + tarRect.height / 2;

    let type = attackType;
    if (['CT-02', 'CT-09', 'DH-02'].includes(cardId)) type = 'CLAW';
    else if (['CT-01', 'DH-01'].includes(cardId)) type = 'LASER';
    else if (['CT-05', 'DH-03'].includes(cardId)) type = 'SONIC';
    else if (['CT-03', 'CT-15'].includes(cardId)) type = 'SPEED';
    else if (['DC-01', 'TR-02', 'TR-06', 'TR-10'].includes(cardId)) type = 'SLAP';
    else if (['TR-12'].includes(cardId)) type = 'EXPLOSION';

    const layer = this.ensureLayer();
    let flyer = null;
    if (layer && typeof document !== 'undefined') {
      const atkEl = this.getZoneElement(attackerZoneId);
      const renderedHtml = cardHtml || (attackerCard ? CardComponent.renderCardHtml(attackerCard) : (atkEl ? atkEl.innerHTML : ''));
      if (renderedHtml && renderedHtml.includes('card-item')) {
        flyer = document.createElement('div');
        flyer.innerHTML = renderedHtml;
        flyer.style.cssText = `
          position: fixed;
          left: ${atkRect.left}px;
          top: ${atkRect.top}px;
          width: ${Math.max(85, atkRect.width)}px;
          height: ${Math.max(120, atkRect.height)}px;
          z-index: 650;
          pointer-events: none;
          filter: drop-shadow(0 0 22px #facc15) drop-shadow(0 16px 32px rgba(0,0,0,0.9));
        `;
        layer.appendChild(flyer);
        if (flyer.animate) {
          const angleDeg = Math.atan2(tarY - atkY, tarX - atkX) * (180 / Math.PI) * 0.12;
          await flyer.animate([
            { left: `${atkRect.left}px`, top: `${atkRect.top}px`, transform: 'scale(1) rotate(0deg)' },
            { left: `${atkRect.left}px`, top: `${atkRect.top - 22}px`, transform: `scale(1.28) rotate(${-angleDeg}deg)`, offset: 0.35 },
            { left: `${tarRect.left}px`, top: `${tarRect.top}px`, transform: `scale(1.35) rotate(${angleDeg}deg)` }
          ], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }).finished;
        }
      }
    }

    if (typeof document !== 'undefined') {
      await ScreenShake.shake(document.getElementById('arena-root'), 5, 140);
    }

    if (this.vfx) {
      if (type === 'CLAW') {
        this.vfx.spawnSlash(tarX, tarY, '#ef4444', customText || '🐺 CÀO XÉ!');
      } else if (type === 'LASER') {
        this.vfx.spawnLaser(atkX, atkY, tarX, tarY, '#06b6d4', customText || '📸 LASER HÓNG HỚT!');
      } else if (type === 'SONIC') {
        this.vfx.spawnSonicBoom(tarX, tarY, '#f59e0b', customText || '🔊 TÙNG TÙNG BOOM!');
      } else if (type === 'EXPLOSION') {
        this.vfx.spawnParticles(tarX, tarY, '#f97316', 55, customText || '🔥 BÙM! NỔ LỬA THIÊNG!');
      } else if (type === 'SLAP') {
        this.vfx.spawnParticles(tarX, tarY, '#10b981', 45, customText || '⚡ ĐÒN SẤM SÉT!');
      } else if (type === 'SPEED') {
        this.vfx.spawnParticles(tarX, tarY, '#38bdf8', 40, customText || '🐎 PHI NƯỚC ĐẠI!');
      } else {
        this.vfx.spawnParticles(tarX, tarY, '#facc15', 35, customText || '⚔️ ĐÒN TẤN CÔNG!');
      }
    }

    if (typeof document !== 'undefined') {
      await ScreenShake.shake(document.getElementById('arena-root'), 12, 300);
    }

    if (flyer) {
      if (flyer.animate) {
        await flyer.animate([
          { left: `${tarRect.left}px`, top: `${tarRect.top}px`, transform: 'scale(1.35)' },
          { left: `${atkRect.left}px`, top: `${atkRect.top}px`, transform: 'scale(1)' }
        ], { duration: 240, easing: 'ease-out', fill: 'forwards' }).finished;
      }
      flyer.remove();
    }
  }

  /**
   * Diễn hoạt Điện Ảnh Tấn Công Khóa Đúng Mục Tiêu, Phá Hủy Lá Bài & Thể Hiện Kết Quả Bằng Hiệu Ứng Trên Màn Hình
   */
  async executeCinematicAttack({
    attackerZoneId,
    targetZoneId,
    attackerCard,
    defenderCard = null,
    targetPlayerName = 'Đối thủ',
    atkPower = 0,
    defPower = null,
    damageDealt = 0,
    attackerDestroyed = false,
    defenderDestroyed = false
  }) {
    const layer = this.ensureLayer();
    const atkRect = this.getZoneRect(attackerZoneId);
    const tarRect = this.getZoneRect(targetZoneId);

    const atkX = atkRect.left + atkRect.width / 2;
    const atkY = atkRect.top + atkRect.height / 2;
    const tarX = tarRect.left + tarRect.width / 2;
    const tarY = tarRect.top + tarRect.height / 2;

    const cardId = attackerCard?.cardId || attackerCard?.id || '';
    const attackerName = attackerCard?.name || 'Chiến Thần';
    const targetLabel = defenderCard ? `${defenderCard.name} (${defPower ?? 0} ⚔️)` : `TRỰC DIỆN: ${targetPlayerName}`;

    if (!layer || typeof document === 'undefined') {
      await this.executeAttackStrike({ attackerZoneId, targetZoneId, cardId });
      if (defenderDestroyed) {
        await this.executeCardDefeat({ zoneId: targetZoneId, card: defenderCard, cardId: defenderCard?.cardId });
      }
      if (attackerDestroyed) {
        await this.executeCardDefeat({ zoneId: attackerZoneId, card: attackerCard, cardId });
      }
      return {
        attackerZoneId,
        targetZoneId,
        defenderDestroyed,
        attackerDestroyed
      };
    }

    const atkSourceEl = this.getZoneElement(attackerZoneId);
    const tarSourceEl = this.getZoneElement(targetZoneId);

    // 1. Vẽ Tia Khóa Mục Tiêu (Target Lock Beam) & Tâm Ngắm Đỏ Rực
    const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgOverlay.setAttribute('width', '100%');
    svgOverlay.setAttribute('height', '100%');
    svgOverlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:610;';
    svgOverlay.innerHTML = `
      <defs>
        <linearGradient id="atk-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#facc15" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <line x1="${atkX}" y1="${atkY}" x2="${tarX}" y2="${tarY}"
            stroke="url(#atk-beam-grad)" stroke-width="5" stroke-dasharray="10,6"
            style="filter: drop-shadow(0 0 10px #ef4444);" />
      <circle cx="${tarX}" cy="${tarY}" r="38" fill="rgba(239,68,68,0.18)" stroke="#ef4444" stroke-width="3" stroke-dasharray="8,4" />
      <circle cx="${tarX}" cy="${tarY}" r="14" fill="none" stroke="#facc15" stroke-width="2.5" />
    `;
    layer.appendChild(svgOverlay);

    const targetLockBadge = document.createElement('div');
    targetLockBadge.style.cssText = `
      position: fixed;
      left: ${tarX}px;
      top: ${Math.max(18, tarRect.top - 32)}px;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #dc2626, #991b1b);
      color: #ffffff;
      border: 2px solid #facc15;
      border-radius: 999px;
      padding: 4px 14px;
      font-family: 'Montserrat', sans-serif;
      font-size: 11.5px;
      font-weight: 900;
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(0,0,0,0.85), 0 0 18px rgba(239,68,68,0.85);
      z-index: 680;
    `;
    targetLockBadge.textContent = `🎯 ${attackerName} ➔ ${targetLabel}`;
    layer.appendChild(targetLockBadge);

    if (tarSourceEl) {
      tarSourceEl.style.outline = '3px solid #ef4444';
      tarSourceEl.style.boxShadow = '0 0 25px rgba(239, 68, 68, 0.9)';
    }

    if (atkSourceEl) atkSourceEl.style.opacity = '0.25';

    const attackerFlyer = document.createElement('div');
    attackerFlyer.innerHTML = `
      <div style="position: relative; width: 110px; height: 154px;">
        ${CardComponent.renderCardHtml(attackerCard)}
        <div style="
          position: absolute;
          bottom: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #f59e0b, #dc2626);
          color: #fff;
          font-weight: 900;
          font-size: 12px;
          padding: 2px 10px;
          border-radius: 999px;
          border: 1.5px solid #fff;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.8);
          z-index: 20;
        ">⚔️ ${atkPower} ĐỘ CHIẾN</div>
      </div>
    `;
    attackerFlyer.style.cssText = `
      position: fixed;
      left: ${atkRect.left}px;
      top: ${atkRect.top}px;
      width: 110px;
      height: 154px;
      transform-origin: center center;
      z-index: 660;
      filter: drop-shadow(0 0 25px #facc15) drop-shadow(0 18px 34px rgba(0,0,0,0.9));
    `;
    layer.appendChild(attackerFlyer);

    if (attackerFlyer.animate) {
      await attackerFlyer.animate([
        { transform: 'translateY(0px) scale(1) rotate(0deg)' },
        { transform: 'translateY(-28px) scale(1.28) rotate(-8deg)' }
      ], { duration: 340, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }).finished;
    }

    const targetLeft = tarX - 55;
    const targetTop = tarY - 77;
    if (attackerFlyer.animate) {
      await attackerFlyer.animate([
        { left: `${atkRect.left}px`, top: `${atkRect.top}px`, transform: 'translateY(-28px) scale(1.28) rotate(-8deg)' },
        { left: `${targetLeft}px`, top: `${targetTop}px`, transform: 'translateY(0px) scale(1.38) rotate(6deg)' }
      ], { duration: 380, easing: 'cubic-bezier(0.32, 0, 0.15, 1)', fill: 'forwards' }).finished;
    }

    audioManager.playAttackClash();
    const clashBannerText = defenderCard
      ? `⚔️ ${attackerName} (${atkPower}) ⚡ VS ⚡ (${defPower ?? 0}) ${defenderCard.name}!`
      : `💥 ${attackerName} ĐÁNH TRỰC DIỆN ${targetPlayerName} (-${damageDealt} HP)!`;

    await this.executeAttackStrike({
      attackerZoneId,
      targetZoneId,
      cardId,
      customText: clashBannerText
    });

    svgOverlay.remove();
    targetLockBadge.remove();
    if (tarSourceEl) {
      tarSourceEl.style.outline = '';
      tarSourceEl.style.boxShadow = '';
    }

    if (!attackerDestroyed) {
      if (attackerFlyer.animate) {
        await attackerFlyer.animate([
          { left: `${targetLeft}px`, top: `${targetTop}px`, transform: 'scale(1.38) rotate(6deg)' },
          { left: `${atkRect.left}px`, top: `${atkRect.top}px`, transform: 'scale(1) rotate(0deg)' }
        ], { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }).finished;
      }
      attackerFlyer.remove();
      if (atkSourceEl) atkSourceEl.style.opacity = '1';
    } else {
      attackerFlyer.remove();
    }

    if (defenderDestroyed) {
      await this.executeCardDefeat({
        zoneId: targetZoneId,
        card: defenderCard,
        defeatType: 'SHATTER',
        cardId: defenderCard?.cardId || ''
      });
    }

    if (attackerDestroyed) {
      await this.executeCardDefeat({
        zoneId: attackerZoneId,
        card: attackerCard,
        defeatType: 'SHATTER',
        cardId
      });
      if (atkSourceEl) atkSourceEl.style.opacity = '1';
    }

    return {
      attackerZoneId,
      targetZoneId,
      defenderDestroyed,
      attackerDestroyed
    };
  }

  /**
   * Diễn hoạt Lá Bài Bị Tiêu Diệt / Phá Hủy Liền Mạch, Rõ Ràng
   */
  async executeCardDefeat({ zoneId, card = null, defeatType = 'SHATTER', cardId = '' }) {
    const rect = this.getZoneRect(zoneId);
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    if (defeatType === 'GHOST') {
      if (this.vfx) {
        this.vfx.spawnGhostAscent(x, y, '#14b8a6', '👻 HỒN MA BÁO OÁN!');
      }
      if (typeof document !== 'undefined') {
        await ScreenShake.shake(document.getElementById('arena-root'), 12, 320);
      }
      return;
    }

    const layer = this.ensureLayer();
    const zoneEl = this.getZoneElement(zoneId);
    const cardName = card?.name || 'Chiến Thần';

    if (layer && typeof document !== 'undefined') {
      const cardVisualHtml = card
        ? CardComponent.renderCardHtml(card)
        : (zoneEl && zoneEl.innerHTML.includes('card-item') ? zoneEl.innerHTML : '');

      if (cardVisualHtml) {
        if (zoneEl) zoneEl.style.opacity = '0.15';

        const doomedContainer = document.createElement('div');
        doomedContainer.className = 'doomed-card-destruction-stage';
        doomedContainer.style.cssText = `
          position: fixed;
          left: ${rect.left}px;
          top: ${rect.top}px;
          width: ${Math.max(96, rect.width)}px;
          height: ${Math.max(134, rect.height)}px;
          z-index: 720;
          pointer-events: none;
          transform-origin: center center;
          filter: drop-shadow(0 0 28px #ef4444) drop-shadow(0 12px 24px rgba(0,0,0,0.95));
        `;

        doomedContainer.innerHTML = `
          <div style="position: relative; width: 100%; height: 100%;">
            ${cardVisualHtml}
            <svg viewBox="0 0 110 154" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 30; pointer-events: none;">
              <path d="M12 6 L58 48 L36 78 L96 148 M88 12 L46 62 L74 96 L18 144 M55 0 L52 75 L105 82"
                    fill="none" stroke="#fef08a" stroke-width="3.5"
                    style="filter: drop-shadow(0 0 8px #ef4444);" />
              <rect x="2" y="2" width="106" height="150" rx="8" fill="rgba(239, 68, 68, 0.28)" stroke="#ef4444" stroke-width="4" />
            </svg>
            <div style="
              position: absolute;
              top: -28px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #ef4444, #991b1b);
              color: #ffffff;
              border: 2px solid #fef08a;
              border-radius: 999px;
              padding: 3px 12px;
              font-family: 'Montserrat', sans-serif;
              font-weight: 900;
              font-size: 11px;
              white-space: nowrap;
              box-shadow: 0 4px 14px rgba(0,0,0,0.9), 0 0 20px #ef4444;
              z-index: 40;
            ">💥 BỊ PHÁ HỦY: ${cardName}!</div>
          </div>
        `;
        layer.appendChild(doomedContainer);

        audioManager.playExplosion();

        if (doomedContainer.animate) {
          await doomedContainer.animate([
            { transform: 'scale(1.15) rotate(0deg)', filter: 'brightness(1.2) drop-shadow(0 0 25px #ef4444)' },
            { transform: 'scale(1.25) rotate(-7deg)', filter: 'brightness(1.6) drop-shadow(0 0 35px #facc15)', offset: 0.25 },
            { transform: 'scale(1.28) rotate(7deg)', filter: 'brightness(1.8) drop-shadow(0 0 40px #ef4444)', offset: 0.5 },
            { transform: 'scale(1.32) rotate(-5deg)', filter: 'brightness(2.2) contrast(1.4) drop-shadow(0 0 45px #ffffff)', offset: 0.8 },
            { transform: 'scale(1.45) rotate(0deg)', opacity: 0 }
          ], { duration: 580, easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)', fill: 'forwards' }).finished;
        }

        doomedContainer.remove();
        if (zoneEl) zoneEl.style.opacity = '1';
      }
    }

    if (this.vfx) {
      this.vfx.spawnCardShatter(x, y, rect.width, rect.height, '#f43f5e', `💥 NÁT BÀI: ${cardName}!`);
    }

    if (typeof document !== 'undefined') {
      await ScreenShake.shake(document.getElementById('arena-root'), 13, 300);
    }

    if (layer && typeof document !== 'undefined' && card) {
      const graveRect = this.getZoneRect('zone-graveyard');
      const soulOrb = document.createElement('div');
      soulOrb.style.cssText = `
        position: fixed;
        left: ${x - 24}px;
        top: ${y - 34}px;
        width: 48px;
        height: 68px;
        border-radius: 8px;
        background: radial-gradient(circle, #fef08a 0%, #ef4444 60%, #7f1d1d 100%);
        border: 2px solid #ffffff;
        box-shadow: 0 0 25px #ef4444;
        z-index: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
      `;
      soulOrb.textContent = '💥';
      layer.appendChild(soulOrb);

      if (soulOrb.animate) {
        await soulOrb.animate([
          { left: `${x - 24}px`, top: `${y - 34}px`, transform: 'scale(1.2) rotate(0deg)', opacity: 1 },
          { left: `${graveRect.left + 10}px`, top: `${graveRect.top + 10}px`, transform: 'scale(0.35) rotate(360deg)', opacity: 0.2 }
        ], { duration: 380, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }).finished;
      }
      audioManager.playGraveyardSend();
      soulOrb.remove();
    }
  }
}
