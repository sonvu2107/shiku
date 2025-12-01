import { SpotlightCard } from "./SpotlightCard";

/**
 * PageLayout - Layout wrapper for pages with standard background and padding
 * Automatically adds padding-bottom to avoid FloatingDock covering content
 */
export function PageLayout({ children, className = "" }) {
  return (
    <div className={`min-h-screen bg-[#F5F7FA] dark:bg-black pt-16 sm:pt-20 pb-32 transition-colors duration-300 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}

/**
 * PageHeader - Header section for pages with title, subtitle, and action button
 */
export function PageHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// Re-export SpotlightCard
export { SpotlightCard };

