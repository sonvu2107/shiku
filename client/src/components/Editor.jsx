import { useState } from "react";
import { uploadImage } from "../api";

export default function Editor({ value, onChange }) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange((value || "") + `\n\n![](${url})\n`);
    } catch (e) {
      alert("Upload thất bại: " + e.message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="space-y-2">
      <textarea rows="12" value={value} onChange={e => onChange(e.target.value)} placeholder="Nội dung (Markdown)..." />
    </div>
  );
}
