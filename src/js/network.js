/**
 * ============================================================================
 * ไฟล์: src/js/network.js
 * คำอธิบาย: ตัวเชื่อมต่อ WebSocket ฝั่ง Client พร้อมระบบความปลอดภัยและการคืนสภาพอัตโนมัติ
 * ภาษา: ECMAScript 2026 (ES2026)
 * ผู้เขียน: ผู้สอน Front-end สำหรับผู้เริ่มต้น
 * ============================================================================
 */

export class NetworkClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.eventListeners = new Map();
    this.roomCode = null;
    this.myPlayerId = null;
  }

  /**
   * เชื่อมต่อ WebSocket
   */
  connect(serverUrl) {
    const url = serverUrl || `ws://${window.location.hostname || 'localhost'}:${window.location.port || '3000'}`;

    return new Promise((resolve) => {
      try {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
          resolve(true);
          return;
        }

        this.ws = new WebSocket(url);

        const timeout = setTimeout(() => {
          if (!this.isConnected) {
            console.warn('[Network] Connection timed out');
            resolve(false);
          }
        }, 3000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.emit('connected');
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (err) {
            console.warn('[Network] รูปแบบข้อมูลไม่ถูกต้อง:', err);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected');
        };

        this.ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  }

  send(action, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, ...payload }));
    }
  }

  handleMessage(message) {
    const { action, ...payload } = message;
    if (this.eventListeners.has(action)) {
      this.eventListeners.get(action).forEach(cb => cb(payload));
    }
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, payload = {}) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(cb => cb(payload));
    }
  }
}

export const net = new NetworkClient();
