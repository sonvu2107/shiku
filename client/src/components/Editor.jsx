import MarkdownEditor from "./MarkdownEditor";

/**
 * Editor - Markdown editor component
 * Wrapper for MarkdownEditor with full features
 * @param {string} value - Current content of the editor
 * @param {Function} onChange - Callback when content changes
 * @param {string} placeholder - Placeholder text
 * @param {number} rows - Default number of rows
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
