/**
 * ============================================================================
 * ไฟล์: src/js/audio.js
 * คำอธิบาย: ระบบสร้างเสียง Web Audio API พร้อมบันทึกสถานะลง localStorage (QOL)
 * ภาษา: ECMAScript 2026 (ES2026)
 * ผู้เขียน: ผู้สอน Front-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    // โหลดสถานะเปิด/ปิดเสียงจาก localStorage เพื่อความสะดวกของผู้เล่น (QOL)
    try {
      this.isMuted = localStorage.getItem('monopoly_sound_muted') === 'true';
    } catch {
      this.isMuted = false;
    }
  }

  /**
   * เริ่มต้น AudioContext เมื่อมีการคลิกครั้งแรกของผู้ใช้
   */
  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * สลับสถานะเปิด/ปิดเสียง พร้อมบันทึกค่าลง localStorage
   * @returns {boolean} สถานะปิดเสียงปัจจุบัน
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('monopoly_sound_muted', String(this.isMuted));
    } catch (err) {
      console.warn('localStorage error:', err);
    }
    return this.isMuted;
  }

  /**
   * เสียงทอยลูกเต๋า
   */
  playDiceRoll() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190 + Math.random() * 220, now + i * 0.07);

      gain.gain.setValueAtTime(0.09, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.06);
    }
  }

  /**
   * เสียงเหรียญ/ได้รับเงิน
   */
  playCoin() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.31);
  }

  /**
   * เสียงก่อสร้างบ้าน/แลนด์มาร์ก
   */
  playBuild() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  /**
   * เสียงวาร์ปสถานีอวกาศ
   */
  playTeleport() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.35);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.41);
  }

  /**
   * เสียงเตือนเสียเงิน/ติดเกาะ
   */
  playPenalty() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.setValueAtTime(120, now + 0.12);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.31);
  }

  /**
   * เพลงชัยชนะจบเกม
   */
  playVictory() {
    if (this.isMuted) return;
    this.init();

    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.12, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.31);
    });
  }
}

export const sound = new SoundSystem();
