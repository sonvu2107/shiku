import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon, X, Clock, User, FileText } from 'lucide-react';
import { api } from '../api';
import UserName from '../components/UserName';

export default function Search({ user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'users', 'posts'
  const inputRef = useRef(null);

  // Load history
  useEffect(() => {
    loadHistory();
  }, []);

  // Perform search when query param changes
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    } else {
      setResults({ users: [], posts: [] });
    }
  }, [searchParams]);

  // Focus input on mount if no query
  useEffect(() => {
    if (!initialQuery && inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const loadHistory = async () => {
    let localItems = [];
    try {
      const raw = localStorage.getItem('searchHistory');
      localItems = JSON.parse(raw || '[]');
    } catch (_) {}
    setHistory(Array.isArray(localItems) ? localItems : []);

    if (user) {
      try {
        const res = await api('/api/search/history');
        if (res.items && Array.isArray(res.items)) {
          // Merge logic could be improved, for now just use server or mix
          // Simple merge:
          const combined = [...res.items, ...localItems].reduce((acc, curr) => {
             if (!acc.find(x => x.query.toLowerCase() === curr.query.toLowerCase())) {
               acc.push(curr);
             }
             return acc;
          }, []).slice(0, 20);
          setHistory(combined);
        }
      } catch (_) {}
    }
  };

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const [userRes, postRes] = await Promise.all([
        api(`/api/users/search?q=${encodeURIComponent(searchQuery)}`),
        api(`/api/posts?q=${encodeURIComponent(searchQuery)}`)
      ]);
      
      setResults({
        users: userRes.users || [],
        posts: postRes.items || []
      });
      
      addToHistory(searchQuery);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = (searchQuery) => {
    const newItem = { 
      id: Date.now().toString(), 
      query: searchQuery, 
      lastSearchedAt: Date.now() 
    };
    const newHistory = [newItem, ...history.filter(h => h.query.toLowerCase() !== searchQuery.toLowerCase())].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    
    if (user) {
      api('/api/search/history', {
        method: "POST",
        body: newItem
      }).catch(() => {});
    }
  };

  const removeFromHistory = (id) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    if (user) {
      api(`/api/search/history/${id}`, { method: "DELETE" }).catch(() => {});
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.setItem('searchHistory', '[]');
    if (user) {
      api('/api/search/history', { method: "DELETE" }).catch(() => {});
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  const renderPostPreview = (post) => {
    let media = { url: '/assets/posts.png', type: 'image' };
    if (post.coverUrl) {
       const found = post.files?.find(f => f.url === post.coverUrl);
       media = { url: post.coverUrl, type: found ? found.type : 'image' };
    } else if (post.files?.length > 0) {
       media = post.files[0];
    }

    if (media.type === 'video') {
      return <video src={media.url} className="w-12 h-12 rounded object-cover bg-gray-100" muted />;
    }
    return <img src={media.url} alt="" className="w-12 h-12 rounded object-cover bg-gray-100" onError={(e) => e.target.src = '/assets/shiku-mark.svg'} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
      {/* Header Mobile */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 h-16">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm trên Shiku..."
              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full py-2.5 pl-10 pr-10 outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            {query && (
              <button 
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </form>
        
        {/* Tabs if there are results */}
        {(results.users.length > 0 || results.posts.length > 0) && (
          <div className="flex px-4 gap-6 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setActiveTab('all')}
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'all' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'users' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}
            >
              Mọi người ({results.users.length})
            </button>
            <button 
              onClick={() => setActiveTab('posts')}
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'posts' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}
            >
              Bài viết ({results.posts.length})
            </button>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto pb-20">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* History */}
            {!searchParams.get('q') && history.length > 0 && (
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-base">Gần đây</h3>
                  <button onClick={clearHistory} className="text-blue-500 text-sm">Xóa tất cả</button>
                </div>
                <div className="space-y-1">
                  {history.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        setQuery(item.query);
                        setSearchParams({ q: item.query });
                      }}
                      className="flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                          <Clock size={20} />
                        </div>
                        <span className="font-medium">{item.query}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFromHistory(item.id); }}
                        className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {searchParams.get('q') && (
              <div className="p-4 space-y-6">
                {/* Users */}
                {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
                  <div className="space-y-4">
                    {activeTab === 'all' && <h3 className="font-semibold text-lg">Mọi người</h3>}
                    <div className="space-y-2">
                      {results.users.map((u, index) => (
                        <Link 
                          key={`${u._id}-${index}`}
                          to={`/user/${u._id}`}
                          className="flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all"
                        >
                          <img 
                            src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`} 
                            alt={u.name}
                            className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base truncate">
                              <UserName user={u} />
                            </div>
                            <div className="text-sm text-gray-500 truncate">{u.email}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts */}
                {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
                  <div className="space-y-4">
                    {activeTab === 'all' && <h3 className="font-semibold text-lg">Bài viết</h3>}
                    <div className="space-y-2">
                      {results.posts.map((post, index) => (
                        <Link 
                          key={`${post._id}-${index}`}
                          to={`/post/${post.slug || post._id}`}
                          className="flex gap-3 p-3 -mx-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all"
                        >
                          {renderPostPreview(post)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-base line-clamp-2 mb-1">{post.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{post.author?.name}</span>
                              <span>•</span>
                              <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.users.length === 0 && results.posts.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <SearchIcon size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Không tìm thấy kết quả nào cho "{searchParams.get('q')}"</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
