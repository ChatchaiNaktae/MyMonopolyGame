/**
 * ============================================================================
 * ไฟล์: src/js/board.js
 * คำอธิบาย: ตัวเรนเดอร์กระดาน 2.5D Isometric, การจัดวางตำแหน่งตาราง, และอนิเมชันความเร็วสูง
 * ปรับปรุง: เพิ่มระบบ Tile Inspector (QOL), ปรับแต่ง DOM Performance และรองรับ Game Speed Toggle
 * ภาษา: ECMAScript 2026 (ES2026)
 * ผู้เขียน: ผู้สอน Front-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

import { BOARD_TILES, COLOR_GROUPS, SVG_ICONS, formatMoney } from './config.js';

export class BoardRenderer {
  constructor(gridContainer, onTileClick) {
    this.grid = gridContainer;
    this.onTileClick = onTileClick;
    this.tileElements = new Map();
    this.pawnElements = new Map(); // เก็บ Element หมากผู้เล่นโดยตรงเพื่อเลี่ยงการล้าง DOM ซ้ำซ้อน
  }

  /**
   * คำนวณพิกัดตาราง 9x9 ตามเข็มนาฬิกา
   */
  getGridCoordinates(index) {
    if (index === 0) return { row: 9, col: 1 };
    if (index >= 1 && index <= 7) return { row: 9, col: index + 1 };
    if (index === 8) return { row: 9, col: 9 };
    if (index >= 9 && index <= 15) return { row: 9 - (index - 8), col: 9 };
    if (index === 16) return { row: 1, col: 9 };
    if (index >= 17 && index <= 23) return { row: 1, col: 9 - (index - 16) };
    if (index === 24) return { row: 1, col: 1 };
    if (index >= 25 && index <= 31) return { row: index - 24 + 1, col: 1 };
    return { row: 1, col: 1 };
  }

  /**
   * สร้าง DOM ช่องกระดาน 32 ช่อง
   */
  renderBoard() {
    BOARD_TILES.forEach((tileData, index) => {
      const coords = this.getGridCoordinates(index);
      const tileEl = document.createElement('div');
      tileEl.className = 'tile';
      tileEl.dataset.id = String(index);
      tileEl.style.gridRow = String(coords.row);
      tileEl.style.gridColumn = String(coords.col);

      if (tileData.type === 'start') {
        tileEl.classList.add('corner-tile', 'tile-start');
        tileEl.innerHTML = `
          ${tileData.icon}
          <div class="corner-label">${tileData.name}</div>
          <div class="pawns-holder"></div>
        `;
      } else if (['island', 'festival', 'space'].includes(tileData.type)) {
        tileEl.classList.add('corner-tile');
        tileEl.innerHTML = `
          ${tileData.icon}
          <div class="corner-label">${tileData.name}</div>
          <div class="pawns-holder"></div>
        `;
      } else if (tileData.type === 'chance') {
        tileEl.innerHTML = `
          <div class="tile-color-bar" style="background: #a855f7;"></div>
          ${tileData.icon}
          <div class="tile-name">${tileData.name}</div>
          <div class="pawns-holder"></div>
        `;
      } else if (tileData.type === 'tax') {
        tileEl.innerHTML = `
          <div class="tile-color-bar" style="background: #ef4444;"></div>
          ${tileData.icon}
          <div class="tile-name">${tileData.name}</div>
          <div class="tile-price">10%</div>
          <div class="pawns-holder"></div>
        `;
      } else {
        const groupColor = COLOR_GROUPS[tileData.group]?.color || '#ffffff';
        tileEl.innerHTML = `
          <div class="tile-color-bar" style="background: ${groupColor};"></div>
          <div class="buildings-container"></div>
          <div class="tile-name">${tileData.name}</div>
          <div class="tile-price">${formatMoney(tileData.price)}</div>
          <div class="pawns-holder"></div>
        `;
      }

      // ระบบตรวจดูรายละเอียดช่องเมื่อชี้หรือคลิก (Tile Inspector QOL)
      tileEl.addEventListener('mouseenter', () => {
        if (this.onTileClick) this.onTileClick(index);
      });
      tileEl.addEventListener('click', () => {
        if (this.onTileClick) this.onTileClick(index);
      });

      this.grid.appendChild(tileEl);
      this.tileElements.set(index, tileEl);
    });
  }

  /**
   * อัปเดตการแสดงผลสิ่งปลูกสร้าง
   */
  updateBuilding(tileId, level, isLandmark, ownerColor) {
    const tileEl = this.tileElements.get(tileId);
    if (!tileEl) return;

    tileEl.style.borderColor = ownerColor;
    const container = tileEl.querySelector('.buildings-container');
    if (!container) return;

    container.innerHTML = '';

    if (isLandmark) {
      const landmark = document.createElement('div');
      landmark.className = 'landmark-model';
      landmark.innerHTML = SVG_ICONS.LANDMARK;
      container.appendChild(landmark);
    } else if (level > 0) {
      for (let i = 1; i <= level; i++) {
        const house = document.createElement('div');
        house.className = `building-unit house-${i}`;
        house.style.borderColor = ownerColor;
        container.appendChild(house);
      }
    }
  }

  /**
   * อัปเดตป้ายตัวคูณค่าผ่านทาง (x2)
   */
  updateMultiplier(tileId, multiplier) {
    const tileEl = this.tileElements.get(tileId);
    if (!tileEl) return;

    let badge = tileEl.querySelector('.tile-multiplier');
    if (multiplier > 1) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'tile-multiplier';
        tileEl.appendChild(badge);
      }
      badge.textContent = `x${multiplier}`;
    } else if (badge) {
      badge.remove();
    }
  }

  /**
   * วางตัวหมากผู้เล่นทุกคน
   */
  renderPawns(players) {
    players.forEach(player => {
      let pawn = this.pawnElements.get(player.id);
      if (!pawn) {
        pawn = document.createElement('div');
        pawn.className = `player-pawn p${player.id + 1}`;
        pawn.innerHTML = player.avatarSvg;
        pawn.title = `${player.name} (P${player.id + 1})`;
        this.pawnElements.set(player.id, pawn);
      }

      if (player.isBankrupt) {
        pawn.remove();
        return;
      }

      const tileEl = this.tileElements.get(player.position);
      if (tileEl) {
        const holder = tileEl.querySelector('.pawns-holder');
        if (holder && pawn.parentElement !== holder) {
          holder.appendChild(pawn);
        }
      }
    });
  }

  /**
   * แอนิเมชันเดินหมากแบบปรับความเร็วได้ตาม QOL Speed Setting (1x, 2x, 3x)
   */
  async animateStepByStep(player, steps, onStep, speedMultiplier = 1) {
    const pawn = this.pawnElements.get(player.id);
    const delay = Math.max(40, Math.floor(180 / speedMultiplier));

    for (let i = 0; i < steps; i++) {
      player.position = (player.position + 1) % 32;

      if (onStep) {
        onStep(player.position);
      }

      const targetTileEl = this.tileElements.get(player.position);
      if (targetTileEl && pawn) {
        const holder = targetTileEl.querySelector('.pawns-holder');
        if (holder) {
          holder.appendChild(pawn);
          pawn.classList.add('hop-animation');
          setTimeout(() => pawn.classList.remove('hop-animation'), delay - 10);
        }
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
