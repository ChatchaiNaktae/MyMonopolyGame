/**
 * ============================================================================
 * ไฟล์: src/js/config.js
 * คำอธิบาย: การตั้งค่าข้อมูลกระดาน, กลุ่มสี, SVG Icons, และตัวช่วยป้องกัน Edge Cases
 * ปรับปรุง: แทนที่ไอคอน Emoji ด้วย SVG คมชัด, เพิ่มข้อมูลสำหรับ Tile Inspector
 * ภาษา: ECMAScript 2026 (ES2026)
 * ผู้เขียน: ผู้สอน Front-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

// เงินเริ่มต้นของผู้เล่นแต่ละคน (20 ล้าน)
export const STARTING_CASH = 20_000_000;

// เงินเดือนเมื่อเดินผ่านจุดเริ่มต้น START
export const SALARY_AMOUNT = 2_000_000;

// ค่าประกันตัวออกจากเกาะร้าง
export const BAIL_COST = 500_000;

// ชุดไอคอน SVG แบบคมชัดสำหรับใช้งานในเกม (กำจัดปัญหา AI Slop Emoji)
export const SVG_ICONS = {
  START: `<svg viewBox="0 0 24 24" class="corner-icon-svg"><path d="M12 2.5s4 3.5 4 8.5c0 2.5-1 4.5-2 5.5l1 4.5-3-2-3 2 1-4.5c-1-1-2-3-2-5.5 0-5 4-8.5 4-8.5zM9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"/></svg>`,
  ISLAND: `<svg viewBox="0 0 24 24" class="corner-icon-svg"><path d="M19 19c-2 0-3-1-5-1s-3 1-5 1-3-1-5-1v2c2 0 3 1 5 1s3-1 5-1 3 1 5 1 3-1 5-1v-2c-2 0-3 1-5 1zM13 3c-.5 2-2 4-5 5 2 1 4 1 5 0v8h2V5c2 1 4 1 5 0-3-1-4.5-3-5-5-.5 1-1.5 2-2 3z"/></svg>`,
  FESTIVAL: `<svg viewBox="0 0 24 24" class="corner-icon-svg"><path d="M12 2L2 9l2 12h16l2-12L12 2zm0 4.5l5 3.5H7l5-3.5zM5.5 19l1-6h11l1 6h-13z"/></svg>`,
  SPACE: `<svg viewBox="0 0 24 24" class="corner-icon-svg"><path d="M12 3a6 6 0 0 0-6 5.3c-2.3.8-4 2.5-4 4.7 0 2.8 2.7 5 6 5h8c3.3 0 6-2.2 6-5 0-2.2-1.7-3.9-4-4.7A6 6 0 0 0 12 3zm0 2a4 4 0 0 1 3.9 3.1c-1.2-.1-2.5-.1-3.9-.1s-2.7 0-3.9.1A4 4 0 0 1 12 5z"/></svg>`,
  CHANCE: `<svg viewBox="0 0 24 24" class="corner-icon-svg"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm1-9a3.5 3.5 0 0 0-3.5 3.5h2a1.5 1.5 0 1 1 2.5 1.1c-.8.8-1.5 1.4-1.5 2.9h2c0-.9.4-1.4 1.1-2.1A3.5 3.5 0 0 0 12 6z"/></svg>`,
  TAX: `<svg viewBox="0 0 24 24" class="corner-icon-svg"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.9V18h-2v-1.1c-1.7-.3-3-1.6-3-3.4h2c0 1 .8 1.8 2 1.8s2-.8 2-1.8c0-1.1-.7-1.6-2.3-2.1C9.6 10.7 8 9.9 8 8c0-1.7 1.2-3 2.9-3.4V4h2v.6c1.5.3 2.6 1.4 2.8 2.9h-2c-.2-.7-.7-1.3-1.8-1.3s-1.9.6-1.9 1.5c0 1 .8 1.5 2.4 2 2.2.7 3.6 1.6 3.6 3.5-.1 1.9-1.4 3.3-3 3.7z"/></svg>`,
  LANDMARK: `<svg viewBox="0 0 24 24"><path d="M12 2L4 7v2h2v11H4v2h16v-2h-2V9h2V7l-8-5zm0 3.2L16.5 8H7.5L12 5.2zM10 11h4v7h-4v-7z"/></svg>`,
  DICE: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`
};

// ข้อมูลกลุ่มสีของเมือง (Color Groups สำหรับตรวจสอบ Triple / Color Monopoly)
export const COLOR_GROUPS = {
  GREEN: { id: 'GREEN', name: 'สีเขียวสด', color: '#10b981' },
  CYAN: { id: 'CYAN', name: 'สีฟ้ามินต์', color: '#06b6d4' },
  BLUE: { id: 'BLUE', name: 'สีน้ำเงิน', color: '#3b82f6' },
  ORANGE: { id: 'ORANGE', name: 'สีส้มสด', color: '#f97316' },
  PURPLE: { id: 'PURPLE', name: 'สีม่วง', color: '#a855f7' },
  PINK: { id: 'PINK', name: 'สีชมพู', color: '#ec4899' },
  RED: { id: 'RED', name: 'สีแดงหรูหรา', color: '#ef4444' }
};

/**
 * ข้อมูลช่องเดินทั้ง 32 ช่องบนกระดาน (เรียงตามลำดับเข็มนาฬิกา 0 ถึง 31)
 */
export const BOARD_TILES = [
  // แถวล่าง (Bottom Row: Index 0 - 7)
  { id: 0, name: 'จุดเริ่มต้น', type: 'start', icon: SVG_ICONS.START },
  { id: 1, name: 'เชียงใหม่', type: 'city', group: 'GREEN', price: 600_000, baseRent: 150_000 },
  { id: 2, name: 'ภูเก็ต', type: 'city', group: 'GREEN', price: 800_000, baseRent: 200_000 },
  { id: 3, name: 'พัทยา', type: 'city', group: 'GREEN', price: 1_000_000, baseRent: 250_000 },
  { id: 4, name: 'การ์ดดวง', type: 'chance', icon: SVG_ICONS.CHANCE },
  { id: 5, name: 'ฮานอย', type: 'city', group: 'CYAN', price: 1_200_000, baseRent: 300_000 },
  { id: 6, name: 'สิงคโปร์', type: 'city', group: 'CYAN', price: 1_400_000, baseRent: 350_000 },
  { id: 7, name: 'บาหลี', type: 'city', group: 'CYAN', price: 1_600_000, baseRent: 400_000 },

  // แถวขวา (Right Row: Index 8 - 15)
  { id: 8, name: 'เกาะร้าง', type: 'island', icon: SVG_ICONS.ISLAND },
  { id: 9, name: 'โตเกียว', type: 'city', group: 'BLUE', price: 1_800_000, baseRent: 450_000 },
  { id: 10, name: 'โอซาก้า', type: 'city', group: 'BLUE', price: 2_000_000, baseRent: 500_000 },
  { id: 11, name: 'โซล', type: 'city', group: 'BLUE', price: 2_200_000, baseRent: 550_000 },
  { id: 12, name: 'การ์ดดวง', type: 'chance', icon: SVG_ICONS.CHANCE },
  { id: 13, name: 'ปักกิ่ง', type: 'city', group: 'ORANGE', price: 2_400_000, baseRent: 600_000 },
  { id: 14, name: 'เซี่ยงไฮ้', type: 'city', group: 'ORANGE', price: 2_600_000, baseRent: 650_000 },
  { id: 15, name: 'ฮ่องกง', type: 'city', group: 'ORANGE', price: 2_800_000, baseRent: 700_000 },

  // แถวบน (Top Row: Index 16 - 23)
  { id: 16, name: 'จัดงานเทศกาล', type: 'festival', icon: SVG_ICONS.FESTIVAL },
  { id: 17, name: 'ดูไบ', type: 'city', group: 'PURPLE', price: 3_000_000, baseRent: 750_000 },
  { id: 18, name: 'เสียภาษี', type: 'tax', icon: SVG_ICONS.TAX, taxRate: 0.1 },
  { id: 19, name: 'ไคโร', type: 'city', group: 'PURPLE', price: 3_200_000, baseRent: 800_000 },
  { id: 20, name: 'การ์ดดวง', type: 'chance', icon: SVG_ICONS.CHANCE },
  { id: 21, name: 'โรม', type: 'city', group: 'PINK', price: 3_500_000, baseRent: 900_000 },
  { id: 22, name: 'ปารีส', type: 'city', group: 'PINK', price: 3_800_000, baseRent: 1_000_000 },
  { id: 23, name: 'ลอนดอน', type: 'city', group: 'PINK', price: 4_000_000, baseRent: 1_100_000 },

  // แถวซ้าย (Left Row: Index 24 - 31)
  { id: 24, name: 'สถานีอวกาศ', type: 'space', icon: SVG_ICONS.SPACE },
  { id: 25, name: 'ซิดนีย์', type: 'city', group: 'RED', price: 4_200_000, baseRent: 1_200_000 },
  { id: 26, name: 'นิวยอร์ก', type: 'city', group: 'RED', price: 4_500_000, baseRent: 1_300_000 },
  { id: 27, name: 'กรุงเทพฯ', type: 'city', group: 'RED', price: 5_000_000, baseRent: 1_500_000 },
  { id: 28, name: 'การ์ดดวง', type: 'chance', icon: SVG_ICONS.CHANCE },
  { id: 29, name: 'ซานฟรานฯ', type: 'city', group: 'RED', price: 5_200_000, baseRent: 1_600_000 },
  { id: 30, name: 'โตรอนโต', type: 'city', group: 'RED', price: 5_500_000, baseRent: 1_700_000 },
  { id: 31, name: 'ลาสเวกัส', type: 'city', group: 'RED', price: 6_000_000, baseRent: 2_000_000 }
];

/**
 * รายการการ์ดดวง (Chance Cards List)
 */
export const CHANCE_CARDS = [
  {
    id: 'fly_space',
    title: 'สถานีอวกาศเรียกตัว',
    desc: 'ได้รับสิทธิ์วาร์ปไปยังสถานีอวกาศเพื่อเตรียมบินรอบโลกในเทิร์นถัดไป',
    action: 'teleport',
    target: 24
  },
  {
    id: 'lotto_win',
    title: 'ถูกรางวัลสลากออมทรัพย์',
    desc: 'โชคดีมาก! ได้รับเงินรางวัลพิเศษ 3,000,000',
    action: 'gain_cash',
    amount: 3_000_000
  },
  {
    id: 'charity',
    title: 'บริจาคสร้างศูนย์การแพทย์',
    desc: 'ร่วมสร้างโรงพยาบาลชุมชน จ่ายเงินบริจาค 1,000,000',
    action: 'lose_cash',
    amount: 1_000_000
  },
  {
    id: 'go_start',
    title: 'บินด่วนสู่จุดเริ่มต้น',
    desc: 'วาร์ปกลับไปยังจุดเริ่มต้น START และรับเงินเดือนทันที',
    action: 'teleport',
    target: 0
  },
  {
    id: 'free_pass',
    title: 'บัตรผ่านทางฟรี',
    desc: 'ได้รับบัตรยกเว้นค่าผ่านทาง 1 ครั้งเมื่อตกเมืองคู่แข่ง',
    action: 'get_shield'
  }
];

/**
 * ฟังก์ชันแปลงตัวเลขจำนวนเงินให้อ่านง่ายสไตล์เกมเศรษฐี
 * @param {number} amount - จำนวนเงิน
 * @returns {string} ข้อความแสดงผล
 */
export function formatMoney(amount) {
  if (amount >= 1_000_000) {
    const millions = Math.floor(amount / 1_000_000);
    const thousands = Math.floor((amount % 1_000_000) / 1_000);
    if (thousands > 0) {
      return `${millions}M${String(thousands).padStart(3, '0')}`;
    }
    return `${millions}M`;
  }
  if (amount >= 1_000) {
    return `${Math.floor(amount / 1_000)}K`;
  }
  return String(amount);
}

/**
 * ฟังก์ชันทำความสะอาดข้อความ ป้องกันช่องโหว่ XSS และควบคุมความยาวตัวอักษร (Harden Edge Case)
 * @param {string} input - ข้อความที่ผู้ใช้กรอก
 * @param {number} [maxLength=15] - ความยาวสูงสุด
 * @returns {string} ข้อความที่ปลอดภัย
 */
export function sanitizeText(input, maxLength = 15) {
  if (typeof input !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = input.trim();
  const safe = div.innerHTML.replace(/[<>"'/]/g, '');
  return safe.slice(0, maxLength);
}
