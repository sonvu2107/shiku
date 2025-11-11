import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Minimize2, Maximize2, RotateCcw } from 'lucide-react';
import { chatbotAPI } from '../services/chatbotAPI';
import './Chatbot.css';

export default function Chatbot({ variant = 'floating', onClose, allowMinimize, showHeader = true }) {
  const isEmbedded = variant === 'embedded';
  const isPopup = variant === 'popup';
  const [isOpen, setIsOpen] = useState(variant === 'floating' ? false : true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // Focus input when chatbot opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isEmbedded) {
      setIsOpen(true);
    }
  }, [isEmbedded]);

  // Load chat history khi component mount hoặc khi mở chatbot
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    
    const loadChatHistory = async () => {
      // Với variant popup hoặc embedded, luôn load history khi component mount
      // Với variant floating, chỉ load khi mở và không minimized
      const shouldLoad = (variant === 'popup' || variant === 'embedded') 
        ? true 
        : (variant === 'floating' && isOpen && !isMinimized);
      
      if (!shouldLoad) {
        setIsLoadingHistory(false);
        return;
      }
      
      try {
        setIsLoadingHistory(true);
        const response = await chatbotAPI.getHistory();
        
        if (!isMounted) return; // Component đã unmount, không cập nhật state
        
        if (response.success && response.data.messages && response.data.messages.length > 0) {
          // Chuyển đổi messages từ database sang format của component
          // Sử dụng timestamp để tạo unique ID, đảm bảo ID ổn định khi reload
          const loadedMessages = response.data.messages.map((msg, index) => ({
            id: msg.timestamp ? new Date(msg.timestamp).getTime() + index : Date.now() + index,
            text: msg.content,
            sender: msg.role === 'user' ? 'user' : 'bot',
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(loadedMessages);
        } else {
          // Nếu không có lịch sử, hiển thị message chào mừng
          setMessages([
            {
              id: Date.now(),
              text: 'Xin chào! Tôi là trợ lý AI của Shiku - mạng xã hội kết nối bạn bè.\n\nTôi có thể giúp bạn:\n• Trả lời các câu hỏi về Shiku và các tính năng\n• Hướng dẫn sử dụng các tính năng như đăng bài, nhắn tin, tạo nhóm, sự kiện\n• Tư vấn về cách sử dụng mạng xã hội hiệu quả\n• Gợi ý nội dung bài viết\n• Giải đáp thắc mắc về Shiku\n\nBạn muốn tôi giúp gì hôm nay? 😊',
              sender: 'bot',
              timestamp: new Date(),
            }
          ]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        if (!isMounted) return;
        
        // Nếu có lỗi, hiển thị message chào mừng mặc định
        setMessages([
          {
            id: Date.now(),
            text: 'Xin chào! Tôi là trợ lý AI của Shiku - mạng xã hội kết nối bạn bè.\n\nTôi có thể giúp bạn:\n• Trả lời các câu hỏi về Shiku và các tính năng\n• Hướng dẫn sử dụng các tính năng như đăng bài, nhắn tin, tạo nhóm, sự kiện\n• Tư vấn về cách sử dụng mạng xã hội hiệu quả\n• Gợi ý nội dung bài viết\n• Giải đáp thắc mắc về Shiku\n\nBạn muốn tôi giúp gì hôm nay? 😊',
            sender: 'bot',
            timestamp: new Date(),
          }
        ]);
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    // Load history ngay khi điều kiện thỏa mãn
    // Với popup/embedded, load ngay khi mount
    // Với floating, load khi mở
    if (variant === 'popup' || variant === 'embedded') {
      // Load ngay khi component mount
      timeoutId = setTimeout(() => {
        loadChatHistory();
      }, 50);
    } else if (variant === 'floating' && isOpen && !isMinimized) {
      // Load khi mở floating chatbot
      timeoutId = setTimeout(() => {
        loadChatHistory();
      }, 50);
    } else {
      setIsLoadingHistory(false);
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [variant, isOpen, isMinimized]); // Reload khi variant, isOpen, hoặc isMinimized thay đổi

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading || isLoadingHistory) return;

    const userMessageText = inputMessage.trim();
    const userMessage = {
      id: Date.now(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatbotAPI.sendMessage(userMessageText);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.message,
        sender: 'bot',
        timestamp: new Date(response.timestamp),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
        sender: 'bot',
        timestamp: new Date(),
        isError: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await chatbotAPI.resetChat();
      setMessages([
        {
          id: Date.now(),
          text: 'Cuộc trò chuyện đã được đặt lại. Chúng ta có thể bắt đầu lại từ đầu!\n\nTôi có thể giúp bạn:\n• Trả lời các câu hỏi về Shiku và các tính năng\n• Hướng dẫn sử dụng các tính năng như đăng bài, nhắn tin, tạo nhóm, sự kiện\n• Tư vấn về cách sử dụng mạng xã hội hiệu quả\n• Gợi ý nội dung bài viết\n• Giải đáp thắc mắc về Shiku\n\nBạn muốn tôi giúp gì hôm nay? 😊',
          sender: 'bot',
          timestamp: new Date(),
        }
      ]);
    } catch (error) {
      console.error('Error resetting chat:', error);
    }
  };

  const canMinimize = (allowMinimize ?? !isEmbedded) && showHeader;

  const toggleMinimize = () => {
    if (!canMinimize) return;
    setIsMinimized(!isMinimized);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) {
    if (variant !== 'floating') {
      return null;
    }
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="chatbot-trigger"
        aria-label="Mở chatbot"
        aria-expanded="false"
        aria-controls="chatbot-panel"
      >
        <Bot size={22} strokeWidth={2} />
        <span className="chatbot-pulse"></span>
      </button>
    );
  }

  return (
    <div
      id="chatbot-panel"
      role="dialog"
      aria-label="Trợ lý AI"
      aria-modal="false"
      className={`chatbot-container ${isEmbedded ? 'embedded' : ''} ${isPopup ? 'popup' : ''} ${isMinimized ? 'minimized' : ''}`}
    >
      {showHeader && (
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">
              <Bot size={20} />
            </div>
            <div className="chatbot-title">
              <h3>Trợ lý AI</h3>
              <span className="chatbot-status">
                <span className="status-dot"></span>
                Đang hoạt động
              </span>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <button
              onClick={handleReset}
              className="chatbot-icon-btn"
              title="Đặt lại cuộc trò chuyện"
            >
              <RotateCcw size={18} />
            </button>
            {canMinimize && (
              <button
                onClick={toggleMinimize}
                className="chatbot-icon-btn"
                title={isMinimized ? 'Phóng to' : 'Thu nhỏ'}
              >
                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
            )}
            <button
              onClick={handleClose}
              className="chatbot-icon-btn"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

          {/* Messages */}
          {(!isEmbedded && !isMinimized) || isEmbedded ? (
            <>
              <div className="chatbot-messages custom-scrollbar" role="log" aria-live="polite">
                {isLoadingHistory ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                    Đang tải lịch sử chat...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                    Bắt đầu cuộc trò chuyện với trợ lý AI
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`chatbot-message ${message.sender} ${message.isError ? 'error' : ''}`}
                      >
                        {message.sender === 'bot' && (
                          <div className="message-avatar">
                            <Bot size={16} />
                          </div>
                        )}
                        <div className="message-content">
                          <div className="message-text">{message.text}</div>
                          <div className="message-time">{formatTime(message.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="chatbot-message bot">
                        <div className="message-avatar">
                          <Bot size={16} />
                        </div>
                        <div className="message-content">
                          <div className="message-text">
                            <div className="typing-indicator">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="chatbot-input-form" aria-label="Gửi tin nhắn đến trợ lý AI">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="chatbot-input"
              disabled={isLoading || isLoadingHistory}
              maxLength={2000}
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={!inputMessage.trim() || isLoading || isLoadingHistory}
            >
              <Send size={20} />
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
