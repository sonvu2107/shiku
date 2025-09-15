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
      console.warn("📞 No socket available for global call manager");
      return;
    }

    console.log("📞 Setting up global call offer listener");
    
    const handleOffer = ({ offer, conversationId, caller, callerSocketId, callerInfo, isVideo }) => {
      console.log("📞 Global call offer received:", { 
        conversationId, 
        caller, 
        callerSocketId,
        isVideo,
        listenersCount: this.listeners.size 
      });

      // Gửi offer đến tất cả listeners
      this.listeners.forEach(callback => {
        try {
          callback({ offer, conversationId, caller, callerSocketId, callerInfo, isVideo });
        } catch (error) {
          console.error("❌ Error in call offer listener:", error);
        }
      });
    };

    socket.on("call-offer", handleOffer);
    this.isListening = true;

    // Cleanup khi socket disconnect
    socket.on("disconnect", () => {
      console.log("📞 Socket disconnected, removing global call listener");
      socket.off("call-offer", handleOffer);
      this.isListening = false;
    });

    // Re-setup listener khi reconnect
    socket.on("connect", () => {
      console.log("📞 Socket reconnected, re-setting up global call listener");
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
    console.log("📞 Cleaning up global call manager");
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
