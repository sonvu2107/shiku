import { useState, useRef } from "react";
import { Send, Image, Smile, X } from "lucide-react";

const EMOTES = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
  '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
  '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
  '⚛️', '🆔', '⚕️', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸'
];

export default function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('');
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() && !selectedImage) return;

    if (selectedImage) {
      // Send image message
      await onSendMessage(message.trim(), 'image', null, selectedImage);
      setSelectedImage(null);
      setImagePreview(null);
    } else {
      // Send text message
      await onSendMessage(message.trim(), 'text');
    }
    
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Chỉ chấp nhận file hình ảnh');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target.result);
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEmoteSelect = (emote) => {
    // Send emote as a separate message
    onSendMessage(message.trim() || 'đã gửi một emote', 'emote', emote);
    setMessage('');
    setShowEmotePicker(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white relative">
      {/* Image preview */}
      {imagePreview && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-32 max-h-32 rounded-lg object-cover"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Emote picker */}
      {showEmotePicker && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-h-48 overflow-y-auto z-10">
          <div className="grid grid-cols-8 gap-2">
            {EMOTES.map((emote, index) => (
              <button
                key={index}
                onClick={() => handleEmoteSelect(emote)}
                className="p-2 text-2xl hover:bg-gray-100 rounded-lg transition-colors"
              >
                {emote}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex items-end space-x-3">
          {/* Action buttons */}
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
              title="Gửi hình ảnh"
            >
              <Image size={20} />
            </button>
            
            <button
              type="button"
              onClick={() => setShowEmotePicker(!showEmotePicker)}
              className={`p-2 rounded-full transition-colors ${
                showEmotePicker 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-blue-500 hover:bg-blue-50'
              }`}
              title="Chọn emote"
            >
              <Smile size={20} />
            </button>
          </div>

          {/* Text input container */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder="Aa"
              className="w-full max-h-32 px-4 py-3 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 border-0 placeholder-gray-500"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* Send button */}
          {(message.trim() || selectedImage) && (
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white hover:bg-blue-600 rounded-full transition-all duration-200 transform hover:scale-105"
              title="Gửi tin nhắn"
            >
              <Send size={20} />
            </button>
          )}
        </div>
      </form>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
    </div>
  );
}
