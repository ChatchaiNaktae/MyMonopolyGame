/**
 * ============================================================================
 * ไฟล์: src/js/dice.js
 * คำอธิบาย: ระบบทอยลูกเต๋า 2 ลูก อนิเมชัน 3D ป้องกัน Race Conditions และรองรับ Speed Multiplier
 * ภาษา: ECMAScript 2026 (ES2026)
 * ผู้เขียน: ผู้สอน Front-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

import { sound } from './audio.js';

export class DiceSystem {
  constructor(dieEl1, dieEl2, badgeEl) {
    this.die1 = dieEl1;
    this.die2 = dieEl2;
    this.badge = badgeEl;
    this.consecutiveDoubles = 0;
    this.isRolling = false;

    // แคช Elements ของจุดบนหน้าเต๋าเพื่อสมรรถนะสูงสุด (Zero Layout Thrashing)
    this.pips1 = Array.from(dieEl1.querySelectorAll('.pip'));
    this.pips2 = Array.from(dieEl2.querySelectorAll('.pip'));

    this.pipMap = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };
  }

  renderFace(pips, value) {
    pips.forEach(p => p.classList.remove('visible'));
    const activeIndices = this.pipMap[value] || [4];
    activeIndices.forEach(idx => {
      if (pips[idx]) pips[idx].classList.add('visible');
    });
  }

  /**
   * เริ่มต้นการทอยลูกเต๋า
   * @param {number} [speedMultiplier=1] - ตัวคูณความเร็ว (QOL)
   */
  roll(speedMultiplier = 1) {
    // ป้องกันการกดทอยซ้ำซ้อนขณะกำลังหมุน (Harden Edge Case)
    if (this.isRolling) return Promise.reject(new Error('ลูกเต๋ากำลังทอยอยู่'));

    this.isRolling = true;
    sound.playDiceRoll();

    this.die1.classList.add('rolling');
    this.die2.classList.add('rolling');
    if (this.badge) this.badge.style.display = 'none';

    const rollDuration = Math.max(200, Math.floor(450 / speedMultiplier));
    const tickInterval = Math.max(30, Math.floor(50 / speedMultiplier));

    return new Promise(resolve => {
      const interval = setInterval(() => {
        this.renderFace(this.pips1, Math.floor(Math.random() * 6) + 1);
        this.renderFace(this.pips2, Math.floor(Math.random() * 6) + 1);
      }, tickInterval);

      setTimeout(() => {
        clearInterval(interval);
        this.die1.classList.remove('rolling');
        this.die2.classList.remove('rolling');

        const val1 = Math.floor(Math.random() * 6) + 1;
        const val2 = Math.floor(Math.random() * 6) + 1;
        const total = val1 + val2;
        const isDouble = (val1 === val2);

        this.renderFace(this.pips1, val1);
        this.renderFace(this.pips2, val2);

        if (isDouble) {
          this.consecutiveDoubles += 1;
          if (this.badge) {
            this.badge.textContent = `เต๋าคู่ดับเบิ้ล! (${val1}+${val2})`;
            this.badge.style.display = 'block';
          }
        } else {
          this.consecutiveDoubles = 0;
          if (this.badge) this.badge.style.display = 'none';
        }

        this.isRolling = false;

        resolve({
          die1: val1,
          die2: val2,
          total,
          isDouble,
          consecutiveDoubles: this.consecutiveDoubles
        });
      }, rollDuration);
    });
  }

  resetDoubles() {
    this.consecutiveDoubles = 0;
    if (this.badge) this.badge.style.display = 'none';
  }
}
