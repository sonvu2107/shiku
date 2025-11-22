import MarkdownEditor from "./MarkdownEditor";

/**
 * Editor - Component editor Markdown mạnh mẽ
 * Wrapper cho MarkdownEditor với các tính năng đầy đủ
 * @param {string} value - Nội dung hiện tại của editor
 * @param {Function} onChange - Callback khi nội dung thay đổi
 * @param {string} placeholder - Placeholder text
 * @param {number} rows - Số dòng mặc định
 */
export default function Editor({ value, onChange, placeholder, rows }) {
  return (
    <MarkdownEditor 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder || "Nội dung (Markdown)..."}
      rows={rows || 12}
    />
  );
}
