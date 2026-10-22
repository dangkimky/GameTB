/**
 * CanvasVFXEngine — Hệ thống hiệu ứng hạt 2D, Chữ truyện tranh Pop-Art & Hiệu ứng Trừ Máu Đặc Sắc trên sàn đấu
 */
export class CanvasVFXEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.textBanners = [];
    this.shockwaves = [];
    this.animating = false;

    if (typeof window !== 'undefined') {
      this.initCanvas();
    }
  }

  initCanvas() {
    let el = document.getElementById('arena-vfx-canvas');
    if (!el) {
      el = document.createElement('canvas');
      el.id = 'arena-vfx-canvas';
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;';
      document.body.appendChild(el);
    }
    this.canvas = el;
    this.ctx = el.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Sinh cụm hạt ánh sáng nổ tung kèm chữ Pop-Art nổi
   */
  spawnParticles(x, y, color = '#facc15', count = 30, text = null) {
    if (!this.ctx) return;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color,
        alpha: 1,
        life: 0.02 + Math.random() * 0.03
      });
    }

    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: 80,
      color,
      alpha: 1,
      lineWidth: 4
    });

    if (text) {
      this.textBanners.push({
        text,
        x,
        y: y - 20,
        vy: -1.2,
        scale: 0.5,
        targetScale: 1.25,
        color,
        alpha: 1,
        life: 0.015
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.loop();
    }
  }

  /**
   * Hiệu ứng Nổ Sát Thương Trừ Máu Đặc Sắc (Blood / HP Damage Burst)
   * Hiển thị sóng xung kích đỏ rực, mảnh vỡ tim 💔 và con số -HP khổng lồ
   */
  spawnBloodDamageBurst(x, y, amount = 1, playerName = '', oldHp = null, newHp = null) {
    if (!this.ctx) return;

    const palette = ['#ef4444', '#dc2626', '#fb7185', '#f97316', '#facc15'];

    // 1. 3 Vòng sóng xung kích đỏ rực lan tỏa
    for (let i = 0; i < 3; i++) {
      this.shockwaves.push({
        x,
        y,
        radius: 8 + i * 16,
        maxRadius: 120 + i * 35 + amount * 15,
        color: i === 0 ? '#ef4444' : (i === 1 ? '#f97316' : '#facc15'),
        alpha: 1,
        lineWidth: 6 - i
      });
    }

    // 2. Mảnh vỡ tim & tia máu năng lượng bắn tung tóe
    const shardCount = Math.min(48, 22 + amount * 8);
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8.5;
      const color = palette[i % palette.length];
      this.particles.push({
        type: 'shard',
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.0,
        gravity: 0.24,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.28,
        size: 7 + Math.random() * 10,
        color,
        alpha: 1,
        life: 0.022
      });
    }

    // 3. Chữ Pop-Art Trừ Máu Cực Lớn
    const hpTransition = (oldHp !== null && newHp !== null) ? ` (${oldHp}♥ ➔ ${newHp}♥)` : '';
    const dmgBannerText = `💔 -${amount} HP!${hpTransition}`;
    this.textBanners.push({
      text: dmgBannerText,
      x,
      y: y - 28,
      vy: -1.45,
      scale: 0.45,
      targetScale: Math.min(1.75, 1.35 + amount * 0.1),
      color: '#ef4444',
      alpha: 1,
      life: 0.012
    });

    if (!this.animating) {
      this.animating = true;
      this.loop();
    }
  }

  /**
   * Hiệu ứng Cào Xé (Claw Slash) — CT-02, DH-02, CT-09
   */
  spawnSlash(x, y, color = '#ef4444', text = '🐺 CÀO XÉ!') {
    if (!this.ctx) return;
    for (let offset = -20; offset <= 20; offset += 20) {
      this.particles.push({
        type: 'slash',
        x: x + offset - 40,
        y: y + offset - 40,
        endX: x + offset + 40,
        endY: y + offset + 40,
        color,
        lineWidth: 6,
        alpha: 1,
        life: 0.06
      });
    }
    this.spawnParticles(x, y, color, 25, text);
  }

  /**
   * Hiệu ứng Tia Quét Laser / Flash (Camera & Nhòm) — CT-01, DH-01
   */
  spawnLaser(fromX, fromY, toX, toY, color = '#06b6d4', text = '📸 QUAN SÁT!') {
    if (!this.ctx) return;
    this.particles.push({
      type: 'laser',
      fromX,
      fromY,
      toX,
      toY,
      color,
      lineWidth: 8,
      alpha: 1,
      life: 0.05
    });
    this.spawnParticles(toX, toY, color, 30, text);
  }

  /**
   * Hiệu ứng Sóng Âm Xung Kích Bass (Sonic Boom) — CT-05, DH-03
   */
  spawnSonicBoom(x, y, color = '#f59e0b', text = '🔊 TÙNG TÙNG BOOM!') {
    if (!this.ctx) return;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.shockwaves.push({
          x,
          y,
          radius: 10 + i * 20,
          maxRadius: 160 + i * 40,
          color,
          alpha: 1,
          lineWidth: 6
        });
      }, i * 80);
    }
    this.spawnParticles(x, y, color, 35, text);
  }

  /**
   * Hiệu ứng Vỡ Vụn Thẻ Bài Truyện Tranh (Comic Shatter) — Khi bị tiêu diệt
   */
  spawnCardShatter(x, y, width = 110, height = 154, color = '#f43f5e', text = '💥 NÁT BÀI!') {
    if (!this.ctx) return;
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this.particles.push({
        type: 'shard',
        x: x + (Math.random() - 0.5) * (width * 0.8),
        y: y + (Math.random() - 0.5) * (height * 0.8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        gravity: 0.28,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.25,
        size: 8 + Math.random() * 12,
        color,
        alpha: 1,
        life: 0.025
      });
    }
    this.spawnParticles(x, y, color, 25, text);
  }

  /**
   * Hiệu ứng Hồn Ma Thăng Thiên (Ghost Ascension) — Khi HP về 0
   */
  spawnGhostAscent(x, y, color = '#14b8a6', text = '👻 HỒN MA BÁO OÁN!') {
    if (!this.ctx) return;
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        type: 'ghost_wisp',
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -2.5 - Math.random() * 3,
        size: 10 + Math.random() * 16,
        color,
        alpha: 0.95,
        life: 0.018
      });
    }
    this.spawnParticles(x, y, color, 20, text);
  }

  loop() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 3.5;
      sw.alpha -= 0.035;

      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = sw.color;
      this.ctx.lineWidth = sw.lineWidth;
      this.ctx.globalAlpha = sw.alpha;
      this.ctx.stroke();
      this.ctx.restore();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === 'shard') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity || 0.28;
        p.rotation += p.vRot || 0.1;
        p.alpha -= p.life;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size);
        this.ctx.lineTo(p.size * 0.8, p.size * 0.8);
        this.ctx.lineTo(-p.size * 0.8, p.size * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
        continue;
      }

      if (p.type === 'slash') {
        p.alpha -= p.life;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        this.ctx.save();
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = p.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = p.alpha;
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = p.color;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(p.endX, p.endY);
        this.ctx.stroke();
        this.ctx.restore();
        continue;
      }

      if (p.type === 'laser') {
        p.alpha -= p.life;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        this.ctx.save();
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = p.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = p.alpha;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = p.color;
        this.ctx.beginPath();
        this.ctx.moveTo(p.fromX, p.fromY);
        this.ctx.lineTo(p.toX, p.toY);
        this.ctx.stroke();
        this.ctx.restore();
        continue;
      }

      if (p.type === 'ghost_wisp') {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.life;
        p.size = Math.max(0, p.size - 0.05);

        if (p.alpha <= 0 || p.size <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.alpha * 0.7;
        this.ctx.shadowBlur = 25;
        this.ctx.shadowColor = p.color;
        this.ctx.fill();
        this.ctx.restore();
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.life;
      p.size = Math.max(0, p.size - 0.08);

      if (p.alpha <= 0 || p.size <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = p.color;
      this.ctx.fill();
      this.ctx.restore();
    }

    for (let i = this.textBanners.length - 1; i >= 0; i--) {
      const tb = this.textBanners[i];
      tb.y += tb.vy;
      tb.scale = Math.min(tb.targetScale, tb.scale + 0.08);
      tb.alpha -= tb.life;

      if (tb.alpha <= 0) {
        this.textBanners.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.font = '900 24px "Bangers", cursive, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.globalAlpha = tb.alpha;
      this.ctx.translate(tb.x, tb.y);
      this.ctx.scale(tb.scale, tb.scale);

      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 5;
      this.ctx.strokeText(tb.text, 0, 0);

      this.ctx.fillStyle = tb.color;
      this.ctx.fillText(tb.text, 0, 0);
      this.ctx.restore();
    }

    if (this.particles.length > 0 || this.shockwaves.length > 0 || this.textBanners.length > 0) {
      const scheduleFrame = typeof requestAnimationFrame !== 'undefined'
        ? requestAnimationFrame
        : (cb) => setTimeout(cb, 16);
      scheduleFrame(() => this.loop());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
