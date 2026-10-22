import { partyModeToggle } from './PartyModeToggle.js';

/**
 * MicDetector — Phân tích tín hiệu âm thanh từ Microphone để nhận diện tiếng sủa, tiếng hát bolero và tiếng cười
 */
export class MicDetector {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.isListening = false;
  }

  async requestMicrophone() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return false;
    }
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);
      return true;
    } catch (err) {
      console.warn('Không thể truy cập Microphone:', err);
      return false;
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Tính toán mức năng lượng âm lượng hiện tại (0.0 -> 1.0)
   */
  getAudioVolume() {
    if (!this.analyser) return 0;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    return sum / (buffer.length * 255);
  }

  /**
   * Nhận diện tiếng sủa "Gâu!" (Âm lượng đột ngột bộc phát ngắn dưới 500ms)
   * Phục vụ CT-02 Chó Cỏ Đầu Đàn & DH-02 Thần Chó 3 Đầu
   */
  async listenForBark({ timeout = 5000, threshold = 0.45 } = {}) {
    // Nếu ở chế độ Chill Mode: Tự động kích hoạt thành công không cần mic
    if (partyModeToggle.isChillMode()) {
      return { success: true, mode: 'CHILL_AUTO' };
    }

    const hasMic = await this.requestMicrophone();
    if (!hasMic) {
      // Fallback tự động nếu người dùng từ chối cấp quyền mic
      return { success: true, mode: 'MIC_FALLBACK' };
    }

    return new Promise((resolve) => {
      this.isListening = true;
      const startTime = Date.now();
      let detectedBurst = false;

      const checkInterval = setInterval(() => {
        if (!this.isListening) {
          clearInterval(checkInterval);
          resolve({ success: false, reason: 'STOPPED' });
          return;
        }

        const vol = this.getAudioVolume();
        if (vol >= threshold) {
          detectedBurst = true;
        }

        if (detectedBurst) {
          clearInterval(checkInterval);
          this.stopListening();
          resolve({ success: true, volume: vol, detectedAtMs: Date.now() - startTime });
          return;
        }

        if (Date.now() - startTime >= timeout) {
          clearInterval(checkInterval);
          this.stopListening();
          resolve({ success: false, reason: 'TIMEOUT' });
        }
      }, 50);
    });
  }

  /**
   * Nhận diện tiếng hát bolero / câu hát ngân dài (Âm lượng duy trì liên tục trên 1.2s)
   * Phục vụ TR-02 Chiến Thần Loa Kẹo Kéo
   */
  async listenForSinging({ timeout = 6000, threshold = 0.3 } = {}) {
    if (partyModeToggle.isChillMode()) {
      return { success: true, mode: 'CHILL_AUTO' };
    }

    const hasMic = await this.requestMicrophone();
    if (!hasMic) {
      return { success: true, mode: 'MIC_FALLBACK' };
    }

    return new Promise((resolve) => {
      this.isListening = true;
      const startTime = Date.now();
      let sustainedFrames = 0;
      const requiredFrames = 15; // 15 frames * 80ms = 1.2 giây

      const interval = setInterval(() => {
        if (!this.isListening) {
          clearInterval(interval);
          resolve({ success: false });
          return;
        }

        const vol = this.getAudioVolume();
        if (vol >= threshold) {
          sustainedFrames++;
        } else {
          sustainedFrames = Math.max(0, sustainedFrames - 1);
        }

        if (sustainedFrames >= requiredFrames) {
          clearInterval(interval);
          this.stopListening();
          resolve({ success: true, mode: 'SING_DETECTED' });
          return;
        }

        if (Date.now() - startTime >= timeout) {
          clearInterval(interval);
          this.stopListening();
          resolve({ success: false, reason: 'TIMEOUT' });
        }
      }, 80);
    });
  }
}

export const micDetector = new MicDetector();
