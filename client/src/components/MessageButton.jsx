import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { chatAPI } from "../chatAPI";
import { useNavigate } from "react-router-dom";

export default function MessageButton({ user, className = "" }) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleMessage = async () => {
    if (!user || !user._id) {
      console.error('Invalid user data');
      return;
    }

    try {
      setIsLoading(true);
      // Nếu user đã có conversationId, chuyển thẳng đến cuộc trò chuyện
      if (user.conversationId) {
        navigate('/chat', {
          state: {
            openConversation: user.conversationId
          }
        });
        return;
      }
      // Tạo cuộc trò chuyện riêng tư nếu chưa có
      const conversation = await chatAPI.createPrivateConversation(user._id);
      navigate('/chat', {
        state: {
          openConversation: conversation._id || conversation.id,
          conversationData: conversation
        }
      });
    } catch (error) {
      console.error('Lỗi tạo cuộc trò chuyện:', error);
      if (error.message && error.message.includes('already exists')) {
        navigate('/chat');
      } else {
        alert('Có lỗi xảy ra khi tạo cuộc trò chuyện');
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
