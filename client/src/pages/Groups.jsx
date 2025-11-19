import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Users,
  MapPin,
  Calendar,
  TrendingUp,
  Star
} from 'lucide-react';
import GroupCard from '../components/GroupCard';
import { api } from '../api';
import { useSEO } from '../utils/useSEO';
/**
 * Groups Page - Trang quản lý và khám phá nhóm/communities
 * Bao gồm tìm kiếm, lọc, hiển thị danh sách nhóm và các chức năng quản lý
 */
const Groups = () => {
  // State cho danh sách nhóm
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);

  // State cho tìm kiếm và lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [groupType, setGroupType] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // grid hoặc list

  // State cho tab hiện tại
  const [activeTab, setActiveTab] = useState('discover'); // khám phá, nhóm của tôi, xu hướng

  // State cho UI
  const [showFilters, setShowFilters] = useState(false);
  const [isJoining, setIsJoining] = useState({});
  const [isLeaving, setIsLeaving] = useState({});

  // ==================== SEO ====================
  // Trang danh sách nhóm là public → index, follow
  useSEO({
    title: "Nhóm - Shiku",
    description: "Khám phá và tham gia các nhóm cộng đồng thú vị trên Shiku",
    robots: "index, follow",
    canonical: "https://shiku.click/groups"
  });

  // Load danh sách nhóm
  const loadGroups = async (page = 1, reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        search: searchTerm,
        type: groupType,
        sortBy,
        sortOrder
      });

      const response = await api(`/api/groups?${params}`, { method: 'GET' });

      if (response.success) {
        if (reset) {
          setGroups(response.data.groups);
        } else {
          setGroups(prev => {
            const existingIds = new Set(prev.map(group => group._id));
            const newGroups = response.data.groups.filter(group => !existingIds.has(group._id));
            return [...prev, ...newGroups];
          });
        }

        setCurrentPage(response.data.pagination.current);
        setTotalPages(response.data.pagination.pages);
        setTotalGroups(response.data.pagination.total);
      }
    } catch (error) {
      setError('Không thể tải danh sách nhóm');
    } finally {
      setLoading(false);
    }
  };

  // Load nhóm của user
  const loadMyGroups = async () => {
    try {
      const response = await api('/api/groups/my-groups', { method: 'GET' });

      if (response.success) {
        setMyGroups(response.data.groups);
      }
    } catch (error) {
      // Error loading my groups
    }
  };

  // Join group
  const handleJoinGroup = async (groupId) => {
    try {
      setIsJoining(prev => ({ ...prev, [groupId]: true }));

      const response = await api(`/api/groups/${groupId}/join`, {
      method: "POST",
      body: {}
    });

      if (response.success) {
        // Reload groups từ server để lấy userRole chính xác
        if (activeTab === 'discover') {
          await loadGroups(currentPage, true);
        }
        
        // Reload my groups
        await loadMyGroups();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Không thể tham gia nhóm');
    } finally {
      setIsJoining(prev => ({ ...prev, [groupId]: false }));
    }
  };

  // Leave group
  const handleLeaveGroup = async (groupId) => {
    try {
      setIsLeaving(prev => ({ ...prev, [groupId]: true }));

      const response = await api(`/api/groups/${groupId}/leave`, {
      method: "POST",
      body: {}
    });

      if (response.success) {
        // Reload groups từ server để lấy userRole chính xác
        if (activeTab === 'discover') {
          await loadGroups(currentPage, true);
        }
        
        // Reload my groups
        await loadMyGroups();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Không thể rời khỏi nhóm');
    } finally {
      setIsLeaving(prev => ({ ...prev, [groupId]: false }));
    }
  };

  // Load more groups (infinite scroll)
  const loadMore = () => {
    if (currentPage < totalPages && !loading) {
      loadGroups(currentPage + 1, false);
    }
  };

  // Search và filter
  const handleSearch = () => {
    setCurrentPage(1);
    loadGroups(1, true);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setGroupType('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
    loadGroups(1, true);
  };

  // Load data khi component mount
  useEffect(() => {
    loadGroups(1, true);
    loadMyGroups();
  }, []);

  // Load more khi scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, totalPages, loading]);

  // Render group card
  const renderGroupCard = (group) => (
    <GroupCard
      key={group._id}
      group={group}
      onJoin={handleJoinGroup}
      onLeave={handleLeaveGroup}
      userRole={group.userRole}
      showActions={true}
    />
  );

  // Render group list item
  const renderGroupListItem = (group) => (
    <div key={group._id} className="bg-white dark:bg-[#111] rounded-[32px] px-5 pt-4 pb-6
    shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
    hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.6)]
    transition-all duration-500 hover:-translate-y-1 border border-transparent dark:border-white/5">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {group.avatar ? (
            <img
              src={group.avatar}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/groups/${group._id}`}
            className="block"
          >
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1">
              {group.name}
            </h3>
          </Link>

          {group.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
              {group.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{group.stats?.memberCount || 0} thành viên</span>
            </div>

            {group.stats?.postCount > 0 && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{group.stats.postCount} bài viết</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0">
          {group.userRole ? (
            <Link
              to={`/groups/${group._id}`}
              className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Đã tham gia</span>
            </Link>
          ) : (
            <button
              onClick={() => handleJoinGroup(group._id)}
              disabled={isJoining[group._id]}
              className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              {isJoining[group._id] ? 'Đang tham gia...' : 'Tham gia nhóm'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nhóm</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">Khám phá và tham gia các nhóm cộng đồng</p>
            </div>

            <div className="flex-shrink-0 ml-4">
              <Link
                to="/groups/create"
                className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tạo nhóm</span>
                <span className="sm:hidden">Tạo</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Create Group Button - Temporary placement for testing */}
        <div className="mb-6 flex justify-end">
          <Link
            to="/groups/create"
            className="bg-gray-900 dark:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Tạo nhóm mới
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white dark:bg-[#111] rounded-[32px] mb-6 overflow-hidden
          shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
          hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgb(0,0,0,0.6)]
          transition-all duration-500 border border-transparent dark:border-white/5">
            <div className="grid grid-cols-3 border-b border-gray-200 dark:border-gray-700 divide-x divide-gray-200 dark:divide-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              {[
                { id: 'discover', label: 'Khám phá', count: totalGroups },
                { id: 'my-groups', label: 'Nhóm của tôi', count: myGroups.length },
                { id: 'trending', label: 'Xu hướng', count: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-6 py-2.5 sm:py-3 md:py-4 font-medium transition-all duration-200 whitespace-nowrap relative touch-target text-xs sm:text-sm md:text-base ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/30'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold min-w-[16px] sm:min-w-[18px] md:min-w-[20px] text-center leading-none flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm dark:shadow-blue-900/50'
                        : 'bg-gray-300 dark:bg-gray-600/80 text-gray-700 dark:text-gray-200'
                    }`}>
                      {tab.count > 99 ? '99+' : tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search và Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhóm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                />
              </div>
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Lọc
            </button>

            {/* View Mode */}
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-900 dark:bg-gray-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-900 dark:bg-gray-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white dark:bg-[#111] rounded-[24px]
            shadow-[0_4px_15px_rgb(0,0,0,0.02)] dark:shadow-[0_4px_15px_rgb(0,0,0,0.3)]
            border border-transparent dark:border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Group Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Loại nhóm
                  </label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  >
                    <option value="all">Tất cả</option>
                    <option value="public">Công khai</option>
                    <option value="private">Riêng tư</option>
                    <option value="secret">Bí mật</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sắp xếp theo
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  >
                    <option value="createdAt">Ngày tạo</option>
                    <option value="name">Tên</option>
                    <option value="stats.memberCount">Số thành viên</option>
                    <option value="stats.postCount">Số bài viết</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Thứ tự
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                  >
                    <option value="desc">Giảm dần</option>
                    <option value="asc">Tăng dần</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-700"
                >
                  Đặt lại
                </button>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {loading && groups.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => loadGroups(1, true)}
              className="mt-4 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* Groups List */}
            {activeTab === 'discover' && (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }>
                {groups.map(renderGroupCard)}
              </div>
            )}

            {activeTab === 'my-groups' && (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }>
                {myGroups.map(renderGroupCard)}
              </div>
            )}

            {activeTab === 'trending' && (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Tính năng xu hướng đang được phát triển</p>
              </div>
            )}

            {/* Load More Button */}
            {activeTab === 'discover' && currentPage < totalPages && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Đang tải...' : 'Tải thêm'}
                </button>
              </div>
            )}

            {/* Empty State */}
            {groups.length === 0 && !loading && activeTab === 'discover' && (
              <div className="text-center py-12">
                  <div className="bg-white dark:bg-[#111] rounded-[32px] p-5 mb-6
                  shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
                  border border-transparent dark:border-white/5 p-8">
                  <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Không tìm thấy nhóm nào</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              </div>
            )}

            {myGroups.length === 0 && !loading && activeTab === 'my-groups' && (
              <div className="text-center py-12">
                  <div className="bg-white dark:bg-[#111] rounded-[32px] p-5 mb-6
                  shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
                  border border-transparent dark:border-white/5 p-8">
                  <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Bạn chưa tham gia nhóm nào</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Khám phá và tham gia các nhóm thú vị</p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                  >
                    Khám phá nhóm
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Groups;
