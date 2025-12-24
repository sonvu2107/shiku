import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ChristmasDecorations - Hiệu ứng trang trí Noel theo phong cách minimal của Shiku
 * Sử dụng màu đen/trắng/neutral để phù hợp với design system
 */

// Snowflake component - hạt tuyết rơi
const Snowflake = ({ style, size = 'md' }) => {
    const sizeMap = {
        sm: 'w-1.5 h-1.5',
        md: 'w-2 h-2',
        lg: 'w-2.5 h-2.5',
        xl: 'w-3 h-3'
    };

    return (
        <motion.div
            className={`fixed z-50 pointer-events-none ${sizeMap[size]} rounded-full bg-neutral-400 dark:bg-white/80`}
            style={{
                ...style,
                boxShadow: '0 0 4px rgba(255,255,255,0.8), 0 0 8px rgba(255,255,255,0.4)'
            }}
            initial={{ y: -20, opacity: 0 }}
            animate={{
                y: '100vh',
                opacity: [0, 1, 1, 0],
                x: [0, 20, -20, 15, -10, 0]
            }}
            transition={{
                duration: style.duration || 8,
                ease: 'linear',
                repeat: Infinity,
                delay: style.delay || 0
            }}
        />
    );
};

// Snow overlay - tuyết phủ nhẹ ở góc
const SnowCorner = ({ position = 'top-right' }) => {
    const positionClasses = {
        'top-right': 'top-0 right-0',
        'top-left': 'top-0 left-0',
        'bottom-right': 'bottom-0 right-0',
        'bottom-left': 'bottom-0 left-0'
    };

    const gradientDirection = {
        'top-right': 'from-neutral-200/20 via-transparent to-transparent',
        'top-left': 'from-neutral-200/20 via-transparent to-transparent',
        'bottom-right': 'from-transparent via-transparent to-neutral-200/10',
        'bottom-left': 'from-transparent via-transparent to-neutral-200/10'
    };

    return (
        <div
            className={`fixed ${positionClasses[position]} w-32 h-32 pointer-events-none z-0`}
        >
            <div className={`w-full h-full bg-gradient-to-br ${gradientDirection[position]} dark:from-neutral-800/20 dark:to-transparent rounded-bl-full`} />
        </div>
    );
};

// Rainbow colors for Christmas lights
const RAINBOW_COLORS = [
    '#FF0000', // Red
    '#FF7F00', // Orange
    '#FFFF00', // Yellow
    '#00FF00', // Green
    '#0000FF', // Blue
    '#4B0082', // Indigo
    '#9400D3', // Violet
];

// Christmas Light Bulb component - bóng đèn realistic
const LightBulb = ({ color, delay = 0, isOn = true }) => {
    // Softer colors for more realistic look
    const glowColor = color;
    const bulbColor = isOn ? color : '#333';

    return (
        <motion.div
            className="relative flex flex-col items-center"
            animate={isOn ? {
                opacity: [0.7, 1, 0.7],
            } : {}}
            transition={{
                duration: 0.8 + Math.random() * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: delay
            }}
        >
            {/* Socket/Cap - phần đui đèn */}
            <div className="w-2.5 h-2 bg-gradient-to-b from-neutral-500 to-neutral-600 dark:from-neutral-400 dark:to-neutral-500 rounded-t-sm relative z-10">
                {/* Socket ring */}
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-1 bg-neutral-600 dark:bg-neutral-500 rounded-sm" />
            </div>

            {/* Outer Glow - ánh sáng tỏa ra */}
            {isOn && (
                <>
                    <div
                        className="absolute rounded-full blur-xl"
                        style={{
                            width: '40px',
                            height: '40px',
                            top: '8px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: glowColor,
                            opacity: 0.4,
                        }}
                    />
                    <div
                        className="absolute rounded-full blur-md"
                        style={{
                            width: '24px',
                            height: '24px',
                            top: '12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: glowColor,
                            opacity: 0.6,
                        }}
                    />
                </>
            )}

            {/* Bulb body - thân bóng đèn */}
            <div
                className="relative w-4 h-5 rounded-b-full"
                style={{
                    background: isOn
                        ? `radial-gradient(circle at 30% 30%, ${color}ff, ${color}cc 50%, ${color}99 100%)`
                        : 'linear-gradient(180deg, #444 0%, #333 100%)',
                    boxShadow: isOn
                        ? `0 0 15px ${color}, 0 0 30px ${color}60, inset 0 -5px 10px ${color}40`
                        : 'inset 0 -3px 6px rgba(0,0,0,0.3)',
                }}
            >
                {/* Glass reflection - phản chiếu kính */}
                <div
                    className="absolute top-1 left-1 w-1.5 h-2 rounded-full"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)',
                    }}
                />

                {/* Inner filament glow */}
                {isOn && (
                    <div
                        className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-2 rounded-full"
                        style={{
                            backgroundColor: '#fff',
                            opacity: 0.8,
                            filter: 'blur(1px)',
                        }}
                    />
                )}
            </div>
        </motion.div>
    );
};

// String of Christmas Lights - đèn treo lơ lửng từ trên xuống
const ChristmasLights = () => {
    const lights = useMemo(() => {
        const count = 20;
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            color: RAINBOW_COLORS[i % RAINBOW_COLORS.length],
            stringLength: 25 + Math.random() * 35, // Random string length 25-60px
            delay: Math.random() * 3,
            swayDuration: 3 + Math.random() * 2,
            swayAmount: 2 + Math.random() * 3
        }));
    }, []);

    return (
        <div className="fixed top-0 left-0 right-0 pointer-events-none z-30 hidden md:block">
            <div className="flex justify-around px-4">
                {lights.map((light) => (
                    <motion.div
                        key={light.id}
                        className="flex flex-col items-center"
                        animate={{
                            rotate: [-light.swayAmount, light.swayAmount, -light.swayAmount]
                        }}
                        transition={{
                            duration: light.swayDuration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        style={{ transformOrigin: 'top center' }}
                    >
                        {/* String/Wire - dây treo */}
                        <div
                            className="w-px bg-gradient-to-b from-neutral-500 to-neutral-400 dark:from-neutral-500 dark:to-neutral-600"
                            style={{ height: `${light.stringLength}px` }}
                        />

                        {/* Light Bulb */}
                        <LightBulb
                            color={light.color}
                            delay={light.delay}
                            isOn={true}
                        />
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// Hanging ornament - quả cầu treo minimal
const HangingOrnament = ({ delay = 0, left = '10%' }) => {
    return (
        <motion.div
            className="fixed top-0 pointer-events-none z-20 hidden md:block"
            style={{ left }}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ delay, duration: 0.5, type: 'spring', bounce: 0.3 }}
        >
            {/* String */}
            <div className="w-px h-12 bg-neutral-300 dark:bg-neutral-700 mx-auto" />

            {/* Ornament ball */}
            <motion.div
                className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 mx-auto shadow-sm"
                animate={{
                    rotate: [0, 5, -5, 3, -3, 0],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: delay + 0.5
                }}
            >
                {/* Shine effect */}
                <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-white/30 dark:bg-white/10" />
            </motion.div>
        </motion.div>
    );
};

// Star decoration - ngôi sao minimal
const Star = ({ size = 16, className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
    >
        <path d="M12 2L14.5 9H22L16 13.5L18.5 21L12 16.5L5.5 21L8 13.5L2 9H9.5L12 2Z" />
    </svg>
);

// Floating star - ngôi sao bay lơ lửng
const FloatingStar = ({ style, size = 12 }) => {
    return (
        <motion.div
            className="fixed pointer-events-none text-neutral-300 dark:text-neutral-700"
            style={style}
            animate={{
                y: [0, -10, 0],
                opacity: [0.3, 0.6, 0.3],
                rotate: [0, 180, 360]
            }}
            transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: style.delay || 0
            }}
        >
            <Star size={size} />
        </motion.div>
    );
};

// Christmas greeting banner - Banner chúc mừng
const ChristmasBanner = ({ onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    // Check localStorage for dismissal
    useEffect(() => {
        try {
            const dismissed = localStorage.getItem('christmas-banner-2024');
            if (dismissed === 'true') {
                setIsVisible(false);
            }
        } catch { }
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        try {
            localStorage.setItem('christmas-banner-2024', 'true');
        } catch { }
        onClose?.();
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed top-20 md:top-20 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm"
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.3 }}
            >
                <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-lg dark:shadow-2xl p-4 flex items-center gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <span className="text-lg">🎄</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            Merry Christmas!
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Shiku chúc bạn Giáng sinh an lành!
                        </p>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-colors"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

/**
 * Main ChristmasDecorations component
 * @param {boolean} enableSnow - Bật/tắt tuyết rơi
 * @param {boolean} enableOrnaments - Bật/tắt quả cầu treo
 * @param {boolean} enableBanner - Bật/tắt banner chúc mừng
 * @param {boolean} enableStars - Bật/tắt ngôi sao lơ lửng
 * @param {boolean} enableLights - Bật/tắt dây đèn 7 màu
 * @param {number} snowflakeCount - Số lượng hạt tuyết (mặc định: 40)
 */
const ChristmasDecorations = ({
    enableSnow = true,
    enableOrnaments = false,
    enableBanner = true,
    enableStars = true,
    enableLights = true,
    snowflakeCount = 40
}) => {
    // Generate snowflakes with random positions
    const snowflakes = useMemo(() => {
        return Array.from({ length: snowflakeCount }, (_, i) => ({
            id: i,
            style: {
                left: `${Math.random() * 100}%`,
                delay: Math.random() * 8,
                duration: 5 + Math.random() * 5
            },
            size: ['sm', 'md', 'lg', 'xl'][Math.floor(Math.random() * 4)]
        }));
    }, [snowflakeCount]);

    // Generate floating stars
    const stars = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => ({
            id: i,
            style: {
                left: `${15 + i * 20}%`,
                top: `${20 + Math.random() * 40}%`,
                delay: i * 0.5
            },
            size: 8 + Math.floor(Math.random() * 8)
        }));
    }, []);

    // Ornament positions
    const ornamentPositions = ['15%', '35%', '65%', '85%'];

    // Reduce animations on mobile for performance
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Reduce snowflakes on mobile
    const displayedSnowflakes = isMobile ? snowflakes.slice(0, 15) : snowflakes;

    return (
        <>
            {/* Snow corners - subtle snow effect at corners */}
            <SnowCorner position="top-right" />
            <SnowCorner position="top-left" />

            {/* Christmas Lights - 7 color blinking lights */}
            {enableLights && <ChristmasLights />}

            {/* Snowflakes */}
            {enableSnow && displayedSnowflakes.map(flake => (
                <Snowflake key={flake.id} style={flake.style} size={flake.size} />
            ))}

            {/* Hanging ornaments - only on desktop */}
            {enableOrnaments && !isMobile && ornamentPositions.map((pos, i) => (
                <HangingOrnament key={i} left={pos} delay={i * 0.2} />
            ))}

            {/* Floating stars */}
            {enableStars && !isMobile && stars.map(star => (
                <FloatingStar key={star.id} style={star.style} size={star.size} />
            ))}

            {/* Christmas banner */}
            {enableBanner && <ChristmasBanner />}
        </>
    );
};

export default ChristmasDecorations;
