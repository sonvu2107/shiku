import { motion } from "framer-motion";
import { cn } from "../utils/cn";

// Preset status options
export const STATUS_PRESETS = [
    { emoji: "", text: "Đang chơi game" },
    { emoji: "", text: "Đang nghe nhạc" },
    { emoji: "", text: "Đang làm việc" },
    { emoji: "", text: "Đang học" },
    { emoji: "", text: "Đang nghỉ ngơi" },
    { emoji: "", text: "Đang bận" },
    { emoji: "", text: "Đang đi du lịch" },
    { emoji: "", text: "Đang xem phim" },
    { emoji: "", text: "Đang uống cafe" },
    { emoji: "", text: "Đang treo" },
];

/**
 * StatusBadge - Display user status with emoji
 */
export default function StatusBadge({
    status,
    size = "md",
    showPulse = true,
    className = ""
}) {
    if (!status?.text && !status?.emoji) return null;

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5 gap-1",
        md: "text-sm px-3 py-1 gap-1.5",
        lg: "text-base px-4 py-1.5 gap-2"
    };

    const emojiSizes = {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg"
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "inline-flex items-center rounded-full",
                "bg-neutral-100 dark:bg-neutral-800",
                "border border-neutral-200 dark:border-neutral-700",
                "text-neutral-700 dark:text-neutral-300",
                "font-medium",
                sizeClasses[size],
                className
            )}
        >
            {showPulse && (
                <span className="relative flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
            )}
            {status.emoji && (
                <span className={emojiSizes[size]}>{status.emoji}</span>
            )}
            {status.text && (
                <span className="truncate max-w-[150px]">{status.text}</span>
            )}
        </motion.div>
    );
}

/**
 * StatusEditor - Edit status with preset options
 */
export function StatusEditor({
    value = { text: "", emoji: "" },
    onChange,
    className = ""
}) {
    const handlePresetClick = (preset) => {
        // Toggle if same preset is clicked
        if (value.emoji === preset.emoji && value.text === preset.text) {
            onChange({ text: "", emoji: "" });
        } else {
            onChange(preset);
        }
    };

    const handleTextChange = (e) => {
        onChange({ ...value, text: e.target.value.slice(0, 100) });
    };

    const handleEmojiChange = (e) => {
        // Extract first emoji from input
        const emojiMatch = e.target.value.match(/\p{Extended_Pictographic}/u);
        onChange({ ...value, emoji: emojiMatch ? emojiMatch[0] : "" });
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Preset options */}
            <div className="flex flex-wrap gap-2">
                {STATUS_PRESETS.map((preset, idx) => (
                    <button
                        key={idx}
                        onClick={() => handlePresetClick(preset)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                            "border",
                            value.emoji === preset.emoji && value.text === preset.text
                                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
                        )}
                    >
                        {preset.emoji} {preset.text}
                    </button>
                ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value.emoji}
                    onChange={handleEmojiChange}
                    placeholder="😊"
                    className="w-14 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-center text-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
                <input
                    type="text"
                    value={value.text}
                    onChange={handleTextChange}
                    placeholder="Nhập trạng thái tùy chỉnh..."
                    maxLength={100}
                    className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
            </div>

            {/* Character count */}
            <div className="flex justify-between items-center text-xs text-neutral-500">
                <span>Trạng thái sẽ hiển thị trên profile của bạn</span>
                <span>{value.text.length}/100</span>
            </div>

            {/* Preview */}
            {(value.text || value.emoji) && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs text-neutral-500 mb-2">Xem trước:</p>
                    <StatusBadge status={value} size="md" />
                </div>
            )}
        </div>
    );
}
