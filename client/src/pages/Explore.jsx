import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Search, Users, Calendar, Image, MessageCircle, Heart, MessageSquare, Hash } from "lucide-react";
import UserName from "../components/UserName";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";

/**
 * Explore - Trang khám phá nội dung
 * Hiển thị các bài viết, người dùng, nhóm được đề xuất
 */
export default function Explore({ user }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Lấy query từ URL nếu có
    const queryFromUrl = searchParams.get('q');
    if (queryFromUrl) {
      setSearchQuery(queryFromUrl);
      performSearch(queryFromUrl);
    } else {
      loadExploreData();
    }
  }, [searchParams]);

  const performSearch = async (query) => {
    if (!query.trim()) {
      loadExploreData();
      return;
    }

    setLoading(true);
    try {
      // Search posts
      const postsRes = await api(`/api/posts?q=${encodeURIComponent(query)}&limit=50`);
      setPosts(postsRes.items || []);

      // Search users
      const usersRes = await api(`/api/users/search?q=${encodeURIComponent(query)}`);
      setUsers(usersRes.users || []);

      // Search groups
      const groupsRes = await api(`/api/groups?search=${encodeURIComponent(query)}&limit=20`);
      setGroups(groupsRes.data?.groups || []);
    } catch (error) {
      // Fallback to empty arrays if search fails
      setPosts([]);
      setUsers([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExploreData = async () => {
    setLoading(true);
    try {
      // Load posts - sử dụng API thực
      const postsRes = await api("/api/posts?limit=50");
      setPosts(postsRes.items || []);

      // Load users - sử dụng API search với query rỗng để lấy tất cả
      const usersRes = await api("/api/users/search?q=");
      setUsers(usersRes.users || []);

      // Load groups - sử dụng API groups thực
      const groupsRes = await api("/api/groups?limit=20");
      setGroups(groupsRes.data?.groups || []);

      // Load trending tags
      loadTrendingTags(postsRes.items || []);
    } catch (error) {
      // Fallback to empty arrays if API fails
      setPosts([]);
      setUsers([]);
      setGroups([]);
      setTrendingTags([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingTags = (postsData) => {
    try {
      // Đếm tần suất xuất hiện của mỗi tag
      const tagCount = {};
      postsData?.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach(tag => {
            if (tag && tag.trim()) {
              const normalizedTag = tag.trim().toLowerCase();
              tagCount[normalizedTag] = (tagCount[normalizedTag] || 0) + 1;
            }
          });
        }
      });

      // Chuyển thành array và sắp xếp theo tần suất
      const sortedTags = Object.entries(tagCount)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // Top 20 tags

      setTrendingTags(sortedTags);
    } catch (error) {
      setTrendingTags([]);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const tabs = [
    { id: "posts", label: "Bài viết", icon: MessageSquare },
    { id: "users", label: "Người dùng", icon: Users },
    { id: "groups", label: "Nhóm", icon: Users },
    { id: "tags", label: "Tag xu hướng", icon: Hash },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 sm:pt-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Khám phá</h1>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, người dùng, nhóm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            />
          </form>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto scrollbar-hide transition-colors duration-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-md transition-all duration-200 whitespace-nowrap flex-shrink-0 touch-target ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-sm sm:text-base">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Posts Tab */}
            {activeTab === "posts" && (
              <div className="space-y-3 sm:space-y-4">
                {posts.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-500">
                    <MessageSquare size={40} className="mx-auto mb-3 sm:mb-4 text-gray-300" />
                    <p className="text-sm sm:text-base">Không có bài viết nào để hiển thị</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post._id} className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <img
                          src={getUserAvatarUrl(post.author, AVATAR_SIZES.MEDIUM)}
                          alt={post.author?.name}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                            <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              <UserName user={post.author} maxLength={20} />
                            </span>
                            <span className="text-gray-500 text-xs sm:text-sm hidden sm:inline">•</span>
                            <span className="text-gray-500 text-xs sm:text-sm">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                            <Link to={`/post/${post.slug || post._id}`} className="hover:text-blue-600">
                              {post.title}
                            </Link>
                          </h3>
                          <p className="text-gray-600 mb-3 sm:mb-4 line-clamp-3 text-sm sm:text-base">{post.content}</p>
                          <div className="flex items-center gap-3 sm:gap-4 text-gray-500">
                            <button className="flex items-center gap-1 hover:text-red-500 touch-target">
                              <Heart size={14} />
                              <span className="text-xs sm:text-sm">{post.emotes?.length || 0}</span>
                            </button>
                            <button className="flex items-center gap-1 hover:text-blue-500 touch-target">
                              <MessageCircle size={14} />
                              <span className="text-xs sm:text-sm">{post.commentCount || 0}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {users.length === 0 ? (
                  <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                    <Users size={40} className="mx-auto mb-3 sm:mb-4 text-gray-300" />
                    <p className="text-sm sm:text-base">Không có người dùng nào để hiển thị</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user._id} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getUserAvatarUrl(user, AVATAR_SIZES.MEDIUM)}
                          alt={user.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            <UserName user={user} maxLength={20} />
                          </h3>
                          <p className="text-gray-500 text-xs sm:text-sm truncate">{user.email}</p>
                        </div>
                        <Link
                          to={`/user/${user._id}`}
                          className="btn-outline text-xs sm:text-sm px-2 sm:px-3 py-1 whitespace-nowrap touch-target"
                        >
                          Xem
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Groups Tab */}
            {activeTab === "groups" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {groups.length === 0 ? (
                  <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                    <Users size={40} className="mx-auto mb-3 sm:mb-4 text-gray-300" />
                    <p className="text-sm sm:text-base">Không có nhóm nào để hiển thị</p>
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group._id} className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={group.avatar || group.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&length=2&background=cccccc&color=222222`}
                          alt={group.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{group.name}</h3>
                          <p className="text-gray-500 text-xs sm:text-sm">{group.members?.length || 0} thành viên</p>
                        </div>
                        <Link
                          to={`/groups/${group._id}`}
                          className="btn-outline text-xs sm:text-sm px-2 sm:px-3 py-1 whitespace-nowrap touch-target"
                        >
                          Xem
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tags Tab */}
            {activeTab === "tags" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                {trendingTags.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
                    <Hash size={40} className="mx-auto mb-3 sm:mb-4 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm sm:text-base">Chưa có tag nào</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {trendingTags.map(({ tag, count }, index) => (
                      <div
                        key={tag}
                        onClick={() => navigate(`/explore?q=${encodeURIComponent(tag)}`)}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md cursor-pointer transition-all group bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{index + 1}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Hash size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                                {tag}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {count} bài viết
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
