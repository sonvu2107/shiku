import { io } from "socket.io-client";
import { getAccessToken, getValidAccessToken } from "./utils/tokenManager.js";
import { API_CONFIG } from "./config/environment.js";

// URL của Socket.IO server - sử dụng environment config
const SOCKET_URL = API_CONFIG.baseURL;

/**
 * Service quản lý WebSocket connection và real-time communication
 * Hỗ trợ chat messaging, WebRTC calls, typing indicators, user status
 */
class SocketService {
  
  // ==================== WEBRTC CALL SIGNALING ====================
  
  /**
   * Lắng nghe call offer từ người khác
   * @param {Function} callback - Callback xử lý khi nhận offer
   */
  onCallOffer(callback) {
    if (this.socket) {
      this.socket.on('call-offer', callback);
    }
  }

  /**
   * Gửi call offer đến conversation
   * @param {Object} offer - WebRTC offer object
   * @param {string} conversationId - ID của conversation
   */
  async emitCallOffer(offer, conversationId, isVideo = false) {
    await this.ensureConnectionAndExecute(() => {
      this.socket.emit('call-offer', { offer, conversationId, isVideo });
    });
  }

  /**
   * Lắng nghe call answer từ người nhận
   * @param {Function} callback - Callback xử lý khi nhận answer
   */
  onCallAnswer(callback) {
    if (this.socket) {
      this.socket.on('call-answer', callback);
    }
  }

  /**
   * Gửi call answer phản hồi offer
   * @param {Object} answer - WebRTC answer object
   * @param {string} conversationId - ID của conversation
   */
  async emitCallAnswer(answer, conversationId) {
    await this.ensureConnectionAndExecute(() => {
      this.socket.emit('call-answer', { answer, conversationId });
    });
  }

  /**
   * Lắng nghe ICE candidates cho WebRTC connection
   * @param {Function} callback - Callback xử lý ICE candidate
   */
  onCallCandidate(callback) {
    if (this.socket) {
      this.socket.on('call-candidate', callback);
    }
  }

  /**
   * Gửi ICE candidate cho WebRTC connection
   * @param {Object} candidate - ICE candidate object
   * @param {string} conversationId - ID của conversation
   */
  async emitCallCandidate(candidate, conversationId) {
    await this.ensureConnectionAndExecute(() => {
      this.socket.emit('call-candidate', { candidate, conversationId });
    });
  }

  /**
   * Gửi signal kết thúc cuộc gọi
   * @param {string} conversationId - ID của conversation
   */
  async emitCallEnd(conversationId) {
    await this.ensureConnectionAndExecute(() => {
      this.socket.emit('call-end', { conversationId });
    });
  }

  /**
   * Lắng nghe signal kết thúc cuộc gọi
   * @param {Function} callback - Callback xử lý khi cuộc gọi kết thúc
   */
  onCallEnd(callback) {
    if (this.socket) {
      this.socket.on('call-end', callback);
    }
  }
  // ==================== CONSTRUCTOR & CONNECTION ====================
  
  /**
   * Khởi tạo SocketService
   */
  constructor() {
    this.socket = null; // Socket.IO client instance
    this.currentConversation = null; // ID của conversation hiện tại
    this.currentUser = null; // User context for reconnection
  }

  /**
   * Kết nối đến Socket.IO server với authentication
   * @param {Object} user - Thông tin user để authenticate
   * @returns {Object} Socket instance
   */
  connect(user) {
    if (user) {
      this.currentUser = user;
    }

    if (this.socket) {
      if (this.socket.connected || this.socket.connecting) {
        return this.socket;
      }
      this.disconnect();
    }

    const token = getAccessToken();
    if (!token) {
      return null;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      reconnectionAttempts: 10,
      maxReconnectionAttempts: 10,
      timeout: 5000,
      forceNew: false,
      multiplex: true
    });

    // Event handlers cho connection
    this.socket.on('connect', () => {
      // Connected to server
      // Join user room để nhận real-time updates
      const targetUser = this.currentUser || user;
      if (targetUser && targetUser._id) {
        this.socket.emit('join-user', targetUser._id);
      }
    });
    
    this.socket.on('connect_error', (error) => {
      // Kết nối socket bị lỗi
    });
    
    this.socket.on('connect_timeout', () => {
      // Kết nối socket timeout
    });
    
    this.socket.io.on('reconnect_attempt', (attempt) => {
      // Đang thử kết nối lại
    });
    
    this.socket.io.on('reconnect', (attempt) => {
      // Đã kết nối lại thành công
    });

    this.socket.on('disconnect', () => {
      // Disconnected from server
    });

    this.socket.on('connect_error', (error) => {
      // Nếu lỗi authentication, có thể token đã hết hạn
      if (error.message === 'Authentication error' || error.type === 'UnauthorizedError') {
        // Có thể trigger logout hoặc refresh token ở đây
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      // Reconnected after attempts
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      // Reconnection attempt
    });

    this.socket.on('reconnect_error', (error) => {
      // Reconnection error
    });

    this.socket.on('reconnect_failed', () => {
      // Failed to reconnect after maximum attempts
    });

    return this.socket;
  }

  /**
   * Ngắt kết nối socket và reset state
   */
  disconnect() {
    if (this.socket) {
      // Remove all listeners to prevent memory leaks
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.currentConversation = null;
    }
  }

  /**
   * Kiểm tra socket có kết nối không
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }

  /**
   * Kiểm tra và đảm bảo socket connection trước khi thực hiện operation
   * @param {Function} operation - Function cần thực hiện khi socket đã kết nối
   * @param {number} retryDelay - Delay trước khi retry (ms)
   */
  async ensureConnectionAndExecute(operation, retryDelay = 1000) {
    if (this.isConnected()) {
      operation();
      return;
    }

    await this.ensureConnection();

    // Retry sau khi reconnect
    setTimeout(() => {
      if (this.isConnected()) {
        operation();
      }
    }, retryDelay);
  }

  /**
   * Kiểm tra server có đang chạy không
   * @returns {Promise<boolean>} True nếu server đang chạy
   */
  async checkServerStatus() {
    try {
      const response = await fetch(`${SOCKET_URL}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Đảm bảo socket được kết nối trước khi thực hiện operation
   */
  async ensureConnection() {
    if (this.socket && this.socket.connected) {
      return true;
    }

    const serverRunning = await this.checkServerStatus();
    if (!serverRunning) {
      return false;
    }

    let token = getAccessToken();
    if (!token) {
      token = await getValidAccessToken();
    }

    if (!token) {
      return false;
    }

    this.connect(this.currentUser || {});
    return this.waitForConnection();
  }

  async waitForConnection(timeout = 5000) {
    if (this.socket && this.socket.connected) {
      return true;
    }

    if (!this.socket) {
      return false;
    }

    return new Promise((resolve) => {
      const handleConnect = () => {
        clearTimeout(timer);
        this.socket.off("connect", handleConnect);
        resolve(true);
      };

      const timer = setTimeout(() => {
        this.socket?.off("connect", handleConnect);
        resolve(false);
      }, timeout);

      this.socket.on("connect", handleConnect);
    });
  }

  // ==================== CONVERSATION MANAGEMENT ====================
  
  /**
   * Join vào conversation để nhận messages real-time
   * @param {string} conversationId - ID của conversation cần join
   */
  async joinConversation(conversationId) {
    if (!conversationId) {
      return;
    }

    const connected = await this.ensureConnection();
    if (!connected || !this.socket) {
      return;
    }

    // Không leave conversation cũ - cho phép join nhiều conversations
    this.socket.emit('join-conversation', conversationId);
  }

  /**
   * Rời khỏi conversation hiện tại
   */
  leaveConversation() {
    if (this.socket && this.currentConversation) {
      this.socket.emit('leave-conversation', this.currentConversation);
      this.currentConversation = null;
    }
  }

  // ==================== MESSAGE HANDLING ====================
  
  /**
   * Gửi message mới qua socket (real-time)
   * @param {Object} messageData - Dữ liệu message cần gửi
   */
  sendMessage(messageData) {
    if (this.socket) {
      this.socket.emit('new-message', messageData);
    }
  }

  /**
   * Lắng nghe messages mới từ socket
   * @param {Function} callback - Callback xử lý khi nhận message mới
   */
  onNewMessage(callback) {
    if (this.socket) {
      // Xóa listener cũ để tránh duplicate
      this.socket.off('new-message');
      
      this.socket.on('new-message', (message) => {
        callback(message);
      });
    }
  }

  /**
   * Cleanup all event listeners
   */
  cleanup() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  /**
   * Tắt listener cho new messages
   */
  offNewMessage() {
    if (this.socket) {
      this.socket.off('new-message');
    }
  }

  // ==================== USER STATUS & TYPING INDICATORS ====================
  
  /**
   * Lắng nghe thay đổi status của users (online/offline)
   * @param {Function} callback - Callback xử lý khi user status thay đổi
   */
  onUserStatusChange(callback) {
    if (this.socket) {
      this.socket.on('user-status-change', callback);
    }
  }

  /**
   * Tắt listener cho user status changes
   */
  offUserStatusChange() {
    if (this.socket) {
      this.socket.off('user-status-change');
    }
  }

  /**
   * Lắng nghe khi có user đang typing
   * @param {Function} callback - Callback xử lý khi có user typing
   */
  onTyping(callback) {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  /**
   * Lắng nghe khi user ngừng typing
   * @param {Function} callback - Callback xử lý khi user ngừng typing
   */
  onStopTyping(callback) {
    if (this.socket) {
      this.socket.on('user-stop-typing', callback);
    }
  }

  /**
   * Gửi signal user đang typing
   * @param {string} conversationId - ID của conversation
   */
  emitTyping(conversationId) {
    if (this.socket) {
      this.socket.emit('typing', { conversationId });
    }
  }

  /**
   * Gửi signal user ngừng typing
   * @param {string} conversationId - ID của conversation
   */
  emitStopTyping(conversationId) {
    if (this.socket) {
      this.socket.emit('stop-typing', { conversationId });
    }
  }
}

// Tạo singleton instance của SocketService
const socketService = new SocketService();
export default socketService;
