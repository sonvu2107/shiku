import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import PostCreator from "../PostCreator";
import ModernPostCard from "../ModernPostCard";
import { SpotlightCard } from "../ui/SpotlightCard";
import { PostCardSkeleton } from "../ui/Skeleton";
import { PROFILE_MESSAGES } from "../../constants/profile";

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
  // recentImages is passed from parent component (extracted from posts)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ overflow: 'visible' }}>
      {/* Sidebar Info (Sticky Left) */}
      <div className="hidden lg:block lg:col-span-1" style={{ overflow: 'visible' }}>
        <div className="sticky top-40 space-y-6" style={{ overflow: 'visible' }}>
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
          </SpotlightCard>
          
          {/* Recent Photos Mini Grid */}
          <SpotlightCard>
            <h3 className="font-bold mb-4 text-lg">Ảnh gần đây</h3>
            <div className="grid grid-cols-3 gap-2">
              {recentImages.length === 0 ? (
                [1,2,3,4,5,6].map(i => (
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
      <div className="lg:col-span-2 space-y-6" style={{ overflow: 'visible', position: 'relative' }}>
        <div className="mb-8" style={{ overflow: 'visible' }}>
          <PostCreator user={user} />
        </div>
        {postsLoading ? (
          <div className="space-y-6" style={{ overflow: 'visible' }}>
            {[1,2,3].map(i => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length > 0 ? (
          posts.map((post, index) => (
            <motion.div 
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              style={{ position: 'relative', overflow: 'visible', zIndex: 1 }}
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
          ))
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

