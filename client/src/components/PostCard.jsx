import { Link, useNavigate } from "react-router-dom";
import { User, Calendar, Eye, Heart, MessageCircle, Tag, Lock, Globe } from "lucide-react";
import { api } from "../api";

export default function PostCard({ post }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

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
          {post.author?.name}
        </Link>
        <span className="flex items-center gap-1">
          <Calendar size={14} />
          {new Date(post.createdAt).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={14} />
          {post.views || 0}
        </span>
        {post.emotes && post.emotes.length > 0 && (
          <span className="flex items-center gap-1">
            <Heart size={14} />
            {post.emotes.length}
          </span>
        )}
      </div>
      {post.tags && post.tags.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Tag size={12} />
          {post.tags.map(t => <span key={t} className="mr-2">#{t}</span>)}
        </div>
      )}
      
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
