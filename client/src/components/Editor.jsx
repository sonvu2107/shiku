import { useState } from "react";
import { uploadImage } from "../api";

/**
 * Editor - Component editor đơn giản cho Markdown content
 * Hỗ trợ upload ảnh và chèn vào nội dung
 * @param {string} value - Nội dung hiện tại của editor
 * @param {Function} onChange - Callback khi nội dung thay đổi
 */
export default function Editor({ value, onChange }) {
  // ==================== STATE MANAGEMENT ====================
  
  const [uploading, setUploading] = useState(false); // Loading state khi upload ảnh

  // ==================== EVENT HANDLERS ====================
  
  /**
   * Xử lý upload ảnh và chèn vào nội dung
   * @param {Event} e - File input change event
   */
  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      // Upload ảnh qua API
      const { url } = await uploadImage(file);
      
      // Chèn ảnh vào nội dung dưới dạng Markdown
      onChange((value || "") + `\n\n![](${url})\n`);
    } catch (e) {
      alert("Upload thất bại: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  // ==================== RENDER ====================
  
  return (
    <div className="space-y-2">
      {/* Textarea editor cho Markdown content */}
      <textarea 
        rows="12" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder="Nội dung (Markdown)..." 
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
      />
      
      {/* File input cho upload ảnh (ẩn) */}
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
        id="image-upload"
      />
    </div>
  );
}
