/**
 * Recap 2025 Page
 * 
 * Story-style slides showing user's year in review.
 * Design follows Shiku's monochrome design system (black/white/neutral)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Loader from '../components/Loader';
import * as htmlToImage from 'html-to-image';

// Confetti particle component - uses neutral colors
const Confetti = ({ count = 50 }) => {
    const particles = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        size: 4 + Math.random() * 8,
        color: ['#FFFFFF', '#D4D4D4', '#A3A3A3', '#737373', '#525252'][Math.floor(Math.random() * 5)]
    }));

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: -20,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color
                    }}
                    initial={{ y: -20, opacity: 1, rotate: 0 }}
                    animate={{
                        y: '100vh',
                        opacity: [1, 1, 0],
                        rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: 'linear'
                    }}
                />
            ))}
        </div>
    );
};

// Animated counter component
const AnimatedNumber = ({ value, duration = 2 }) => {
    const [displayed, setDisplayed] = useState(0);

    useEffect(() => {
        const start = 0;
        const end = parseInt(value) || 0;
        const increment = end / (duration * 60);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                setDisplayed(end);
                clearInterval(timer);
            } else {
                setDisplayed(Math.floor(current));
            }
        }, 1000 / 60);

        return () => clearInterval(timer);
    }, [value, duration]);

    return <span>{displayed.toLocaleString('vi-VN')}</span>;
};

// Background music player
const MusicPlayer = ({ src, autoPlay = false }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(() => { });
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const toggleMute = useCallback(() => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    }, [isMuted]);

    useEffect(() => {
        if (autoPlay && audioRef.current) {
            audioRef.current.play().catch(() => { });
            setIsPlaying(true);
        }
    }, [autoPlay]);

    return (
        <div className="fixed top-3 right-3 z-50 flex gap-1.5">
            <audio ref={audioRef} src={src} loop />
            <button
                onClick={togglePlay}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-900 dark:bg-white backdrop-blur-sm border border-neutral-700 dark:border-neutral-300 flex items-center justify-center text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
            >
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                    </svg>
                )}
            </button>
            <button
                onClick={toggleMute}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-900 dark:bg-white backdrop-blur-sm border border-neutral-700 dark:border-neutral-300 flex items-center justify-center text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
            >
                {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
                        <path d="M15.54,8.46a5,5,0,0,1,0,7.07" />
                        <path d="M19.07,4.93a10,10,0,0,1,0,14.14" />
                    </svg>
                )}
            </button>
        </div>
    );
};

// Progress bar
const SlideProgress = ({ current, total }) => (
    <div className="flex gap-1 md:gap-1.5 justify-center mb-4 md:mb-6">
        {Array.from({ length: total }, (_, i) => (
            <div
                key={i}
                className={`h-1 md:h-1.5 rounded-full transition-all duration-300 ${i === current
                    ? 'w-6 md:w-8 bg-black dark:bg-white'
                    : 'w-1 md:w-1.5 bg-neutral-300 dark:bg-neutral-700'
                    }`}
            />
        ))}
    </div>
);

// Slide wrapper with transitions
const Slide = ({ children, isActive, direction }) => (
    <AnimatePresence mode="wait">
        {isActive && (
            <motion.div
                initial={{ x: direction > 0 ? 200 : -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -200 : 200, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-6"
            >
                {children}
            </motion.div>
        )}
    </AnimatePresence>
);

// Stat card component - monochrome style
const StatCard = ({ label, value, delay = 0 }) => (
    <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay, type: 'spring' }}
        className="flex flex-col items-center p-3 md:p-5 lg:p-6 bg-neutral-100 dark:bg-neutral-900 backdrop-blur-sm rounded-xl border border-neutral-200 dark:border-neutral-800"
    >
        <span className="text-xl md:text-3xl lg:text-4xl font-bold text-black dark:text-white mb-0.5 md:mb-1">
            <AnimatedNumber value={value} />
        </span>
        <span className="text-xs md:text-sm lg:text-base text-neutral-500 dark:text-neutral-400">{label}</span>
    </motion.div>
);

export default function Recap2025() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const containerRef = useRef(null);
    const summaryRef = useRef(null);
    const dragX = useMotionValue(0);

    const totalSlides = 8;

    // Fetch recap data
    useEffect(() => {
        const fetchRecap = async () => {
            try {
                setLoading(true);
                const endpoint = userId
                    ? `/api/recap/2025/user/${userId}`
                    : '/api/recap/2025';
                const response = await api(endpoint);
                setData(response);
            } catch (err) {
                setError(err.message || 'Không thể tải dữ liệu recap');
            } finally {
                setLoading(false);
            }
        };

        fetchRecap();
    }, [userId]);

    // Show confetti on last slide
    useEffect(() => {
        if (currentSlide === totalSlides - 1) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [currentSlide]);

    // Navigation methods
    const goToSlide = useCallback((index) => {
        setDirection(index > currentSlide ? 1 : -1);
        setCurrentSlide(Math.max(0, Math.min(totalSlides - 1, index)));
    }, [currentSlide]);

    const nextSlide = useCallback(() => {
        if (currentSlide < totalSlides - 1) {
            setDirection(1);
            setCurrentSlide(prev => prev + 1);
        }
    }, [currentSlide]);

    const prevSlide = useCallback(() => {
        if (currentSlide > 0) {
            setDirection(-1);
            setCurrentSlide(prev => prev - 1);
        }
    }, [currentSlide]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nextSlide, prevSlide]);

    // Handle drag end for swipe
    const handleDragEnd = (_, info) => {
        const threshold = 50;
        if (info.offset.x < -threshold) {
            nextSlide();
        } else if (info.offset.x > threshold) {
            prevSlide();
        }
    };

    // Share handlers
    const handleShareLink = async () => {
        try {
            const response = await api('/api/recap/2025/share', {
                method: 'POST',
                body: JSON.stringify({ type: 'link' })
            });

            await navigator.clipboard.writeText(response.shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    // Save as image using html-to-image (better text rendering than html2canvas)
    const saveAsImage = async () => {
        if (!summaryRef.current || saving) return;

        setSaving(true);
        try {
            const node = summaryRef.current;
            const isDark = document.documentElement.classList.contains('dark');

            const dataUrl = await htmlToImage.toPng(node, {
                backgroundColor: isDark ? '#000000' : '#ffffff',
                pixelRatio: 2,
                style: {
                    transform: 'none'
                }
            });

            const link = document.createElement('a');
            link.download = `shiku-recap-2025-${user.name}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Save image error:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center text-black dark:text-white p-6">
                <h1 className="text-2xl font-bold mb-4">Recap 2025</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-center">{error}</p>
                <Link
                    to="/"
                    className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg font-medium transition-colors"
                >
                    Quay về trang chủ
                </Link>
            </div>
        );
    }

    if (!data) return null;

    const { user, social, cultivation, arena, topMoments, ranking } = data;

    return (
        <div className="min-h-screen bg-white dark:bg-black overflow-hidden transition-colors">
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-200 dark:from-neutral-900 via-transparent to-transparent" />
            </div>

            {/* Confetti */}
            {showConfetti && <Confetti count={80} />}

            {/* Music Player */}
            <MusicPlayer src="/assets/recap2025.mp3" />

            {/* Main content */}
            <motion.div
                ref={containerRef}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                style={{ x: dragX }}
                className="relative min-h-screen flex flex-col"
            >
                {/* Fixed Header Bar - transparent */}
                <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3">
                    {/* Back Button - Left */}
                    <Link
                        to="/"
                        className="flex items-center gap-1.5 px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm font-medium hidden sm:inline">Trang chủ</span>
                    </Link>

                    {/* Title - Center (hidden on mobile for space) */}
                    <h1 className="absolute left-1/2 -translate-x-1/2 text-base md:text-lg font-bold text-black dark:text-white">
                        RECAP 2025
                    </h1>

                    {/* Spacer for music controls on right (handled by MusicPlayer fixed position) */}
                    <div className="w-24"></div>
                </div>

                {/* Content Header - below fixed bar */}
                <div className="relative z-10 pt-16 pb-2 px-4 md:px-6">
                    <SlideProgress current={currentSlide} total={totalSlides} />
                </div>

                {/* Slides container */}
                <div className="flex-1 relative min-h-[60vh]">
                    {/* Slide 0: Welcome */}
                    <Slide isActive={currentSlide === 0} direction={direction}>
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="w-32 h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-black dark:border-white shadow-[0_0_40px_rgba(0,0,0,0.2)] dark:shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-6"
                        >
                            <img
                                src={user.avatarUrl || '/default-avatar.png'}
                                alt={user.name}
                                className="w-full h-full object-cover"
                            />
                        </motion.div>

                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl md:text-3xl lg:text-4xl font-bold text-black dark:text-white mb-2"
                        >
                            {user.name}
                        </motion.h2>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-lg text-neutral-600 dark:text-neutral-400 mb-4"
                        >
                            {cultivation.currentRealmName}
                        </motion.p>

                        {/* Membership duration */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="bg-neutral-100 dark:bg-neutral-900 rounded-xl px-6 py-3 mb-6 border border-neutral-200 dark:border-neutral-800 text-center"
                        >
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm">Thành viên Shiku</p>
                            <p className="text-black dark:text-white font-bold text-lg">
                                {user.membershipDays >= 365
                                    ? `${Math.floor(user.membershipDays / 365)} năm ${user.membershipDays % 365} ngày`
                                    : `${user.membershipDays || 0} ngày`
                                }
                            </p>
                        </motion.div>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="text-neutral-500 dark:text-neutral-400 text-center max-w-sm"
                        >
                            Một năm trên Shiku cùng đạo hữu. Hãy cùng nhìn lại hành trình tu luyện nào!
                        </motion.p>
                    </Slide>

                    {/* Slide 1: Social Stats Overview */}
                    <Slide isActive={currentSlide === 1} direction={direction}>
                        <h2 className="text-2xl font-bold text-black dark:text-white mb-8">Hoạt động xã hội</h2>

                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                            <StatCard label="Bài viết" value={social.totalPosts} delay={0} />
                            <StatCard label="Upvotes nhận" value={social.totalUpvotesReceived} delay={0.1} />
                            <StatCard label="Comments" value={social.commentsWritten} delay={0.2} />
                            <StatCard label="Bạn mới" value={social.newFriends} delay={0.3} />
                        </div>
                    </Slide>

                    {/* Slide 2: Top Post */}
                    <Slide isActive={currentSlide === 2} direction={direction}>
                        <h2 className="text-2xl font-bold text-black dark:text-white mb-6">Bài viết nổi bật nhất</h2>

                        {topMoments.topPost ? (
                            <motion.div
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="w-full max-w-sm bg-neutral-100 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6"
                            >
                                <h3 className="text-lg font-semibold text-black dark:text-white mb-4 line-clamp-2">
                                    {topMoments.topPost.title}
                                </h3>

                                <div className="flex justify-between text-sm">
                                    <span className="text-black dark:text-white font-medium">
                                        {topMoments.topPost.upvoteCount} upvotes
                                    </span>
                                    <span className="text-neutral-500 dark:text-neutral-400">
                                        {topMoments.topPost.views?.toLocaleString('vi-VN') || 0} views
                                    </span>
                                </div>
                            </motion.div>
                        ) : (
                            <p className="text-neutral-500 dark:text-neutral-400">Chưa có bài viết nào trong năm 2025</p>
                        )}
                    </Slide>

                    {/* Slide 3: Top Interactor */}
                    <Slide isActive={currentSlide === 3} direction={direction}>
                        <h2 className="text-2xl font-bold text-black dark:text-white mb-6">Người tương tác nhiều nhất</h2>

                        {topMoments.topInteractor ? (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex flex-col items-center"
                            >
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-neutral-300 dark:border-neutral-600 mb-4">
                                    <img
                                        src={topMoments.topInteractor.avatarUrl || '/default-avatar.png'}
                                        alt={topMoments.topInteractor.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                                    {topMoments.topInteractor.name}
                                </h3>

                                <p className="text-neutral-600 dark:text-neutral-400">
                                    {topMoments.topInteractor.interactionCount} lần tương tác
                                </p>
                            </motion.div>
                        ) : (
                            <p className="text-neutral-500 dark:text-neutral-400">Chưa có dữ liệu tương tác</p>
                        )}
                    </Slide>

                    {/* Slide 4: Cultivation Journey */}
                    <Slide isActive={currentSlide === 4} direction={direction}>
                        <h2 className="text-2xl font-bold text-black dark:text-white mb-8">Hành trình tu luyện</h2>

                        {cultivation.hasData ? (
                            <div className="w-full max-w-sm space-y-6">
                                <motion.div
                                    initial={{ x: -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex items-center gap-4 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-xl border-l-4 border-black dark:border-white"
                                >
                                    <div className="text-4xl">
                                        <span role="img" aria-label="realm"></span>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">Cảnh giới hiện tại</p>
                                        <p className="text-xl font-bold text-black dark:text-white">
                                            {cultivation.currentRealmName}
                                        </p>
                                    </div>
                                </motion.div>

                                <div className="grid grid-cols-2 gap-4">
                                    <StatCard label="Tu vi" value={cultivation.totalExp} delay={0.2} />
                                    <StatCard label="Linh thạch" value={cultivation.spiritStones} delay={0.3} />
                                    <StatCard label="Nhiệm vụ hoàn thành" value={cultivation.questsCompleted.total} delay={0.4} />
                                    <StatCard label="Vật phẩm" value={cultivation.inventoryCount} delay={0.5} />
                                </div>
                            </div>
                        ) : (
                            <p className="text-neutral-500 dark:text-neutral-400">Chưa bước vào con đường tu tiên</p>
                        )}
                    </Slide>

                    {/* Slide 5: Arena Stats */}
                    <Slide isActive={currentSlide === 5} direction={direction}>
                        <h2 className="text-2xl font-bold text-black dark:text-white mb-8">Thành tích Võ Đài</h2>

                        {arena.hasData ? (
                            <div className="w-full max-w-sm space-y-6">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-center p-6 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800"
                                >
                                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-2">Hạng hiện tại</p>
                                    <p className="text-3xl font-bold text-black dark:text-white">
                                        {arena.currentTierName}
                                    </p>
                                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">{arena.currentMmr} MMR</p>
                                </motion.div>

                                <div className="grid grid-cols-3 gap-3">
                                    <StatCard label="Thắng" value={arena.wins} delay={0.2} />
                                    <StatCard label="Thua" value={arena.losses} delay={0.3} />
                                    <StatCard label="Win Rate" value={`${arena.winRate}%`} delay={0.4} />
                                </div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-center p-4 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800"
                                >
                                    <p className="text-black dark:text-white font-medium">
                                        Chuỗi thắng dài nhất: {arena.longestWinStreak} trận
                                    </p>
                                </motion.div>
                            </div>
                        ) : (
                            <p className="text-neutral-500 dark:text-neutral-400">Chưa tham gia Võ Đài</p>
                        )}
                    </Slide>

                    {/* Slide 6: Community Ranking */}
                    <Slide isActive={currentSlide === 6} direction={direction}>
                        <h2 className="text-2xl font-bold text-black dark:text-white mb-8">Xếp hạng cộng đồng</h2>

                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', damping: 10 }}
                            className="relative w-48 h-48 mb-8"
                        >
                            {/* Circular progress background */}
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    className="text-neutral-200 dark:text-neutral-800"
                                    strokeWidth="8"
                                />
                                <motion.circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    className="text-black dark:text-white"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    initial={{ strokeDasharray: '0 283' }}
                                    animate={{ strokeDasharray: `${ranking.postPercentile * 2.83} 283` }}
                                    transition={{ duration: 1.5, delay: 0.3 }}
                                />
                            </svg>

                            {/* Percentage text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-black dark:text-white">
                                    Top {100 - ranking.postPercentile}%
                                </span>
                                <span className="text-neutral-500 dark:text-neutral-400 text-sm">người dùng tích cực</span>
                            </div>
                        </motion.div>

                        {ranking.isTopPerformer && (
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="text-black dark:text-white font-medium text-center"
                            >
                                Đạo hữu là một trong những tu sĩ tích cực nhất Shiku!
                            </motion.p>
                        )}
                    </Slide>

                    {/* Slide 7: Summary & Share */}
                    <Slide isActive={currentSlide === 7} direction={direction}>
                        <div
                            ref={summaryRef}
                            data-summary-ref
                            style={{
                                display: 'block',
                                textAlign: 'center',
                                padding: '24px',
                                width: '380px',
                                boxSizing: 'border-box'
                            }}
                            className="bg-white dark:bg-black"
                        >
                            {/* User Avatar + Name */}
                            <div style={{ marginBottom: '16px' }}>
                                <img
                                    src={user.avatarUrl || '/default-avatar.png'}
                                    alt={user.name}
                                    crossOrigin="anonymous"
                                    style={{
                                        width: '72px',
                                        height: '72px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        margin: '0 auto 10px',
                                        display: 'block',
                                        border: '3px solid'
                                    }}
                                    className="border-black dark:border-white"
                                />
                                <p style={{ fontSize: '20px', fontWeight: '700', lineHeight: '28px', margin: 0 }} className="text-black dark:text-white">
                                    {user.name}
                                </p>
                            </div>

                            <p style={{ fontSize: '15px', lineHeight: '22px', textAlign: 'center', marginBottom: '18px' }} className="text-neutral-600 dark:text-neutral-400">
                                Một năm tu luyện cùng Shiku!
                            </p>

                            {/* Quick Stats */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%', marginBottom: '14px' }}>
                                <div style={{ flex: '1 1 45%', padding: '14px 12px', borderRadius: '12px', textAlign: 'center' }} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                    <p style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '28px', margin: 0 }} className="text-black dark:text-white">{social.totalPosts}</p>
                                    <p style={{ fontSize: '12px', lineHeight: '16px', margin: 0 }} className="text-neutral-500">Bài viết</p>
                                </div>
                                <div style={{ flex: '1 1 45%', padding: '14px 12px', borderRadius: '12px', textAlign: 'center' }} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                    <p style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '28px', margin: 0 }} className="text-black dark:text-white">{social.totalUpvotesReceived}</p>
                                    <p style={{ fontSize: '12px', lineHeight: '16px', margin: 0 }} className="text-neutral-500">Upvotes</p>
                                </div>
                                <div style={{ flex: '1 1 45%', padding: '14px 12px', borderRadius: '12px', textAlign: 'center' }} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                    <p style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: '20px', margin: 0 }} className="text-black dark:text-white">{cultivation.currentRealmName}</p>
                                    <p style={{ fontSize: '12px', lineHeight: '16px', margin: 0 }} className="text-neutral-500">Cảnh giới</p>
                                </div>
                                <div style={{ flex: '1 1 45%', padding: '14px 12px', borderRadius: '12px', textAlign: 'center' }} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                    <p style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '28px', margin: 0 }} className="text-black dark:text-white">Top {100 - ranking.postPercentile}%</p>
                                    <p style={{ fontSize: '12px', lineHeight: '16px', margin: 0 }} className="text-neutral-500">Hoạt động</p>
                                </div>
                            </div>

                            <p style={{ fontSize: '12px', lineHeight: '16px' }} className="text-neutral-400">
                                shiku.click • Recap 2025
                            </p>
                        </div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex gap-3 w-full max-w-sm mt-4"
                        >
                            <button
                                onClick={handleShareLink}
                                className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                            >
                                {copied ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Đã copy!
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="18" cy="5" r="3" />
                                            <circle cx="6" cy="12" r="3" />
                                            <circle cx="18" cy="19" r="3" />
                                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                        </svg>
                                        Chia sẻ
                                    </>
                                )}
                            </button>

                            <button
                                onClick={saveAsImage}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-neutral-200 dark:border-neutral-700"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        Lưu ảnh
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </Slide>
                </div>

                {/* Navigation buttons */}
                <div className="relative z-10 pb-8 px-6">
                    <div className="flex justify-between items-center max-w-sm mx-auto">
                        <button
                            onClick={prevSlide}
                            disabled={currentSlide === 0}
                            className={`px-6 py-3 rounded-xl font-medium transition-all ${currentSlide === 0
                                ? 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed'
                                : 'text-black dark:text-white bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800'
                                }`}
                        >
                            Trước
                        </button>

                        <span className="text-neutral-500 dark:text-neutral-400 text-sm">
                            {currentSlide + 1} / {totalSlides}
                        </span>

                        <button
                            onClick={nextSlide}
                            disabled={currentSlide === totalSlides - 1}
                            className={`px-6 py-3 rounded-xl font-medium transition-all ${currentSlide === totalSlides - 1
                                ? 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed'
                                : 'text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100'
                                }`}
                        >
                            Tiếp
                        </button>
                    </div>
                </div>
            </motion.div >
        </div >
    );
}
