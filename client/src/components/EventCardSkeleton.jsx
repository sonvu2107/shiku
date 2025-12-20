import React from "react";

/**
 * EventCardSkeleton - Skeleton loader for Event card
 */
export default function EventCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#111] rounded-[32px] mb-6 overflow-hidden
    shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
    border border-transparent dark:border-white/5">
      {/* Cover Image Skeleton */}
      <div className="h-48 sm:h-56 md:h-64 lg:h-72 w-full bg-gray-200 dark:bg-neutral-900 animate-pulse"></div>
      
      <div className="px-5 pt-4 pb-6">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            {/* Title and Badges Skeleton */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="h-6 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-48"></div>
              <div className="h-5 bg-gray-200 dark:bg-neutral-900 rounded-full animate-pulse w-16"></div>
            </div>
            
            {/* Description Skeleton */}
            <div className="space-y-2 mb-3 sm:mb-4">
              <div className="h-4 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-5/6"></div>
            </div>
            
            {/* Info Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-neutral-900 rounded animate-pulse w-24"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Buttons Skeleton */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="h-10 bg-gray-200 dark:bg-neutral-900 rounded-lg animate-pulse w-full sm:w-32"></div>
            <div className="h-10 bg-gray-200 dark:bg-neutral-900 rounded-lg animate-pulse w-full sm:w-24"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
