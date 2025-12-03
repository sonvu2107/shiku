/**
 * Loading Skeleton for Cultivation Page
 */

const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse p-6">
    <div className="h-48 bg-slate-800/50 rounded-xl"></div>
    <div className="grid grid-cols-2 gap-3">
      <div className="h-20 bg-slate-800/50 rounded-lg"></div>
      <div className="h-20 bg-slate-800/50 rounded-lg"></div>
    </div>
    <div className="h-32 bg-slate-800/50 rounded-xl"></div>
  </div>
);

export default LoadingSkeleton;

