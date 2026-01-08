import { motion } from 'framer-motion';
import { memo } from 'react';

const RARITY_COLORS = {
    common: { border: 'border-slate-600', shadow: 'shadow-slate-500/20', bg: 'bg-slate-800' },
    uncommon: { border: 'border-emerald-500', shadow: 'shadow-emerald-500/40', bg: 'bg-emerald-900' },
    rare: { border: 'border-blue-500', shadow: 'shadow-blue-500/40', bg: 'bg-blue-900' },
    epic: { border: 'border-purple-500', shadow: 'shadow-purple-500/40', bg: 'bg-purple-900' },
    legendary: { border: 'border-amber-500', shadow: 'shadow-amber-500/40', bg: 'bg-amber-900' },
    mythic: { border: 'border-rose-500', shadow: 'shadow-rose-500/40', bg: 'bg-rose-900' },
};

const Furnace = memo(({ selectedMaterials, onRemoveMaterial, crafting }) => {
    // 5 slots arranged in a pentagon or circle
    // Coordinates for 5 slots around a center (100px radius)
    // 0: Top (0, -100)
    // 1: Top Right (95, -31)
    // 2: Bottom Right (59, 81)
    // 3: Bottom Left (-59, 81)
    // 4: Top Left (-95, -31)

    // Adjusted for CSS positioning (translate from center)
    const slotPositions = [
        { top: '0%', left: '50%', transform: 'translate(-50%, -50%)' },          // Top
        { top: '30%', left: '90%', transform: 'translate(-50%, -50%)' },          // Right Top
        { top: '80%', left: '75%', transform: 'translate(-50%, -50%)' },          // Right Bottom
        { top: '80%', left: '25%', transform: 'translate(-50%, -50%)' },          // Left Bottom
        { top: '30%', left: '10%', transform: 'translate(-50%, -50%)' },          // Left Top
    ];

    return (
        <div className="relative w-full aspect-square max-w-[400px] mx-auto my-4">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-orange-900/10 rounded-full blur-3xl animate-pulse" />

            {/* Central Furnace Image */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 z-10">
                <motion.img
                    src="/assets/loluyen.jpg"
                    alt="Lò Luyện"
                    className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                    animate={crafting ? {
                        scale: [1, 1.05, 1],
                        rotate: [0, 1, -1, 0],
                        filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
                    } : {
                        y: [0, -5, 0]
                    }}
                    transition={crafting ? {
                        duration: 0.5,
                        repeat: Infinity
                    } : {
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Fire Effect Overlay */}
                {crafting && (
                    <div className="absolute inset-0 bg-orange-500/20 blur-xl animate-pulse rounded-full mix-blend-screen" />
                )}
            </div>

            {/* Material Slots */}
            {Array.from({ length: 5 }).map((_, index) => {
                const material = selectedMaterials[index];
                const rarity = material ? (RARITY_COLORS[material.rarity] || RARITY_COLORS.common) : null;

                return (
                    <div
                        key={index}
                        className="absolute w-16 h-16 z-20"
                        style={slotPositions[index]}
                    >
                        {/* Slot Placeholder or Material */}
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={() => material && onRemoveMaterial(material)}
                            disabled={!material}
                            className={`w-full h-full rounded-full border-2 flex items-center justify-center overflow-hidden transition-all bg-black/60 backdrop-blur-sm
                                ${material
                                    ? `${rarity.border} ${rarity.shadow} shadow-lg ring-2 ring-white/10`
                                    : 'border-slate-700/50 border-dashed hover:border-slate-500/80 shadow-inner'
                                }`
                            }
                        >
                            {material ? (
                                <>
                                    <img
                                        src={`/assets/materials/${material.templateId}.jpg`}
                                        alt={material.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.src = '/assets/materials/mat_iron_ore.jpg'; }}
                                    />
                                    {/* Level Badge */}
                                    <div className="absolute -bottom-1 -right-1 bg-black/80 text-[10px] text-white px-1.5 rounded-full border border-white/20">
                                        P{material.tier}
                                    </div>
                                </>
                            ) : (
                                <span className="text-slate-600 text-2xl font-thin">+</span>
                            )}
                        </motion.button>

                        {/* Connection Line to Center (Optional visual flair) */}
                        {material && (
                            <div
                                className="absolute top-1/2 left-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent -z-10"
                                style={{
                                    transformOrigin: 'left center',
                                    transform: `rotate(${index * 72 + 180 + 90}deg) translate(2rem, 0)` // Rough calc, might need tweaking based on exact layout
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
});

export default Furnace;
