import { useState, useRef } from "react";
import { 
  Bold, Italic, Underline, Code, List, ListOrdered, 
  CheckSquare, Link, Image as ImageIcon, Eye, Edit3,
  Heading1, Heading2, Heading3, Quote, Minus
} from "lucide-react";
import { uploadImage } from "../api";

/**
 * MarkdownEditor - Trình soạn thảo Markdown mạnh mẽ
 * Hỗ trợ định dạng văn bản, chèn code, tạo checklist, preview
 * @param {string} value - Nội dung Markdown hiện tại
 * @param {Function} onChange - Callback khi nội dung thay đổi
 * @param {string} placeholder - Placeholder text
 * @param {number} rows - Số dòng mặc định của textarea
 */
export default function MarkdownEditor({ value = "", onChange, placeholder = "Viết nội dung của bạn...", rows = 12 }) {
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const textareaRef = useRef(null);

  /**
   * Chèn text vào vị trí cursor trong textarea
   */
  const insertText = (before, after = "", placeholder = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = placeholder || selectedText;

    const newValue = 
      value.substring(0, start) + 
      before + textToInsert + after + 
      value.substring(end);

    onChange(newValue);

    // Đặt cursor sau text đã chèn
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length + after.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  /**
   * Chèn text ở đầu dòng hiện tại
   */
  const insertAtLineStart = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lines = value.substring(0, start).split('\n');
    const currentLine = lines.length - 1;
    const lineStart = value.substring(0, start).lastIndexOf('\n') + 1;
    
    const newValue = 
      value.substring(0, lineStart) + 
      prefix + 
      value.substring(lineStart);

    onChange(newValue);

    setTimeout(() => {
      const newCursorPos = start + prefix.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  /**
   * Upload ảnh và chèn vào nội dung
   */
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      insertText("![", `](${url})`, "Mô tả ảnh");
    } catch (error) {
      alert("Upload thất bại: " + error.message);
    } finally {
      setUploading(false);
      // Reset input
      if (e.target) e.target.value = "";
    }
  };

  /**
   * Render Markdown preview (đơn giản)
   */
  const renderPreview = () => {
    if (!showPreview) return null;

    // Simple Markdown rendering (có thể nâng cấp với thư viện markdown parser)
    let html = value
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-5 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg overflow-x-auto my-2"><code>$1</code></pre>')
      // Inline code
      .replace(/`(.*?)`/gim, '<code class="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-2" />')
      // Blockquote
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-neutral-300 dark:border-neutral-700 pl-4 my-2 italic text-neutral-600 dark:text-neutral-400">$1</blockquote>')
      // Unordered list
      .replace(/^[\*\-] (.*$)/gim, '<li class="ml-4">$1</li>')
      // Ordered list
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
      // Checklist
      .replace(/^- \[ \] (.*$)/gim, '<li class="ml-4"><input type="checkbox" disabled class="mr-2" />$1</li>')
      .replace(/^- \[x\] (.*$)/gim, '<li class="ml-4"><input type="checkbox" checked disabled class="mr-2" />$1</li>')
      // Horizontal rule
      .replace(/^---$/gim, '<hr class="my-4 border-neutral-200 dark:border-neutral-800" />')
      // Line breaks
      .replace(/\n/gim, '<br />');

    return (
      <div 
        className="prose prose-neutral dark:prose-invert max-w-none p-4 min-h-[200px] text-neutral-900 dark:text-neutral-100"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  // Nhóm toolbar buttons theo chức năng
  const textFormatButtons = [
    { icon: Bold, label: "Bold", action: () => insertText("**", "**", "văn bản đậm") },
    { icon: Italic, label: "Italic", action: () => insertText("*", "*", "văn bản nghiêng") },
    { icon: Underline, label: "Underline", action: () => insertText("<u>", "</u>", "văn bản gạch chân") },
  ];

  const headingButtons = [
    { icon: Heading1, label: "H1", action: () => insertAtLineStart("# ") },
    { icon: Heading2, label: "H2", action: () => insertAtLineStart("## ") },
    { icon: Heading3, label: "H3", action: () => insertAtLineStart("### ") },
  ];

  const listButtons = [
    { icon: List, label: "List", action: () => insertAtLineStart("- ") },
    { icon: ListOrdered, label: "Ordered", action: () => insertAtLineStart("1. ") },
    { icon: CheckSquare, label: "Checklist", action: () => insertAtLineStart("- [ ] ") },
  ];

  const otherButtons = [
    { icon: Code, label: "Code", action: () => insertText("`", "`", "code") },
    { icon: Quote, label: "Quote", action: () => insertAtLineStart("> ") },
    { icon: Link, label: "Link", action: () => insertText("[", "](url)", "link text") },
  ];

  return (
    <div className="space-y-1.5">
      {/* Toolbar - Compact */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
        {/* Text Format */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-neutral-200 dark:border-neutral-800">
          {textFormatButtons.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onClick={btn.action}
              className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title={btn.label}
            >
              <btn.icon size={14} />
            </button>
          ))}
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-neutral-200 dark:border-neutral-800">
          {headingButtons.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onClick={btn.action}
              className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title={btn.label}
            >
              <btn.icon size={14} />
            </button>
          ))}
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-neutral-200 dark:border-neutral-800">
          {listButtons.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onClick={btn.action}
              className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title={btn.label}
            >
              <btn.icon size={14} />
            </button>
          ))}
        </div>

        {/* Other */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-neutral-200 dark:border-neutral-800">
          {otherButtons.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onClick={btn.action}
              className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title={btn.label}
            >
              <btn.icon size={14} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => insertText("```\n", "\n```", "code here")}
            className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            title="Code Block"
          >
            <Code size={14} />
          </button>
          <button
            type="button"
            onClick={() => insertText("\n---\n", "")}
            className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            title="Horizontal Rule"
          >
            <Minus size={14} />
          </button>
        </div>
        
        <div className="flex-1" />
        
        {/* Image Upload */}
        <label className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer" title="Chèn ảnh">
          <ImageIcon size={14} />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        
        {/* Toggle Preview */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          title={showPreview ? "Chế độ chỉnh sửa" : "Xem trước"}
        >
          {showPreview ? <Edit3 size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {/* Editor/Preview */}
      <div className="relative border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-black">
        {showPreview ? (
          <div className="min-h-[150px] max-h-[500px] overflow-y-auto p-3 bg-neutral-50 dark:bg-neutral-900/50">
            {renderPreview()}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full p-3 bg-transparent border-none text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-0 resize-none"
            style={{ minHeight: `${rows * 1.5}rem` }}
          />
        )}
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
          <div className="animate-spin rounded-full h-2.5 w-2.5 border-t-2 border-neutral-400"></div>
          Đang tải ảnh...
        </div>
      )}

      {/* Markdown Tips - Collapsible */}
      <div className="text-xs">
        <button
          type="button"
          onClick={() => setShowTips(!showTips)}
          className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors flex items-center gap-1"
        >
          <span>{showTips ? "Ẩn" : "Hiện"} mẹo Markdown</span>
        </button>
        {showTips && (
          <div className="mt-1.5 text-neutral-500 dark:text-neutral-400 space-y-0.5">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <span><code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px]">**text**</code> đậm</span>
              <span><code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px]">*text*</code> nghiêng</span>
              <span><code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px]">`code`</code> code</span>
              <span><code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px]">- [ ]</code> checklist</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

