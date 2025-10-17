import { useState } from "react";
import ChatPopupManager from "./ChatPopupManager";
import ChatDropdown from "./ChatDropdown";

/**
 * Ví dụ sử dụng ChatPopupManager
 * Component này minh họa cách sử dụng ChatPopupManager để quản lý nhiều chat popup
 */
export default function ChatExample() {
  const [openConversations, setOpenConversations] = useState([]);

  const handleOpenChat = (conversation) => {
    // Kiểm tra xem conversation đã mở chưa
    const isAlreadyOpen = openConversations.some(conv => conv._id === conversation._id);
    
    if (!isAlreadyOpen) {
      setOpenConversations(prev => [...prev, conversation]);
    }
  };

  const handleCloseConversation = (conversationId) => {
    setOpenConversations(prev => prev.filter(conv => conv._id !== conversationId));
  };

  return (
    <div className="relative">
      {/* Chat Dropdown để mở conversations */}
      <ChatDropdown onOpenChat={handleOpenChat} />
      
      {/* Chat Popup Manager để quản lý các popup đã mở */}
      <ChatPopupManager 
        conversations={openConversations}
        onCloseConversation={handleCloseConversation}
      />
    </div>
  );
}
