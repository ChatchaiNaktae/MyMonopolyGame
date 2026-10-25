/**
 * ============================================================================
 * ไฟล์: src/js/game.js
 * คำอธิบาย: Game Engine หลักของเกมเศรษฐี กฎกติกา Line Let's Get Rich
 * ปรับปรุง: แก้ไข Edge Cases (Infinite Loop, Empty Properties, Debt Recovery),
 *            เพิ่มระบบ Speed Multiplier, Event Logging และ Tile Inspection (QOL)
 * ภาษา: ECMAScript 2026 (ES2026)
 * ผู้เขียน: ผู้สอน Front-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

import { BOARD_TILES, COLOR_GROUPS, CHANCE_CARDS, SALARY_AMOUNT, BAIL_COST, formatMoney } from './config.js';
import { Player, updatePlayerRankings } from './player.js';
import { BotAI } from './bot.js';
import { sound } from './audio.js';

export class GameEngine {
  constructor({ playerConfigs, uiCallbacks }) {
    this.ui = uiCallbacks;
    this.gameMode = 'offline';
    this.currentTurn = 1;
    this.currentPlayerIndex = 0;
    this.isGameOver = false;
    this.speedMultiplier = 1; // 1 = ปกติ, 2 = เร็ว 2 เท่า, 3 = เทอร์โบ (QOL)
    this.autoRoll = false;    // ทอยอัตโนมัติ (QOL)

    // คัดลอกกระดานและเตรียมข้อมูลสถานะ
    this.boardState = BOARD_TILES.map(tile => ({
      ...tile,
      ownerId: null,
      buildingLevel: 0,
      isLandmark: false,
      multiplier: 1
    }));

    this.players = playerConfigs.map(cfg => new Player(cfg));
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(1, Math.min(3, multiplier));
  }

  log(msg) {
    if (this.ui.addLog) {
      this.ui.addLog(msg);
    }
  }

  start() {
    this.isGameOver = false;
    this.currentTurn = 1;
    this.currentPlayerIndex = 0;

    updatePlayerRankings(this.players, this.boardState);
    this.ui.updateProfiles(this.players, this.currentPlayerIndex);
    this.ui.renderPawns(this.players);
    this.log(`🎲 เริ่มเกมใหม่แล้ว! ผู้เล่นคนแรกคือ ${this.getCurrentPlayer().name}`);
    this.ui.showToast(`เริ่มเกมแล้ว! ตาของ ${this.getCurrentPlayer().name}`);

    if (this.getCurrentPlayer().isBot) {
      setTimeout(() => this.runBotTurn(), Math.floor(800 / this.speedMultiplier));
    }
  }

  /**
   * ดึงข้อมูลช่องสำหรับ Tile Inspector (QOL)
   */
  getTileDetails(tileId) {
    const tile = this.boardState[tileId];
    if (!tile) return null;

    if (tile.type !== 'city') {
      return {
        name: tile.name,
        type: tile.type,
        desc: tile.type === 'start' ? 'จุดเริ่มต้น (รับเงินเดือน 2M)' :
              tile.type === 'island' ? 'เกาะร้าง (หยุดเดิน 3 เทิร์น)' :
              tile.type === 'festival' ? 'จัดงานเทศกาล (ค่าผ่านทาง x2)' :
              tile.type === 'space' ? 'สถานีอวกาศ (บินไปช่องใดก็ได้)' :
              tile.type === 'tax' ? 'เสียภาษีบำรุงเมือง 10%' : 'การ์ดดวงสุ่มโชค'
      };
    }

    const owner = tile.ownerId !== null ? this.players[tile.ownerId] : null;
    let rent = tile.baseRent * (tile.buildingLevel || 1) * (tile.multiplier || 1);
    if (tile.isLandmark) rent *= 2.5;

    const levelText = tile.isLandmark ? 'แลนด์มาร์ก 🏰' :
                      tile.buildingLevel === 3 ? 'โรงแรม 🏨' :
                      tile.buildingLevel === 2 ? 'ตึกพาณิชย์ 🏢' :
                      tile.buildingLevel === 1 ? 'บ้านพัก 🏡' : 'ที่ดินเปล่า';

    return {
      name: tile.name,
      type: 'city',
      groupName: COLOR_GROUPS[tile.group]?.name || '',
      price: formatMoney(tile.price),
      ownerName: owner ? owner.name : 'ยังไม่มีเจ้าของ',
      ownerColor: owner ? owner.color : '#94a3b8',
      buildingLevelText: levelText,
      currentRent: formatMoney(rent),
      takeoverCost: tile.isLandmark ? 'ไม่สามารถซื้อต่อได้' : formatMoney(tile.price * 2)
    };
  }

  /**
   * ประมวลผลการทอยเต๋าและการเดิน
   */
  async handleDiceRoll(rollResult) {
    const player = this.getCurrentPlayer();
    this.log(`🎲 ${player.name} ทอยได้ ${rollResult.total} (${rollResult.die1}+${rollResult.die2})${rollResult.isDouble ? ' [เต๋าคู่!]' : ''}`);

    // ดับเบิ้ล 3 ครั้งติด -> ส่งไปเกาะร้าง
    if (rollResult.consecutiveDoubles >= 3) {
      this.log(`🚨 ${player.name} ทอยดับเบิ้ล 3 ครั้งติด! ถูกส่งไปเกาะร้าง`);
      this.ui.showToast(`ทอยได้ดับเบิ้ล 3 ครั้งติด! ${player.name} ถูกส่งไปเกาะร้าง`);
      sound.playPenalty();
      player.position = 8;
      player.inIsland = true;
      player.islandTurns = 3;
      this.ui.renderPawns(this.players);
      this.endTurn();
      return;
    }

    // กรณีติดเกาะร้าง
    if (player.inIsland) {
      if (rollResult.isDouble) {
        this.log(`✨ ${player.name} ทอยได้เต๋าคู่ หลุดพ้นจากเกาะร้างได้สำเร็จ!`);
        this.ui.showToast(`โชคดีมาก! ทอยได้เต๋าคู่ ออกจากเกาะร้างได้สำเร็จ`);
        player.inIsland = false;
        player.islandTurns = 0;
      } else {
        player.islandTurns -= 1;
        if (player.islandTurns <= 0) {
          this.log(`🏝️ ${player.name} ครบกำหนด 3 เทิร์น ออกจากเกาะร้างแล้ว`);
          this.ui.showToast(`ครบกำหนด 3 เทิร์น ออกจากเกาะร้างแล้ว`);
          player.inIsland = false;
        } else {
          this.log(`🏝️ ${player.name} ยังคงติดเกาะร้าง (เหลืออีก ${player.islandTurns} เทิร์น)`);
          this.ui.showToast(`${player.name} ยังคงติดเกาะร้าง (เหลืออีก ${player.islandTurns} เทิร์น)`);
          this.endTurn();
          return;
        }
      }
    }

    // กรณีพร้อมบินด้วยสถานีอวกาศ
    if (player.spaceTravelReady) {
      player.spaceTravelReady = false;
      let targetTile = 0;

      if (player.isBot) {
        targetTile = BotAI.decideSpaceTarget(player, this.boardState);
      } else {
        targetTile = await this.ui.promptSpaceSelect(this.boardState);
      }

      sound.playTeleport();
      this.log(`🛸 ${player.name} บินวาร์ปไปยังช่อง "${this.boardState[targetTile].name}"`);
      this.ui.showToast(`${player.name} บินวาร์ปไปยังช่อง "${this.boardState[targetTile].name}"`);
      player.position = targetTile;
      this.ui.renderPawns(this.players);
      await this.handleTileAction(player, targetTile, rollResult.isDouble);
      return;
    }

    // แอนิเมชันเดินหมากทีละก้าว (คำนึงถึงตัวคูณความเร็ว)
    await this.ui.animateStepByStep(
      player,
      rollResult.total,
      (currentPos) => {
        if (currentPos === 0) {
          player.addCash(SALARY_AMOUNT);
          sound.playCoin();
          this.log(`💵 ${player.name} เดินผ่านจุดเริ่มต้น รับเงินเดือน ${formatMoney(SALARY_AMOUNT)}`);
          this.ui.showFloatingCash(player.id, SALARY_AMOUNT, true);
          this.ui.updateProfiles(this.players, this.currentPlayerIndex);
        }
      },
      this.speedMultiplier
    );

    await this.handleTileAction(player, player.position, rollResult.isDouble);
  }

  async handleTileAction(player, tileId, rolledDouble) {
    const tile = this.boardState[tileId];

    switch (tile.type) {
      case 'start':
        player.addCash(SALARY_AMOUNT * 2);
        sound.playCoin();
        this.log(`🏆 ตกจุดเริ่มต้นพอดี! ${player.name} รับโบนัส ${formatMoney(SALARY_AMOUNT * 2)}`);
        this.ui.showFloatingCash(player.id, SALARY_AMOUNT * 2, true);
        this.ui.showToast(`ตกช่องจุดเริ่มต้นพอดี! ${player.name} รับเงินรางวัลพิเศษ ${formatMoney(SALARY_AMOUNT * 2)}`);
        break;

      case 'island':
        if (!player.inIsland) {
          player.inIsland = true;
          player.islandTurns = 3;
          sound.playPenalty();
          this.log(`🏝️ ${player.name} ตกเกาะร้าง ติดเกาะ 3 เทิร์น`);
          this.ui.showToast(`${player.name} ตกเกาะร้าง! ต้องหยุดพัก 3 เทิร์น`);
        }
        break;

      case 'festival':
        await this.handleFestivalAction(player);
        break;

      case 'space':
        player.spaceTravelReady = true;
        sound.playTeleport();
        this.log(`🛸 ${player.name} เข้าสู่สถานีอวกาศ เตรียมบินรอบโลกในเทิร์นถัดไป`);
        this.ui.showToast(`${player.name} เข้าสู่สถานีอวกาศ! รอบหน้าจะได้บินไปช่องใดก็ได้`);
        break;

      case 'tax': {
        const tax = Math.floor(player.cash * 0.1);
        if (tax > 0) {
          player.deductCash(tax);
          sound.playPenalty();
          this.log(`💸 ${player.name} เสียภาษีบำรุงเมือง ${formatMoney(tax)}`);
          this.ui.showFloatingCash(player.id, tax, false);
          this.ui.showToast(`${player.name} เสียภาษีบำรุงเมือง ${formatMoney(tax)}`);
        }
        break;
      }

      case 'chance':
        await this.handleChanceCard(player);
        break;

      case 'city':
        await this.handleCityTile(player, tile);
        break;
    }

    this.checkBankruptcies();
    updatePlayerRankings(this.players, this.boardState);
    this.ui.updateProfiles(this.players, this.currentPlayerIndex);

    if (this.checkWinConditions(player)) {
      return;
    }

    // ทอยได้เต๋าคู่ ได้สิทธิ์ทอยต่อ
    if (rolledDouble && !player.inIsland && !this.isGameOver) {
      this.log(`✨ ทอยได้เต๋าคู่! ${player.name} ได้สิทธิ์ทอยอีก 1 ครั้ง`);
      this.ui.showToast(`ทอยได้เต๋าคู่! ${player.name} ได้สิทธิ์ทอยต่ออีก 1 รอบ`);
      if (player.isBot) {
        setTimeout(() => this.runBotTurn(), Math.floor(700 / this.speedMultiplier));
      } else if (this.autoRoll) {
        setTimeout(() => this.triggerHumanAutoRoll(), 500);
      }
      return;
    }

    this.endTurn();
  }

  async handleCityTile(player, tile) {
    if (tile.ownerId === null) {
      if (player.isBot) {
        const decision = BotAI.decideBuild(player, tile);
        if (decision.shouldBuy) {
          this.executeBuild(player, tile, decision.buildLevel, decision.buildLandmark);
        }
      } else {
        const choice = await this.ui.promptBuyProperty(player, tile);
        if (choice && choice.confirm) {
          this.executeBuild(player, tile, choice.level, choice.isLandmark);
        }
      }
      return;
    }

    if (tile.ownerId === player.id) {
      if (!tile.isLandmark) {
        if (player.isBot) {
          const decision = BotAI.decideBuild(player, tile);
          if (decision.shouldBuy) {
            this.executeBuild(player, tile, decision.buildLevel, decision.buildLandmark);
          }
        } else {
          const choice = await this.ui.promptBuyProperty(player, tile);
          if (choice && choice.confirm) {
            this.executeBuild(player, tile, choice.level, choice.isLandmark);
          }
        }
      }
      return;
    }

    // เมืองของคู่แข่ง -> เสียค่าผ่านทาง
    const owner = this.players[tile.ownerId];
    if (owner && !owner.isBankrupt) {
      if (player.freePassShield > 0) {
        player.freePassShield -= 1;
        this.log(`🛡️ ${player.name} ใช้บัตรผ่านทางฟรี ยกเว้นค่าผ่านทางที่ ${tile.name}`);
        this.ui.showToast(`${player.name} ใช้บัตรผ่านทางฟรี ยกเว้นค่าผ่านทางได้สำเร็จ!`);
        return;
      }

      let rent = tile.baseRent * (tile.buildingLevel || 1) * (tile.multiplier || 1);
      if (tile.isLandmark) rent *= 2.5;

      player.deductCash(rent);
      owner.addCash(rent);
      sound.playPenalty();

      this.log(`💰 ${player.name} จ่ายค่าผ่านทาง ${formatMoney(rent)} ให้กับ ${owner.name} ที่เมือง ${tile.name}`);
      this.ui.showFloatingCash(player.id, rent, false);
      this.ui.showFloatingCash(owner.id, rent, true);
      this.ui.showToast(`${player.name} จ่ายค่าผ่านทาง ${formatMoney(rent)} ให้กับ ${owner.name}`);

      // ซื้อต่อ / เทคโอเวอร์
      if (!tile.isLandmark && player.cash > 0) {
        const takeoverCost = tile.price * 2;
        if (player.cash >= takeoverCost) {
          let wantTakeover = false;
          if (player.isBot) {
            wantTakeover = BotAI.decideTakeover(player, takeoverCost);
          } else {
            wantTakeover = await this.ui.promptTakeover(player, tile, takeoverCost, owner);
          }

          if (wantTakeover) {
            player.deductCash(takeoverCost);
            owner.addCash(takeoverCost);
            owner.removeProperty(tile.id);

            tile.ownerId = player.id;
            player.addProperty(tile.id);
            sound.playBuild();

            this.log(`⚡ ${player.name} เทคโอเวอร์เมือง ${tile.name} จาก ${owner.name} (${formatMoney(takeoverCost)})`);
            this.ui.updateBuilding(tile.id, tile.buildingLevel, tile.isLandmark, player.color);
            this.ui.showToast(`เทคโอเวอร์สำเร็จ! ${player.name} เข้าซื้อเมือง ${tile.name} จาก ${owner.name}`);
          }
        }
      }
    }
  }

  executeBuild(player, tile, level, isLandmark) {
    let cost = tile.price;
    if (level === 2) cost += tile.price * 0.5;
    if (level === 3) cost += tile.price * 1.0;
    if (isLandmark) cost += tile.price * 1.5;

    if (player.deductCash(cost)) {
      tile.ownerId = player.id;
      tile.buildingLevel = level;
      tile.isLandmark = isLandmark;
      player.addProperty(tile.id);

      sound.playBuild();
      this.ui.showFloatingCash(player.id, cost, false);
      this.ui.updateBuilding(tile.id, level, isLandmark, player.color);

      const buildName = isLandmark ? 'แลนด์มาร์ก' : `ตึกเลเวล ${level}`;
      this.log(`🏗️ ${player.name} สร้าง${buildName} ที่ ${tile.name} (${formatMoney(cost)})`);
      this.ui.showToast(`${player.name} สร้าง${buildName} ที่เมือง ${tile.name} สำเร็จ!`);
    }
  }

  async handleChanceCard(player) {
    const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
    this.log(`🔮 การ์ดดวงของ ${player.name}: ${card.title} - ${card.desc}`);
    await this.ui.showChanceCardModal(card);

    if (card.action === 'teleport') {
      sound.playTeleport();
      player.position = card.target;
      this.ui.renderPawns(this.players);
      if (card.target === 0) {
        player.addCash(SALARY_AMOUNT);
        sound.playCoin();
      }
    } else if (card.action === 'gain_cash') {
      player.addCash(card.amount);
      sound.playCoin();
      this.ui.showFloatingCash(player.id, card.amount, true);
    } else if (card.action === 'lose_cash') {
      player.deductCash(card.amount);
      sound.playPenalty();
      this.ui.showFloatingCash(player.id, card.amount, false);
    } else if (card.action === 'get_shield') {
      player.freePassShield += 1;
      sound.playCoin();
    }
  }

  async handleFestivalAction(player) {
    // Edge case: ผู้เล่นไม่มีเมืองในครอบครอง
    if (player.properties.size === 0) {
      this.log(`🎪 ${player.name} ยังไม่มีเมือง จึงไม่สามารถจัดงานเทศกาลได้`);
      this.ui.showToast(`${player.name} ยังไม่มีเมืองในครอบครอง จึงไม่สามารถจัดงานเทศกาลได้`);
      return;
    }

    let chosenTileId = null;
    if (player.isBot) {
      chosenTileId = BotAI.decideFestivalTarget(player, this.boardState);
    } else {
      chosenTileId = await this.ui.promptFestivalCity(player, this.boardState);
    }

    if (chosenTileId !== null && this.boardState[chosenTileId]) {
      this.boardState[chosenTileId].multiplier = 2;
      this.ui.updateMultiplier(chosenTileId, 2);
      sound.playCoin();
      this.log(`🎪 ${player.name} จัดงานเทศกาลที่ "${this.boardState[chosenTileId].name}" ค่าผ่านทาง x2!`);
      this.ui.showToast(`จัดงานเทศกาลที่เมือง "${this.boardState[chosenTileId].name}" ค่าผ่านทาง x2!`);
    }
  }

  checkBankruptcies() {
    this.players.forEach(player => {
      if (!player.isBankrupt && player.cash <= 0) {
        player.properties.forEach(tileId => {
          const tile = this.boardState[tileId];
          if (tile) {
            tile.ownerId = null;
            tile.buildingLevel = 0;
            tile.isLandmark = false;
            tile.multiplier = 1;
            this.ui.updateBuilding(tileId, 0, false, 'transparent');
            this.ui.updateMultiplier(tileId, 1);
          }
        });

        player.setBankrupt();
        sound.playPenalty();
        this.log(`💥 ${player.name} เงินหมดบัญชีและประกาศล้มละลาย!`);
        this.ui.showToast(`${player.name} ล้มละลายและต้องออกจากเกม!`);
      }
    });
  }

  checkWinConditions(player) {
    if (player.isBankrupt) return false;

    // ชนะแบบล้มละลาย
    const activePlayers = this.players.filter(p => !p.isBankrupt);
    if (activePlayers.length === 1) {
      this.triggerVictory(activePlayers[0], 'ชัยชนะแบบล้มละลาย (Bankruptcy Victory)!');
      return true;
    }

    // Line Monopoly (ครองทั้งแถว)
    const rows = [
      [1, 2, 3, 5, 6, 7],
      [9, 10, 11, 13, 14, 15],
      [17, 19, 21, 22, 23],
      [25, 26, 27, 29, 30, 31]
    ];

    for (const row of rows) {
      const allOwned = row.every(tileId => this.boardState[tileId].ownerId === player.id);
      if (allOwned) {
        this.triggerVictory(player, 'ชัยชนะสุดยอด Line Monopoly (ครองทั้งแถว)!');
        return true;
      }
    }

    // Triple Monopoly (ครอง 3 สี)
    const ownedGroups = new Set();
    Object.keys(COLOR_GROUPS).forEach(groupKey => {
      const groupTiles = this.boardState.filter(t => t.type === 'city' && t.group === groupKey);
      if (groupTiles.length > 0 && groupTiles.every(t => t.ownerId === player.id)) {
        ownedGroups.add(groupKey);
      }
    });

    if (ownedGroups.size >= 3) {
      this.triggerVictory(player, 'ชัยชนะเหนือชั้น Triple Monopoly (ครองเมืองครบ 3 สี)!');
      return true;
    }

    return false;
  }

  triggerVictory(winner, reason) {
    this.isGameOver = true;
    sound.playVictory();
    this.log(`🏆 จบเกม! ${winner.name} ได้รับ${reason}`);
    this.ui.showVictoryModal(winner, reason);
  }

  /**
   * จบเทิร์น และสลับผู้เล่น (ป้องกัน Infinite Loop หากผู้เล่นหลายคนล้มละลายพร้อมกัน)
   */
  endTurn() {
    if (this.isGameOver) return;

    // ตรวจสอบจำนวนผู้เล่นที่ยังรอด
    const activePlayers = this.players.filter(p => !p.isBankrupt);
    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1) {
        this.triggerVictory(activePlayers[0], 'ชัยชนะแบบล้มละลาย (Bankruptcy Victory)!');
      }
      return;
    }

    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    let guardCount = 0;

    // ค้นหาผู้เล่นคนถัดไปที่ยังไม่ล้มละลายอย่างปลอดภัย
    while (this.players[nextIndex].isBankrupt && guardCount < this.players.length) {
      nextIndex = (nextIndex + 1) % this.players.length;
      guardCount++;
    }

    if (nextIndex <= this.currentPlayerIndex) {
      this.currentTurn += 1;
      this.ui.updateTurnCounter(this.currentTurn);
    }

    this.currentPlayerIndex = nextIndex;
    const nextPlayer = this.getCurrentPlayer();

    this.ui.updateProfiles(this.players, this.currentPlayerIndex);
    this.ui.showToast(`ตาของ ${nextPlayer.name}`);

    if (nextPlayer.isBot) {
      setTimeout(() => this.runBotTurn(), Math.floor(700 / this.speedMultiplier));
    } else if (this.autoRoll) {
      setTimeout(() => this.triggerHumanAutoRoll(), 600);
    }
  }

  async runBotTurn() {
    if (this.isGameOver) return;
    const bot = this.getCurrentPlayer();
    if (!bot.isBot) return;

    if (bot.inIsland && BotAI.decideBail(bot, BAIL_COST)) {
      if (bot.deductCash(BAIL_COST)) {
        bot.inIsland = false;
        bot.islandTurns = 0;
        sound.playCoin();
        this.log(`🏝️ ${bot.name} จ่ายเงินประกันตัว ${formatMoney(BAIL_COST)} ออกจากเกาะร้าง`);
        this.ui.updateProfiles(this.players, this.currentPlayerIndex);
      }
    }

    try {
      const rollResult = await this.ui.triggerDiceRoll(this.speedMultiplier);
      await this.handleDiceRoll(rollResult);
    } catch (err) {
      console.warn('Bot roll error:', err);
    }
  }

  async triggerHumanAutoRoll() {
    if (this.isGameOver) return;
    const cur = this.getCurrentPlayer();
    if (cur.isBot || cur.isBankrupt) return;

    try {
      const rollResult = await this.ui.triggerDiceRoll(this.speedMultiplier);
      await this.handleDiceRoll(rollResult);
    } catch (err) {
      console.warn('Auto roll error:', err);
    }
  }
}
