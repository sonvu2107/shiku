import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { UserPlus, UserMinus, UserCheck, Heart, Users, FileText, MessageCircle, Calendar } from "lucide-react";
import MessageButton from "../components/MessageButton";
import UserName from "../components/UserName";
import PostCard from "../components/PostCard";


/**
 * UserProfile - Trang profile của user khác
 * Hiển thị thông tin cá nhân, trạng thái bạn bè và các actions
 * @returns {JSX.Element} Component user profile page
 */
export default function UserProfile() {
  // ==================== ROUTER & NAVIGATION ====================
  
  const { userId } = useParams(); // ID của user từ URL
  const navigate = useNavigate();
  
  // ==================== STATE MANAGEMENT ====================
  
  // Profile data
  const [profile, setProfile] = useState(null); // Thông tin profile user
  const [loading, setLoading] = useState(true); // Loading state
  const [actionLoading, setActionLoading] = useState(false); // Loading khi thực hiện actions
  const [error, setError] = useState(""); // Error message
  
  // Tabs and content
  const [activeTab, setActiveTab] = useState('posts'); // Tab hiện tại đang active
  const [posts, setPosts] = useState([]); // Danh sách bài đăng
  const [postsLoading, setPostsLoading] = useState(false); // Loading posts
  const [postsError, setPostsError] = useState(""); // Error khi load posts

  useEffect(() => {
    loadProfile();
  }, [userId]);

  useEffect(() => {
    if (profile && activeTab === 'posts') {
      loadPosts();
    }
  }, [profile, activeTab]);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await api(`/api/users/${userId}`);

      // Map backend response sang friendshipStatus
      let friendshipStatus = "none";
      if (data.user.isFriend) {
        friendshipStatus = "friends";
      } else if (data.user.hasPendingRequest) {
        friendshipStatus =
          data.user.pendingRequestDirection === "sent"
            ? "request_sent"
            : "request_received";
      }

      setProfile({
        ...data,
        friendshipStatus,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Load danh sách bài đăng của user
   */
  async function loadPosts() {
    if (!profile?.user?._id) return;
    
    setPostsLoading(true);
    setPostsError("");
    
    try {
      const response = await api(`/api/posts?author=${profile.user._id}&limit=20`);
      setPosts(response.items || []);
    } catch (err) {
      // Silent handling for posts loading error
      setPostsError("Không thể tải bài đăng: " + err.message);
    } finally {
      setPostsLoading(false);
    }
  }


  async function sendFriendRequest() {
    try {
      setActionLoading(true);
      await api("/api/friends/send-request", {
        method: "POST",
        body: { to: userId },
      });
      await loadProfile();
      setError("");
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra khi gửi lời mời kết bạn");
    } finally {
      setActionLoading(false);
    }
  }

  async function acceptFriendRequest() {
    try {
      setActionLoading(true);
      await api(`/api/friends/accept/${userId}`, { method: "POST" });
      await loadProfile();
      setError("");
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra khi chấp nhận lời mời kết bạn");
    } finally {
      setActionLoading(false);
    }
  }

  async function declineFriendRequest() {
    try {
      setActionLoading(true);
      await api(`/api/friends/decline/${userId}`, { method: "POST" });
      await loadProfile();
      setError("");
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra khi từ chối lời mời kết bạn");
    } finally {
      setActionLoading(false);
    }
  }

  async function removeFriend() {
    try {
      setActionLoading(true);
      await api(`/api/friends/remove/${userId}`, { method: "DELETE" });
      await loadProfile();
      setError("");
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra khi bỏ kết bạn");
    } finally {
      setActionLoading(false);
    }
  }

  async function blockUser() {
    try {
      setActionLoading(true);
      await api(`/api/users/block/${userId}`, { method: "POST" });
      await loadProfile();
      setError("");
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra khi chặn người dùng");
    } finally {
      setActionLoading(false);
    }
  }

  async function unblockUser() {
    try {
      setActionLoading(true);
      await api(`/api/users/unblock/${userId}`, { method: "POST" });
      await loadProfile();
      setError("");
    } catch (error) {
      setError(error.message || "Có lỗi xảy ra khi bỏ chặn người dùng");
    } finally {
      setActionLoading(false);
    }
  }

  function renderFriendButton() {
    if (actionLoading) {
      return (
        <button disabled className="px-4 py-2 bg-gray-400 text-white rounded-lg flex items-center gap-2 text-sm">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Đang xử lý...
        </button>
      );
    }

    // Nếu người kia chặn mình
    if (profile.user?.theyBlockedMe) {
      return (
        <div className="text-red-600 text-sm">Người dùng này đã chặn bạn</div>
      );
    }

    // Nếu mình đã chặn họ
    if (profile.user?.iBlockedThem) {
      return (
        <button
          onClick={unblockUser}
          className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
        >
          Bỏ chặn
        </button>
      );
    }

    // Các trạng thái bạn bè khác
    switch (profile.friendshipStatus) {
      case "friends":
        return (
          <div className="flex flex-wrap gap-2">
            <MessageButton user={profile.user} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm" />
            <button
              onClick={removeFriend}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
            >
              <UserMinus className="w-4 h-4" />
              Bỏ kết bạn
            </button>
            <button
              onClick={blockUser}
              className="px-3 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
            >
              Chặn
            </button>
          </div>
        );
      case "request_sent":
        return (
          <div className="flex flex-wrap gap-2">
            <button disabled className="px-4 py-2 bg-gray-400 text-white rounded-lg text-sm">
              Đã gửi lời mời
            </button>
            <button
              onClick={blockUser}
              className="px-3 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
            >
              Chặn
            </button>
          </div>
        );
      case "request_received":
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={acceptFriendRequest}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
            >
              <UserCheck className="w-4 h-4" />
              Chấp nhận
            </button>
            <button
              onClick={declineFriendRequest}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 text-sm"
            >
              <UserMinus className="w-4 h-4" />
              Từ chối
            </button>
            <button
              onClick={blockUser}
              className="px-3 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
            >
              Chặn
            </button>
          </div>
        );
      default:
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={sendFriendRequest}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Kết bạn
            </button>
            <MessageButton user={profile.user} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm" />
            <button
              onClick={blockUser}
              className="px-3 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
            >
              Chặn
            </button>
          </div>
        );
    }
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
        <div className="animate-pulse">
          <div className="h-72 bg-gray-200"></div>
          <div className="relative -mt-20 px-6 pb-6">
            <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
            <div className="mt-4 h-6 bg-gray-200 rounded w-48"></div>
            <div className="mt-2 h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold mb-2">Không thể tải profile</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!profile?.user) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-semibold mb-2">Không tìm thấy người dùng</h2>
          <p className="text-gray-600 mb-4">Người dùng này có thể đã bị xóa hoặc không tồn tại</p>
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const user = profile.user;
  const roleIcons = {
    solo: "/assets/Sung-tick.png",
    sybau: "/assets/Sybau-tick.png",
    keeper: "/assets/moxumxue.png",
  };

  // Nếu bị block thì ẩn toàn bộ thông tin
  if (user?.theyBlockedMe) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-semibold mb-2">Bị chặn</h2>
          <p className="text-gray-600 mb-4">Người dùng này đã chặn bạn</p>
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* Cover Photo */}
      <div className="relative h-72 md:h-80 lg:h-96 group">
        {user.coverUrl ? (
          <img
            src={user.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full"
            style={{ backgroundColor: "#3b82f6" }}
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-20" />
      </div>

      {/* Profile Info */}
      <div className="relative -mt-8 md:-mt-20 px-4 md:px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Profile Header */}
            <div className="pt-16 md:pt-12 p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-3 md:gap-6">
                {/* Avatar */}
                <div className="relative -mt-12 md:-mt-28 z-20">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden">
                    <img
                      src={
                        user.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.name
                        )}&background=cccccc&color=222222&size=128`
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(user.name) +
                          "&background=cccccc&color=222222&size=128";
                      }}
                    />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                          <UserName user={user} />
                        </h1>
                        {user.role && roleIcons[user.role] && (
                          <img
                            src={roleIcons[user.role]}
                            alt={user.role}
                            className="w-6 h-6"
                          />
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">
                        {user.bio || "Chưa có tiểu sử"}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Tham gia {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                        {user.isOnline && (
                          <span className="flex items-center gap-1 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Đang hoạt động
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {renderFriendButton()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-1 md:space-x-8 px-2 md:px-6 overflow-x-auto scrollbar-hide">
              {[
                { id: "posts", label: "Bài đăng", icon: FileText, count: posts.length },
                { id: "friends", label: "Bạn bè", icon: Users, count: user.friends?.length || 0 }
              ].map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-3 md:px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors min-w-fit flex-shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{label}</span>
                  {count > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="min-h-[500px] p-4 md:p-6">
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div>
                {postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4">
                        <div className="animate-pulse">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : postsError ? (
                  <div className="text-center py-12">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Có lỗi xảy ra</h3>
                    <p className="text-gray-500 mb-4">{postsError}</p>
                    <button
                      onClick={loadPosts}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard key={post._id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                      <FileText className="w-10 h-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có bài đăng</h3>
                    <p className="text-gray-500 text-base">Người dùng này chưa có bài đăng nào</p>
                  </div>
                )}
              </div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Bạn bè</h3>
                  <p className="text-sm text-gray-500">
                    {user.friends?.length || 0} người bạn
                  </p>
                </div>
                
                {/* Check privacy setting */}
                {user.showFriends === false ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                      <Users className="w-10 h-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Danh sách bạn bè riêng tư</h3>
                    <p className="text-gray-500 text-base">Chỉ người dùng này mới có thể xem danh sách bạn bè</p>
                  </div>
                ) : user.friends && user.friends.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {user.friends.map(friend => (
                      <div key={friend._id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => navigate(`/user/${friend._id}`)}>
                        <div className="flex items-center space-x-3">
                          <img
                            src={friend.avatarUrl || "/assets/admin.jpg"}
                            alt={friend.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {friend.name}
                            </p>
                            {friend.role && (
                              <p className="text-xs text-gray-500 capitalize">
                                {friend.role}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                      <Users className="w-10 h-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có bạn bè</h3>
                    <p className="text-gray-500 text-base">Người dùng này chưa có bạn bè nào</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {error}
        </div>
      )}
    </div>
  );
}