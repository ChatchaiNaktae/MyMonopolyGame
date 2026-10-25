/**
 * ============================================================================
 * ไฟล์: backend/server.js
 * คำอธิบาย: เซิร์ฟเวอร์หลัก (HTTP Static Server & Native RFC 6455 WebSocket Server)
 * ข้อกำหนด: ไม่ใช้ไลบรารีภายนอก (Zero External Dependencies - ใช้เฉพาะ built-in modules)
 * ภาษา: JavaScript (Node.js ES Modules / ECMAScript 2026)
 * ผู้เขียน: ผู้สอน Back-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { RoomManager } from './roomManager.js';

// กำหนดไดเรกทอรีรากของโปรเจกต์
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const PORT = process.env.PORT || 3000;
const roomManager = new RoomManager();

// ตารางแมปนามสกุลไฟล์เป็น MIME Type สำหรับ HTTP Server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

/**
 * 1. สร้างเซิร์ฟเวอร์ HTTP เพื่อให้บริการไฟล์สถิต (Static File Server)
 * ช่วยให้เปิดเข้าเล่นผ่านเบราว์เซอร์ได้ที่ http://localhost:3000
 */
const server = http.createServer((req, res) => {
  // ถอดรหัส URL และตั้งค่าหน้าเริ่มต้นเป็น index.html
  let safePath = path.normalize(decodeURIComponent(req.url.split('?')[0]));
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(ROOT_DIR, safePath);

  // ป้องกัน Directory Traversal Attack
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 เข้าถึงไม่ได้');
    return;
  }

  // อ่านและส่งไฟล์กลับไปยังเบราว์เซอร์
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 ไม่พบไฟล์ที่ร้องขอ');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

/**
 * 2. ระบบ Native WebSocket (RFC 6455) โดยไม่ใช้แพ็กเกจภายนอก
 * จับสัญญาณ Upgrade จาก HTTP Request เพื่อเปลี่ยนโปรโตคอลเป็น WebSocket
 */
server.on('upgrade', (req, socket, head) => {
  const upgradeHeader = req.headers['upgrade'];
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }

  // ดึงค่า Sec-WebSocket-Key จาก Client
  const clientKey = req.headers['sec-websocket-key'];
  if (!clientKey) {
    socket.destroy();
    return;
  }

  // คำนวณ Handshake Key ตามมาตรฐาน RFC 6455: SHA-1(Key + GUID) แปลงเป็น Base64
  const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const acceptKey = crypto
    .createHash('sha1')
    .update(clientKey + WS_GUID)
    .digest('base64');

  // ส่ง HTTP 101 Switching Protocols กลับไปยืนยันการเชื่อมต่อ
  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '\r\n'
  ];

  socket.write(responseHeaders.join('\r\n'));

  // ฟังก์ชันผู้ช่วยส่ง WebSocket Text Frame (เซิร์ฟเวอร์ส่งไปยังไคลเอนต์ไม่ต้อง Mask)
  socket.sendFrame = (textData) => {
    const payload = Buffer.from(textData, 'utf-8');
    const length = payload.length;
    let header;

    if (length <= 125) {
      header = Buffer.from([0x81, length]); // 0x81 = FIN bit + Text Frame (Opcode 1)
    } else if (length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    socket.write(Buffer.concat([header, payload]));
  };

  // ตัวแปรสะสม Buffer สำหรับถอดรหัส Frame ข้อมูลที่รับเข้ามา
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const opcode = firstByte & 0x0f; // 1 = Text, 8 = Close, 9 = Ping

      // จัดการ Close Frame (ไคลเอนต์ขอปิดการเชื่อมต่อ)
      if (opcode === 0x8) {
        socket.end();
        return;
      }

      const secondByte = buffer[1];
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (buffer.length < 4) return; // ข้อมูลยังมาไม่ครบ
        payloadLength = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (buffer.length < 10) return;
        payloadLength = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      // ตรวจสอบขนาดของ Mask Key (4 ไบต์)
      const maskKeyLength = isMasked ? 4 : 0;
      if (buffer.length < offset + maskKeyLength + payloadLength) {
        return; // ข้อมูลเฟรมยังมาไม่ครบ รอ chunk ถัดไป
      }

      let payload = buffer.subarray(offset + maskKeyLength, offset + maskKeyLength + payloadLength);

      // ถอดรหัส XOR Mask (มาตรฐาน Client ส่งมายัง Server จะต้อง Mask เสมอ)
      if (isMasked) {
        const maskKey = buffer.subarray(offset, offset + 4);
        const unmasked = Buffer.alloc(payloadLength);
        for (let i = 0; i < payloadLength; i++) {
          unmasked[i] = payload[i] ^ maskKey[i % 4];
        }
        payload = unmasked;
      }

      // เลื่อนตำแหน่ง Buffer เพื่อรอเฟรมถัดไป
      buffer = buffer.subarray(offset + maskKeyLength + payloadLength);

      // ประมวลผลข้อความ Text
      if (opcode === 0x1) {
        const messageString = payload.toString('utf-8');
        try {
          const parsed = JSON.parse(messageString);
          handleClientMessage(socket, parsed);
        } catch (err) {
          console.warn('[WebSocket Server] ข้อความไม่ใช่ JSON:', messageString);
        }
      }
    }
  });

  socket.on('close', () => {
    roomManager.handleDisconnect(socket);
  });

  socket.on('error', (err) => {
    console.warn('[WebSocket Server] เกิดข้อผิดพลาดของ Socket:', err.message);
  });
});

/**
 * 3. จัดการคำสั่งและตรรกะของเกมที่ไคลเอนต์ส่งเข้ามา
 * @param {Object} socket - Socket ของผู้ส่ง
 * @param {Object} message - ข้อมูลคำสั่ง
 */
function handleClientMessage(socket, message) {
  const { action, username, roomCode, ...data } = message;

  switch (action) {
    case 'CREATE_ROOM': {
      const room = roomManager.createRoom(socket, username || 'โฮสต์');
      socket.sendFrame(JSON.stringify({
        action: 'ROOM_CREATED',
        roomCode: room.code,
        username: username || 'โฮสต์',
        playerId: 0
      }));
      break;
    }

    case 'JOIN_ROOM': {
      const result = roomManager.joinRoom(socket, roomCode, username || 'ผู้เล่น');
      if (result.success) {
        socket.sendFrame(JSON.stringify({
          action: 'ROOM_JOINED',
          roomCode: result.room.code,
          username: username || 'ผู้เล่น',
          playerId: socket.playerId
        }));
      } else {
        socket.sendFrame(JSON.stringify({
          action: 'ERROR',
          message: result.error
        }));
      }
      break;
    }

    case 'GAME_ACTION': {
      // ส่งต่อการกระทำในเกม (เช่น ทอยเต๋า, ซื้อที่ดิน) ให้ทุกคนในห้องเดียวกัน
      if (socket.roomCode) {
        roomManager.broadcast(socket.roomCode, {
          action: 'GAME_SYNC',
          senderId: socket.playerId,
          ...data
        });
      }
      break;
    }

    default:
      console.log('[WebSocket Server] คำสั่งที่ไม่รู้จัก:', action);
  }
}

// เริ่มต้นฟังการเชื่อมต่อที่พอร์ต 3000
server.listen(PORT, () => {
  console.log('============================================================');
  console.log(`🚀 เซิร์ฟเวอร์ Monopoly (เกมเศรษฐี) พร้อมใช้งานแล้ว!`);
  console.log(`👉 เปิดเล่นผ่านเบราว์เซอร์ได้ที่: http://localhost:${PORT}`);
  console.log(`🌐 Native WebSocket Server พร้อมทำงานที่พอร์ต: ${PORT}`);
  console.log('============================================================');
});
