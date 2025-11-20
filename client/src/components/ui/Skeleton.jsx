import { cn } from "../../utils/cn";

/**
 * Skeleton loader component
 */
export default function Skeleton({
  className = "",
  variant = "default",
  ...props
}) {
  const variants = {
    default: "bg-neutral-100 dark:bg-neutral-900 rounded-xl animate-pulse",
    card: "bg-neutral-100 dark:bg-neutral-900 rounded-2xl animate-pulse",
    circle: "bg-neutral-100 dark:bg-neutral-900 rounded-full animate-pulse",
    text: "bg-neutral-100 dark:bg-neutral-900 rounded animate-pulse h-4",
  };
  
  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}

/**
 * Skeleton cho Post Card
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
 * Skeleton cho Friend Card
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
 * Skeleton cho Analytics Card
 */
export function AnalyticsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-3">
      <Skeleton variant="text" className="w-32" />
      <Skeleton variant="text" className="w-20 h-8" />
    </div>
  );
}

