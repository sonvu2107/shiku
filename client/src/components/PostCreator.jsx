import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Globe, Lock, Image, Users, BarChart3, Plus, X, Loader2, Youtube } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BanNotification from "./BanNotification";
import MarkdownEditor from "./MarkdownEditor";
import UserAvatar from "./UserAvatar";
import { useToast } from "../contexts/ToastContext";
import YouTubePlayer, { isValidYouTubeUrl } from "./YouTubePlayer";

/**
 * PostCreator - Component for creating a new post
 * Includes a Facebook-style quick input and a modal for detailed post creation
 * Supports media uploads, privacy settings, tags and group posting
 * @param {Object} user - Current user object
 * @param {string} groupId - Group ID when creating a post inside a group
 * @param {boolean} hideTrigger - Hide the quick input trigger (show modal only)
 * @param {React.Ref} triggerRef - Ref to trigger the modal externally
 */
const PostCreator = forwardRef(function PostCreator({ user, groupId = null, hideTrigger = false }, ref) {
  // ==================== STATE MANAGEMENT ====================
  const { showSuccess, showError } = useToast();

  // Modal and form states
  const [showModal, setShowModal] = useState(false); // Whether the create-post modal is visible
  const [title, setTitle] = useState(""); // Post title
  const [content, setContent] = useState(""); // Post content
  const [tags, setTags] = useState(""); // Tags (comma-separated)
  const [files, setFiles] = useState([]); // Uploaded media files
  const [status, setStatus] = useState("published"); // Post status (published/private)

  // UI states
  const [err, setErr] = useState(""); // Error message shown to user
  const [loading, setLoading] = useState(false); // Loading state while submitting
  const [uploading, setUploading] = useState(false); // Loading state while uploading files
  const [coverUrl, setCoverUrl] = useState(""); // Cover image URL
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false); // Privacy dropdown visibility

  // Group states
  const [groups, setGroups] = useState([]); // User's groups list
  const [selectedGroup, setSelectedGroup] = useState(groupId); // Currently selected group
  const [showGroupDropdown, setShowGroupDropdown] = useState(false); // Group dropdown visibility

  // Ban notification states
  const [showBanNotification, setShowBanNotification] = useState(false);
  const [banInfo, setBanInfo] = useState(null);

  // Poll states
  const [hasPoll, setHasPoll] = useState(false); // Whether creating a poll
  const [pollQuestion, setPollQuestion] = useState(""); // Poll question
  const [pollOptions, setPollOptions] = useState(["", ""]); // Poll options (minimum 2)
  const [pollExpiresIn, setPollExpiresIn] = useState(""); // Expiry in days
  const [pollIsPublic, setPollIsPublic] = useState(true); // Whether poll votes are public
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false); // Allow multiple choices

  // YouTube Music states
  const [youtubeUrl, setYoutubeUrl] = useState(""); // YouTube URL for music embed
  const [showYoutubeInput, setShowYoutubeInput] = useState(false); // Show YouTube input field

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

  const userDisplayName = user?.name || "Bạn"; // Fallback display name

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle submit of the create-post form
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!title.trim()) {
      setErr("Vui lòng nhập tiêu đề");
      showError("Vui lòng nhập tiêu đề");
      return;
    }

    // Content, poll, and media are all optional - only title is required
    // (validation for title is already done above)

    // Validate poll nếu có
    if (hasPoll) {
      if (!pollQuestion.trim()) {
        setErr("Vui lòng nhập câu hỏi bình chọn");
        showError("Vui lòng nhập câu hỏi bình chọn");
        return;
      }
      const validOptions = pollOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        setErr("Bình chọn phải có ít nhất 2 lựa chọn");
        showError("Bình chọn phải có ít nhất 2 lựa chọn");
        return;
      }
      if (validOptions.length > 10) {
        setErr("Bình chọn chỉ có thể có tối đa 10 lựa chọn");
        showError("Bình chọn chỉ có thể có tối đa 10 lựa chọn");
        return;
      }
    }

    setLoading(true);
    try {
      // Parse tags from comma-separated string into an array
      const tagsArray = tags.split(",").map(tag => tag.trim()).filter(tag => tag);

      // Call API to create the post
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
          hasPoll,
          youtubeUrl: youtubeUrl.trim() || undefined
        }
      });

      // If a poll is present, create the poll for the post
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

      // Reset form and close modal
      setShowModal(false);
      resetForm();

      // Show success message
      if (status === "private") {
        showSuccess("Bài viết riêng tư đã được lưu thành công!");
        navigate("/");
      } else {
        showSuccess("Bài viết đã được đăng thành công!");
        navigate(`/post/${post.post.slug}`); // Redirect đến bài viết mới
      }
    } catch (error) {
      // Xử lý ban notification
      if (error.banInfo) {
        setBanInfo(error.banInfo);
        setShowBanNotification(true);
      } else {
        const errorMessage = error.message || "Có lỗi xảy ra khi tạo bài viết";
        setErr(errorMessage);
        showError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset all form fields to their initial state
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
    // Reset YouTube
    setYoutubeUrl("");
    setShowYoutubeInput(false);
  };

  /**
   * Handle uploading multiple files (images/videos)
   * @param {Event} e - File input change event
   */
  const handleFilesUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    setUploading(true);
    try {
      // Use unified upload helper (supports direct + fallback)
      const { uploadMediaFiles } = await import("../api");
      const uploaded = await uploadMediaFiles(selectedFiles, { folder: "blog" });

      // Append uploaded files to state
      if (uploaded && uploaded.length) {
        setFiles(prev => {
          const newFiles = [...prev, ...uploaded];
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
   * Close the modal and reset the form
   */
  const handleClose = () => {
    setShowModal(false);
    resetForm();
  };

  // Expose method to open modal via ref
  useImperativeHandle(ref, () => ({
    openModal: () => setShowModal(true)
  }));

  return (
    <>
      {/* Hidden trigger button for external access */}
      <button
        data-post-creator-trigger
        onClick={() => setShowModal(true)}
        className="hidden"
        aria-hidden="true"
      />

      {/* Trigger Input Card - Monochrome Luxury Style */}
      {!groupId && !hideTrigger && (
        <div
          onClick={() => setShowModal(true)}
          className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-3 sm:p-5 cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-[0.98] sm:hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <UserAvatar
              user={user}
              size={36}
              showFrame={true}
              showBadge={true}
              className="sm:hidden"
            />
            <UserAvatar
              user={user}
              size={40}
              showFrame={true}
              showBadge={true}
              className="hidden sm:block"
            />
            <div className="flex-1 text-neutral-500 dark:text-neutral-400 text-sm sm:text-base font-medium truncate">
              Bạn đang nghĩ gì?
            </div>
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <div className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group" title="Thêm ảnh/video">
                <Image size={20} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-colors" />
              </div>
              <div className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group" title="Tạo bình chọn">
                <BarChart3 size={20} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Monochrome Luxury with Glassmorphism */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
            data-post-creator-modal
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl border-t sm:border border-neutral-200 dark:border-neutral-800"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white">Tạo bài viết</h2>
                  <button
                    onClick={handleClose}
                    className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
                    aria-label="Đóng"
                  >
                    <X size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Avatar + Privacy */}
                  <div className="flex items-center gap-4">
                    <UserAvatar
                      user={user}
                      size={40}
                      showFrame={true}
                      showBadge={true}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-neutral-900 dark:text-white mb-1">{userDisplayName}</div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                          className="text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-all duration-200"
                        >
                          {status === "published" ? (
                            <>
                              <Globe size={12} strokeWidth={2.5} />
                              <span>Công khai</span>
                            </>
                          ) : (
                            <>
                              <Lock size={12} strokeWidth={2.5} />
                              <span>Riêng tư</span>
                            </>
                          )}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {showPrivacyDropdown && (
                          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-20 min-w-[140px] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setStatus("published");
                                setShowPrivacyDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
                            >
                              <Globe size={14} strokeWidth={2.5} />
                              <span>Công khai</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStatus("private");
                                setShowPrivacyDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
                            >
                              <Lock size={14} strokeWidth={2.5} />
                              <span>Riêng tư</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Group Selection */}
                  {!groupId && groups.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Đăng trong:</span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                          className="text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-all duration-200"
                        >
                          {selectedGroup ? (
                            <>
                              <Users size={12} strokeWidth={2.5} />
                              <span>{groups.find(g => g._id === selectedGroup)?.name || 'Chọn nhóm'}</span>
                            </>
                          ) : (
                            <>
                              <Globe size={12} strokeWidth={2.5} />
                              <span>Trang cá nhân</span>
                            </>
                          )}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {showGroupDropdown && (
                          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-20 min-w-[220px] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGroup(null);
                                setShowGroupDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
                            >
                              <Globe size={14} strokeWidth={2.5} />
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
                                className="w-full px-4 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
                              >
                                <Users size={14} strokeWidth={2.5} />
                                <span>{group.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Title - Borderless */}
                  <div>
                    <input
                      type="text"
                      placeholder="Tiêu đề bài viết..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border-0 bg-transparent text-2xl font-black text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 resize-none focus:outline-none"
                    />
                  </div>

                  {/* Content - Markdown Editor */}
                  <div>
                    <MarkdownEditor
                      value={content}
                      onChange={setContent}
                      placeholder={`${userDisplayName} ơi, bạn đang nghĩ gì thế?`}
                      rows={8}
                    />
                  </div>

                  {/* Actions - Minimalist Icons */}
                  <div className="flex items-center gap-1 sm:gap-2 pt-3 sm:pt-4 border-t border-neutral-200 dark:border-neutral-800 flex-wrap">
                    <label className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-all duration-200 group" title="Thêm ảnh/video">
                      <Image size={16} className="sm:w-[18px] sm:h-[18px] text-neutral-500 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" strokeWidth={2.5} />
                      <span className="text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                        {uploading ? "Đang tải..." : "Ảnh/Video"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFilesUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setHasPoll(!hasPoll)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 group ${hasPoll
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      title="Tạo bình chọn"
                    >
                      <BarChart3 size={16} className={`sm:w-[18px] sm:h-[18px] ${hasPoll ? "text-white dark:text-black" : "text-neutral-500 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors"}`} strokeWidth={2.5} />
                      <span className={`text-xs sm:text-sm font-bold ${hasPoll ? "text-white dark:text-black" : "text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors"}`}>
                        Bình chọn
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowYoutubeInput(!showYoutubeInput)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-200 group ${showYoutubeInput || youtubeUrl
                        ? "bg-red-600 text-white"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      title="Thêm nhạc từ YouTube"
                    >
                      <Youtube size={16} className={`sm:w-[18px] sm:h-[18px] ${showYoutubeInput || youtubeUrl ? "text-white" : "text-red-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors"}`} strokeWidth={2.5} />
                      <span className={`text-xs sm:text-sm font-bold ${showYoutubeInput || youtubeUrl
                        ? "text-white"
                        : "text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors"
                        }`}>
                        YouTube
                      </span>
                    </button>
                  </div>

                  {/* Media Preview */}
                  {files.length > 0 && (
                    <div className="flex gap-3 flex-wrap">
                      {files.map((f, idx) => (
                        <div key={idx} className="relative group">
                          {f.type === "image" ? (
                            <img src={f.url} alt="preview" className="w-24 h-24 object-cover rounded-2xl border border-neutral-200 dark:border-neutral-800" loading="lazy" />
                          ) : (
                            <video src={f.url} controls className="w-24 h-24 object-cover rounded-2xl border border-neutral-200 dark:border-neutral-800" />
                          )}
                          <button
                            type="button"
                            onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-neutral-900/80 dark:bg-white/90 text-white dark:text-black rounded-full w-6 h-6 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 touch-manipulation backdrop-blur-sm"
                            title="Xóa"
                          >
                            <X size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags - Borderless */}
                  <div>
                    <input
                      type="text"
                      placeholder="Thêm tags cho bài viết..."
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full border-0 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                    />
                  </div>

                  {/* YouTube Music Input */}
                  {showYoutubeInput && (
                    <div className="space-y-4 p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.15em]">YouTube</span>
                          <h4 className="text-base font-bold text-neutral-900 dark:text-white">Thêm nhạc từ YouTube</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowYoutubeInput(false);
                            setYoutubeUrl("");
                          }}
                          className="text-xs font-bold text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        >
                          Đóng
                        </button>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="url"
                          placeholder="Dán link YouTube vào đây... (VD: https://youtube.com/watch?v=...)"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          className="w-full border-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 transition-all"
                        />
                        {youtubeUrl && !isValidYouTubeUrl(youtubeUrl) && (
                          <p className="text-xs text-red-500 font-medium">
                            Link YouTube không hợp lệ. Vui lòng nhập link đúng định dạng.
                          </p>
                        )}
                        {youtubeUrl && isValidYouTubeUrl(youtubeUrl) && (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                            <span>✓</span> Link hợp lệ - Nhạc sẽ được hiển thị trong bài viết
                          </p>
                        )}
                      </div>

                      {/* YouTube Preview */}
                      {youtubeUrl && isValidYouTubeUrl(youtubeUrl) && (
                        <div className="mt-3">
                          <YouTubePlayer url={youtubeUrl} variant="compact" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Poll Configuration */}
                  {hasPoll && (
                    <div className="space-y-4 p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-black text-neutral-900 dark:text-white">Tạo bình chọn</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setHasPoll(false);
                            setPollQuestion("");
                            setPollOptions(["", ""]);
                            setPollExpiresIn("");
                          }}
                          className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          title="Đóng"
                        >
                          <X size={18} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Poll Question */}
                      <div>
                        <input
                          type="text"
                          placeholder="Câu hỏi bình chọn..."
                          value={pollQuestion}
                          onChange={(e) => setPollQuestion(e.target.value)}
                          className="w-full border-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                          maxLength={500}
                        />
                      </div>

                      {/* Poll Options */}
                      <div className="space-y-3">
                        <label className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
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
                                className="w-full border-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                                maxLength={200}
                              />
                              {option.trim() && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <div className="w-2 h-2 bg-neutral-900 dark:bg-white rounded-full"></div>
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
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-opacity p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 touch-manipulation"
                                title="Xóa lựa chọn này"
                              >
                                <X size={16} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Add Option Button */}
                        {pollOptions.length < 10 && (
                          <button
                            type="button"
                            onClick={() => setPollOptions([...pollOptions, ""])}
                            className="flex items-center gap-2 text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 px-4 py-2.5 rounded-xl transition-all duration-200 border border-dashed border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500"
                          >
                            <Plus size={16} strokeWidth={2.5} />
                            <span>Thêm lựa chọn</span>
                          </button>
                        )}
                      </div>

                      {/* Poll Settings */}
                      <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        {/* Expiry Time */}
                        <div className="space-y-2">
                          <label className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Hết hạn sau:
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              placeholder="Số ngày (để trống = không giới hạn)"
                              value={pollExpiresIn}
                              onChange={(e) => setPollExpiresIn(e.target.value)}
                              min="1"
                              max="365"
                              className="flex-1 border-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                            />
                            <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400 whitespace-nowrap">ngày</span>
                          </div>
                        </div>

                        {/* Checkboxes */}
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 text-sm cursor-pointer hover:text-neutral-900 dark:hover:text-white group text-neutral-700 dark:text-neutral-300">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={pollAllowMultiple}
                                onChange={(e) => setPollAllowMultiple(e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-200 ${pollAllowMultiple
                                ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-black'
                                : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 group-hover:border-neutral-900 dark:group-hover:border-white'
                                }`}>
                                {pollAllowMultiple && (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="leading-tight flex-1 font-medium">Cho phép chọn nhiều lựa chọn</span>
                          </label>

                          <label className="flex items-center gap-3 text-sm cursor-pointer hover:text-neutral-900 dark:hover:text-white group text-neutral-700 dark:text-neutral-300">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={pollIsPublic}
                                onChange={(e) => setPollIsPublic(e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-200 ${pollIsPublic
                                ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-black'
                                : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 group-hover:border-neutral-900 dark:group-hover:border-white'
                                }`}>
                                {pollIsPublic && (
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="leading-tight flex-1 font-medium">Hiển thị ai đã vote (công khai)</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {err && (
                    <div className="text-red-600 dark:text-red-400 text-sm font-bold bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                      {err}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-6 py-3 border-2 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !title.trim()}
                      className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:scale-105 transition-all duration-200 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {loading ? "Đang đăng..." : "Đăng bài"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ban Notification */}
      {showBanNotification && (
        <BanNotification
          banInfo={banInfo}
          onClose={() => setShowBanNotification(false)}
        />
      )}
    </>
  );
});

export default PostCreator;
