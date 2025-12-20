import React, { useState, useEffect, useMemo } from 'react';
import { motion } from "framer-motion";
import { FileText, ArrowRight, Sparkles, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import PostCreator from "../PostCreator";
import ModernPostCard from "../ModernPostCard";
import { SpotlightCard } from "../ui/SpotlightCard";
import { PostCardSkeleton } from "../ui/Skeleton";
import { PROFILE_MESSAGES } from "../../constants/profile";
import SpotifyEmbed from "../SpotifyEmbed";
import Pagination from "../admin/Pagination";


/**
 * PostsTab - Component showing Posts tab in user profile
 */
export default function PostsTab({
  user,
  posts,
  postsLoading,
  form,
  savedMap,
  recentImages = [],
  onUpdate,
  onSavedChange,
}) {
  // --- STATE ---
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortOption, setSortOption] = React.useState('newest'); // 'newest', 'oldest', 'popular'
  const itemsPerPage = 5;

  // Dropdown state
  const [sortDropdownOpen, setSortDropdownOpen] = React.useState(false);
  const sortDropdownRef = React.useRef(null);

  // Filter options
  const filterOptions = React.useMemo(() => [
    { key: 'newest', label: 'Mới nhất' },
    { key: 'oldest', label: 'Cũ nhất' },
    { key: 'popular', label: 'Phổ biến nhất' }
  ], []);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
    };
    if (sortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortDropdownOpen]);

  // --- MEMOIZED DATA ---
  const processedPosts = React.useMemo(() => {
    let result = [...posts];

    // 1. Sorting
    switch (sortOption) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'popular':
        // Sort by upvotes + comments count
        result.sort((a, b) => {
          const upvotesA = a.upvoteCount ?? 0;
          const commentsA = a.commentCount || (Array.isArray(a.comments) ? a.comments.length : 0);
          const scoreA = upvotesA + commentsA;

          const upvotesB = b.upvoteCount ?? 0;
          const commentsB = b.commentCount || (Array.isArray(b.comments) ? b.comments.length : 0);
          const scoreB = upvotesB + commentsB;

          return scoreB - scoreA;
        });
        break;
      default:
        break;
    }

    return result;
  }, [posts, sortOption]);

  // 2. Pagination Logic
  const totalPages = Math.ceil(processedPosts.length / itemsPerPage);
  const paginatedPosts = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedPosts.slice(start, start + itemsPerPage);
  }, [processedPosts, currentPage, itemsPerPage]);

  const paginationData = {
    page: currentPage,
    totalPages: totalPages,
    total: processedPosts.length,
    hasPrevPage: currentPage > 1,
    hasNextPage: currentPage < totalPages
  };

  // Reset page when posts or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [posts.length, sortOption]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar Info (Sticky Left) */}
      <div className="hidden lg:block lg:col-span-1">
        <div className="sticky top-40 space-y-6">
          <SpotlightCard>
            <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4">Tiểu sử</h3>
            <div className="pt-2">
              {form.bio ? (
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line text-center">
                  {form.bio}
                </p>
              ) : (
                <div className="text-center py-8">
                  <span className="text-neutral-500 dark:text-neutral-400 text-sm block">
                    {PROFILE_MESSAGES.NO_BIO}
                  </span>
                </div>
              )}
            </div>
            {/* Spotify Embed in Bio Box */}
            {user.profileSongUrl && (
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <SpotifyEmbed
                  url={user.profileSongUrl}
                  compact={true}
                  className="bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                />
              </div>
            )}
          </SpotlightCard>

          {/* Recent Photos Mini Grid */}
          <SpotlightCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Ảnh gần đây</h3>
              {recentImages.length > 0 && (
                <Link
                  to="/gallery"
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <span>Xem tất cả</span>
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {recentImages.length === 0 ? (
                [1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="aspect-square bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
                ))
              ) : (
                recentImages.slice(0, 6).map((img, i) => (
                  <div
                    key={`${img.postId}-${i}`}
                    className="aspect-square bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    title={img.postTitle}
                  >
                    <img src={img.url} alt={img.postTitle} className="w-full h-full object-cover" />
                  </div>
                ))
              )}
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* Feed */}
      <div className="lg:col-span-2 space-y-6">
        <div className="mb-6">
          <PostCreator user={user} />
        </div>

        {/* Sort Controls - Only show if there are posts */}
        {posts.length > 0 && (
          <div className="flex items-center justify-between px-1 mb-4">
            <h3 className="font-bold text-lg block">Bài viết ({posts.length})</h3>
            <div className="relative" ref={sortDropdownRef}>
              <button
                onClick={() => setSortDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all"
              >
                <span>{filterOptions.find(f => f.key === sortOption)?.label || 'Mới nhất'}</span>
                <ChevronDown size={14} className={`transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {sortDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-full mt-2 w-26 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1.5 z-[200]"
                >
                  {filterOptions.map(option => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setSortOption(option.key);
                        setSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${sortOption === option.key
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}

        {postsLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : paginatedPosts.length > 0 ? (
          <>
            {/* Posts List */}
            {paginatedPosts.map((post, index) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <ModernPostCard
                  post={post}
                  user={user}
                  onUpdate={onUpdate}
                  isSaved={savedMap[post._id]}
                  onSavedChange={onSavedChange}
                  hideActionsMenu={true}
                />
              </motion.div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination
                pagination={paginationData}
                onPageChange={setCurrentPage}
                loading={postsLoading}
                itemLabel="bài viết"
              />
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700">
            <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-neutral-400" />
            </div>
            <h3 className="font-bold text-lg">{PROFILE_MESSAGES.NO_POSTS.title}</h3>
            <p className="text-neutral-500">{PROFILE_MESSAGES.NO_POSTS.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

