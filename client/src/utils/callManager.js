import { getUserInfo } from "./auth";
import socketService from "../socket";

/**
 * Global Call Manager - Quản lý incoming calls toàn cục
 * Đảm bảo user có thể nhận call offers ngay cả khi không trong conversation room
 */
class CallManager {
  constructor() {
    this.listeners = new Set(); // Set of callback functions
    this.isListening = false;
  }

  /**
   * Thêm listener cho incoming calls
   * @param {Function} callback - Callback function để xử lý incoming call
   */
  addListener(callback) {
    this.listeners.add(callback);
    this.ensureListening();
  }

  /**
   * Xóa listener
   * @param {Function} callback - Callback function cần xóa
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Đảm bảo socket đang lắng nghe call offers
   */
  ensureListening() {
    if (this.isListening) return;

    const socket = socketService.socket;
    if (!socket) {
      return;
    }
    
    const handleOffer = ({ offer, conversationId, caller, callerSocketId, callerInfo, isVideo }) => {
      // Gửi offer đến tất cả listeners
      this.listeners.forEach(callback => {
        try {
          callback({ offer, conversationId, caller, callerSocketId, callerInfo, isVideo });
        } catch (error) {
          // Error in call offer listener
        }
      });
    };

    socket.on("call-offer", handleOffer);
    this.isListening = true;

    // Cleanup khi socket disconnect
    socket.on("disconnect", () => {
      socket.off("call-offer", handleOffer);
      this.isListening = false;
    });

    // Re-setup listener khi reconnect
    socket.on("connect", () => {
      if (this.listeners.size > 0) {
        this.isListening = false;
        this.ensureListening();
      }
    });
  }

  /**
   * Xóa tất cả listeners và cleanup
   */
  cleanup() {
    this.listeners.clear();
    
    const socket = socketService.socket;
    if (socket) {
      socket.off("call-offer");
    }
    this.isListening = false;
  }
}

// Tạo singleton instance
const callManager = new CallManager();
export default callManager;
