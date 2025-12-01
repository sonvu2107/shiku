import { Eye, FileText, TrendingUp, Globe, BarChart3 } from "lucide-react";
import { SpotlightCard } from "../ui/SpotlightCard";
import { AnalyticsCardSkeleton } from "../ui/Skeleton";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { ANALYTICS_PERIODS, PROFILE_MESSAGES } from "../../constants/profile";

/**
 * AnalyticsTab - Component showing analytics overview for user's posts
 */
export default function AnalyticsTab({
  analytics,
  analyticsLoading,
  analyticsPeriod,
  onPeriodChange,
  onRefresh,
}) {
  return (
    <div className="pb-32">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Phân tích bài viết</h3>
          <p className="text-sm text-neutral-500">Thống kê lượt xem và hiệu suất bài viết của bạn</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={analyticsPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="min-w-[140px]"
          >
            {ANALYTICS_PERIODS.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </Select>
          <Button
            onClick={onRefresh}
            variant="primary"
            size="md"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {analyticsLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <AnalyticsCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : analytics ? (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SpotlightCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-500 mb-1">Tổng lượt xem</p>
                  <p className="text-2xl font-black text-black dark:text-white">
                    {analytics.totalViews?.toLocaleString() || 0}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-neutral-400" />
              </div>
            </SpotlightCard>
            
            <SpotlightCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-500 mb-1">Tổng bài viết</p>
                  <p className="text-2xl font-black text-black dark:text-white">
                    {analytics.totalPosts || 0}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-neutral-400" />
              </div>
            </SpotlightCard>
            
            <SpotlightCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-500 mb-1">Trung bình lượt xem</p>
                  <p className="text-2xl font-black text-black dark:text-white">
                    {analytics.avgViewsPerPost?.toLocaleString() || 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-neutral-400" />
              </div>
            </SpotlightCard>
            
            <SpotlightCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-500 mb-1">Bài đã công khai</p>
                  <p className="text-2xl font-black text-black dark:text-white">
                    {analytics.publishedPosts || 0}
                  </p>
                </div>
                <Globe className="w-8 h-8 text-neutral-400" />
              </div>
            </SpotlightCard>
          </div>

          {/* Recent Posts */}
          {analytics.recentPosts && analytics.recentPosts.length > 0 && (
            <SpotlightCard className="p-6">
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Các bài viết gần đây ({analytics.period === '7d' ? '7 ngày' : analytics.period === '30d' ? '30 ngày' : analytics.period === '90d' ? '90 ngày' : '1 năm'})
              </h4>
              <div className="space-y-3">
                {analytics.recentPosts.slice(0, 10).map((post, index) => (
                  <a
                    key={post._id}
                    href={`/post/${post.slug}`}
                    className="flex items-start justify-between p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-neutral-900 dark:text-white truncate">
                          {post.title || "Không có tiêu đề"}
                        </h5>
                        <p className="text-sm text-neutral-500">
                          {new Date(post.createdAt).toLocaleDateString('vi-VN')} • 
                          <span className={`ml-1 ${post.status === 'published' ? 'text-green-600' : 'text-orange-600'}`}>
                            {post.status === 'published' ? 'Công khai' : 'Riêng tư'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 flex-shrink-0 ml-3">
                      <Eye className="w-4 h-4" />
                      <span className="font-bold">{post.views?.toLocaleString() || 0}</span>
                    </div>
                  </a>
                ))}
              </div>
            </SpotlightCard>
          )}

          {/* Top Posts */}
          {analytics.topPosts && analytics.topPosts.length > 0 && (
            <SpotlightCard className="p-6">
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top bài viết có lượt xem cao nhất
              </h4>
              <div className="space-y-3">
                {analytics.topPosts.map((post, index) => (
                  <a
                    key={post._id}
                    href={`/post/${post.slug}`}
                    className="flex items-start justify-between p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-neutral-900 dark:text-white truncate">
                          {post.title || "Không có tiêu đề"}
                        </h5>
                        <p className="text-sm text-neutral-500">
                          {new Date(post.createdAt).toLocaleDateString('vi-VN')} • 
                          <span className={`ml-1 ${post.status === 'published' ? 'text-green-600' : 'text-orange-600'}`}>
                            {post.status === 'published' ? 'Công khai' : 'Riêng tư'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 flex-shrink-0 ml-3">
                      <Eye className="w-4 h-4" />
                      <span className="font-bold">{post.views?.toLocaleString() || 0}</span>
                    </div>
                  </a>
                ))}
              </div>
            </SpotlightCard>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700">
          <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="text-neutral-400" />
          </div>
          <h3 className="font-bold text-lg">{PROFILE_MESSAGES.NO_ANALYTICS.title}</h3>
          <p className="text-neutral-500">{PROFILE_MESSAGES.NO_ANALYTICS.description}</p>
        </div>
      )}
    </div>
  );
}

