import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { chatAPI } from "../chatAPI";
import { useNavigate } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";

/**
 * MessageButton - Message button for a user
 * Creates a private conversation or navigates to an existing one
 * @param {Object} props - Component props
 * @param {Object} props.user - Target user information
 * @param {string} props.user._id - User ID
 * @param {string} props.user.conversationId - Existing conversation ID (if any)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Message button component
 */
export default function MessageButton({ user, className = "" }) {
  // ==================== STATE MANAGEMENT ====================
  
  const [isLoading, setIsLoading] = useState(false); // Loading state while creating a conversation
  const navigate = useNavigate();
  const { showError } = useToast();

  const handleMessage = async () => {
    if (!user || !user._id) {
      // Silent handling for invalid user data
      return;
    }

    try {
      setIsLoading(true);
      // If conversation already exists, navigate to it
      if (user.conversationId) {
        navigate('/chat', {
          state: {
            openConversation: user.conversationId
          }
        });
        return;
      }
      // Create a private conversation if none exists
      const conversation = await chatAPI.createPrivateConversation(user._id);
      navigate('/chat', {
        state: {
          openConversation: conversation._id || conversation.id,
          conversationData: conversation
        }
      });
    } catch (error) {
      // Silent handling for conversation creation error
      if (error.message && error.message.includes('already exists')) {
        navigate('/chat');
      } else {
        showError('Có lỗi xảy ra khi tạo cuộc trò chuyện');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleMessage}
      disabled={isLoading}
      className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Đang tạo...
        </>
      ) : (
        'Nhắn tin'
      )}
    </button>
  );
}
