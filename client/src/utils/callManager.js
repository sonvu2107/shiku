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
    this.handleOffer = null; // Store reference to handler
    this.handleDisconnect = null; // Store reference to disconnect handler
    this.handleConnect = null; // Store reference to connect handler
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

    // Create handler once and store reference
    this.handleOffer = ({ offer, conversationId, caller, callerSocketId, callerInfo, isVideo }) => {
      // Validate parameters
      if (!offer || !conversationId) {
        return;
      }

      // Gửi offer đến tất cả listeners
      this.listeners.forEach(callback => {
        try {
          callback({ offer, conversationId, caller, callerSocketId, callerInfo, isVideo });
        } catch (error) {
          // Silent error handling
        }
      });
    };

    // Create disconnect handler
    this.handleDisconnect = () => {
      this.isListening = false;
    };

    // Create connect handler
    this.handleConnect = () => {
      if (this.listeners.size > 0) {
        this.isListening = false;
        this.ensureListening();
      }
    };

    // Remove old listeners if any (prevent duplicates)
    socket.off("call-offer", this.handleOffer);
    socket.off("disconnect", this.handleDisconnect);
    socket.off("connect", this.handleConnect);

    // Add new listeners
    socket.on("call-offer", this.handleOffer);
    socket.on("disconnect", this.handleDisconnect);
    socket.on("connect", this.handleConnect);

    this.isListening = true;
  }

  /**
   * Xóa tất cả listeners và cleanup
   */
  cleanup() {
    this.listeners.clear();

    const socket = socketService.socket;
    if (socket) {
      // Remove all event listeners
      if (this.handleOffer) {
        socket.off("call-offer", this.handleOffer);
      }
      if (this.handleDisconnect) {
        socket.off("disconnect", this.handleDisconnect);
      }
      if (this.handleConnect) {
        socket.off("connect", this.handleConnect);
      }
    }

    // Reset references
    this.handleOffer = null;
    this.handleDisconnect = null;
    this.handleConnect = null;
    this.isListening = false;
  }
}

// Tạo singleton instance
const callManager = new CallManager();
export default callManager;
