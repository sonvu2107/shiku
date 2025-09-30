import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  UserPlus,
  UserMinus,
  UserCheck,
  Heart,
  Users,
  FileText,
  MessageCircle,
  Calendar,
  MapPin,
  Globe,
  Phone,
  Mail,
} from "lucide-react";
import MessageButton from "../components/MessageButton";
import UserName from "../components/UserName";
import PostCard from "../components/PostCard";

/**
 * UserProfile - Trang profile của user khác
 * Hiển thị thông tin cá nhân, trạng thái bạn bè và các actions
 */
export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");

  useEffect(() => {
    loadProfile();
  }, [userId]);

  useEffect(() => {
    if (profile && activeTab === "posts") {
      loadPosts();
    }
  }, [profile, activeTab]);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await api(`/api/users/${userId}`);

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

  async function loadPosts() {
    if (!profile?.user?._id) return;

    setPostsLoading(true);
    setPostsError("");

    try {
      const response = await api(`/api/posts?author=${profile.user._id}&limit=20`);
      setPosts(response.items || []);
    } catch (err) {
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

    if (profile.user?.theyBlockedMe) {
      return <div className="text-red-600 text-sm">Người dùng này đã chặn bạn</div>;
    }

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

    switch (profile.friendshipStatus) {
      case "friends":
        return (
          <div className="flex flex-wrap gap-2">
            <MessageButton
              user={profile.user}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
              style={{backgroundColor: '#000', color: '#fff'}}
            />
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
            <MessageButton
              user={profile.user}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
            />
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
    return <div className="w-full min-h-screen bg-gray-100 animate-pulse" />;
  }

  if (error) {
    return <div className="w-full min-h-screen flex items-center justify-center">{error}</div>;
  }

  if (!profile?.user) {
    return <div className="w-full min-h-screen flex items-center justify-center">Không tìm thấy người dùng</div>;
  }

  const user = profile.user;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Cover */}
      <div className="relative h-72 md:h-80 lg:h-96 group">
        {user.coverUrl ? (
          <img src={user.coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-blue-500" />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-20" />
      </div>

      {/* Profile Info */}
      <div className="relative -mt-8 md:-mt-20 px-4 md:px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="pt-12 md:pt-8 p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
                {/* Avatar */}
                <div className="relative -mt-12 md:-mt-28 flex-shrink-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden">
                    <img
                      src={
                        user.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&length=2&background=cccccc&color=222222&size=128`
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 break-words">
                          <UserName user={user} />
                        </h1>
                      </div>

                      {/* Contact Info */}
                      <div className="mt-3">
                        {(() => {
                          const hasContactInfo = (
                            (user.showEmail !== false && user.email) ||
                            (user.showPhone !== false && user.phone) ||
                            (user.showLocation !== false && user.location) ||
                            (user.showWebsite !== false && user.website) ||
                            (user.showBirthday !== false && user.birthday) ||
                            (user.showHobbies !== false && user.hobbies)
                          );
                          
                          if (!hasContactInfo) {
                            return (
                              <div className="bg-gray-50 rounded-lg p-3 text-center mb-3">
                                <p className="text-gray-500 text-sm">Chưa có thông tin liên hệ</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-2 text-sm text-gray-700 mb-2">
                              {user.showEmail !== false && user.email && (
                                <div className="flex items-center min-w-0 gap-2 py-0.5">
                                  <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="truncate">{user.email}</span>
                                </div>
                              )}
                              {user.showPhone !== false && user.phone && (
                                <div className="flex items-center min-w-0 gap-2 py-0.5">
                                  <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="truncate">{user.phone}</span>
                                </div>
                              )}
                              {user.showLocation !== false && user.location && (
                                <div className="flex items-center min-w-0 gap-2 py-0.5">
                                  <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="truncate">{user.location}</span>
                                </div>
                              )}
                              {user.showWebsite !== false && user.website && (
                                <div className="flex items-center min-w-0 gap-2 py-0.5">
                                  <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate leading-tight block">
                                    {user.website}
                                  </a>
                                </div>
                              )}
                              {user.showBirthday !== false && user.birthday && (
                                <div className="flex items-center min-w-0 gap-2 py-0.5">
                                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="truncate">{new Date(user.birthday).toISOString().slice(0, 10)}</span>
                                </div>
                              )}
                              {user.showHobbies !== false && user.hobbies && (
                                <div className="flex items-center min-w-0 gap-2 py-0.5">
                                  <Heart className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="truncate">{user.hobbies}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {user.showJoinDate === false ? null : (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Tham gia {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                        {user.isOnline && (
                          <span className="flex items-center gap-1 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            Đang hoạt động
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">{renderFriendButton()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-1 md:space-x-8 px-2 md:px-6 overflow-x-auto">
              {[
                ...(user.showPosts === false ? [] : [{ id: "posts", label: "Bài đăng", icon: FileText, count: posts.length }]),
                { id: "friends", label: "Bạn bè", icon: Users, count: user.friends?.length || 0 },
              ].map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`${
                    activeTab === id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-3 md:px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
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

          {/* Content */}
          <div className="min-h-[500px] p-4 md:p-6">
            {activeTab === "posts" && (
              <div>
                {user.showPosts === false ? (
                  <div className="text-center py-16 text-gray-500">Bài đăng đã được đặt ở chế độ riêng tư</div>
                ) : postsLoading ? (
                  <div>Đang tải bài đăng...</div>
                ) : postsError ? (
                  <div className="text-red-600">{postsError}</div>
                ) : posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard key={post._id} post={post} hidePublicIcon={true} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">Chưa có bài đăng</div>
                )}
              </div>
            )}

            {activeTab === 'friends' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Bạn bè</h3>
                  <p className="text-sm text-gray-500">{user.friends?.length || 0} người bạn</p>
                </div>

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
                      <div key={friend._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-3">
                          {/* Avatar */}
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                              {friend.avatarUrl ? (
                                <img
                                  src={friend.avatarUrl}
                                  alt={friend.name || 'Avatar'}
                                  className="w-full h-full object-cover"
                                  onError={e => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-full h-full flex items-center justify-center text-gray-600 font-medium text-lg ${
                                  friend.avatarUrl ? 'hidden' : 'flex'
                                }`}
                              >
                                {friend.name ? friend.name.charAt(0).toUpperCase() : '?'}
                              </div>
                            </div>
                            {/* Chấm online/offline */}
                            <div
                              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                            />
                          </div>

                          {/* Friend Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{friend.name || 'Người dùng'}</h4>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => navigate(`/user/${friend._id}`)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Xem profile"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/chat?user=${friend._id}`)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Nhắn tin"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
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
    </div>
  );
}
