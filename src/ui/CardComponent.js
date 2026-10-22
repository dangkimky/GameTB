import { ALL_96_CARDS, CARD_TYPES } from '../data/cards.js';
import { getCardArtSvg } from '../data/cardImages.js';

/**
 * CardComponent — Render giao diện Thẻ Bài 2.5D (5 Lớp: Backdrop, Tribe Aura, Cutout, Hologram, HUD)
 * Phong cách Thần Thoại & Dân Gian Việt Nam (Vietnamese Mythic Pop-Art)
 */
export class CardComponent {
  /**
   * Tạo cấu trúc HTML cho một Thẻ Bài 2.5D (5 Lớp)
   */
  static renderCardHtml(cardInstance, options = {}) {
    if (!cardInstance) return '';

    const cardId = cardInstance.cardId || cardInstance.id || '';
    const cardData = ALL_96_CARDS[cardId] || cardInstance || {};
    const faceDown = options.faceDown || false;
    const isSelected = options.isSelected || false;
    const isGhost = options.isGhost || false;
    const isShowcase = options.isShowcase || false;
    const customClass = [options.customClass || '', isShowcase ? 'card-showcase-mode' : ''].filter(Boolean).join(' ');

    // Nếu là bài úp (Bẫy chưa lật hoặc bài úp của đối thủ)
    if (faceDown) {
      return `
        <div class="card-item ${customClass} ${isSelected ? 'selected' : ''}" data-instance-id="${cardInstance.instanceId || ''}" data-card-id="" data-is-facedown="true">
          <div class="card-back-design">
            <div class="card-back-emblem">
              <span style="font-size: 22px;">🐉</span>
            </div>
            <div class="card-back-text">THẦN THOẠI VIỆT</div>
          </div>
        </div>
      `;
    }

    const type = cardInstance.type || cardData.type || CARD_TYPES.LOW_MONSTER;
    const tribe = cardInstance.tribe || cardData.tribe || '';
    let basePower = cardInstance.power !== undefined ? cardInstance.power : (cardInstance.basePower !== undefined ? cardInstance.basePower : cardData.power);
    if (basePower !== undefined && basePower !== null && Array.isArray(cardInstance.statusEffects)) {
      const delta = cardInstance.statusEffects.reduce((sum, eff) => sum + (eff.powerDelta || 0), 0);
      basePower = Math.max(0, basePower + delta);
    }
    const power = basePower;
    const hasHolo = [CARD_TYPES.HIGH_MONSTER, CARD_TYPES.FUSION_MONSTER].includes(type);
    const displayName = cardInstance.name || cardData.name || 'Thẻ Bài';
    const displayDesc = cardInstance.description || cardData.description || cardData.aliveAbility || '';

    // Tính toán badge trang bị nếu có
    let equipsHtml = '';
    if (cardInstance.equippedItems && cardInstance.equippedItems.length > 0) {
      equipsHtml = `
        <div class="equipped-badge-list">
          ${cardInstance.equippedItems.map(item => `
            <div class="equip-mini-pill" title="${item.name}">🛡️ ${item.name}</div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="card-item tribe-${tribe} ${customClass} ${isSelected ? 'selected' : ''}"
           data-instance-id="${cardInstance.instanceId || ''}"
           data-card-id="${cardId}">
        <div class="card-inner type-${type}">
          <!-- LỚP 1: CardBackdrop -->
          <div class="card-layer-backdrop" style="background-color: ${this.getBackdropColor(type, tribe)};"></div>

          <!-- LỚP 2: TribeAuraLayer -->
          <div class="card-layer-aura"></div>

          <!-- LỚP 3: CharacterCutout -->
          <div class="card-layer-cutout">
            <img class="card-art-img"
                 src="assets/cards/${cardId}${isGhost ? '_ghost' : ''}.png"
                 alt="${displayName}"
                 onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';"
                 onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';"
                 style="display:none;" />
            <div class="card-art-fallback" style="width:100%; height:100%;">
              ${getCardArtSvg(cardId, isGhost)}
            </div>
          </div>

          <!-- LỚP 4: HolographicShader (Chỉ cho Boss & Dung Hợp) -->
          ${hasHolo ? '<div class="card-layer-holo"></div>' : ''}

          <!-- LỚP 5: CardHUD -->
          <div class="card-layer-hud">
            <div class="card-header-bar">
              <span class="card-name-title" title="${displayName}">${displayName}</span>
              ${power !== undefined && power !== null ? `
                <div class="card-power-badge">⚔️ ${power}</div>
              ` : ''}
            </div>

            <div class="card-footer-box">
              <div class="card-desc-text" title="${displayDesc}">
                ${displayDesc}
              </div>
            </div>
          </div>
        </div>
        ${equipsHtml}
      </div>
    `;
  }

  static getBackdropColor(type, tribe) {
    switch (type) {
      case CARD_TYPES.HIGH_MONSTER: return '#3b0d18';
      case CARD_TYPES.FUSION_MONSTER: return '#3b1847';
      case CARD_TYPES.EQUIPMENT: return '#082f25';
      case CARD_TYPES.DRAMA: return '#0c274d';
      case CARD_TYPES.TRAP: return '#27104d';
      case CARD_TYPES.CURSE: return '#063d36';
      default:
        if (tribe === 'HONG_HOT') return '#083344';
        if (tribe === 'QUAY_PHA') return '#4c0519';
        if (tribe === 'TOC_DO') return '#422006';
        if (tribe === 'AN_VA') return '#2e1065';
        return '#1e1b4b';
    }
  }

  static getCardIconSymbol(cardId, type, tribe) {
    if (cardId?.startsWith('NV')) return '👑';
    if (type === CARD_TYPES.EQUIPMENT) return '🛠️';
    if (type === CARD_TYPES.DRAMA) return '📜';
    if (type === CARD_TYPES.TRAP) return '⚠️';
    if (type === CARD_TYPES.CURSE) return '👻';
    if (type === CARD_TYPES.FUSION_MONSTER) return '🐉';
    if (type === CARD_TYPES.HIGH_MONSTER) return '👑';
    return '🃏';
  }
}
