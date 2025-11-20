import { cn } from "../../utils/cn";

/**
 * Textarea component với consistent styling
 */
export default function Textarea({
  label,
  error,
  className = "",
  ...props
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-400 transition-all resize-none",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

