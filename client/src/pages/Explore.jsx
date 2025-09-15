import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Search, Users, Calendar, Image, MessageCircle, Heart, MessageSquare } from "lucide-react";

/**
 * Explore - Trang khám phá nội dung
 * Hiển thị các bài viết, người dùng, nhóm được đề xuất
 */
export default function Explore() {
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadExploreData();
  }, []);

  const loadExploreData = async () => {
    setLoading(true);
    try {
      // Load posts - sử dụng API thực
      const postsRes = await api("/api/posts?limit=20");
      setPosts(postsRes.items || []);

      // Load users - sử dụng API search với query rỗng để lấy tất cả
      const usersRes = await api("/api/users/search?q=");
      setUsers(usersRes.users || []);

      // Load groups - sử dụng API groups thực
      const groupsRes = await api("/api/groups?limit=20");
      setGroups(groupsRes.data?.groups || []);
    } catch (error) {
      console.error("Error loading explore data:", error);
      // Fallback to empty arrays if API fails
      setPosts([]);
      setUsers([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadExploreData();
      return;
    }

    setLoading(true);
    try {
      // Search posts
      const postsRes = await api(`/api/posts?q=${encodeURIComponent(searchQuery)}&limit=20`);
      setPosts(postsRes.items || []);

      // Search users
      const usersRes = await api(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      setUsers(usersRes.users || []);

      // Search groups
      const groupsRes = await api(`/api/groups?search=${encodeURIComponent(searchQuery)}&limit=20`);
      setGroups(groupsRes.data?.groups || []);
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to empty arrays if search fails
      setPosts([]);
      setUsers([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "posts", label: "Bài viết", icon: MessageSquare },
    { id: "users", label: "Người dùng", icon: Users },
    { id: "groups", label: "Nhóm", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Khám phá</h1>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết, người dùng, nhóm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </form>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
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
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Không có bài viết nào để hiển thị</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post._id} className="bg-white rounded-lg shadow-sm border p-6">
                      <div className="flex items-start gap-4">
                        <img
                          src={post.author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || '')}&background=3b82f6&color=ffffff`}
                          alt={post.author?.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">{post.author?.name}</span>
                            <span className="text-gray-500 text-sm">•</span>
                            <span className="text-gray-500 text-sm">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            <Link to={`/post/${post.slug || post._id}`} className="hover:text-blue-600">
                              {post.title}
                            </Link>
                          </h3>
                          <p className="text-gray-600 mb-4 line-clamp-3">{post.content}</p>
                          <div className="flex items-center gap-4 text-gray-500">
                            <button className="flex items-center gap-1 hover:text-red-500">
                              <Heart size={16} />
                              <span>{post.likes?.length || 0}</span>
                            </button>
                            <button className="flex items-center gap-1 hover:text-blue-500">
                              <MessageCircle size={16} />
                              <span>{post.comments?.length || 0}</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Không có người dùng nào để hiển thị</p>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user._id} className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=ffffff`}
                          alt={user.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <p className="text-gray-500 text-sm">{user.email}</p>
                        </div>
                        <Link
                          to={`/user/${user._id}`}
                          className="btn-outline text-sm px-3 py-1"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Không có nhóm nào để hiển thị</p>
                  </div>
                ) : (
                  groups.map((group) => (
                    <div key={group._id} className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={group.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=3b82f6&color=ffffff`}
                          alt={group.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{group.name}</h3>
                          <p className="text-gray-500 text-sm">{group.members?.length || 0} thành viên</p>
                        </div>
                        <Link
                          to={`/groups/${group._id}`}
                          className="btn-outline text-sm px-3 py-1"
                        >
                          Xem
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
