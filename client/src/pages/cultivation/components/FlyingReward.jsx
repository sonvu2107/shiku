import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * FlyingReward - Hiệu ứng vật phẩm bay khi nhận thưởng
 * @param {Object} startPos - Vị trí bắt đầu {x, y}
 * @param {Array} rewards - Danh sách phần thưởng [{ type: 'exp' | 'stone', amount: number }]
 * @param {Function} onComplete - Callback khi hiệu ứng kết thúc
 */
const FlyingReward = ({ startPos, targetPos, rewards, onComplete, inline = false }) => {
    const [items, setItems] = useState([]);

    useEffect(() => {
        // Tạo các particle items từ rewards
        const newItems = [];

        rewards.forEach((reward, rewardIndex) => {
            // Số lượng particle tùy thuộc vào amount, tối đa 5-7 particle mỗi loại
            const particleCount = Math.min(5, Math.max(1, Math.floor(reward.amount / 10)));

            for (let i = 0; i < particleCount; i++) {
                newItems.push({
                    id: `${reward.type}-${rewardIndex}-${i}-${Date.now()}`,
                    type: reward.type,
                    x: startPos.x + (Math.random() * 40 - 20), // Random spread X
                    y: startPos.y + (Math.random() * 20 - 10), // Random spread Y
                    delay: i * 0.05 + rewardIndex * 0.1, // Stagger delays
                });
            }
        });

        setItems(newItems);

        // Tự động cleanup sau khi animation xong (2s)
        const timer = setTimeout(onComplete, 2000);
        return () => clearTimeout(timer);
    }, [startPos, rewards, onComplete]);

    const content = (
        <div className={`${inline ? 'absolute inset-0' : 'fixed inset-0'} pointer-events-none z-[9999] overflow-hidden`}>
            <AnimatePresence>
                {items.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{
                            x: item.x,
                            y: item.y,
                            opacity: 0,
                            scale: 0.5
                        }}
                        animate={{
                            x: targetPos ? targetPos.x : (window.innerWidth > 768 ? window.innerWidth - 300 : window.innerWidth - 100),
                            y: targetPos ? targetPos.y : 50,
                            opacity: [0, 1, 1, 0],
                            scale: [0.5, 1.2, 0.8]
                        }}
                        transition={{
                            duration: 1.2,
                            ease: "easeOut",
                            delay: item.delay
                        }}
                        className="absolute flex items-center justify-center"
                    >
                        {item.type === 'exp' ? (
                            <div className="w-6 h-6 rounded-full bg-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.6)] border border-amber-300 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white">
                                Exp
                            </div>
                        ) : (
                            <div className="w-5 h-5 rotate-45 bg-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.6)] border border-emerald-300 backdrop-blur-sm flex items-center justify-center">
                                <div className="-rotate-45 w-2 h-2 bg-emerald-100 rounded-full opacity-70"></div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );

    // Render local hoặc portal
    if (inline) return content;
    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
};

export default FlyingReward;
