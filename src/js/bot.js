/**
 * ============================================================================
 * ไฟล์: src/js/bot.js
 * คำอธิบาย: ระบบ AI Bot สำหรับเล่นคนเดียว และการตัดสินใจเชิงกลยุทธ์
 * ภาษา: ECMAScript 2026 (ES2026)
 * ผู้เขียน: ผู้สอน Front-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

export class BotAI {
  /**
   * บอทตัดสินใจซื้อที่ดินหรือสร้างตึก
   */
  static decideBuild(player, tile) {
    const cash = player.cash;
    const basePrice = tile.price;

    if (cash < basePrice) {
      return { shouldBuy: false, buildLevel: 0, buildLandmark: false };
    }

    if (tile.ownerId === player.id && tile.buildingLevel >= 3) {
      const landmarkCost = basePrice * 1.5;
      if (cash >= landmarkCost + 1_500_000) {
        return { shouldBuy: true, buildLevel: 3, buildLandmark: true };
      }
    }

    if (cash >= basePrice * 2.2) {
      return { shouldBuy: true, buildLevel: 3, buildLandmark: false };
    }
    if (cash >= basePrice * 1.5) {
      return { shouldBuy: true, buildLevel: 2, buildLandmark: false };
    }
    return { shouldBuy: true, buildLevel: 1, buildLandmark: false };
  }

  /**
   * บอทตัดสินใจเทคโอเวอร์
   */
  static decideTakeover(player, takeoverCost) {
    return player.cash >= takeoverCost + 2_000_000;
  }

  /**
   * บอทตัดสินใจจ่ายประกันออกจากเกาะ
   */
  static decideBail(player, bailCost) {
    return player.cash >= bailCost + 2_500_000;
  }

  /**
   * บอทเลือกเมืองจัดงานเทศกาล (คูณค่าผ่านทาง x2)
   */
  static decideFestivalTarget(player, boardTiles) {
    if (player.properties.size === 0) return null;

    let bestTileId = null;
    let highestRent = 0;

    for (const tileId of player.properties) {
      const tile = boardTiles[tileId];
      if (tile && tile.type === 'city') {
        const estRent = tile.baseRent * (tile.buildingLevel || 1);
        if (estRent > highestRent) {
          highestRent = estRent;
          bestTileId = tileId;
        }
      }
    }
    return bestTileId;
  }

  /**
   * บอทเลือกเป้าหมายบินจากสถานีอวกาศ
   */
  static decideSpaceTarget(player, boardTiles) {
    let bestTarget = 0;
    let maxPrice = 0;

    boardTiles.forEach((tile, index) => {
      if (tile.type === 'city' && tile.ownerId === null) {
        if (tile.price > maxPrice) {
          maxPrice = tile.price;
          bestTarget = index;
        }
      }
    });

    return bestTarget || 0;
  }
}
