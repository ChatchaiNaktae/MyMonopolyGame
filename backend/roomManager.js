/**
 * ============================================================================
 * ไฟล์: backend/roomManager.js
 * คำอธิบาย: ตัวจัดการห้องเล่นเกมเศรษฐี (Room & Matchmaking Manager) บนฝั่ง Back-end
 * ภาษา: JavaScript (Node.js ES Modules / ECMAScript 2026)
 * ผู้เขียน: ผู้สอน Back-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // เก็บรายการห้องทั้งหมดโดยใช้ Room Code เป็น Key
  }

  /**
   * สุ่มสร้างรหัสห้อง 4 ตัวอักษรภาษาอังกฤษ (เช่น ABCD, RICH, LUCK)
   * @returns {string} รหัสห้อง
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // หากรหัสซ้ำ ให้สุ่มใหม่จนกว่าจะไม่ซ้ำ
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  /**
   * สร้างห้องเกมใหม่
   * @param {Object} socket - Socket ของผู้สร้างห้อง (Host)
   * @param {string} username - ชื่อผู้เล่น
   * @returns {Object} ข้อมูลห้องที่สร้างขึ้น
   */
  createRoom(socket, username) {
    const roomCode = this.generateRoomCode();

    const room = {
      code: roomCode,
      hostSocket: socket,
      clients: [socket],
      players: [
        { id: 0, name: username, color: '#ff3366', avatar: '👑', isBot: false }
      ],
      status: 'lobby',
      createdAt: Date.now()
    };

    socket.roomCode = roomCode;
    socket.playerId = 0;

    this.rooms.set(roomCode, room);
    console.log(`[RoomManager] สร้างห้องใหม่สำเร็จ: ${roomCode} โดยคุณ ${username}`);

    return room;
  }

  /**
   * ให้ผู้เล่นอื่นเข้าร่วมห้องด้วยรหัสห้อง
   * @param {Object} socket - Socket ของผู้เล่นที่กำลังเข้าร่วม
   * @param {string} roomCode - รหัสห้อง 4 ตัว
   * @param {string} username - ชื่อผู้เล่น
   * @returns {{ success: boolean, room?: Object, error?: string }}
   */
  joinRoom(socket, roomCode, username) {
    const cleanCode = roomCode.trim().toUpperCase();
    const room = this.rooms.get(cleanCode);

    if (!room) {
      return { success: false, error: 'ไม่พบห้องที่ระบุ กรุณาตรวจสอบรหัสห้องอีกครั้ง' };
    }

    if (room.clients.length >= 4) {
      return { success: false, error: 'ห้องนี้มีผู้เล่นครบ 4 คนแล้ว' };
    }

    const playerId = room.players.length;
    const colors = ['#ff3366', '#4361ee', '#00e5a3', '#ffd23f'];
    const avatars = ['👑', '🎮', '👽', '🚀'];

    room.clients.push(socket);
    room.players.push({
      id: playerId,
      name: username,
      color: colors[playerId],
      avatar: avatars[playerId],
      isBot: false
    });

    socket.roomCode = cleanCode;
    socket.playerId = playerId;

    console.log(`[RoomManager] ผู้เล่น ${username} เข้าร่วมห้อง ${cleanCode} (ผู้เล่นคนที่ ${playerId + 1})`);
    return { success: true, room };
  }

  /**
   * จัดการเมื่อผู้เล่นตัดการเชื่อมต่อหรือออกจากห้อง
   * @param {Object} socket - Socket ที่ตัดการเชื่อมต่อ
   */
  handleDisconnect(socket) {
    if (!socket.roomCode) return;

    const room = this.rooms.get(socket.roomCode);
    if (!room) return;

    // นำ socket ออกจากห้อง
    room.clients = room.clients.filter(s => s !== socket);

    // ถ้าไม่มีใครอยู่ในห้องแล้ว ให้ลบห้องทิ้งเพื่อประหยัดหน่วยความจำ
    if (room.clients.length === 0) {
      this.rooms.delete(socket.roomCode);
      console.log(`[RoomManager] ลบห้อง ${socket.roomCode} เนื่องจากไม่มีผู้เล่นเหลืออยู่`);
    } else {
      // แจ้งเตือนผู้เล่นที่เหลือในห้อง
      this.broadcast(socket.roomCode, {
        action: 'PLAYER_LEFT',
        playerId: socket.playerId
      });
    }
  }

  /**
   * ส่งข้อความกระจายให้ผู้เล่นทุกคนในห้องเดียวกัน (Broadcast)
   * @param {string} roomCode - รหัสห้อง
   * @param {Object} data - ข้อมูลที่จะส่ง
   */
  broadcast(roomCode, data) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const json = JSON.stringify(data);
    room.clients.forEach(client => {
      if (client.sendFrame) {
        client.sendFrame(json);
      }
    });
  }
}
