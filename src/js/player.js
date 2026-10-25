/**
 * ============================================================================
 * ไฟล์: src/js/player.js
 * คำอธิบาย: คลาสจัดการข้อมูลผู้เล่น, การเงิน, ทรัพย์สิน, อันดับ และไอคอนผู้เล่น
 * ภาษา: ECMAScript 2026 (ES2026)
 * ผู้เขียน: ผู้สอน Front-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

import { STARTING_CASH } from './config.js';

// ชุดไอคอนอวตารผู้เล่นแบบ SVG คมชัด (แทนที่อิโมจิ AI Slop)
export const PLAYER_AVATARS = [
  // P1: มงกุฎผู้นำ
  `<svg viewBox="0 0 24 24" class="avatar-icon-svg"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>`,
  // P2: หุ่นยนต์ AI
  `<svg viewBox="0 0 24 24" class="avatar-icon-svg"><path d="M12 2a2 2 0 0 1 2 2c0 .7-.4 1.4-1 1.7V7h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4V5.7c-.6-.3-1-1-1-1.7a2 2 0 0 1 2-2zm-3 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8 15h8v-1H8v1z"/></svg>`,
  // P3: มนุษย์ต่างดาว
  `<svg viewBox="0 0 24 24" class="avatar-icon-svg"><path d="M12 2C6.5 2 2 6.5 2 12c0 4.5 3 8.3 7 9.5V22h6v-.5c4-1.2 7-5 7-9.5 0-5.5-4.5-10-10-10zm-3 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-3 6c1.7 0 3-.7 3-1.5h-6c0 .8 1.3 1.5 3 1.5z"/></svg>`,
  // P4: ยานสำรวจอวกาศ
  `<svg viewBox="0 0 24 24" class="avatar-icon-svg"><path d="M12 2.5s4 3.5 4 8.5c0 2.5-1 4.5-2 5.5l1 4.5-3-2-3 2 1-4.5c-1-1-2-3-2-5.5 0-5 4-8.5 4-8.5zM9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"/></svg>`
];

export class Player {
  constructor({ id, name, color, avatarSvg, isBot = false }) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.avatarSvg = avatarSvg || PLAYER_AVATARS[id % PLAYER_AVATARS.length];
    this.isBot = isBot;

    // การเงินและทรัพย์สิน
    this.cash = STARTING_CASH;
    this.properties = new Set();

    // ตำแหน่งบนกระดาน (0 = START)
    this.position = 0;

    // สถานะพิเศษ
    this.inIsland = false;
    this.islandTurns = 0;
    this.spaceTravelReady = false;
    this.freePassShield = 0;
    this.isBankrupt = false;
    this.rank = id + 1;
  }

  /**
   * คำนวณมูลค่าทรัพย์สินรวม (Net Worth)
   */
  getNetWorth(boardTiles) {
    if (this.isBankrupt) return 0;

    let total = Math.max(0, this.cash);
    for (const tileId of this.properties) {
      const tile = boardTiles[tileId];
      if (tile && tile.type === 'city') {
        total += tile.price;
        if (tile.buildingLevel > 0) {
          total += tile.buildingLevel * (tile.price * 0.5);
        }
        if (tile.isLandmark) {
          total += tile.price * 1.5;
        }
      }
    }
    return total;
  }

  addCash(amount) {
    this.cash += Math.max(0, amount);
  }

  deductCash(amount) {
    this.cash -= amount;
    return this.cash >= 0;
  }

  addProperty(tileId) {
    this.properties.add(tileId);
  }

  removeProperty(tileId) {
    this.properties.delete(tileId);
  }

  setBankrupt() {
    this.isBankrupt = true;
    this.cash = 0;
    this.properties.clear();
  }
}

/**
 * ฟังก์ชันคำนวณและอัปเดตอันดับในตาราง (Rank 1-4)
 */
export function updatePlayerRankings(players, boardTiles) {
  const ranked = [...players]
    .map(p => ({ player: p, netWorth: p.getNetWorth(boardTiles) }))
    .sort((a, b) => {
      if (a.player.isBankrupt) return 1;
      if (b.player.isBankrupt) return -1;
      return b.netWorth - a.netWorth;
    });

  ranked.forEach((item, index) => {
    item.player.rank = index + 1;
  });
}
