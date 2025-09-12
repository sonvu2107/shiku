import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Globe, Lock, Image } from "lucide-react";
import BanNotification from "./BanNotification";

export default function PostCreator({ user }) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("published");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [showBanNotification, setShowBanNotification] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const navigate = useNavigate();

  const userDisplayName = user?.name || "Bạn";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErr("Vui lòng nhập tiêu đề và nội dung");
      return;
    }

    setLoading(true);
    try {
      const tagsArray = tags.split(",").map(tag => tag.trim()).filter(tag => tag);
      const post = await api("/api/posts", {
        method: "POST",
        body: { title, content, tags: tagsArray, files, status, coverUrl }
      });
      setShowModal(false);
      resetForm();

      if (status === "private") {
        navigate("/");
        alert("Bài viết riêng tư đã được lưu");
      } else {
        navigate(`/post/${post.post.slug}`);
      }
    } catch (error) {
      if (error.banInfo) {
        setBanInfo(error.banInfo);
        setShowBanNotification(true);
      } else {
        setErr(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setTags("");
    setFiles([]);
    setStatus("published");
    setCoverUrl("");
    setErr("");
    setShowPrivacyDropdown(false);
  };

  const handleFilesUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append("files", f));

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const response = await fetch(`${API_URL}/api/uploads/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
          if (data.files) {
            setFiles(prev => {
              const newFiles = [...prev, ...data.files];
              // Nếu chưa có coverUrl thì chọn file đầu tiên là ảnh làm cover
              if (!coverUrl) {
                const firstImage = newFiles.find(f => f.type === "image");
              }
              return newFiles;
            });
          }
    } catch (error) {
      setErr("Lỗi upload file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <>
      {/* Facebook-style post creator */}
      <div className="card max-w-2xl mx-auto mb-6">
        <div className="flex items-center gap-3">
          <img
            src={user?.avatarUrl || `https://ui-avatars.io/api/?name=${encodeURIComponent(userDisplayName)}&background=3b82f6&color=ffffff&size=40`}
            alt={userDisplayName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-3 text-left text-gray-500 transition-colors"
          >
            {userDisplayName} ơi, bạn đang nghĩ gì thế?
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Tạo bài viết</h2>
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Avatar + Privacy */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDisplayName)}&background=3b82f6&color=ffffff&size=40`}
                  alt={userDisplayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="font-medium">{userDisplayName}</div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 flex items-center gap-1 transition-colors"
                    >
                      {status === "published" ? (
                        <>
                          <Globe size={14} />
                          <span>Công khai</span>
                        </>
                      ) : (
                        <>
                          <Lock size={14} />
                          <span>Riêng tư</span>
                        </>
                      )}
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showPrivacyDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                        <button
                          type="button"
                          onClick={() => {
                            setStatus("published");
                            setShowPrivacyDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                          <Globe size={14} />
                          <span>Công khai</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStatus("private");
                            setShowPrivacyDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                          <Lock size={14} />
                          <span>Riêng tư</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <input
                  type="text"
                  placeholder="Tiêu đề bài viết..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border-0 text-lg font-medium resize-none focus:outline-none"
                />
              </div>

              {/* Content */}
              <div>
                <textarea
                  placeholder={`${userDisplayName} ơi, bạn đang nghĩ gì thế?`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full border-0 text-base resize-none focus:outline-none"
                />
              </div>

              {/* Upload section: ảnh/video + preview */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1">
                  <label className="btn-outline flex items-center gap-2 cursor-pointer w-fit">
                    <Image size={18} />
                    <span>{uploading ? "Đang tải..." : "Thêm ảnh/video"}</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFilesUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
                {files.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {files.map((f, idx) => (
                      <div key={idx} className="relative">
                        {f.type === "image" ? (
                          <img src={f.url} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <video src={f.url} controls className="w-16 h-16 object-cover rounded-lg" />
                        )}
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <input
                  type="text"
                  placeholder="Thêm tags (phân cách bằng dấu phẩy)..."
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {err && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {err}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-outline"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !content.trim()}
                  className="btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Đang đăng..." : "Đăng bài"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ban Notification */}
      {showBanNotification && (
        <BanNotification
          banInfo={banInfo}
          onClose={() => setShowBanNotification(false)}
        />
      )}
    </>
  );
}
