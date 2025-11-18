import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Search, Users, Calendar, Image, MessageCircle, Heart, MessageSquare, Hash } from "lucide-react";
import UserName from "../components/UserName";
import { getUserAvatarUrl, AVATAR_SIZES } from "../utils/avatarUtils";
import { useSEO } from "../utils/useSEO";

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

  // ==================== SEO ====================
  // Trang khám phá là public → index, follow
  useSEO({
    title: searchQuery ? `Tìm kiếm "${searchQuery}" - Shiku` : "Khám phá - Shiku",
    description: "Khám phá bài viết, người dùng, nhóm và sự kiện thú vị trên Shiku",
    robots: "index, follow",
    canonical: "https://shiku.click/explore"
  });

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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, người dùng, nhóm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                        focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent 
                        outline-none text-sm sm:text-base bg-white dark:bg-gray-800 
                        text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 
                        shadow-sm dark:shadow-gray-900/50 transition-all duration-200
                        hover:border-gray-400 dark:hover:border-gray-500"
            />
          </form>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 divide-x divide-gray-200 dark:divide-gray-700 transition-colors duration-200">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 px-1.5 sm:px-2 md:px-4 py-2 sm:py-2.5 md:py-3 transition-all duration-200 whitespace-nowrap relative touch-target font-medium text-[10px] sm:text-xs md:text-sm lg:text-base ${
                      activeTab === tab.id
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/30"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <Icon size={14} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="truncate">{tab.label}</span>
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Đang tải...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Posts Tab */}
            {activeTab === "posts" && (
              <div className="space-y-3 sm:space-y-4">
                {posts.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center py-12 sm:py-16">
                    <MessageSquare size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600 opacity-60" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Không có bài viết nào để hiển thị</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-200">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <Link to={`/user/${post.author?._id}`} className="flex-shrink-0">
                          <img
                            src={getUserAvatarUrl(post.author, AVATAR_SIZES.MEDIUM)}
                            alt={post.author?.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                            <Link to={`/user/${post.author?._id}`} className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <UserName user={post.author} maxLength={20} />
                            </Link>
                            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm hidden sm:inline">•</span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                              {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                            <Link to={`/post/${post.slug || post._id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              {post.title}
                            </Link>
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 line-clamp-3 text-sm sm:text-base">{post.content}</p>
                          <div className="flex items-center gap-4 sm:gap-6 text-gray-500 dark:text-gray-400">
                            <button className="flex items-center gap-1.5 hover:text-red-500 dark:hover:text-red-400 touch-target transition-colors">
                              <Heart size={16} className="sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm font-medium">{post.emotes?.length || 0}</span>
                            </button>
                            <button className="flex items-center gap-1.5 hover:text-blue-500 dark:hover:text-blue-400 touch-target transition-colors">
                              <MessageCircle size={16} className="sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm font-medium">{post.commentCount || 0}</span>
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
                  <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center py-12 sm:py-16">
                    <Users size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600 opacity-60" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Không có người dùng nào để hiển thị</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <Link to={`/user/${user._id}`} className="flex-shrink-0">
                          <img
                            src={getUserAvatarUrl(user, AVATAR_SIZES.MEDIUM)}
                            alt={user.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/user/${user._id}`}>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <UserName user={user} maxLength={20} />
                            </h3>
                          </Link>
                          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm truncate">{user.email}</p>
                        </div>
                        <Link
                          to={`/user/${user._id}`}
                          className="btn-outline text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap touch-target border-gray-800 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                  <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center py-12 sm:py-16">
                    <Users size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600 opacity-60" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Không có nhóm nào để hiển thị</p>
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <Link to={`/groups/${group._id}`} className="flex-shrink-0">
                          <img
                            src={group.avatar || group.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&length=2&background=cccccc&color=222222`}
                            alt={group.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/groups/${group._id}`}>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{group.name}</h3>
                          </Link>
                          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{group.members?.length || 0} thành viên</p>
                        </div>
                        <Link
                          to={`/groups/${group._id}`}
                          className="btn-outline text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap touch-target border-gray-800 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
