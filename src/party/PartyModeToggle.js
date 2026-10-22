/**
 * PartyModeToggle — Quản lý chế độ chơi: "Party Mode" (Mic/Cam) vs "Chill Mode" (Tự động hóa)
 */

export class PartyModeToggle {
  constructor(initialMode = 'CHILL') {
    this.mode = initialMode; // 'PARTY' | 'CHILL'
    this.listeners = [];
    this.loadPreference();
  }

  loadPreference() {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('xom_play_mode');
        if (saved === 'PARTY' || saved === 'CHILL') {
          this.mode = saved;
        }
      } catch (e) {}
    }
  }

  savePreference() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('xom_play_mode', this.mode);
      } catch (e) {}
    }
  }

  setMode(mode) {
    if (mode === 'PARTY' || mode === 'CHILL') {
      this.mode = mode;
      this.savePreference();
      this.notify();
    }
  }

  toggle() {
    this.mode = this.mode === 'PARTY' ? 'CHILL' : 'PARTY';
    this.savePreference();
    this.notify();
    return this.mode;
  }

  isPartyMode() {
    return this.mode === 'PARTY';
  }

  isChillMode() {
    return this.mode === 'CHILL';
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.mode);
    }
  }
}

export const partyModeToggle = new PartyModeToggle();
