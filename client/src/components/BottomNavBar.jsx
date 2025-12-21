import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Compass, Plus, User, Users } from "lucide-react";
import { cn } from "../utils/cn";

/**
 * BottomNavBar - Fixed bottom navigation for mobile
 * Shows: Home, Explore, Create (+), Groups, Profile
 * Auto-hide on scroll down, show on scroll up
 * Hides when modals are open
 */
export default function BottomNavBar({ user, onCreatePost }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [visible, setVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Check if any modal is open
    useEffect(() => {
        const checkModal = () => {
            const modal = document.querySelector('[data-post-creator-modal]') ||
                document.querySelector('[data-profile-customization-modal]') ||
                document.querySelector('[data-image-viewer]') ||
                document.querySelector('[data-media-viewer]') ||
                document.querySelector('[data-story-viewer]') ||
                document.querySelector('[data-emote-list-modal]') ||
                document.querySelector('[data-post-detail-modal]') ||
                document.querySelector('.fixed.inset-0.z-\\[110\\]') ||
                document.querySelector('.fixed.inset-0.z-\\[50\\]');
            setIsModalOpen(!!modal);
        };

        checkModal();
        const interval = setInterval(checkModal, 100);
        const observer = new MutationObserver(checkModal);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            clearInterval(interval);
            observer.disconnect();
        };
    }, []);

    // Hide on scroll down, show on scroll up
    const handleScroll = useCallback(() => {
        const currentScrollY = window.scrollY;

        if (currentScrollY < 50) {
            setVisible(true);
        } else if (currentScrollY > lastScrollY + 10) {
            setVisible(false);
        } else if (currentScrollY < lastScrollY - 10) {
            setVisible(true);
        }

        setLastScrollY(currentScrollY);
    }, [lastScrollY]);

    useEffect(() => {
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    const tabs = [
        { icon: Home, label: "Trang chủ", path: "/" },
        { icon: Compass, label: "Khám phá", path: "/explore" },
        { icon: Plus, label: "Đăng", path: null, isCreate: true },
        { icon: Users, label: "Nhóm", path: "/groups" },
        { icon: User, label: "Cá nhân", path: user ? "/profile" : "/login" }
    ];

    const handleTabClick = (tab) => {
        if (tab.isCreate) {
            // Trigger PostCreator modal via global trigger (same as FloatingDock)
            const triggerBtn = document.querySelector('[data-post-creator-trigger]');
            if (triggerBtn) {
                triggerBtn.click();
            }
        }
    };

    // Don't show on certain pages
    const hiddenPaths = ["/login", "/register", "/admin", "/cultivation", "/chat"];
    if (hiddenPaths.some(p => location.pathname.startsWith(p))) {
        return null;
    }

    // Hide when modal is open
    if (isModalOpen) {
        return null;
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.nav
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-t border-neutral-100 dark:border-neutral-800/50 safe-bottom"
                >
                    <div className="flex items-center justify-around h-14 px-2">
                        {tabs.map((tab, index) => {
                            const Icon = tab.icon;
                            const isActive = tab.path && location.pathname === tab.path;

                            if (tab.isCreate) {
                                return (
                                    <button
                                        key="create"
                                        onClick={() => handleTabClick(tab)}
                                        className="flex items-center justify-center w-12 h-12 -mt-4 bg-black dark:bg-white rounded-full shadow-lg shadow-black/20 active:scale-95 transition-transform"
                                    >
                                        <Plus size={24} className="text-white dark:text-black" strokeWidth={2.5} />
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={tab.path}
                                    to={tab.path}
                                    className={cn(
                                        "flex flex-col items-center justify-center flex-1 py-2 transition-colors",
                                        isActive
                                            ? "text-black dark:text-white"
                                            : "text-neutral-400 dark:text-neutral-500"
                                    )}
                                >
                                    <Icon
                                        size={22}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={cn(
                                            "transition-transform",
                                            isActive && "scale-110"
                                        )}
                                    />
                                    <span className={cn(
                                        "text-[10px] mt-0.5",
                                        isActive ? "font-medium" : "font-normal"
                                    )}>
                                        {tab.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </motion.nav>
            )}
        </AnimatePresence>
    );
}
