import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

class SocketService {
  constructor() {
    this.socket = null;
    this.currentConversation = null;
  }

  connect(user) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling']
    });

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

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentConversation = null;
    }
  }

  joinConversation(conversationId) {
    if (this.socket && conversationId) {
      console.log('🔥 Socket connected status:', this.socket.connected);
      console.log('🔥 Socket ID:', this.socket.id);
      
      // Leave previous conversation if any
      if (this.currentConversation) {
        this.socket.emit('leave-conversation', this.currentConversation);
      }
      
      console.log('🔥 Joining conversation:', conversationId);
      this.socket.emit('join-conversation', conversationId);
      this.currentConversation = conversationId;
      
      // Log when join is successful
      this.socket.on('conversation-joined', (data) => {
        console.log('🔥 Joined conversation successfully, currentConversation set to:', this.currentConversation);
      });
    }
  }

  leaveConversation() {
    if (this.socket && this.currentConversation) {
      this.socket.emit('leave-conversation', this.currentConversation);
      this.currentConversation = null;
    }
  }

  sendMessage(messageData) {
    if (this.socket) {
      this.socket.emit('new-message', messageData);
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      console.log('🔥 Setting up new-message listener on socket:', this.socket.id);
      console.log('🔥 Socket connected:', this.socket.connected);
      console.log('🔥 Current conversation:', this.currentConversation);
      
      // Remove previous listeners to avoid duplicates
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

  offNewMessage() {
    if (this.socket) {
      this.socket.off('new-message');
    }
  }

  onUserStatusChange(callback) {
    if (this.socket) {
      this.socket.on('user-status-change', callback);
    }
  }

  offUserStatusChange() {
    if (this.socket) {
      this.socket.off('user-status-change');
    }
  }

  onTyping(callback) {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  onStopTyping(callback) {
    if (this.socket) {
      this.socket.on('user-stop-typing', callback);
    }
  }

  emitTyping(conversationId) {
    if (this.socket) {
      this.socket.emit('typing', { conversationId });
    }
  }

  emitStopTyping(conversationId) {
    if (this.socket) {
      this.socket.emit('stop-typing', { conversationId });
    }
  }
}

const socketService = new SocketService();
export default socketService;
