import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Calendar, Eye, MessageCircle, Tag, Lock, Globe, ThumbsUp } from "lucide-react";
import { api } from "../api";
import UserName from "./UserName";

export default function PostCard({ post }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [showEmotePopup, setShowEmotePopup] = useState(false);
  const emotePopupTimeout = useRef();
  const emoteMap = {
    "👍": "like.gif",
    "❤️": "care.gif",
    "😂": "haha.gif",
    "😮": "wow.gif",
    "😢": "sad.gif",
    "😡": "angry.gif"
  };
  const emotes = Object.keys(emoteMap);

  const getFirstImageFromContent = (content) => {
    if (!content) return null;
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    return imageMatch ? imageMatch[1] : null;
  };

  const getDisplayImage = () => {
    return post.coverUrl || getFirstImageFromContent(post.content);
  };

  async function deletePost() {
    if (!window.confirm("Bạn có chắc muốn xóa bài này?")) return;
    try {
      await api(`/api/posts/${post._id}`, { method: "DELETE" });
      alert("Đã xóa bài viết.");
      navigate(0);
    } catch (e) { alert("Lỗi xóa bài"); }
  }

  async function togglePostStatus() {
    const newStatus = post.status === 'private' ? 'published' : 'private';
    const confirmMessage = newStatus === 'private' 
      ? "Bạn có chắc muốn chuyển bài viết này thành riêng tư?"
      : "Bạn có chắc muốn công khai bài viết này?";
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await api(`/api/posts/${post._id}`, { 
        method: "PUT", 
        body: { status: newStatus } 
      });
      alert(newStatus === 'private' ? "Đã chuyển thành riêng tư" : "Đã công khai bài viết");
      navigate(0);
    } catch (e) { 
      alert("Lỗi: " + e.message); 
    }
  }

  const [emotesState, setEmotesState] = useState(post.emotes || []);

  async function emote(emote) {
    try {
      const res = await api(`/api/posts/${post._id}/emote`, { method: "POST", body: { emote } });
      if (res.emotes) {
        setEmotesState(res.emotes);
      }
      // Nếu có callback thì gọi để cập nhật ngoài Home nếu cần
      if (typeof onUpdate === "function") {
        onUpdate();
      }
    } catch (e) {
      alert(e.message);
    }
  }

  function countEmotes() {
    const counts = {};
    if (!emotesState) return counts;
    for (const emo of emotes) counts[emo] = 0;
    for (const e of emotesState) {
      if (counts[e.type] !== undefined) counts[e.type]++;
    }
    return counts;
  }
  const counts = countEmotes();
  const totalEmotes = Object.values(counts).reduce((a, b) => a + b, 0);

  const displayImage = getDisplayImage();

  return (
    <div className="card flex flex-col gap-2">
      {displayImage && (
        <div className="w-full aspect-[16/10] overflow-hidden rounded-xl">
          <img 
            src={displayImage} 
            alt="" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
          />
        </div>
      )}
      <Link to={`/post/${post.slug}`} className="text-xl font-semibold hover:underline flex items-center gap-2">
        {post.title}
        {post.status === 'private' ? (
          <Lock size={16} className="text-gray-500" title="Bài viết riêng tư - chỉ bạn xem được" />
        ) : (
          <Globe size={16} className="text-green-500" title="Bài viết công khai" />
        )}
      </Link>
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <Link 
          to={`/user/${post.author?._id}`}
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          <User size={14} />
          <UserName user={post.author} />
        </Link>
        <span className="flex items-center gap-1">
          <Calendar size={14} />
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={14} />
          {post.views || 0}
        </span>
      </div>
      {/* Emote bar giống Facebook */}
      <div className="flex items-center justify-between py-2 border-b border-gray-200">
        <div className="flex items-center gap-1">
          {/* Hiển thị các emote đã thả */}
          {Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .slice(0, 2)
            .map(([emo]) => (
              <img key={emo} src={`/assets/${emoteMap[emo]}`} alt={emo} className="w-6 h-6 inline-block align-middle" />
            ))}
          {totalEmotes > 0 && (
            <span className="ml-1 font-semibold text-gray-800 ">{totalEmotes.toLocaleString()}</span>
          )}
        </div>
        {/* Không hiển thị lượt xem ở emote bar nữa */}
      </div>
      {/* Action bar */}
      <div className="flex items-center justify-between py-2">
        <div
          className="relative inline-block"
          onMouseEnter={() => {
            if (emotePopupTimeout.current) clearTimeout(emotePopupTimeout.current);
            setShowEmotePopup(true);
          }}
          onMouseLeave={() => {
            emotePopupTimeout.current = setTimeout(() => setShowEmotePopup(false), 400);
          }}
        >
          <button className="btn-outline flex items-center gap-2" type="button" onClick={() => emote("👍")}> 
            <ThumbsUp size={18} />
            <span>Thích</span>
          </button>
          {showEmotePopup && (
            <div
              className="absolute bottom-full left-0 mb-2 flex gap-2 bg-white p-2 rounded-xl shadow z-10 border border-gray-200"
              style={{ minWidth: 340, maxWidth: 400, justifyContent: "center" }}
            >
              {emotes.map(e => (
                <button key={e} className="hover:scale-110 transition-transform" type="button" onClick={() => { emote(e); setShowEmotePopup(false); }}>
                  <img src={`/assets/${emoteMap[e]}`} alt={e} className="w-8 h-8" />
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="btn-outline flex items-center gap-2"
          type="button"
          onClick={() => navigate(`/post/${post.slug}`)}
        >
          <MessageCircle size={18} />
          <span>Bình luận</span>
        </button>
      </div>
      {/* Action buttons for post owner and admin */}
      {user && (user._id === post.author?._id || user.role === "admin") && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex gap-2">
          <button 
            className="text-xs bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 flex items-center gap-1 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              togglePostStatus();
            }}
          >
            {post.status === 'private' ? (
              <>
                <Globe size={12} />
                Công khai
              </>
            ) : (
              <>
                <Lock size={12} />
                Riêng tư
              </>
            )}
          </button>
          <button 
            className="text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded px-2 py-1 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              deletePost();
            }}
          >
            Xóa
          </button>
        </div>
      )}
    </div>
  );
}