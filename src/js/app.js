/**
 * ============================================================================
 * ไฟล์: src/js/app.js
 * คำอธิบาย: จุดเชื่อมต่อระบบหลัก (Entry Point), ควบคุม UI, Event Handlers และ QOL Features
 * ปรับปรุง: เพิ่มระบบ Speed Control, Tile Inspector, Event Log, และ Keyboard Shortcuts
 * ภาษา: ECMAScript 2026 (ES2026)
 * ผู้เขียน: ผู้สอน Front-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

import { BoardRenderer } from './board.js';
import { DiceSystem } from './dice.js';
import { GameEngine } from './game.js';
import { formatMoney, sanitizeText } from './config.js';
import { sound } from './audio.js';
import { net } from './network.js';
import { PLAYER_AVATARS } from './player.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. อ้างอิง DOM Elements
  const gridEl = document.getElementById('board-grid');
  const dieEl1 = document.getElementById('die-1');
  const dieEl2 = document.getElementById('die-2');
  const doubleBadge = document.getElementById('double-badge');
  const rollBtn = document.getElementById('roll-btn');
  const turnCounterEl = document.getElementById('turn-counter');
  const toastContainer = document.getElementById('toast-container');
  const muteBtn = document.getElementById('mute-btn');
  const exitBtn = document.getElementById('exit-btn');

  // องค์ประกอบ QOL เพิ่มเติม
  const speedBtns = document.querySelectorAll('.speed-toggle-btn');
  const eventLogDrawer = document.getElementById('event-log-drawer');
  const eventLogToggle = document.getElementById('event-log-toggle');
  const eventLogList = document.getElementById('event-log-list');
  const tileInspector = document.getElementById('tile-inspector');

  // ล็อบบี้
  const lobbyOverlay = document.getElementById('lobby-overlay');
  const usernameInput = document.getElementById('username-input');
  const roomCodeInput = document.getElementById('roomcode-input');
  const playSoloBtn = document.getElementById('play-solo-btn');
  const createRoomBtn = document.getElementById('create-room-btn');
  const joinRoomBtn = document.getElementById('join-room-btn');

  // โมดอล
  const gameModal = document.getElementById('game-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalBody = document.getElementById('modal-body');
  const modalBtnConfirm = document.getElementById('modal-btn-confirm');
  const modalBtnCancel = document.getElementById('modal-btn-cancel');

  let gameEngine = null;
  let modalResolver = null;
  let currentSpeed = 1;

  // 2. ฟังก์ชันตรวจสอบข้อมูลช่องเมื่อชี้หรือคลิก (Tile Inspector QOL)
  const handleTileInspect = (tileId) => {
    if (!gameEngine || !tileInspector) return;
    const details = gameEngine.getTileDetails(tileId);
    if (!details) return;

    if (details.type !== 'city') {
      tileInspector.innerHTML = `<strong>${details.name}</strong>: ${details.desc}`;
    } else {
      tileInspector.innerHTML = `
        <strong>${details.name}</strong> (${details.groupName}) | 
        เจ้าของ: <span style="color:${details.ownerColor}; font-weight:700;">${details.ownerName}</span> | 
        สิ่งปลูกสร้าง: ${details.buildingLevelText} | 
        ค่าผ่านทาง: <span style="color:var(--accent-gold); font-weight:700;">${details.currentRent}</span>
      `;
    }

    tileInspector.classList.add('visible');
    clearTimeout(tileInspector._timer);
    tileInspector._timer = setTimeout(() => {
      tileInspector.classList.remove('visible');
    }, 4500);
  };

  // 3. เริ่มต้น BoardRenderer และ DiceSystem
  const boardRenderer = new BoardRenderer(gridEl, handleTileInspect);
  boardRenderer.renderBoard();

  const diceSystem = new DiceSystem(dieEl1, dieEl2, doubleBadge);

  // 4. ตั้งค่า UI Callbacks
  const uiCallbacks = {
    updateProfiles: (players, currentIdx) => {
      const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      players.forEach((p, idx) => {
        const card = document.querySelector(`.profile-${positions[idx]}`);
        if (!card) return;

        const rankEl = card.querySelector('.profile-rank-badge');
        if (rankEl) {
          rankEl.textContent = String(p.rank);
          rankEl.className = `profile-rank-badge rank-${p.rank}`;
        }

        const nameEl = card.querySelector('.profile-username');
        if (nameEl) nameEl.textContent = p.name;

        const cashEl = card.querySelector('.cash-amount');
        if (cashEl) cashEl.textContent = formatMoney(p.cash);

        const netEl = card.querySelector('.net-worth-amount');
        if (netEl) {
          const netWorth = p.getNetWorth(gameEngine?.boardState || []);
          netEl.textContent = `รวม ${formatMoney(netWorth)}`;
        }

        if (idx === currentIdx && !p.isBankrupt) {
          card.classList.add('active-turn');
        } else {
          card.classList.remove('active-turn');
        }

        if (p.isBankrupt) {
          card.classList.add('bankrupted');
        } else {
          card.classList.remove('bankrupted');
        }
      });

      const cur = gameEngine?.getCurrentPlayer();
      if (cur && !cur.isBot && !cur.isBankrupt && !gameEngine.isGameOver) {
        rollBtn.disabled = false;
      } else {
        rollBtn.disabled = true;
      }
    },

    renderPawns: (players) => {
      boardRenderer.renderPawns(players);
    },

    updateBuilding: (tileId, level, isLandmark, ownerColor) => {
      boardRenderer.updateBuilding(tileId, level, isLandmark, ownerColor);
    },

    updateMultiplier: (tileId, mult) => {
      boardRenderer.updateMultiplier(tileId, mult);
    },

    animateStepByStep: async (player, steps, onStep, speedMult = 1) => {
      await boardRenderer.animateStepByStep(player, steps, onStep, speedMult);
    },

    updateTurnCounter: (turn) => {
      if (turnCounterEl) turnCounterEl.textContent = `รอบที่ ${turn}`;
    },

    showToast: (msg) => {
      const toast = document.createElement('div');
      toast.className = 'toast-msg';
      toast.textContent = msg;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => toast.remove(), 250);
      }, 2200);
    },

    // บันทึกรายการลงใน Game Event Log Drawer (QOL)
    addLog: (msg) => {
      if (!eventLogList) return;
      const item = document.createElement('div');
      item.className = 'event-log-item';
      item.textContent = msg;
      eventLogList.appendChild(item);

      // จำกัดประวัติไม่เกิน 35 รายการเพื่อประหยัดหน่วยความจำ
      while (eventLogList.children.length > 35) {
        eventLogList.removeChild(eventLogList.firstChild);
      }
      eventLogList.scrollTop = eventLogList.scrollHeight;
    },

    showFloatingCash: (playerId, amount, isGain) => {
      const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      const card = document.querySelector(`.profile-${positions[playerId]}`);
      if (!card) return;

      const floatEl = document.createElement('div');
      floatEl.className = `floating-cash ${isGain ? 'gain' : 'loss'}`;
      floatEl.textContent = `${isGain ? '+' : '-'}${formatMoney(amount)}`;

      const rect = card.getBoundingClientRect();
      floatEl.style.left = `${rect.left + rect.width / 2}px`;
      floatEl.style.top = `${rect.top}px`;

      document.body.appendChild(floatEl);
      setTimeout(() => floatEl.remove(), 1200);
    },

    promptBuyProperty: (player, tile) => {
      return new Promise(resolve => {
        modalResolver = resolve;
        modalTitle.textContent = `ซื้อที่ดิน ${tile.name}`;
        modalSubtitle.textContent = `เงินสดของคุณ: ${formatMoney(player.cash)}`;

        const basePrice = tile.price;
        const canLandmark = (tile.buildingLevel === 3 || tile.ownerId === player.id);

        modalBody.innerHTML = `
          <div class="building-options-grid">
            <div class="build-card selected" data-level="1" data-landmark="false">
              <div class="build-icon-svg"><svg viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg></div>
              <div class="build-name">บ้านพัก</div>
              <div class="build-cost">${formatMoney(basePrice)}</div>
            </div>
            <div class="build-card ${player.cash < basePrice * 1.5 ? 'disabled' : ''}" data-level="2" data-landmark="false">
              <div class="build-icon-svg"><svg viewBox="0 0 24 24"><path d="M4 3v18h16V3H4zm6 14H6v-3h4v3zm0-5H6V9h4v3zm0-5H6V4h4v3zm8 10h-4v-3h4v3zm0-5h-4V9h4v3zm0-5h-4V4h4v3z"/></svg></div>
              <div class="build-name">ตึกพาณิชย์</div>
              <div class="build-cost">${formatMoney(basePrice * 1.5)}</div>
            </div>
            <div class="build-card ${player.cash < basePrice * 2.0 ? 'disabled' : ''}" data-level="3" data-landmark="false">
              <div class="build-icon-svg"><svg viewBox="0 0 24 24"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg></div>
              <div class="build-name">โรงแรมหรู</div>
              <div class="build-cost">${formatMoney(basePrice * 2.0)}</div>
            </div>
          </div>
          ${canLandmark ? `
            <div class="build-card ${player.cash < basePrice * 2.5 ? 'disabled' : ''}" data-level="3" data-landmark="true" style="margin-top: 8px;">
              <div class="build-icon-svg" style="fill: var(--accent-gold);"><svg viewBox="0 0 24 24"><path d="M12 2L4 7v2h2v11H4v2h16v-2h-2V9h2V7l-8-5zm0 3.2L16.5 8H7.5L12 5.2zM10 11h4v7h-4v-7z"/></svg></div>
              <div class="build-name">สร้างแลนด์มาร์ก (ป้องกันการเทคโอเวอร์)</div>
              <div class="build-cost">${formatMoney(basePrice * 2.5)}</div>
            </div>
          ` : ''}
        `;

        const cards = modalBody.querySelectorAll('.build-card:not(.disabled)');
        cards.forEach(c => {
          c.addEventListener('click', () => {
            modalBody.querySelectorAll('.build-card').forEach(item => item.classList.remove('selected'));
            c.classList.add('selected');
          });
        });

        modalBtnConfirm.textContent = 'ยืนยันการซื้อ';
        modalBtnCancel.textContent = 'ไม่ซื้อ (ผ่าน) [Esc]';
        modalBtnCancel.style.display = 'block';
        gameModal.classList.remove('hidden');
      });
    },

    promptTakeover: (player, tile, takeoverCost, owner) => {
      return new Promise(resolve => {
        modalResolver = (res) => resolve(res.confirm);
        modalTitle.textContent = `เทคโอเวอร์เมือง ${tile.name}`;
        modalSubtitle.textContent = `เมืองนี้เป็นของ ${owner.name} คุณต้องการซื้อต่อหรือไม่?`;

        modalBody.innerHTML = `
          <div style="font-size: 1.15rem; color: var(--accent-gold); margin: 16px 0; font-weight: 700;">
            ค่าซื้อต่อ (2 เท่า): ${formatMoney(takeoverCost)}
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            (เงินสดคงเหลือหลังซื้อ: ${formatMoney(player.cash - takeoverCost)})
          </p>
        `;

        modalBtnConfirm.textContent = 'ตกลงเทคโอเวอร์';
        modalBtnCancel.textContent = 'ไม่ซื้อต่อ [Esc]';
        modalBtnCancel.style.display = 'block';
        gameModal.classList.remove('hidden');
      });
    },

    showChanceCardModal: (card) => {
      return new Promise(resolve => {
        modalResolver = () => resolve(true);
        modalTitle.textContent = `การ์ดดวง: ${card.title}`;
        modalSubtitle.textContent = '';

        modalBody.innerHTML = `
          <p style="font-size: 1rem; color: #ffffff; line-height: 1.5; margin: 16px 0;">
            ${card.desc}
          </p>
        `;

        modalBtnConfirm.textContent = 'รับทราบ [Space]';
        modalBtnCancel.style.display = 'none';
        gameModal.classList.remove('hidden');
      });
    },

    promptFestivalCity: (player, boardTiles) => {
      return new Promise(resolve => {
        modalResolver = (res) => resolve(res.selectedTileId);
        modalTitle.textContent = `จัดงานเทศกาล (ค่าผ่านทาง x2)`;
        modalSubtitle.textContent = `เลือกเมืองของคุณที่ต้องการเพิ่มค่าผ่านทาง`;

        let listHtml = '<div style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;">';
        player.properties.forEach(tId => {
          const t = boardTiles[tId];
          listHtml += `
            <button class="city-select-btn" data-id="${tId}" style="padding: 10px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-light); color: #fff; border-radius: 8px; cursor: pointer; text-align: left; font-family: var(--font-main);">
              🏙️ ${t.name} (ค่าผ่านทางปัจจุบัน: ${formatMoney(t.baseRent * (t.buildingLevel || 1))})
            </button>
          `;
        });
        listHtml += '</div>';
        modalBody.innerHTML = listHtml;

        let selectedId = Array.from(player.properties)[0];
        const buttons = modalBody.querySelectorAll('.city-select-btn');
        buttons.forEach(btn => {
          btn.addEventListener('click', () => {
            buttons.forEach(b => {
              b.style.background = 'rgba(255,255,255,0.06)';
              b.style.borderColor = 'var(--border-light)';
            });
            btn.style.background = 'var(--accent-mint)';
            btn.style.borderColor = 'var(--accent-mint)';
            btn.style.color = '#02121f';
            selectedId = Number(btn.dataset.id);
          });
        });

        modalBtnConfirm.textContent = 'เริ่มจัดงานเทศกาล';
        modalBtnCancel.style.display = 'none';
        modalBtnConfirm.onclick = () => {
          gameModal.classList.add('hidden');
          if (modalResolver) modalResolver({ selectedTileId: selectedId });
        };
        gameModal.classList.remove('hidden');
      });
    },

    promptSpaceSelect: () => {
      return new Promise(resolve => {
        modalTitle.textContent = `สถานีอวกาศ (บินรอบโลก)`;
        modalSubtitle.textContent = `เลือกช่องเป้าหมายที่คุณต้องการวาร์ปไป`;

        modalBody.innerHTML = `
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 14px;">
            คลิกเลือกช่องเป้าหมายที่ต้องการวาร์ปไป หรือเลือกจุดเริ่มต้นเพื่อรับเงินเดือน
          </p>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button id="warp-start-btn" class="btn-primary" style="font-size: 0.9rem; padding: 8px 16px;">
              🚀 วาร์ปไปจุดเริ่มต้น START
            </button>
          </div>
        `;

        document.getElementById('warp-start-btn').onclick = () => {
          gameModal.classList.add('hidden');
          resolve(0);
        };

        modalBtnConfirm.textContent = 'วาร์ปทันที';
        modalBtnCancel.style.display = 'none';
        modalBtnConfirm.onclick = () => {
          gameModal.classList.add('hidden');
          resolve(0);
        };
        gameModal.classList.remove('hidden');
      });
    },

    showVictoryModal: (winner, reason) => {
      modalTitle.textContent = `👑 ชัยชนะของ ${winner.name}!`;
      modalSubtitle.textContent = reason;

      modalBody.innerHTML = `
        <div style="font-size: 3rem; margin: 12px 0;">🏆</div>
        <p style="font-size: 1.1rem; color: var(--accent-gold); font-weight: 700;">
          ${winner.name} ได้รับชัยชนะและเป็นมหาเศรษฐีอันดับ 1!
        </p>
      `;

      modalBtnConfirm.textContent = 'กลับสู่หน้าล็อบบี้';
      modalBtnCancel.style.display = 'none';
      modalBtnConfirm.onclick = () => {
        gameModal.classList.add('hidden');
        lobbyOverlay.classList.remove('hidden');
      };
      gameModal.classList.remove('hidden');
    },

    triggerDiceRoll: async (speedMult = 1) => {
      rollBtn.disabled = true;
      return await diceSystem.roll(speedMult);
    }
  };

  // 5. ปรับปรุงการสลับความเร็วเกม (Speed Toggle QOL: 1x, 2x, 3x)
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active-speed'));
      btn.classList.add('active-speed');
      currentSpeed = Number(btn.dataset.speed) || 1;
      document.documentElement.style.setProperty('--anim-speed', String(1 / currentSpeed));
      if (gameEngine) gameEngine.setSpeed(currentSpeed);
      uiCallbacks.showToast(`ปรับความเร็วเกม: ${currentSpeed}x`);
    });
  });

  // สลับการเปิด/ปิด Drawer บันทึกประวัติการเดิน (QOL)
  if (eventLogToggle && eventLogDrawer) {
    eventLogToggle.addEventListener('click', () => {
      eventLogDrawer.classList.toggle('collapsed');
    });
  }

  // 6. โมดอลยืนยันและยกเลิก
  modalBtnConfirm.addEventListener('click', () => {
    gameModal.classList.add('hidden');
    if (modalResolver) {
      const selectedCard = modalBody.querySelector('.build-card.selected');
      const level = selectedCard ? Number(selectedCard.dataset.level) : 1;
      const isLandmark = selectedCard ? selectedCard.dataset.landmark === 'true' : false;
      modalResolver({ confirm: true, level, isLandmark });
      modalResolver = null;
    }
  });

  modalBtnCancel.addEventListener('click', () => {
    gameModal.classList.add('hidden');
    if (modalResolver) {
      modalResolver({ confirm: false });
      modalResolver = null;
    }
  });

  // 7. จัดการปุ่มทอยลูกเต๋า
  const handleRollAction = async () => {
    if (rollBtn.disabled || !gameEngine || gameEngine.isGameOver) return;
    const cur = gameEngine.getCurrentPlayer();
    if (cur.isBot) return;

    try {
      const rollResult = await uiCallbacks.triggerDiceRoll(currentSpeed);
      await gameEngine.handleDiceRoll(rollResult);
    } catch (err) {
      console.warn('Dice roll error:', err);
    }
  };

  rollBtn.addEventListener('click', handleRollAction);

  // Keyboard Shortcuts: กด Spacebar เพื่อทอยเต๋า, กด Escape เพื่อปิดโมดอล (QOL)
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!gameModal.classList.contains('hidden')) {
        modalBtnConfirm.click();
      } else {
        handleRollAction();
      }
    } else if (e.code === 'Escape') {
      if (!gameModal.classList.contains('hidden') && modalBtnCancel.style.display !== 'none') {
        modalBtnCancel.click();
      }
    }
  });

  // ปุ่มเปิด/ปิดเสียง
  muteBtn.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    muteBtn.innerHTML = isMuted ?
      `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>` :
      `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    uiCallbacks.showToast(isMuted ? 'ปิดเสียงแล้ว' : 'เปิดเสียงแล้ว');
  });

  // ปุ่มออกจากเกม
  exitBtn.addEventListener('click', () => {
    if (confirm('คุณต้องการออกจากเกมและกลับสู่ล็อบบี้ใช่หรือไม่?')) {
      lobbyOverlay.classList.remove('hidden');
    }
  });

  // 8. เริ่มเล่นคนเดียวกับบอท (Solo Mode)
  playSoloBtn.addEventListener('click', () => {
    const rawName = usernameInput.value || 'ผู้เล่น (P1)';
    const myName = sanitizeText(rawName, 15) || 'ผู้เล่น (P1)';

    const playerConfigs = [
      { id: 0, name: myName, color: 'var(--p1-color)', avatarSvg: PLAYER_AVATARS[0], isBot: false },
      { id: 1, name: 'บอทบิลลี่', color: 'var(--p2-color)', avatarSvg: PLAYER_AVATARS[1], isBot: true },
      { id: 2, name: 'บอทนาเดีย', color: 'var(--p3-color)', avatarSvg: PLAYER_AVATARS[2], isBot: true },
      { id: 3, name: 'บอทเจมส์', color: 'var(--p4-color)', avatarSvg: PLAYER_AVATARS[3], isBot: true }
    ];

    gameEngine = new GameEngine({ playerConfigs, uiCallbacks });
    gameEngine.setSpeed(currentSpeed);
    gameEngine.gameMode = 'offline';

    lobbyOverlay.classList.add('hidden');
    gameEngine.start();
  });

  // 9. สร้างห้องและเข้าร่วมห้องออนไลน์ (WebSocket)
  createRoomBtn.addEventListener('click', async () => {
    const rawName = usernameInput.value || 'โฮสต์';
    const myName = sanitizeText(rawName, 15) || 'โฮสต์';
    const isConnected = await net.connect();

    if (!isConnected) {
      uiCallbacks.showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กำลังเริ่มเล่นในโหมดบอท');
      playSoloBtn.click();
      return;
    }

    net.send('CREATE_ROOM', { username: myName });
  });

  joinRoomBtn.addEventListener('click', async () => {
    const rawName = usernameInput.value || 'ผู้เล่น';
    const myName = sanitizeText(rawName, 15) || 'ผู้เล่น';
    const code = sanitizeText(roomCodeInput.value, 6).toUpperCase();

    if (!code) {
      alert('กรุณากรอกรหัสห้อง (Room Code)');
      return;
    }

    const isConnected = await net.connect();
    if (!isConnected) {
      uiCallbacks.showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ห้องได้');
      return;
    }

    net.send('JOIN_ROOM', { roomCode: code, username: myName });
  });

  net.on('ROOM_CREATED', (data) => {
    uiCallbacks.showToast(`สร้างห้องสำเร็จ! รหัสห้องคือ: ${data.roomCode}`);
    roomCodeInput.value = data.roomCode;

    const playerConfigs = [
      { id: 0, name: data.username, color: 'var(--p1-color)', avatarSvg: PLAYER_AVATARS[0], isBot: false },
      { id: 1, name: 'บอทออนไลน์ 1', color: 'var(--p2-color)', avatarSvg: PLAYER_AVATARS[1], isBot: true },
      { id: 2, name: 'บอทออนไลน์ 2', color: 'var(--p3-color)', avatarSvg: PLAYER_AVATARS[2], isBot: true },
      { id: 3, name: 'บอทออนไลน์ 3', color: 'var(--p4-color)', avatarSvg: PLAYER_AVATARS[3], isBot: true }
    ];

    gameEngine = new GameEngine({ playerConfigs, uiCallbacks });
    gameEngine.setSpeed(currentSpeed);
    gameEngine.gameMode = 'online';

    lobbyOverlay.classList.add('hidden');
    gameEngine.start();
  });

  net.on('ROOM_JOINED', (data) => {
    uiCallbacks.showToast(`เข้าร่วมห้อง ${data.roomCode} สำเร็จ!`);
    const playerConfigs = [
      { id: 0, name: 'โฮสต์', color: 'var(--p1-color)', avatarSvg: PLAYER_AVATARS[0], isBot: true },
      { id: 1, name: data.username, color: 'var(--p2-color)', avatarSvg: PLAYER_AVATARS[1], isBot: false },
      { id: 2, name: 'บอทออนไลน์ 2', color: 'var(--p3-color)', avatarSvg: PLAYER_AVATARS[2], isBot: true },
      { id: 3, name: 'บอทออนไลน์ 3', color: 'var(--p4-color)', avatarSvg: PLAYER_AVATARS[3], isBot: true }
    ];

    gameEngine = new GameEngine({ playerConfigs, uiCallbacks });
    gameEngine.setSpeed(currentSpeed);
    gameEngine.gameMode = 'online';

    lobbyOverlay.classList.add('hidden');
    gameEngine.start();
  });
});
