import { useRef, useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "../api";
import ReactMarkdown from "react-markdown";
import CommentSection from "../components/CommentSection";
import { Expand, X, Lock, Globe } from "lucide-react";

const roleIcons = {
  solo: "/assets/Sung-tick.png",
  sybau: "/assets/Sybau-tick.png",
  keeper: "/assets/moxumxue.png"
};

export default function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setDataRaw] = useState(null);
  const [loading, setLoading] = useState(true);

  const setData = (updater) => {
    console.log("🔥 setData called:", typeof updater === "function" ? "function" : updater, "\nStack:", new Error().stack);
    setDataRaw(updater);
    setLoading(false);
  };

  const getFirstImageFromContent = (content) => {
    if (!content) return null;
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    return imageMatch ? imageMatch[1] : null;
  };

  const getDisplayImage = (post) => {
    return post?.coverUrl || getFirstImageFromContent(post?.content);
  };

  const [showEmote, setShowEmote] = useState(false);
  const [user, setUser] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const emotes = ["👍", "😂", "❤️", "😮", "😢", "😡"];

  useEffect(() => {
    console.log("🔄 useEffect load triggered, slug:", slug, "data exists:", !!data);
    if (!data || data.post?.slug !== slug) {
      load();
    }
  }, [slug]);
  useEffect(() => {
    api("/api/auth/me").then(res => setUser(res.user)).catch(() => setUser(null));
  }, []);

  const commentTree = useMemo(() => {
    console.log("🎯 useMemo commentTree running, data.comments:", data?.comments?.length);
    return data?.comments || [];
  }, [data?.comments]);

  async function load() {
    try {
      console.log("🔄 load() called");
      const res = await api(`/api/posts/slug/${slug}`);
      setData(res);
    } catch (e) {}
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
      await api(`/api/posts/${data.post._id}/emote`, { method: "POST", body: { emote } });
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
        ? "Bạn có chắc muốn chuyển bài viết này thành riêng tư? Chỉ bạn mới có thể xem."
        : "Bạn có chắc muốn công khai bài viết này? Mọi người sẽ có thể xem được.";

    if (!window.confirm(confirmMessage)) return;

    try {
      await api(`/api/posts/${data.post._id}`, {
        method: "PUT",
        body: { status: newStatus }
      });

      setData(prev => ({
        ...prev,
        post: { ...prev.post, status: newStatus }
      }));

      alert(newStatus === "private" ? "Đã chuyển thành bài viết riêng tư" : "Đã công khai bài viết");
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

  return (
    <div className="w-full px-6 py-6 space-y-4 pt-20">
      <div className="card max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Link to={`/user/${p.author?._id}`}>
            <img
              src={
                p.author?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(p.author?.name || "")}&background=cccccc&color=222222&size=64`
              }
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover border border-gray-300 bg-gray-100 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
            />
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {p.title}
            {p.status === "private" ? (
              <Lock size={20} className="text-gray-500" title="Bài viết riêng tư - chỉ bạn xem được" />
            ) : (
              <Globe size={20} className="text-green-500" title="Bài viết công khai" />
            )}
          </h1>
        </div>

        {/* Tên + tick xanh */}
        <div className="text-sm text-gray-600 mb-3 flex items-center gap-1">
          <Link to={`/user/${p.author?._id}`} className="hover:text-blue-600 font-medium flex items-center gap-1">
            {p.author?.name}
            {p.author?.role && roleIcons[p.author.role] && (
              <img
                src={roleIcons[p.author.role]}
                alt="Tích xanh"
                className="w-4 h-4 rounded-full ml-1"
              />
            )}
          </Link>
          • {new Date(p.createdAt).toLocaleString()}
          {p.isEdited === true && <span className="text-gray-500"> (đã chỉnh sửa)</span>} • {p.views} lượt xem
        </div>

        {/* Cover image */}
        {getDisplayImage(p) && (
          <div className="mb-4 relative group">
            <img
              src={getDisplayImage(p)}
              alt={p.title}
              className="w-full max-h-96 object-cover rounded-lg cursor-pointer transition-all hover:brightness-90"
              onClick={() => setShowImageModal(true)}
            />
            <button
              onClick={() => setShowImageModal(true)}
              className="absolute top-3 right-3 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
              title="Xem toàn ảnh"
            >
              <Expand size={16} />
            </button>
          </div>
        )}

        <div className="prose max-w-none">
          <ReactMarkdown>{p.content}</ReactMarkdown>
        </div>

        {/* Emotes + Actions */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button className="btn-outline flex items-center gap-2" type="button" onClick={() => setShowEmote(!showEmote)}>
            Biểu cảm
            <span className="ml-2 flex gap-2">
              {Object.entries(counts).map(([emo, count]) =>
                count > 0 ? (
                  <span key={emo}>
                    {emo} {count}
                  </span>
                ) : null
              )}
            </span>
          </button>
          {showEmote && (
            <div className="flex gap-2 mt-2">
              {emotes.map(e => (
                <button key={e} className="btn-outline" type="button" onClick={() => emote(e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
          {user && (user._id === p.author?._id || user.role === "admin") && (
            <div className="flex gap-2">
              <button className="btn-outline flex items-center gap-1" type="button" onClick={togglePostStatus}>
                {p.status === "private" ? (
                  <>
                    <Globe size={14} />
                    Chuyển công khai
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    Chuyển riêng tư
                  </>
                )}
              </button>
              <button className="btn-outline" type="button" onClick={() => navigate(`/edit/${p._id}`)}>
                Sửa bài
              </button>
              <button className="btn-outline text-red-600" type="button" onClick={deletePost}>
                Xóa bài
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comment section */}
      <div className="card max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Bình luận</h2>
        <CommentSection postId={data.post._id} initialComments={data.comments || []} user={user} />
      </div>

      {/* Image modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 z-10"
              title="Đóng"
            >
              <X size={20} />
            </button>
            <img
              src={getDisplayImage(p)}
              alt={p.title}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
