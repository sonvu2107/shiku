import { useState } from "react";
import ChatPopupManager from "./ChatPopupManager";
import ChatDropdown from "./ChatDropdown";

/**
 * Usage examples ChatPopupManager
 * This component demonstrates how to use ChatPopupManager to manage multiple chat popups
 */
export default function ChatExample() {
  const [openConversations, setOpenConversations] = useState([]);

  const handleOpenChat = (conversation) => {
    // Check if the conversation is already open
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
      {/* Chat Dropdown to open conversations */}
      <ChatDropdown onOpenChat={handleOpenChat} />
      
      {/* Chat Popup Manager to manage opened popups */}
      <ChatPopupManager 
        conversations={openConversations}
        onCloseConversation={handleCloseConversation}
      />
    </div>
  );
}
