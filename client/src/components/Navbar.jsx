import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api";
import { removeAuthToken } from "../utils/auth";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import { 
  Crown, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus,
  Search,
  Users,
  MessageCircle
} from "lucide-react";
import ChatDropdown from "./ChatDropdown";
import ChatPopup from "./ChatPopup";

export default function Navbar({ user, setUser }) {
  const [openPopups, setOpenPopups] = useState([]);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPosts, setSearchPosts] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Load pending friend requests count
  useEffect(() => {
    if (user) {
      loadPendingRequests();
    }
  }, [user]);

  async function loadPendingRequests() {
    try {
      const data = await api("/api/friends/requests");
      setPendingRequests(data.requests?.length || 0);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery && trimmedQuery.length <= 100) {
      setSearchLoading(true);
      try {
        // Tìm user
        const userRes = await api(`/api/users/search?q=${encodeURIComponent(trimmedQuery)}`);
        setSearchResults(userRes.users || []);
  // Tìm bài viết
  const postRes = await api(`/api/posts?q=${encodeURIComponent(trimmedQuery)}`);
  setSearchPosts(postRes.items || []);
      } catch (err) {
        setSearchResults([]);
        setSearchPosts([]);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
      setSearchPosts([]);
    }
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    removeAuthToken(); 
    if (setUser) setUser(null);
    navigate("/");
  }

  return (
  <div className="bg-white border-b fixed top-0 left-0 w-full z-50 shadow">
      <div className="w-full max-w-none px-6 py-3 flex items-center justify-between">
        {/* Left side - Logo + Search */}
        <div className="flex items-center gap-4">
          <Link to="/" className="font-bold text-xl flex items-center gap-2">
            <span onClick={() => { navigate('/'); window.scrollTo({top:0,behavior:'smooth'}); }} style={{cursor:'pointer',display:'flex',alignItems:'center'}}>
              <Logo size="small" />
            </span>
          </Link>
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative hidden md:flex items-center gap-2">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={100}
                className="pl-10 pr-4 py-2 w-56 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200"
                autoComplete="off"
              />
              {/* Dropdown kết quả tìm kiếm */}
              {searchQuery.trim() && (
                (searchResults.length > 0 || searchPosts.length > 0) && (
                  <div className="absolute left-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {/* Kết quả user */}
                    {searchResults.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs text-gray-500">Người dùng</div>
                        {searchResults.map(user => (
                          <div
                            key={user._id}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => navigate(`/user/${user._id}`)}
                          >
                            <img
                              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                              alt={user.name}
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{user.name}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {/* Kết quả bài viết: chỉ hiện nếu không có user nào khớp */}
                    {searchResults.length === 0 && searchPosts.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs text-gray-500">Bài viết</div>
                        {searchPosts.map(post => (
                          <div
                            key={post._id}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => navigate(`/post/${post.slug || post._id}`)}
                          >
                            <img
                              src={post.coverUrl || '/default-avatar.png'}
                              alt={post.title}
                              className="w-8 h-8 rounded"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{post.title}</div>
                              <div className="text-xs text-gray-500">{post.author?.name || ''}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {searchLoading && (
                      <div className="px-4 py-2 text-gray-500">Đang tìm kiếm...</div>
                    )}
                  </div>
                )
              )}
            </div>
            <button 
              type="submit"
              className="btn flex items-center gap-2 px-3 py-2"
            >
              <Search size={18} />
              Tìm
            </button>
          </form>
        </div>

        {/* Right side - Navigation */}
        <div className="flex items-center gap-3">
          {/* Mobile search button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden btn-outline p-2"
          >
            <Search size={18} />
          </button>
          
          {user ? (
            <>
              <Link to="/friends" className="btn-outline flex items-center gap-2 relative">
                <Users size={18} />
                <span className="hidden sm:block">Bạn bè</span>
                {pendingRequests > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingRequests}
                  </span>
                )}
              </Link>
              <ChatDropdown onOpenChat={(conv) => {
                setOpenPopups(prev => {
                  // Nếu đã mở rồi thì đưa lên cuối
                  const exists = prev.find(p => p._id === conv._id);
                  let newPopups = exists ? prev.filter(p => p._id !== conv._id) : [...prev];
                  newPopups.push(conv);
                  // Giới hạn tối đa 2 popup
                  if (newPopups.length > 2) newPopups = newPopups.slice(1);
                  return newPopups;
                });
              }} />
              <NotificationBell user={user} />
              <div className="relative">
                <button
                  className="flex items-center gap-2 focus:outline-none"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <img
                    src={user.avatarUrl || `https://ui-avatars.io/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                    alt={user.name}
                    className="w-9 h-9 rounded-full border border-gray-300 shadow-sm"
                  />
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-3">
                    <div className="px-5 pb-3 border-b">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl || `https://ui-avatars.io/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                          alt={user.name}
                          className="w-12 h-12 rounded-full border"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <Link to={`/profile`} className="text-dark-600 text-sm hover:underline" onClick={()=>setShowProfileMenu(false)}>Xem tất cả trang cá nhân</Link>
                        </div>
                      </div>
                    </div>
                    <div className="py-2">
                      {user.role === "admin" && (
                        <Link to="/admin" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-red-600" onClick={()=>setShowProfileMenu(false)}>
                          <Crown size={18} />
                          Admin
                        </Link>
                      )}
                      <Link to="/settings" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50" onClick={()=>setShowProfileMenu(false)}>
                        <User size={18} />
                        Cài đặt & quyền riêng tư
                      </Link>
                      <Link to="/support" className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50" onClick={()=>setShowProfileMenu(false)}>
                        <MessageCircle size={18} />
                        Trợ giúp & hỗ trợ
                      </Link>
                      <button onClick={()=>{setShowProfileMenu(false);logout();}} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 w-full text-left">
                        <LogOut size={18} />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-outline flex items-center gap-2">
                <LogIn size={18} />
                Đăng nhập
              </Link>
              <Link to="/register" className="btn flex items-center gap-2">
                <UserPlus size={18} />
                Đăng ký
              </Link>
            </>
          )}
        </div>
        {/* Popup chat Messenger */}
        {openPopups.map((conv, idx) => (
          <div style={{ position: 'fixed', bottom: 16, right: 16 + idx * 340, zIndex: 100 + idx }}>
            <ChatPopup
              key={conv._id}
              conversation={conv}
              onClose={() => setOpenPopups(popups => popups.filter(p => p._id !== conv._id))}
            />
          </div>
        ))}
      </div>
      
      {/* Mobile search bar */}
      {showMobileSearch && (
        <div className="md:hidden border-t bg-white px-6 py-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200"
                autoFocus
              />
            </div>
            <button 
              type="submit"
              className="btn flex items-center gap-2 px-3 py-2"
            >
              <Search size={18} />
              Tìm
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
