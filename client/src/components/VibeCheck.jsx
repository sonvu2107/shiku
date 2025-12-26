/**
 * VibeCheck Component
 * 
 * Widget hiển thị câu hỏi vibe check hàng ngày
 * - Cho phép vote 1 trong các options
 * - Hiển thị kết quả % của community
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Check, Users } from "lucide-react";
import { useVibeCheck, useVibeCheckVote } from "../hooks/useVibeCheck";
import { cn } from "../utils/cn";

export default function VibeCheck({ className }) {
    const { data, isLoading, error } = useVibeCheck();
    const voteMutation = useVibeCheckVote();
    const [selectedOption, setSelectedOption] = useState(null);

    if (isLoading) {
        return (
            <div className={cn("bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 animate-pulse", className)}>
                <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2 mb-3"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4 mb-4"></div>
                <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return null; // Ẩn widget nếu có lỗi
    }

    const { question, options, totalVotes, hasVoted, userChoice } = data;

    const handleVote = async (optionId) => {
        if (hasVoted || voteMutation.isPending) return;
        setSelectedOption(optionId);
        try {
            await voteMutation.mutateAsync(optionId);
        } catch (err) {
            setSelectedOption(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "bg-white dark:bg-neutral-900",
                "rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800",
                "shadow-sm hover:shadow-md transition-shadow",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <Heart className="w-4 h-4 text-neutral-900 dark:text-white fill-neutral-900 dark:fill-white" />
                    </motion.div>
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">
                    Vibe Check
                </h3>
                {totalVotes > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <Users className="w-3 h-3" />
                        {totalVotes.toLocaleString()}
                    </span>
                )}
            </div>

            {/* Question */}
            <p className="text-neutral-700 dark:text-neutral-300 text-sm mb-4 font-medium">
                {question}
            </p>

            {/* Options */}
            <div className="grid grid-cols-2 gap-2">
                <AnimatePresence mode="wait">
                    {options.map((option) => {
                        const isSelected = userChoice === option.id || selectedOption === option.id;
                        const showResults = hasVoted || selectedOption;

                        return (
                            <motion.button
                                key={option.id}
                                onClick={() => handleVote(option.id)}
                                disabled={hasVoted || voteMutation.isPending}
                                className={cn(
                                    "relative overflow-hidden rounded-xl p-3 text-left transition-all",
                                    "border-2",
                                    hasVoted || selectedOption
                                        ? isSelected
                                            ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800"
                                            : "border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50"
                                        : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 cursor-pointer"
                                )}
                                whileHover={!hasVoted && !selectedOption ? { scale: 1.02 } : {}}
                                whileTap={!hasVoted && !selectedOption ? { scale: 0.98 } : {}}
                            >
                                {/* Progress bar background */}
                                {showResults && (
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${option.percentage || 0}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                        className={cn(
                                            "absolute inset-0 rounded-lg",
                                            isSelected
                                                ? "bg-neutral-200 dark:bg-neutral-700"
                                                : "bg-neutral-100 dark:bg-neutral-800"
                                        )}
                                    />
                                )}

                                {/* Content */}
                                <div className="relative flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-neutral-900 dark:text-white text-sm truncate">
                                                {option.label}
                                            </span>
                                            {showResults && (
                                                <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
                                                    {option.percentage || 0}%
                                                </span>
                                            )}
                                        </div>
                                        {/* Progress bar */}
                                        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: showResults ? `${option.percentage || 0}%` : "0%" }}
                                                transition={{ duration: 0.5, ease: "easeOut" }}
                                                className={cn(
                                                    "h-full rounded-full",
                                                    isSelected
                                                        ? "bg-neutral-900 dark:bg-white"
                                                        : "bg-neutral-400 dark:bg-neutral-500"
                                                )}
                                            />
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <Check className="w-4 h-4 text-neutral-900 dark:text-white flex-shrink-0" />
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Footer - After voting */}
            {hasVoted && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400"
                >
                    ✨ Cảm ơn bạn đã chia sẻ vibe!
                </motion.div>
            )}
        </motion.div>
    );
}
