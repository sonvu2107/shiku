import React from "react";

/**
 * MediaCardSkeleton - Skeleton loader cho Media card (grid view)
 */
export function MediaGridSkeleton() {
  return (
    <div className="bg-white dark:bg-[#111] rounded-[32px] overflow-hidden
    shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
    border border-transparent dark:border-white/5">
      <div className="aspect-square bg-gray-200 dark:bg-neutral-900 animate-pulse"></div>
      <div className="p-2 sm:p-3">
        <div className="h-4 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-1/2"></div>
      </div>
    </div>
  );
}

/**
 * MediaListSkeleton - Skeleton loader cho Media list item
 */
export function MediaListSkeleton() {
  return (
    <div className="bg-white dark:bg-[#111] rounded-[32px] px-5 pt-4 pb-6 mb-6
    shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
    border border-transparent dark:border-white/5">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          <div className="h-5 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-3/4 mb-2"></div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="h-4 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-16"></div>
            <div className="h-4 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-20"></div>
            <div className="h-4 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-24"></div>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2">
          <div className="w-8 h-8 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse"></div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

