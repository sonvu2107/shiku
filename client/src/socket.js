import { io } from "socket.io-client";

// URL của Socket.IO server
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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
  emitCallOffer(offer, conversationId) {
    if (this.socket) {
      this.socket.emit('call-offer', { offer, conversationId });
    }
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
  emitCallAnswer(answer, conversationId) {
    if (this.socket) {
      this.socket.emit('call-answer', { answer, conversationId });
    }
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
  emitCallCandidate(candidate, conversationId) {
    if (this.socket) {
      this.socket.emit('call-candidate', { candidate, conversationId });
    }
  }

  /**
   * Gửi signal kết thúc cuộc gọi
   * @param {string} conversationId - ID của conversation
   */
  emitCallEnd(conversationId) {
    if (this.socket) {
      this.socket.emit('call-end', { conversationId });
    }
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
  }

  /**
   * Kết nối đến Socket.IO server với authentication
   * @param {Object} user - Thông tin user để authenticate
   * @returns {Object} Socket instance
   */
  connect(user) {
    // Disconnect socket cũ nếu có
    if (this.socket) {
      this.disconnect();
    }

    // Tạo kết nối mới với authentication token
    this.socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling'] // Fallback từ websocket sang polling
    });

    // Event handlers cho connection
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
    });

    return this.socket;
  }

  /**
   * Ngắt kết nối socket và reset state
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentConversation = null;
    }
  }

  // ==================== CONVERSATION MANAGEMENT ====================
  
  /**
   * Join vào conversation để nhận messages real-time
   * @param {string} conversationId - ID của conversation cần join
   */
  joinConversation(conversationId) {
    if (this.socket && conversationId) {
      console.log('🔥 Socket connected status:', this.socket.connected);
      console.log('🔥 Socket ID:', this.socket.id);
      
      // Rời conversation cũ nếu có
      if (this.currentConversation) {
        this.socket.emit('leave-conversation', this.currentConversation);
      }
      
      console.log('🔥 Joining conversation:', conversationId);
      this.socket.emit('join-conversation', conversationId);
      this.currentConversation = conversationId;
      
      // Log khi join thành công
      this.socket.on('conversation-joined', (data) => {
        console.log('🔥 Joined conversation successfully, currentConversation set to:', this.currentConversation);
      });
    }
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
      console.log('🔥 Setting up new-message listener on socket:', this.socket.id);
      console.log('🔥 Socket connected:', this.socket.connected);
      console.log('🔥 Current conversation:', this.currentConversation);
      
      // Xóa listener cũ để tránh duplicate
      this.socket.off('new-message');
      
      this.socket.on('new-message', (message) => {
        console.log('🔥 Received new-message event:', message);
        console.log('📨 Message conversation ID:', message.conversationId || message.conversation);
        console.log('📨 Message object keys:', Object.keys(message));
        console.log('📨 Current conversation ID:', this.currentConversation);
        callback(message);
      });
    } else {
      console.warn('⚠️ No socket available for new-message listener');
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
