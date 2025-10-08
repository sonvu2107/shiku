import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Globe, Lock, Image, Users, BarChart3, Plus, X } from "lucide-react";
import BanNotification from "./BanNotification";

/**
 * PostCreator - Component tạo bài viết mới
 * Gồm Facebook-style post input và modal tạo bài chi tiết
 * Hỗ trợ upload media, privacy settings, tags, groups
 * @param {Object} user - Thông tin user hiện tại
 * @param {string} groupId - ID của nhóm (nếu đang tạo bài trong nhóm)
 */
export default function PostCreator({ user, groupId = null }) {
  // ==================== STATE MANAGEMENT ====================
  
  // Modal và form states
  const [showModal, setShowModal] = useState(false); // Hiển thị modal tạo bài
  const [title, setTitle] = useState(""); // Tiêu đề bài viết
  const [content, setContent] = useState(""); // Nội dung bài viết
  const [tags, setTags] = useState(""); // Tags (phân cách bằng phẩy)
  const [files, setFiles] = useState([]); // Media files đã upload
  const [status, setStatus] = useState("published"); // Trạng thái public/private
  
  // UI states
  const [err, setErr] = useState(""); // Error message
  const [loading, setLoading] = useState(false); // Loading khi submit
  const [uploading, setUploading] = useState(false); // Loading khi upload files
  const [coverUrl, setCoverUrl] = useState(""); // URL ảnh cover
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false); // Dropdown privacy
  
  // Group states
  const [groups, setGroups] = useState([]); // Danh sách nhóm của user
  const [selectedGroup, setSelectedGroup] = useState(groupId); // Nhóm được chọn
  const [showGroupDropdown, setShowGroupDropdown] = useState(false); // Dropdown chọn nhóm
  
  // Ban notification states
  const [showBanNotification, setShowBanNotification] = useState(false);
  const [banInfo, setBanInfo] = useState(null);

  // Poll states
  const [hasPoll, setHasPoll] = useState(false); // Có tạo poll không
  const [pollQuestion, setPollQuestion] = useState(""); // Câu hỏi poll
  const [pollOptions, setPollOptions] = useState(["", ""]); // Danh sách options (tối thiểu 2)
  const [pollExpiresIn, setPollExpiresIn] = useState(""); // Thời gian hết hạn (days)
  const [pollIsPublic, setPollIsPublic] = useState(true); // Hiển thị ai vote gì
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false); // Cho phép vote nhiều options

  const navigate = useNavigate();

  // ==================== EFFECTS ====================
  
  // Load user's groups
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await api('/api/groups/my-groups', { method: 'GET' });
        if (response.success) {
          setGroups(response.data.groups);
        }
      } catch (error) {
        // Silent handling for groups loading error
      }
    };

    if (user) {
      loadGroups();
    }
  }, [user]);

  // ==================== HELPERS ====================
  
  const userDisplayName = user?.name || "Bạn"; // Fallback name

  // ==================== EVENT HANDLERS ====================
  
  /**
   * Xử lý submit form tạo bài viết
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!title.trim()) {
      setErr("Vui lòng nhập tiêu đề");
      return;
    }
    
    // Content is optional if poll is present
    if (!hasPoll && !content.trim()) {
      setErr("Vui lòng nhập nội dung hoặc tạo poll");
      return;
    }

    // Validate poll nếu có
    if (hasPoll) {
      if (!pollQuestion.trim()) {
        setErr("Vui lòng nhập câu hỏi poll");
        return;
      }
      const validOptions = pollOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        setErr("Poll phải có ít nhất 2 lựa chọn");
        return;
      }
      if (validOptions.length > 10) {
        setErr("Poll chỉ có thể có tối đa 10 lựa chọn");
        return;
      }
    }

    setLoading(true);
    try {
      // Parse tags từ string thành array
      const tagsArray = tags.split(",").map(tag => tag.trim()).filter(tag => tag);

      // Gọi API tạo bài viết
      const post = await api("/api/posts", {
        method: "POST",
        body: {
          title,
          content,
          tags: tagsArray,
          files,
          status,
          coverUrl,
          group: selectedGroup || null,
          hasPoll
        }
      });

      // Nếu có poll, tạo poll cho bài viết
      if (hasPoll) {
        const validOptions = pollOptions.filter(opt => opt.trim()).map(opt => ({ text: opt.trim() }));

        // Tính expiresAt nếu có
        let expiresAt = null;
        if (pollExpiresIn && parseInt(pollExpiresIn) > 0) {
          const days = parseInt(pollExpiresIn);
          expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        }

        await api("/api/polls", {
          method: "POST",
          body: {
            postId: post.post._id,
            question: pollQuestion.trim(),
            options: validOptions,
            allowMultipleVotes: pollAllowMultiple,
            isPublic: pollIsPublic,
            expiresAt
          }
        });
      }

      // Reset form và đóng modal
      setShowModal(false);
      resetForm();

      // Navigate based on post status
      if (status === "private") {
        navigate("/");
        alert("Bài viết riêng tư đã được lưu");
      } else {
        navigate(`/post/${post.post.slug}`); // Redirect đến bài viết mới
      }
    } catch (error) {
      // Xử lý ban notification
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

  /**
   * Reset tất cả form fields về trạng thái ban đầu
   */
  const resetForm = () => {
    setTitle("");
    setContent("");
    setTags("");
    setFiles([]);
    setStatus("published");
    setCoverUrl("");
    setErr("");
    setShowPrivacyDropdown(false);
    setSelectedGroup(groupId); // Reset về group ban đầu
    setShowGroupDropdown(false);
    // Reset poll
    setHasPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollExpiresIn("");
    setPollIsPublic(true);
    setPollAllowMultiple(false);
  };

  /**
   * Xử lý upload multiple files (images/videos)
   * @param {Event} e - File input change event
   */
  const handleFilesUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    
    setUploading(true);
    try {
      // Tạo FormData cho multiple files
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append("files", f));

      // Upload files qua api helper với FormData
      const data = await api("/api/uploads/media", {
        method: "POST",
        body: formData
      });
      
      // Thêm files đã upload vào state
      if (data.files) {
        setFiles(prev => {
          const newFiles = [...prev, ...data.files];
          // Auto-select first image as cover if no cover is set
          if (!coverUrl) {
            const firstImage = newFiles.find(f => f.type === "image");
            // setCoverUrl(firstImage?.url); // Commented out - có thể implement sau
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

  /**
   * Đóng modal và reset form
   */
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
            src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDisplayName)}&background=cccccc&color=222222&size=40`}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-mobile">
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
                  src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDisplayName)}&background=cccccc&color=222222&size=40`}
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

              {/* Group Selection */}
              {!groupId && groups.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Đăng trong:</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                      className="bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 flex items-center gap-1 transition-colors"
                    >
                      {selectedGroup ? (
                        <>
                          <Users size={14} />
                          <span>{groups.find(g => g._id === selectedGroup)?.name || 'Chọn nhóm'}</span>
                        </>
                      ) : (
                        <>
                          <Globe size={14} />
                          <span>Trang cá nhân</span>
                        </>
                      )}
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showGroupDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroup(null);
                            setShowGroupDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                          <Globe size={14} />
                          <span>Trang cá nhân</span>
                        </button>
                        {groups.map((group) => (
                          <button
                            key={group._id}
                            type="button"
                            onClick={() => {
                              setSelectedGroup(group._id);
                              setShowGroupDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Users size={14} />
                            <span>{group.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  placeholder={hasPoll ? `${userDisplayName} ơi, bạn đang nghĩ gì thế?` : `${userDisplayName} ơi, bạn đang nghĩ gì thế?`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full border-0 text-base resize-none focus:outline-none"
                />
                {hasPoll && (
                  <p className="text-sm text-gray-500 mt-1">
                  </p>
                )}
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

              {/* Poll Toggle Button */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setHasPoll(!hasPoll)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    hasPoll
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <BarChart3 size={18} />
                  <span>{hasPoll ? "Đã tạo bình chọn" : "Tạo bình chọn"}</span>
                </button>
              </div>

              {/* Poll Configuration */}
              {hasPoll && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Tạo bình chọn</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setHasPoll(false);
                        setPollQuestion("");
                        setPollOptions(["", ""]);
                        setPollExpiresIn("");
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      title="Đóng"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Poll Question */}
                  <div>
                    <input
                      type="text"
                      placeholder="Câu hỏi bình chọn..."
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={500}
                    />
                  </div>

                  {/* Poll Options */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Các lựa chọn:
                    </label>
                    {pollOptions.map((option, index) => (
                      <div key={index} className="flex items-center gap-2 group">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder={`Lựa chọn ${index + 1}...`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...pollOptions];
                              newOptions[index] = e.target.value;
                              setPollOptions(newOptions);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            maxLength={200}
                          />
                          {option.trim() && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = pollOptions.filter((_, i) => i !== index);
                              setPollOptions(newOptions);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity p-1 rounded"
                            title="Xóa lựa chọn này"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Add Option Button */}
                    {pollOptions.length < 10 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions([...pollOptions, ""])}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors border border-dashed border-blue-300 hover:border-blue-400"
                      >
                        <Plus size={16} />
                        <span>Thêm lựa chọn</span>
                      </button>
                    )}
                  </div>

                  {/* Poll Settings */}
                  <div className="space-y-3 pt-3 border-t border-gray-300">
                    {/* Expiry Time */}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Hết hạn sau:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Số ngày (để trống = không giới hạn)"
                          value={pollExpiresIn}
                          onChange={(e) => setPollExpiresIn(e.target.value)}
                          min="1"
                          max="365"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">ngày</span>
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 text-sm cursor-pointer hover:text-gray-900 group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={pollAllowMultiple}
                            onChange={(e) => setPollAllowMultiple(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-200 ${
                            pollAllowMultiple 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'border-gray-300 bg-white group-hover:border-blue-400'
                          }`}>
                            {pollAllowMultiple && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="leading-tight flex-1">Cho phép chọn nhiều lựa chọn</span>
                      </label>

                      <label className="flex items-center gap-3 text-sm cursor-pointer hover:text-gray-900 group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={pollIsPublic}
                            onChange={(e) => setPollIsPublic(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-200 ${
                            pollIsPublic 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'border-gray-300 bg-white group-hover:border-blue-400'
                          }`}>
                            {pollIsPublic && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="leading-tight flex-1">Hiển thị ai đã vote (công khai)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {err && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {err}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-outline"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || (!hasPoll && !content.trim())}
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
