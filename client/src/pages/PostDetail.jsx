import React, { useRef, useEffect, useState, useMemo } from "react";
import MenuActions from "../components/MenuActions";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../api";
import ReactMarkdown from "react-markdown";
import CommentSection from "../components/CommentSection";
import { Expand, X, Eye, Lock, Globe, ThumbsUp } from "lucide-react";
import UserName from "../components/UserName";

/**
 * Mapping các role với icon tương ứng (hiện tại chưa sử dụng)
 */
const roleIcons = {
  solo: "/assets/Sung-tick.png",
  sybau: "/assets/Sybau-tick.png",
  keeper: "/assets/moxumxue.png"
};

/**
 * PostDetail - Trang chi tiết bài viết
 * Hiển thị nội dung bài viết, media, emotes, comments và các actions
 * Hỗ trợ media modal carousel và emote system
 */
export default function PostDetail() {
  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Format thời gian chi tiết cho tooltip
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  function formatFullDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Format thời gian dạng relative (x giờ trước, x ngày trước, etc.)
   * @param {string} dateString - ISO date string
   * @returns {string} Relative time string
   */
  function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    
    if (diffMonth >= 1) return `${diffMonth} tháng trước`;
    if (diffDay >= 1) return `${diffDay} ngày trước`;
    if (diffHour >= 1) return `${diffHour} giờ trước`;
    if (diffMin >= 1) return `${diffMin} phút trước`;
    return 'Vừa xong';
  }
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setDataRaw] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showEmoteList, setShowEmoteList] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const setData = (updater) => {
    setDataRaw(updater);
    setLoading(false);
  };

  const [user, setUser] = useState(null);

  // modal media
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const emoteMap = {
    "👍": "like.gif",
    "❤️": "care.gif",
    "😂": "haha.gif",
    "😮": "wow.gif",
    "😢": "sad.gif",
    "😡": "angry.gif"
  };
  const emotes = Object.keys(emoteMap);
  const [showEmotePopup, setShowEmotePopup] = React.useState(false);
  const emotePopupTimeout = React.useRef();

  useEffect(() => {
    if (!data || data.post?.slug !== slug) {
      load();
    }
  }, [slug]);

  useEffect(() => {
    api("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
  }, []);

  const commentTree = useMemo(() => {
    return data?.comments || [];
  }, [data?.comments]);

  async function load() {
    try {
      const res = await api(`/api/posts/slug/${slug}`);
      setData(res);
    } catch (e) { }
  }

  async function deletePost() {
    if (!window.confirm("Bạn có chắc muốn xóa bài này?")) return;
    try {
      await api(`/api/posts/${data.post._id}`, { method: "DELETE" });
      alert("Đã xóa bài viết.");
      navigate("/");
    } catch (e) {
      alert(e.message);
    }
  }

  async function emote(emote) {
    try {
      await api(`/api/posts/${data.post._id}/emote`, {
        method: "POST",
        body: { emote }
      });
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function togglePostStatus() {
    const currentStatus = data.post.status;
    const newStatus = currentStatus === "private" ? "published" : "private";
    const confirmMessage =
      newStatus === "private"
        ? "Bạn có chắc muốn chuyển bài viết này thành riêng tư?"
        : "Bạn có chắc muốn công khai bài viết này?";
    if (!window.confirm(confirmMessage)) return;

    try {
      await api(`/api/posts/${data.post._id}`, {
        method: "PUT",
        body: { status: newStatus }
      });

      setData((prev) => ({
        ...prev,
        post: { ...prev.post, status: newStatus }
      }));

      alert(
        newStatus === "private"
          ? "Đã chuyển thành riêng tư"
          : "Đã công khai bài viết"
      );
    } catch (e) {
      alert(e.message);
    }
  }

  function countEmotes() {
    const counts = {};
    if (!data?.post?.emotes) return counts;
    for (const emo of emotes) counts[emo] = 0;
    for (const e of data.post.emotes) {
      if (counts[e.type] !== undefined) counts[e.type]++;
    }
    return counts;
  }

  if (loading || !data) return <div className="card">Đang tải...</div>;
  const p = data.post;
  const counts = countEmotes();

  // all media = cover + files
  const allMedia = [
    ...(p.coverUrl
      ? (() => {
          const found = Array.isArray(p.files)
            ? p.files.find(f => f.url === p.coverUrl)
            : null;
          if (found) return [{ url: p.coverUrl, type: found.type }];
          return [{ url: p.coverUrl, type: "image" }];
        })()
      : []),
    ...(Array.isArray(p.files) ? p.files.filter(f => f.url !== p.coverUrl) : [])
  ];

  return (
    <div className="w-full px-6 py-6 space-y-4 pt-20">
  <div className="card max-w-4xl mx-auto relative">
        {/* Header: avatar + tên user */}
        <div className="flex items-center gap-2 mb-0">
        {/* Menu 3 chấm góc phải */}
        {user && (user._id === p.author?._id || user.role === "admin") && (
          <div className="absolute top-4 right-4 z-10">
            <MenuActions
              onToggleStatus={togglePostStatus}
              onEdit={() => navigate(`/edit/${p._id}`)}
              onDelete={deletePost}
              isPrivate={p.status === "private"}
            />
          </div>
        )}
          <Link to={`/user/${p.author?._id}`}>
            <img
              src={
                p.author?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  p.author?.name || ""
                )}&background=cccccc&color=222222&size=64`
              }
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover border border-gray-300 bg-gray-100"
            />
          </Link>
          <span className="font-semibold text-gray-900 text-base mr-2"><UserName user={p.author} /></span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 ml-10">
          <span
            title={formatFullDate(p.createdAt)}
            className="cursor-pointer"
          >
            {formatTimeAgo(p.createdAt)}
          </span>
          {p.status === "private" ? (
            <Lock size={16} className="text-gray-500" />
          ) : (
            <Globe size={16} className="text-green-500" />
          )}
        </div>
        {/* Tiêu đề */}
        <h1 className="text-xl font-bold mb-2">{p.title}</h1>

        {/* Cover removed. Only files are shown as media. */}

        {/* Content */}
        <div className="prose max-w-none">
          <ReactMarkdown>{p.content}</ReactMarkdown>
        </div>

        {/* Hiển thị preview media trong bài */}
        {allMedia.length === 1 && (
          <div className="mt-4">
            <div
              className="w-full rounded-xl overflow-hidden cursor-pointer"
              onClick={() => {
                setCurrentIndex(0);
                setShowMediaModal(true);
              }}
            >
              {allMedia[0].type === "video" ? (
                <video
                  src={allMedia[0].url}
                  className="w-full object-contain max-h-[70vh]"
                  controls
                />
              ) : (
                <img
                  src={allMedia[0].url}
                  className="w-full object-contain max-h-[70vh]"
                  alt="media"
                />
              )}
            </div>
          </div>
        )}
        {allMedia.length > 1 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div
              className="col-span-2 row-span-2 h-64 rounded-xl overflow-hidden cursor-pointer"
              onClick={() => {
                setCurrentIndex(0);
                setShowMediaModal(true);
              }}
            >
              {allMedia[0].type === "video" ? (
                <video
                  src={allMedia[0].url}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <img
                  src={allMedia[0].url}
                  className="w-full h-full object-cover"
                  alt="media"
                />
              )}
            </div>
            {allMedia.slice(1, 3).map((m, idx) => (
              <div
                key={idx + 1}
                className="h-36 rounded-xl overflow-hidden relative cursor-pointer"
                onClick={() => {
                  setCurrentIndex(idx + 1);
                  setShowMediaModal(true);
                }}
              >
                {m.type === "video" ? (
                  <video
                    src={m.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={m.url}
                    className="w-full h-full object-cover"
                    alt="media"
                  />
                )}
                {/* Nếu là ảnh cuối và còn nhiều hơn 3 ảnh, overlay số lượng */}
                {idx === 1 && allMedia.length > 3 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded text-white text-2xl font-bold">
                    +{allMedia.length - 3} ảnh
                  </div>
                )}
              </div>
            ))}
          </div>
        )}


        {/* Emotes + Actions */}
        <div className="mt-4 flex flex-col gap-2 flex-wrap">
          {/* Like count */}
          <div className="flex items-center gap-1 mb-2">
            {Object.entries(counts)
              .filter(([_, count]) => count > 0)
              .slice(0, 2)
              .map(([emo]) => (
                <img
                  key={emo}
                  src={`/assets/${emoteMap[emo]}`}
                  alt={emo}
                  className="w-6 h-6"
                />
              ))}
            {Object.values(counts).reduce((a, b) => a + b, 0) > 0 && (
              <span
                className="ml-1 font-semibold cursor-pointer"
                onClick={() => setShowEmoteList(true)}
              >
                {Object.values(counts).reduce((a, b) => a + b, 0)}
              </span>
            )}
            {/* Popup danh sách người đã thả emote */}
            {showEmoteList && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setShowEmoteList(false)}>
                <div className="bg-white text-gray-900 rounded-xl shadow-2xl p-0 min-w-[350px] max-w-[95vw] relative" onClick={e => e.stopPropagation()}>
                  {/* Header tabs */}
                  <div className="flex items-center border-b px-6 pt-5 pb-2 gap-2">
                    <button
                      className={`font-semibold px-2 py-1 rounded ${activeTab === 'all' ? 'bg-white-200' : ''}`}
                      onClick={() => setActiveTab('all')}
                    >
                      Tất cả
                    </button>
                    {Object.entries(counts)
                      .filter(([_, count]) => count > 0)
                      .map(([emo]) => (
                        <button
                          key={emo}
                          className={`flex items-center gap-1 px-2 py-1 rounded ${activeTab === emo ? 'bg-white-200' : ''}`}
                          onClick={() => setActiveTab(emo)}
                        >
                          <img src={`/assets/${emoteMap[emo]}`} alt={emo} className="w-5 h-5" />
                          <span>{counts[emo]}</span>
                        </button>
                      ))}
                  </div>

                  {/* Close button */}
                  <button className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-black" onClick={() => setShowEmoteList(false)}>
                    &#10005;
                  </button>

                  {/* User list */}
                  <div className="px-6 py-3 max-h-[60vh] overflow-y-auto">
                    {(() => {
                      let emoteUsers;
                      if (activeTab === "all") {
                        emoteUsers = p.emotes;
                      } else {
                        emoteUsers = p.emotes.filter(e => e.type === activeTab);
                      }
                      if (emoteUsers.length === 0) return <div className="text-gray-400">Chưa có ai thả cảm xúc này.</div>;
                      return emoteUsers.map((e, idx) => {
                        const user = e.user || {};
                        const avatar = user.avatarUrl
                          ? user.avatarUrl
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "?")}&background=3b82f6&color=ffffff&size=40`;
                        return (
                          <div key={idx} className="flex gap-3 py-2 border-b items-center">
                            <img src={avatar} alt={user.name || "Người dùng"} className="w-10 h-10 rounded-full object-cover" />
                            <UserName user={user} className="font-semibold text-sm text-gray-900" />
                            <div className="flex-1"></div>
                            <img src={`/assets/${emoteMap[e.type]}`} alt={e.type} className="w-5 h-5 ml-2" />
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Like/Emote */}
            <div
              className="relative inline-block"
              onMouseEnter={() => {
                if (emotePopupTimeout.current)
                  clearTimeout(emotePopupTimeout.current);
                setShowEmotePopup(true);
              }}
              onMouseLeave={() => {
                emotePopupTimeout.current = setTimeout(
                  () => setShowEmotePopup(false),
                  400
                );
              }}
            >
              <button
                className="btn-outline flex items-center gap-2"
                type="button"
                onClick={() => setShowEmotePopup(true)}
              >
                <ThumbsUp size={18} /> Thích
              </button>
              {showEmotePopup && (
                <div
                  className="absolute bottom-full left-0 mb-2 flex gap-2 bg-white p-2 rounded-xl shadow z-10 border"
                  style={{ minWidth: 340, maxWidth: 400, justifyContent: "center" }}
                >
                  {emotes.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        emote(e);
                        setShowEmotePopup(false);
                      }}
                    >
                      <img src={`/assets/${emoteMap[e]}`} alt={e} className="w-8 h-8" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle / Edit / Delete */}
            {/* Đã gộp vào menu 3 chấm */}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="card max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Bình luận</h2>
        <CommentSection
          postId={p._id}
          initialComments={data.comments || []}
          user={user}
        />
      </div>

      {/* Media modal carousel */}
      {showMediaModal && allMedia.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowMediaModal(false)}
        >
          <div className="relative max-w-full max-h-full flex items-center">
            {/* Close */}
            <button
              onClick={() => setShowMediaModal(false)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full"
            >
              <X size={20} />
            </button>

            {/* Prev */}
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) => i - 1);
                }}
                className="absolute left-4 bg-black bg-opacity-50 text-white p-3 rounded-full"
              >
                ‹
              </button>
            )}

            {/* Content */}
            <div className="max-w-full max-h-full">
              {allMedia[currentIndex].type === "video" ? (
                <video
                  src={allMedia[currentIndex].url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={allMedia[currentIndex].url}
                  alt={`media-${currentIndex}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>

            {/* Next */}
            {currentIndex < allMedia.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((i) => i + 1);
                }}
                className="absolute right-4 bg-black bg-opacity-50 text-white p-3 rounded-full"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
