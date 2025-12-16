import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image, Smile, X } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";

/**
 * List of emojis to choose from in chat message input
 */
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

/**
 * MessageInput - Component input to send chat messages
 * Supports sending text, emoji, and images with preview
 * @param {Function} onSendMessage - Callback when sending a message
 */
export default function MessageInput({ onSendMessage }) {
  const { showError } = useToast();
  // ==================== STATE MANAGEMENT ====================

  // Message states
  const [message, setMessage] = useState(''); // Text message content
  const [showEmotePicker, setShowEmotePicker] = useState(false); // Show emoji picker
  const [selectedImage, setSelectedImage] = useState(null); // Selected image file
  const [imagePreview, setImagePreview] = useState(null); // Image preview

  // Refs
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
      showError('Kích thước file không được vượt quá 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showError('Chỉ chấp nhận file hình ảnh');
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
    onSendMessage(message.trim() || '~', 'emote', emote);
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
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 border-b border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="relative inline-block">
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                src={imagePreview}
                alt="Preview"
                className="max-w-32 max-h-32 rounded-lg object-cover"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 dark:bg-red-600 text-white rounded-full p-1 hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
              >
                <X size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emote picker */}
      <AnimatePresence>
        {showEmotePicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-4 max-h-48 overflow-y-auto z-10 emote-picker-mobile"
          >
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {EMOTES.map((emote, index) => (
                <button
                  key={index}
                  onClick={() => handleEmoteSelect(emote)}
                  className="p-2 text-xl sm:text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-lg transition-colors touch-target"
                >
                  {emote}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4">
        <div className="flex items-center gap-2">
          {/* Action buttons */}
          <div className="flex space-x-1">
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 rounded-full transition-colors touch-target"
              title="Gửi hình ảnh"
            >
              <Image size={20} />
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowEmotePicker(!showEmotePicker)}
              className={`p-2 rounded-full transition-colors touch-target ${showEmotePicker
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30'
                }`}
              title="Chọn emote"
            >
              <Smile size={20} />
            </motion.button>
          </div>

          {/* Text input container */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder="Aa"
              className="w-full max-h-32 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl resize-none focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500 border-0 placeholder-gray-500 dark:placeholder-gray-400 text-base"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* Send button */}
          <AnimatePresence>
            {(message.trim() || selectedImage) && (
              <motion.button
                type="submit"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="p-2 bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 dark:active:bg-blue-800 rounded-full transition-colors touch-target"
                title="Gửi tin nhắn"
              >
                <Send size={20} />
              </motion.button>
            )}
          </AnimatePresence>
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
