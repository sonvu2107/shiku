// Import các dependencies cần thiết
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api";
import { removeAuthToken } from "../utils/auth";

// Import các components
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import ChatDropdown from "./ChatDropdown";
import ChatPopup from "./ChatPopup";
import { ChatPopupWithCallModal } from "./ChatPopup";
import MobileMenu from "./MobileMenu";
import UserName from "./UserName";

// Import icons từ Lucide React
import { 
  Crown,        // Icon admin
  User,         // Icon user
  LogOut,       // Icon đăng xuất
  LogIn,        // Icon đăng nhập
  UserPlus,     // Icon đăng ký
  Search,       // Icon tìm kiếm
  X,            // Icon đóng
  Users,        // Icon bạn bè
  MessageCircle, // Icon tin nhắn/support
  UserCheck     // Icon groups
} from "lucide-react";

/**
 * Navbar - Component thanh điều hướng chính của ứng dụng
 * Bao gồm logo, search, navigation links, user menu, chat popups
 * @param {Object} user - Thông tin user hiện tại (null nếu chưa đăng nhập)
 * @param {Function} setUser - Function để cập nhật user state
 */
export default function Navbar({ user, setUser }) {
  // ==================== STATE MANAGEMENT ====================
  const [openPopups, setOpenPopups] = useState([]); // Chat popups đang mở
  const navigate = useNavigate();
  
  // Search states
  const [searchQuery, setSearchQuery] = useState(""); // Query tìm kiếm
  const [showMobileSearch, setShowMobileSearch] = useState(false); // Hiện search mobile
  const [searchResults, setSearchResults] = useState([]); // Kết quả search users
  const [searchLoading, setSearchLoading] = useState(false); // Loading state
  const [searchPosts, setSearchPosts] = useState([]); // Kết quả search posts
  
  // UI states
  const [pendingRequests, setPendingRequests] = useState(0); // Số lời mời kết bạn
  const [showProfileMenu, setShowProfileMenu] = useState(false); // Menu profile dropdown

  // ==================== EFFECTS ====================
  
  /**
   * Load số lượng friend requests đang chờ khi user đăng nhập
   */
  useEffect(() => {
    if (user) {
      loadPendingRequests();
    }
  }, [user]);

  /**
   * Lấy số lượng friend requests đang chờ phê duyệt
   */
  async function loadPendingRequests() {
    try {
      const data = await api("/api/friends/requests");
      setPendingRequests(data.requests?.length || 0);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    }
  }

  // ==================== HANDLERS ====================
  
  /**
   * Xử lý tìm kiếm users và posts
   * @param {Event} e - Form submit event
   */
  async function handleSearch(e) {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    
    if (trimmedQuery && trimmedQuery.length <= 100) {
      setSearchLoading(true);
      try {
        // Tìm users
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
      // Reset kết quả nếu query không hợp lệ
      setSearchResults([]);
      setSearchPosts([]);
    }
  }

  /**
   * Xử lý đăng xuất user
   */
  async function logout() {
    try {
      // Gọi API logout để invalidate session trên server
      await api("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    
    // Xóa token khỏi localStorage
    removeAuthToken(); 
    // Reset user state
    if (setUser) setUser(null);
    // Redirect về trang chủ
    navigate("/");
  }

  // ==================== RENDER ====================
  
  return (
    // Main navbar container - fixed top với shadow
    <div className="bg-white border-b fixed top-0 left-0 w-full z-50 shadow navbar-mobile">
      <div className="w-full max-w-none px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
        {/* Left side - Logo + Search */}
        <div className="flex items-center gap-4">
          <Link to="/" className="font-bold text-xl flex items-center gap-2">
            <span onClick={() => { navigate('/'); window.scrollTo({top:0,behavior:'smooth'}); }} style={{cursor:'pointer',display:'flex',alignItems:'center'}}>
              <Logo size="small" />
            </span>
          </Link>
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative hidden md:flex items-center gap-2 search-container">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                maxLength={100}
                className="pl-10 pr-4 py-2 w-56 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all duration-200"
                autoComplete="off"
              />
              {/* Dropdown kết quả tìm kiếm */}
              {searchQuery.trim() && (
                (searchResults.length > 0 || searchPosts.length > 0) && (
                  <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto dropdown-mobile">
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
              Tìm
            </button>
          </form>
        </div>

        {/* Right side - Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Menu */}
          <MobileMenu user={user} setUser={setUser} />
          
          {/* Mobile search button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden btn-outline p-2 touch-target mobile-search"
            title="Tìm kiếm"
          >
            <Search size={16} />
          </button>
          
          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-3">
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
                <Link to="/groups" className="btn-outline flex items-center gap-2">
                  <UserCheck size={18} />
                  <span className="hidden sm:block">Nhóm</span>
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
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-3 dropdown-mobile">
                      <div className="px-5 pb-3 border-b">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl || `https://ui-avatars.io/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                            alt={user.name}
                            className="w-12 h-12 rounded-full border"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">
                              <UserName user={user} maxLength={15} />
                            </div>
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
        </div>
        {/* Popup chat Messenger */}
        {openPopups.map((conv, idx) => (
          <div key={conv._id || idx} style={{ position: 'fixed', bottom: 16, right: 16 + idx * 340, zIndex: 100 + idx }}>
            <ChatPopupWithCallModal
              conversation={conv}
              onClose={() => setOpenPopups(popups => popups.filter(p => p._id !== conv._id))}
            />
          </div>
        ))}
      </div>
      
      {/* Mobile search bar */}
      {showMobileSearch && (
        <div className="md:hidden border-t bg-white px-3 sm:px-6 py-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Tìm kiếm người dùng, bài viết..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm"
                autoFocus
              />
              {/* Mobile search results dropdown */}
              {searchQuery.trim() && (
                (searchResults.length > 0 || searchPosts.length > 0) && (
                  <div className="absolute left-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto mobile-search-dropdown">
                    {/* Kết quả user */}
                    {searchResults.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 font-medium">Người dùng</div>
                        {searchResults.map(user => (
                          <div
                            key={user._id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 cursor-pointer touch-target border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              navigate(`/user/${user._id}`);
                              setShowMobileSearch(false);
                              setSearchQuery("");
                            }}
                          >
                            <img
                              src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                              alt={user.name}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{user.name}</div>
                              <div className="text-xs text-gray-500 truncate">{user.email}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {/* Kết quả bài viết: chỉ hiện nếu không có user nào khớp */}
                    {searchResults.length === 0 && searchPosts.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 font-medium">Bài viết</div>
                        {searchPosts.map(post => (
                          <div
                            key={post._id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 cursor-pointer touch-target border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              navigate(`/post/${post.slug || post._id}`);
                              setShowMobileSearch(false);
                              setSearchQuery("");
                            }}
                          >
                            <img
                              src={post.coverUrl || '/default-avatar.png'}
                              alt={post.title}
                              className="w-8 h-8 rounded flex-shrink-0 object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{post.title}</div>
                              <div className="text-xs text-gray-500 truncate">{post.author?.name || ''}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {searchLoading && (
                      <div className="px-3 py-4 text-center text-gray-500 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        Đang tìm kiếm...
                      </div>
                    )}
                    {searchQuery.trim() && searchResults.length === 0 && searchPosts.length === 0 && !searchLoading && (
                      <div className="px-3 py-4 text-center text-gray-500 text-sm">
                        Không tìm thấy kết quả nào
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
            <button 
              type="submit"
              className="btn flex items-center gap-1 sm:gap-2 px-3 py-2.5 text-sm touch-target"
            >
              <Search size={16} />
              <span className="hidden sm:inline">Tìm</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMobileSearch(false)}
              className="btn-outline p-2.5 touch-target"
              title="Đóng tìm kiếm"
            >
              <X size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
