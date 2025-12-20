import { useState, useRef, useEffect } from "react";
import {
  Bold, Italic, Underline, Code, List, ListOrdered,
  CheckSquare, Link, Image as ImageIcon, Eye, Edit3,
  Heading1, Heading2, Heading3, Quote, Minus
} from "lucide-react";
import { uploadImage } from "../api";
import MentionAutocomplete from "./MentionAutocomplete";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

/**
 * MarkdownEditor
 * Support text formatting, code insertion, checklist creation, preview
 * @param {string} value - Current Markdown content
 * @param {Function} onChange - Callback when content changes
 * @param {string} placeholder - Placeholder text
 * @param {number} rows - Default number of textarea rows
 * @param {boolean} compactMode - When true, hides toolbar and tips (simple textarea only)
 */
export default function MarkdownEditor({ value = "", onChange, placeholder = "Viết nội dung của bạn...", rows = 12, compactMode = false }) {
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  /**
   * Insert text at the cursor position in the textarea
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

    // Set cursor after inserted text
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length + after.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  /**
   * Insert text at the start of the current line
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
   * Upload image and insert into content
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
   * Handle mention autocomplete selection
   */
  const handleMentionSelect = (user, startPosition, endPosition) => {
    if (!textareaRef.current) return;

    const before = value.substring(0, startPosition);
    const after = value.substring(endPosition);
    const mention = `@${user.name} `;

    const newContent = before + mention + after;
    onChange(newContent);

    // Set cursor position after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = startPosition + mention.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
        setCursorPosition(newCursorPos);
      }
    }, 0);

    setShowMentionAutocomplete(false);
  };

  /**
   * Handle textarea change and cursor position
   */
  const handleTextareaChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check if we should show autocomplete (user typed @)
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Show autocomplete if @ is followed by valid characters or empty
      if (textAfterAt.length === 0 || /^[\p{L}\p{N}_\s]*$/u.test(textAfterAt)) {
        const spaceAfter = textAfterAt.includes(' ');
        if (!spaceAfter || textAfterAt.match(/^[\p{L}\p{N}_]+\s+[\p{L}\p{N}_]*$/u)) {
          setShowMentionAutocomplete(true);
          return;
        }
      }
    }

    setShowMentionAutocomplete(false);
  };

  /**
   * Handle textarea key events
   */
  const handleTextareaKeyDown = (e) => {
    if (showMentionAutocomplete && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Tab" || e.key === "Escape")) {
      // Let MentionAutocomplete handle these keys
      return;
    }

    // Close autocomplete on Escape
    if (e.key === "Escape") {
      setShowMentionAutocomplete(false);
    }
  };

  /**
   * Close autocomplete when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMentionAutocomplete && textareaRef.current && !textareaRef.current.contains(e.target)) {
        // Check if click is on autocomplete dropdown
        const autocompleteElement = e.target.closest('[class*="absolute"]');
        if (!autocompleteElement || !autocompleteElement.querySelector('[class*="MentionAutocomplete"]')) {
          setShowMentionAutocomplete(false);
        }
      }
    };

    if (showMentionAutocomplete) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMentionAutocomplete]);

  /**
   * Render Markdown preview using ReactMarkdown (safe, no XSS)
   */
  const renderPreview = () => {
    if (!showPreview) return null;

    return (
      <div className="prose prose-neutral dark:prose-invert max-w-none p-4 min-h-[200px] text-neutral-900 dark:text-neutral-100">
        <ReactMarkdown
          remarkPlugins={[remarkBreaks]}
          components={{
            h1: ({ children }) => <h1 className="text-3xl font-bold mt-6 mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-2xl font-bold mt-5 mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xl font-bold mt-4 mb-2">{children}</h3>,
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ node, inline, children, ...props }) => {
              if (inline) {
                return <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>;
              }
              return <pre className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg overflow-x-auto my-2"><code {...props}>{children}</code></pre>;
            },
            a: ({ href, children }) => (
              <a href={href} className="text-black dark:text-white hover:underline" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            img: ({ src, alt }) => (
              <img src={src} alt={alt} className="max-w-full rounded-lg my-2" />
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-neutral-300 dark:border-neutral-700 pl-4 my-2 italic text-neutral-600 dark:text-neutral-400">
                {children}
              </blockquote>
            ),
            li: ({ children }) => <li className="ml-4">{children}</li>,
            hr: () => <hr className="my-4 border-neutral-200 dark:border-neutral-800" />,
            input: ({ type, checked, disabled }) => (
              type === 'checkbox' ? <input type="checkbox" checked={checked} disabled={disabled} className="mr-2" /> : null
            ),
          }}
        >
          {value}
        </ReactMarkdown>
      </div>
    );
  };

  // Group toolbar buttons by function
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
      {/* Toolbar - Hidden in compact mode */}
      {!compactMode && (
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
      )}

      {/* Editor/Preview */}
      <div className="relative border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-black">
        {showPreview ? (
          <div className="min-h-[150px] max-h-[500px] overflow-y-auto p-3 bg-neutral-50 dark:bg-neutral-900/50">
            {renderPreview()}
          </div>
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              onSelect={(e) => setCursorPosition(e.target.selectionStart)}
              placeholder={placeholder}
              rows={rows}
              className="w-full p-3 bg-transparent border-none text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-0 resize-none"
              style={{ minHeight: `${rows * 1.5}rem` }}
            />
            {/* Mention Autocomplete */}
            {showMentionAutocomplete && !showPreview && (
              <div className="absolute bottom-full left-0 mb-2">
                <MentionAutocomplete
                  value={value}
                  cursorPosition={cursorPosition}
                  onSelect={handleMentionSelect}
                  onClose={() => setShowMentionAutocomplete(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
          <div className="animate-spin rounded-full h-2.5 w-2.5 border-t-2 border-neutral-400"></div>
          Đang tải ảnh...
        </div>
      )}

      {/* Markdown Tips - Collapsible - Hidden in compact mode */}
      {!compactMode && (
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
      )}
    </div>
  );
}

