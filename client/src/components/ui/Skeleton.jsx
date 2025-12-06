import { cn } from "../../utils/cn";

/**
 * Skeleton loader component with shimmer effect
 */
export default function Skeleton({
  className = "",
  variant = "default",
  ...props
}) {
  const variants = {
    default: "bg-neutral-100 dark:bg-neutral-900 rounded-xl relative overflow-hidden",
    card: "bg-neutral-100 dark:bg-neutral-900 rounded-2xl relative overflow-hidden",
    circle: "bg-neutral-100 dark:bg-neutral-900 rounded-full relative overflow-hidden",
    text: "bg-neutral-100 dark:bg-neutral-900 rounded relative overflow-hidden h-4",
  };
  
  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent"></div>
    </div>
  );
}

/**
 * Skeleton for Post Card
 */
export function PostCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-32" />
          <Skeleton variant="text" className="w-24" />
        </div>
      </div>
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="card" className="w-full h-64" />
    </div>
  );
}

/**
 * Skeleton for Friend Card
 */
export function FriendCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center gap-4">
      <Skeleton variant="circle" className="w-12 h-12" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="text" className="w-16" />
      </div>
      <Skeleton variant="circle" className="w-10 h-10" />
    </div>
  );
}

/**
 * Skeleton for Analytics Card
 */
export function AnalyticsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-3">
      <Skeleton variant="text" className="w-32" />
      <Skeleton variant="text" className="w-20 h-8" />
    </div>
  );
}

