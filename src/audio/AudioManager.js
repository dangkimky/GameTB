import { ALL_96_CARDS, CARD_TYPES } from '../data/cards.js';

/**
 * AudioManager — Hệ thống tổng hợp âm thanh Web Audio API & Giọng đọc Anime Yu-Gi-Oh! (Web Speech API)
 * Hoạt động 100% tự lập bằng bộ tổng hợp âm sắc (Audio Synthesis) không phụ thuộc file ngoài.
 *
 * Nguyên tắc v4.4:
 * 1. CHỈ ĐỌC CÁC HIỆU ỨNG ĐANG KÍCH HOẠT (`hasTriggeredEffect !== false`), tuyệt đối KHÔNG đọc các hiệu ứng không kích hoạt để tránh mất thời gian.
 * 2. ĐỐI VỚI TẤN CÔNG (`category === 'ATTACK'`): Chỉ đọc Đối tượng tấn công và Mục tiêu tấn công (`"${cardName} tấn công ${targetName}!"`), kết quả sẽ thể hiện trực tiếp trên màn hình bằng các hiệu ứng tấn công và hiệu ứng trừ máu.
 * 3. Đọc tuần tự từng câu (`playSegmentAt`), chờ đọc xong mới tắt hiển thị và lập tức mở khóa thao tác.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    this.isMuted = false;
    this.volumes = {
      master: 0.8,
      sfx: 0.9,
      music: 0.5,
      voice: 1.0
    };

    this.activeSfxCount = 0;
    this.maxConcurrentSfx = 6;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.lastNarration = null;

    this.isSpeaking = false;
    this.currentSegmentIndex = -1;
    this.currentSpeechPromise = Promise.resolve();
    this._speechResolve = null;
    this._speechTimer = null;
    this._segmentTimers = [];
    this._activeUtterances = [];
    this._speechSessionId = 0;

    this.loadPreferences();
  }

  initAudioContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.updateGains();

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }
  }

  ensureAudio() {
    this.initAudioContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  loadPreferences() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('xom_audio_prefs');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.isMuted = parsed.isMuted ?? false;
          this.volumes = { ...this.volumes, ...(parsed.volumes || {}) };
        }
      }
    } catch (e) {}
  }

  savePreferences() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('xom_audio_prefs', JSON.stringify({
          isMuted: this.isMuted,
          volumes: this.volumes
        }));
      }
    } catch (e) {}
  }

  updateGains() {
    if (!this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volumes.master, now);
    this.sfxGain.gain.setValueAtTime(this.volumes.sfx, now);
    this.musicGain.gain.setValueAtTime(this.volumes.music, now);
  }

  setVolume(type, value) {
    if (this.volumes[type] !== undefined) {
      this.volumes[type] = Math.max(0, Math.min(1, value));
      this.updateGains();
      this.savePreferences();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopSpeaking();
    }
    this.updateGains();
    this.savePreferences();
    return this.isMuted;
  }

  // ==========================================
  // BỘ TỔNG HỢP HIỆU ỨNG ÂM THANH (SFX SYNTH)
  // ==========================================

  playDrawCard() {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
    osc.onended = () => this.activeSfxCount--;
  }

  playCardPlay() {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.14);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
    osc.onended = () => this.activeSfxCount--;
  }

  playAttackClash() {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.32);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.35);
    osc.onended = () => this.activeSfxCount--;
  }

  /**
   * Âm thanh đặc trưng khi bị Trừ Máu (HP Damage Impact)
   * Càng mất nhiều máu âm trầm càng vang dội kèm tiếng tim vỡ sắc nét
   */
  playHpDamage(amount = 1) {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const intensity = Math.min(1, 0.55 + amount * 0.15);

    // Lớp 1: Sub-bass chấn động khi mất máu
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(135, now);
    bassOsc.frequency.exponentialRampToValueAtTime(28, now + 0.42);
    bassGain.gain.setValueAtTime(intensity, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    bassOsc.connect(bassGain);
    bassGain.connect(this.sfxGain);
    bassOsc.start(now);
    bassOsc.stop(now + 0.46);

    // Lớp 2: Âm rạn vỡ Điểm Nhân Phẩm (Heart Shatter Overtones)
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'triangle';
    crackOsc.frequency.setValueAtTime(620, now + 0.04);
    crackOsc.frequency.exponentialRampToValueAtTime(190, now + 0.32);
    crackGain.gain.setValueAtTime(intensity * 0.6, now + 0.04);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    crackOsc.connect(crackGain);
    crackGain.connect(this.sfxGain);
    crackOsc.start(now + 0.04);
    crackOsc.stop(now + 0.36);

    bassOsc.onended = () => this.activeSfxCount--;
  }

  playTrapFlip() {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.28);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);
    osc.onended = () => this.activeSfxCount--;
  }

  playItemEquip() {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.16);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);
    osc.onended = () => this.activeSfxCount--;
  }

  playDeflect() {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.42);
    osc.onended = () => this.activeSfxCount--;
  }

  playFusion() {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const freqs = [330, 440, 550, 660];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.4);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
      if (idx === freqs.length - 1) {
        osc.onended = () => this.activeSfxCount--;
      }
    });
  }

  playExplosion() {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.65);
    osc.onended = () => this.activeSfxCount--;
  }

  playGraveyardSend() {
    this.ensureAudio();
    if (this.isMuted || !this.ctx || this.activeSfxCount >= this.maxConcurrentSfx) return;

    this.activeSfxCount++;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
    osc.onended = () => this.activeSfxCount--;
  }

  playTrapTrigger() {
    this.playTrapFlip();
  }

  // ==========================================
  // HỆ THỐNG ĐỌC HIỆU ỨNG ĐANG KÍCH HOẠT & TUYÊN BỐ TẤN CÔNG GỌN NHANH
  // ==========================================

  getSegmentReadingDurationMs(text = '', segmentIndex = 0) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    const minForSegment = segmentIndex === 0 ? 1200 : 1650;
    return Math.max(minForSegment, Math.min(5400, words * 205 + 400));
  }

  stopSpeaking() {
    this._speechSessionId++;
    if (this._speechTimer) {
      clearTimeout(this._speechTimer);
      this._speechTimer = null;
    }
    if (Array.isArray(this._segmentTimers)) {
      this._segmentTimers.forEach(t => clearTimeout(t));
      this._segmentTimers = [];
    }
    this._activeUtterances = [];
    this.isSpeaking = false;
    this.currentSegmentIndex = -1;
    if (typeof this._speechResolve === 'function') {
      const resolve = this._speechResolve;
      this._speechResolve = null;
      resolve();
    }
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  }

  async waitForSpeech(maxWaitMs = 18000) {
    if (!this.isSpeaking) return;
    await Promise.race([
      this.currentSpeechPromise,
      new Promise(resolve => setTimeout(resolve, maxWaitMs))
    ]);
  }

  cleanTextForSpeech(rawText = '') {
    return String(rawText || '')
      .replace(/⚔️/g, ' Độ Chiến ')
      .replace(/🛡️/g, ' Phòng Thủ ')
      .replace(/♥/g, ' Nhân Phẩm ')
      .replace(/\bHP\b/g, ' Nhân Phẩm ')
      .replace(/\bdmg\b/gi, ' sát thương ')
      .replace(/\+([0-9]+)/g, ' cộng $1 ')
      .replace(/(?<!\w)-([0-9]+)/g, ' trừ $1 ')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
      .replace(/\[|\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  stripCasterAndBoilerplate(rawText = '', activatorName = '', cardName = '') {
    let text = this.cleanTextForSpeech(rawText);
    if (!text) return '';

    if (activatorName) {
      const escapedActor = activatorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`^${escapedActor}\\s+`, 'i'), '');
    }

    text = text
      .replace(/^(SỰ TÍCH KHỞI PHÁT!|HIẾN TẾ!|DUNG HỢP THẦN THOẠI!|GỌI BẦY LINH THÚ!|LẬT BẪY!|BẪY LẬT:?|CỘNG HƯỞNG ĐỒNG TỘC!)\s*/i, '')
      .replace(/^[A-Z]{2}\s*(?:trừ\s*)?\d{2}\s+[^:]+:\s*/i, '')
      .replace(/^[A-Z]{2}-\d{2}\s+[^:]+:\s*/i, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (activatorName) {
      const escapedActor = activatorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`^${escapedActor}\\s*`, 'i'), '');
    }

    return text.trim();
  }

  /**
   * Lọc ra đúng vế hiệu ứng đang thực sự kích hoạt, loại bỏ các vế điều kiện chưa kích hoạt
   * (Ví dụ: khi vừa trang bị DC-01 thì chỉ đọc phần "+2 Độ Chiến", không đọc phần "Nếu bị tiêu diệt...")
   */
  extractActiveClauseOnly(fullCardEffect = '', category = 'SUMMON') {
    const raw = String(fullCardEffect || '').trim();
    if (!raw) return '';
    const clauses = raw.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    if (clauses.length <= 1) return raw;

    if (category === 'EQUIP') {
      const immediateClauses = clauses.filter(c => !/^(Nếu|Khi Linh Thú.*bị tiêu diệt|Khi đánh thắng)/i.test(c));
      if (immediateClauses.length > 0) return immediateClauses.join(' ');
    } else if (category === 'SUMMON' || category === 'TRIBUTE' || category === 'FUSION') {
      const summonClauses = clauses.filter(c => !/^(Nếu bị tiêu diệt|Lần đầu tiên bị đánh bại|Khi bị tiêu diệt)/i.test(c));
      if (summonClauses.length > 0) return summonClauses.join(' ');
    }
    return raw;
  }

  summarizeEffectForVoice(rawText = '', maxWords = 26, activatorName = '') {
    const cleaned = this.stripCasterAndBoilerplate(rawText, activatorName)
      .replace(/^(Khi vừa triệu hồi|Khi vừa xuất hiện|Khi vừa giáng lâm|Khi tuyên bố tấn công|Khi bị tiêu diệt bởi đòn tấn công|Đầu mỗi lượt của bạn|Mỗi đầu lượt|Một lần mỗi lượt|Một lần trong lượt|Tuyệt kỹ trên sân)\s*:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return '';

    const parts = cleaned.split(/\s*•\s*/).filter(Boolean);
    const corePart = parts.length > 1 ? parts[parts.length - 1] : parts[0];

    const words = corePart.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) {
      return corePart.replace(/[.!?]+$/, '');
    }
    return words.slice(0, maxWords).join(' ').replace(/[.!?]+$/, '');
  }

  buildFallbackResultForVoice({
    card = null,
    cardData = {},
    category = 'SUMMON',
    cardName = 'Thẻ Bài',
    power = null,
    targetName = '',
    atkPower = null
  } = {}) {
    const effectivePower = atkPower !== null && atkPower !== undefined
      ? atkPower
      : (power !== null && power !== undefined ? power : cardData?.power);

    switch (category) {
      case 'SUMMON':
      case 'TRIBUTE':
      case 'FUSION':
        if (effectivePower !== undefined && effectivePower !== null) {
          return `${cardName} trấn giữ trên sân với ${effectivePower} Độ Chiến và kích hoạt nội tại`;
        }
        return `${cardName} đã xuất trận và kích hoạt nội tại trên sân`;
      case 'EQUIP': {
        const bonus = cardData?.powerBonus;
        if (bonus !== undefined && bonus !== 0) {
          const signText = bonus > 0 ? `tăng ${bonus}` : `giảm ${Math.abs(bonus)}`;
          return `Gắn pháp bảo thành công, ${signText} Độ Chiến và kích hoạt hiệu ứng trang bị`;
        }
        return `Gắn pháp bảo ${cardName} thành công và kích hoạt hiệu ứng hỗ trợ`;
      }
      case 'DRAMA':
        return `Phép sự tích ${cardName} đã phát huy hiệu lực trên bàn đấu`;
      case 'TRAP':
        return `Bẫy thiên cơ ${cardName} đã lật ngửa và phát động phản đòn`;
      case 'ATTACK':
        if (targetName) {
          return `${cardName} tấn công ${targetName}`;
        }
        return `${cardName} tấn công trực diện đối thủ`;
      case 'PASSIVE':
      case 'SKILL':
        return `Hiệu ứng của ${cardName} đã kích hoạt thành công trên sân`;
      case 'GHOST':
        return `Ám quẻ ${cardName} đã giáng xuống bàn đấu`;
      default:
        return `${cardName} đã hoàn tất kích hoạt hiệu ứng`;
    }
  }

  extractResultSummaryForVoice(rawTriggered = '', fullCardEffect = '', activatorName = '', cardName = '', maxWords = 26, fallbackOptions = {}) {
    if (rawTriggered) {
      const rawParts = String(rawTriggered).split(/\s*•\s*/).map(s => s.trim()).filter(Boolean);

      const meaningfulParts = rawParts.filter(part => {
        const cleanP = this.cleanTextForSpeech(part);
        if (/triệu hồi thường .* Độ Chiến\s*!?$/i.test(cleanP)) return false;
        if (/triệu hồi nhanh .* lên sân\s*!?$/i.test(cleanP)) return false;
        if (/SỰ TÍCH KHỞI PHÁT! .* tung ra:/i.test(cleanP)) return false;
        if (/LẬT BẪY! .* kích hoạt Bẫy Thiên Cơ:/i.test(cleanP)) return false;
        if (/HIẾN TẾ! .* gọi ra Thần Thú/i.test(cleanP)) return false;
        if (/DUNG HỢP THẦN THOẠI! .* triệu hồi/i.test(cleanP)) return false;
        return true;
      });

      if (meaningfulParts.length > 0) {
        const joinedMeaningful = meaningfulParts.slice(-2).join(', ');
        const summary = this.summarizeEffectForVoice(joinedMeaningful, maxWords, activatorName);
        if (summary && summary.toLowerCase() !== String(fullCardEffect || '').trim().toLowerCase()) {
          return summary;
        }
      }

      if (rawParts.length > 0) {
        const lastRaw = this.stripCasterAndBoilerplate(rawParts[rawParts.length - 1], activatorName, cardName);
        if (lastRaw && !/^(triệu hồi|tung ra|kích hoạt)/i.test(lastRaw)) {
          const summary = this.summarizeEffectForVoice(lastRaw, maxWords, activatorName);
          if (summary) return summary;
        }
      }
    }

    return this.buildFallbackResultForVoice(fallbackOptions);
  }

  /**
   * Xây dựng kịch bản đọc thẻ bài:
   * - Nếu `hasTriggeredEffect === false`: Không đọc hiệu ứng không kích hoạt (`isSkippedInactive: true`, `sentences: []`).
   * - Nếu `category === 'ATTACK'`: CHỈ đọc Đối tượng tấn công và Mục tiêu tấn công (`sentences: [cleanDeclaration]`),
   *   kết quả giao tranh sẽ thể hiện trực tiếp bằng các hiệu ứng tấn công và hiệu ứng trừ máu trên màn hình!
   * - Nếu hiệu ứng đang thực sự kích hoạt (`category !== 'ATTACK'`): Đọc phần khai chiêu, nội dung hiệu ứng đang kích hoạt và kết quả.
   */
  buildYugiohNarration({
    card = null,
    activatorName = 'Người chơi',
    category = 'SUMMON',
    title = '',
    description = '',
    triggeredEffectText = '',
    targetName = '',
    isDirectAttack = false,
    atkPower = null,
    defPower = null,
    hasTriggeredEffect = true
  } = {}) {
    const cardId = card?.cardId || card?.id || '';
    const cardData = ALL_96_CARDS[cardId] || card || {};
    const cardName = card?.name || cardData?.name || title || 'Thẻ Bài';
    const type = card?.type || cardData?.type || '';
    const power = atkPower !== null && atkPower !== undefined
      ? atkPower
      : (card?.power !== undefined ? card.power : (card?.basePower !== undefined ? card.basePower : cardData?.power));

    const powerShort = (power !== undefined && power !== null && [CARD_TYPES.LOW_MONSTER, CARD_TYPES.HIGH_MONSTER, CARD_TYPES.FUSION_MONSTER].includes(type))
      ? `, ${power} Độ Chiến`
      : '';

    const fullCardEffect = (
      description ||
      cardData?.description ||
      cardData?.aliveAbility ||
      cardData?.ghostAbility ||
      card?.description ||
      'Khai mở thần lực chiến đấu trên bàn cờ.'
    ).trim();

    // 1. Trường hợp hiệu ứng KHÔNG kích hoạt -> Bỏ qua không đọc để tránh mất thời gian!
    if (hasTriggeredEffect === false) {
      return {
        cardId,
        cardName,
        category,
        power,
        animeDeclaration: '',
        fullCardEffect,
        triggeredEffect: '',
        hasDistinctTriggered: false,
         isSkippedInactive: true,
        effectSummary: '',
        resultSummary: '',
        conciseEffectSummary: '',
        spokenText: '',
        fullSpeechText: '',
        sentences: [],
        segmentDurations: [],
        totalExpectedDurationMs: 0
      };
    }

    // 2. Trường hợp TẤN CÔNG (ATTACK): CHỈ đọc Đối tượng tấn công và Mục tiêu tấn công!
    if (category === 'ATTACK') {
      const targetClause = targetName
        ? (isDirectAttack ? `tấn công trực diện ${targetName}` : `tấn công ${targetName}`)
        : 'tấn công trực diện';
      const animeDeclaration = `${cardName} ${targetClause}!`;
      const cleanDeclaration = this.cleanTextForSpeech(animeDeclaration).replace(/[.!?]+$/, '').trim();
      const sentences = [cleanDeclaration];
      const segmentDurations = [this.getSegmentReadingDurationMs(cleanDeclaration, 0)];
      const totalExpectedDurationMs = segmentDurations[0];
      const spokenText = `${cleanDeclaration}.`;

      return {
        cardId,
        cardName,
        category,
        power,
        animeDeclaration,
        fullCardEffect,
        triggeredEffect: triggeredEffectText || animeDeclaration,
        hasDistinctTriggered: false,
        isAttackOnlyCallout: true,
        effectSummary: cleanDeclaration,
        resultSummary: cleanDeclaration,
        conciseEffectSummary: cleanDeclaration,
        spokenText,
        fullSpeechText: spokenText,
        sentences,
        segmentDurations,
        totalExpectedDurationMs
      };
    }

    // 3. Trường hợp Hiệu Ứng Đang Thực Sự Kích Hoạt
    let animeDeclaration = '';
    switch (category) {
      case 'SUMMON':
        animeDeclaration = `Triệu hồi ${cardName}${powerShort}!`;
        break;
      case 'TRIBUTE':
        animeDeclaration = `Hiến tế triệu hồi ${cardName}${powerShort}!`;
        break;
      case 'FUSION':
        animeDeclaration = `Dung hợp triệu hồi ${cardName}${powerShort}!`;
        break;
      case 'DRAMA':
        animeDeclaration = `Phát động phép ${cardName}!`;
        break;
      case 'EQUIP':
        animeDeclaration = `Trang bị pháp bảo ${cardName}!`;
        break;
      case 'TRAP':
        animeDeclaration = `Lật bẫy ${cardName}!`;
        break;
      case 'PASSIVE':
        animeDeclaration = `Kích hoạt hiệu ứng ${cardName}!`;
        break;
      case 'SKILL':
        animeDeclaration = `Kích hoạt tuyệt kỹ ${cardName}!`;
        break;
      case 'GHOST':
        animeDeclaration = `Ám quẻ ${cardName}!`;
        break;
      default:
        animeDeclaration = `Kích hoạt ${cardName}!`;
        break;
    }

    const activeClauseText = this.extractActiveClauseOnly(fullCardEffect, category);
    const rawTriggered = (triggeredEffectText || '').trim();

    const effectSummary = this.summarizeEffectForVoice(activeClauseText, 26, activatorName) ||
      this.cleanTextForSpeech(activeClauseText);

    const resultSummary = this.extractResultSummaryForVoice(
      rawTriggered,
      activeClauseText,
      activatorName,
      cardName,
      26,
      { card, cardData, category, cardName, power, targetName, atkPower, defPower }
    );

    const cleanDeclaration = this.cleanTextForSpeech(animeDeclaration);
    const cleanEffectSentence = `Hiệu ứng: ${this.cleanTextForSpeech(effectSummary)}`;
    const cleanResultSentence = `Kết quả: ${this.cleanTextForSpeech(resultSummary)}`;

    const sentences = [
      cleanDeclaration,
      cleanEffectSentence,
      cleanResultSentence
    ].filter(Boolean);

    const segmentDurations = sentences.map((s, idx) => this.getSegmentReadingDurationMs(s, idx));
    const totalExpectedDurationMs = segmentDurations.reduce((acc, d) => acc + d, 0);

    const spokenText = sentences.join('. ') + '.';
    const conciseEffectSummary = `${effectSummary}. Kết quả: ${resultSummary}`;

    const fullSpeechText = [
      cleanDeclaration,
      `Hiệu ứng kích hoạt: ${this.cleanTextForSpeech(activeClauseText)}`,
      `Kết quả khi kích hoạt: ${this.cleanTextForSpeech(resultSummary)}`
    ].filter(Boolean).join('. ');

    return {
      cardId,
      cardName,
      category,
      power,
      animeDeclaration,
      fullCardEffect,
      triggeredEffect: rawTriggered || resultSummary,
      hasDistinctTriggered: true,
      effectSummary,
      resultSummary,
      conciseEffectSummary,
      spokenText,
      fullSpeechText,
      sentences,
      segmentDurations,
      totalExpectedDurationMs
    };
  }

  /**
   * Đọc ngắn gọn tuyên bố tấn công: Chỉ đọc Đối tượng tấn công và Mục tiêu tấn công!
   */
  speakAttackDeclaration({ card = null, attackerName = '', targetName = '', isDirectAttack = false } = {}) {
    return this.speakYugiohActivation({
      card,
      activatorName: attackerName,
      category: 'ATTACK',
      targetName,
      isDirectAttack,
      hasTriggeredEffect: true
    });
  }

  /**
   * Phát giọng đọc của hiệu ứng đang kích hoạt
   */
  speakYugiohActivation(options = {}) {
    const narration = this.buildYugiohNarration(options);
    this.lastNarration = narration;
    const onSegmentChange = typeof options.onSegmentChange === 'function' ? options.onSegmentChange : null;

    this.stopSpeaking();

    if (narration.isSkippedInactive || typeof document === 'undefined') {
      return narration;
    }

    const segments = Array.isArray(narration.sentences) && narration.sentences.length > 0
      ? narration.sentences
      : [narration.spokenText].filter(Boolean);

    if (segments.length === 0) return narration;

    const sessionId = ++this._speechSessionId;
    this.isSpeaking = true;
    this.currentSegmentIndex = 0;
    this._activeUtterances = [];
    this._segmentTimers = [];

    const hasSynth = Boolean(!this.isMuted && typeof window !== 'undefined' && window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined');
    const totalExpected = narration.totalExpectedDurationMs || 4500;
    const safetyMaxMs = Math.max(8000, Math.min(20000, totalExpected + 4000));

    this.currentSpeechPromise = new Promise((resolve) => {
      this._speechResolve = resolve;

      const finishAllSpeech = () => {
        if (this._speechSessionId !== sessionId) return;
        if (this._speechTimer) {
          clearTimeout(this._speechTimer);
          this._speechTimer = null;
        }
        if (Array.isArray(this._segmentTimers)) {
          this._segmentTimers.forEach(t => clearTimeout(t));
          this._segmentTimers = [];
        }
        this.isSpeaking = false;
        this.currentSegmentIndex = segments.length;
        this._activeUtterances = [];
        if (onSegmentChange) {
          try { onSegmentChange(segments.length, ''); } catch (e) {}
        }
        if (typeof this._speechResolve === 'function') {
          const r = this._speechResolve;
          this._speechResolve = null;
          r();
        }
      };

      this._speechTimer = setTimeout(finishAllSpeech, safetyMaxMs);

      const playSegmentAt = (idx) => {
        if (this._speechSessionId !== sessionId) return;
        if (idx >= segments.length) {
          const waitUntilSynthQuiet = () => {
            if (this._speechSessionId !== sessionId) return;
            if (hasSynth && window.speechSynthesis && window.speechSynthesis.speaking) {
              const pollTimer = setTimeout(waitUntilSynthQuiet, 70);
              this._segmentTimers.push(pollTimer);
            } else {
              finishAllSpeech();
            }
          };
          waitUntilSynthQuiet();
          return;
        }

        this.currentSegmentIndex = idx;
        const segText = segments[idx];
        const minSegMs = narration.segmentDurations?.[idx] || this.getSegmentReadingDurationMs(segText, idx);

        if (onSegmentChange) {
          try { onSegmentChange(idx, segText); } catch (e) {}
        }

        let minTimerDone = false;
        let utteranceDone = !hasSynth;
        let advanced = false;

        const tryAdvanceNext = () => {
          if (advanced || this._speechSessionId !== sessionId) return;
          if (minTimerDone && utteranceDone) {
            advanced = true;
            playSegmentAt(idx + 1);
          }
        };

        const segTimer = setTimeout(() => {
          minTimerDone = true;
          tryAdvanceNext();
        }, minSegMs);
        this._segmentTimers.push(segTimer);

        if (hasSynth) {
          try {
            const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
            const viVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('vi'));

            const utterance = new SpeechSynthesisUtterance(segText);
            utterance.lang = 'vi-VN';
            utterance.volume = this.volumes.voice;
            utterance.rate = 1.18;
            utterance.pitch = idx === 0 ? 1.08 : 1.02;
            if (viVoice) utterance.voice = viVoice;

            utterance.onend = () => {
              utteranceDone = true;
              tryAdvanceNext();
            };
            utterance.onerror = () => {
              utteranceDone = true;
              tryAdvanceNext();
            };

            this._activeUtterances.push(utterance);
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            utteranceDone = true;
            tryAdvanceNext();
          }
        }
      };

      const startTimer = setTimeout(() => playSegmentAt(0), 25);
      this._segmentTimers.push(startTimer);
    });

    return narration;
  }

  speakCallout(phrase, options = {}) {
    this.stopSpeaking();
    if (this.isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      const cleanPhrase = this.summarizeEffectForVoice(phrase, 24);
      if (!cleanPhrase) return;

      const sessionId = ++this._speechSessionId;
      this.isSpeaking = true;
      this._activeUtterances = [];
      const timeoutMs = Math.max(2200, Math.min(5500, cleanPhrase.length * 50));

      this.currentSpeechPromise = new Promise((resolve) => {
        this._speechResolve = resolve;
        this._speechTimer = setTimeout(() => {
          if (this._speechSessionId === sessionId) {
            this.isSpeaking = false;
            this._activeUtterances = [];
            this._speechResolve = null;
            resolve();
          }
        }, timeoutMs);
      });

      const utterance = new SpeechSynthesisUtterance(cleanPhrase);
      utterance.lang = 'vi-VN';
      utterance.volume = this.volumes.voice;
      utterance.rate = options.rate || 1.18;
      utterance.pitch = options.pitch || 1.04;

      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      const viVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('vi'));
      if (viVoice) utterance.voice = viVoice;

      const finishSpeech = () => {
        if (this._speechSessionId !== sessionId) return;
        if (this._speechTimer) {
          clearTimeout(this._speechTimer);
          this._speechTimer = null;
        }
        this.isSpeaking = false;
        this._activeUtterances = [];
        if (typeof this._speechResolve === 'function') {
          const r = this._speechResolve;
          this._speechResolve = null;
          r();
        }
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      this._activeUtterances.push(utterance);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.isSpeaking = false;
    }
  }

  playVoiceCallout(phrase = 'Kích hoạt!', options = {}) {
    this.speakCallout(phrase, options);
  }

  startAmbientMusic() {
    this.ensureAudio();
    if (this.musicPlaying || !this.ctx) return;
    this.musicPlaying = true;

    const baseFrequencies = [130.81, 146.83, 164.81, 196.00];
    let noteIdx = 0;

    const playBassBeat = () => {
      if (!this.musicPlaying || this.isMuted || !this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = baseFrequencies[noteIdx % baseFrequencies.length];
      noteIdx++;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.9, now + 0.6);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain ? this.musicGain : this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);

      this.musicTimer = setTimeout(playBassBeat, 900);
    };

    playBassBeat();
  }

  stopAmbientMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  testSound(type) {
    this.ensureAudio();
    switch (type) {
      case 'draw': this.playDrawCard(); break;
      case 'card': this.playCardPlay(); break;
      case 'attack': this.playAttackClash(); break;
      case 'damage': this.playHpDamage(2); break;
      case 'trap': this.playTrapFlip(); break;
      case 'equip': this.playItemEquip(); break;
      case 'deflect': this.playDeflect(); break;
      case 'fusion': this.playFusion(); break;
      case 'explosion': this.playExplosion(); break;
      case 'voice':
        this.speakYugiohActivation({
          card: ALL_96_CARDS['DH-02'],
          activatorName: 'Chủ Xóm',
          category: 'FUSION',
          triggeredEffectText: 'Đánh lan cùng lúc vào 2 đối thủ!'
        });
        break;
      default: this.playCardPlay(); break;
    }
  }
}

export const audioManager = new AudioManager();
