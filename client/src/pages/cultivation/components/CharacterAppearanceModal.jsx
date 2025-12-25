/**
 * Character Appearance Modal - Choose character appearance (Tiên/Ma, Nam/Nữ)
 * Cooldown: 7 days between changes
 */
import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock } from 'lucide-react';

const CHARACTER_OPTIONS = [
    { id: 'Immortal_male', label: 'Tiên Đạo/Nam', image: '/assets/avatar_characters/Immortal_male.jpg' },
    { id: 'Immortal_female', label: 'Tiên Đạo/Nữ', image: '/assets/avatar_characters/Immortal_female.jpg' },
    { id: 'Demon_male', label: 'Ma Đạo/Nam', image: '/assets/avatar_characters/Demon_male.jpg' },
    { id: 'Demon_female', label: 'Ma Đạo/Nữ', image: '/assets/avatar_characters/Demon_female.jpg' }
];

const CharacterAppearanceModal = memo(function CharacterAppearanceModal({
    isOpen,
    onClose,
    currentAppearance = 'Immortal_male',
    lastChangeAt,
    onSave
}) {
    const [selected, setSelected] = useState(currentAppearance);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Check cooldown (7 days)
    const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const canChange = !lastChangeAt || (now.getTime() - new Date(lastChangeAt).getTime() >= COOLDOWN_MS);

    const getRemainingDays = () => {
        if (!lastChangeAt) return 0;
        const remaining = COOLDOWN_MS - (now.getTime() - new Date(lastChangeAt).getTime());
        return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
    };

    const handleSave = async () => {
        if (!canChange && selected !== currentAppearance) {
            setError(`Bạn cần đợi ${getRemainingDays()} ngày nữa để đổi hình tượng`);
            return;
        }

        if (selected === currentAppearance) {
            onClose();
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave(selected);
            onClose();
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra khi lưu');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    className="bg-slate-900 border-2 border-amber-500/40 rounded-xl sm:rounded-2xl p-3 sm:p-5 w-full max-w-[320px] sm:max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-cultivation"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base sm:text-lg font-bold text-amber-400">Chọn Hình Tượng</h3>
                        <button
                            onClick={onClose}
                            className="p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Cooldown Warning */}
                    {!canChange && (
                        <div className="mb-3 p-2 sm:p-3 bg-amber-900/30 border border-amber-500/30 rounded-lg flex items-center gap-2">
                            <Clock size={16} className="text-amber-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-amber-300">
                                Có thể đổi sau {getRemainingDays()} ngày
                            </span>
                        </div>
                    )}

                    {/* Character Options Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
                        {CHARACTER_OPTIONS.map((char) => (
                            <button
                                key={char.id}
                                onClick={() => setSelected(char.id)}
                                disabled={!canChange && char.id !== currentAppearance}
                                className={`relative rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all ${selected === char.id
                                    ? 'border-amber-500 ring-2 ring-amber-500/30'
                                    : 'border-slate-700 hover:border-slate-600'
                                    } ${!canChange && char.id !== currentAppearance ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <img
                                    src={char.image}
                                    alt={char.label}
                                    className="w-full aspect-square object-cover object-top"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 text-center">
                                    <span className={`text-[10px] sm:text-xs font-bold ${selected === char.id ? 'text-amber-400' : 'text-slate-300'}`}>
                                        {char.label}
                                    </span>
                                </div>
                                {selected === char.id && (
                                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-amber-500 rounded-full flex items-center justify-center">
                                        <Check size={12} className="text-black" />
                                    </div>
                                )}
                                {char.id === currentAppearance && (
                                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 px-1.5 py-0.5 bg-slate-800/80 rounded text-[8px] sm:text-[10px] text-slate-300">
                                        Hiện tại
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-3 p-2 bg-red-900/30 border border-red-500/30 rounded-lg">
                            <p className="text-xs text-red-400 text-center">{error}</p>
                        </div>
                    )}

                    {/* Info */}
                    <p className="text-[10px] sm:text-xs text-slate-500 text-center mb-3">
                        Sau khi thay đổi, bạn cần đợi 7 ngày để đổi lại
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 sm:gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg sm:rounded-xl transition-colors font-medium text-sm"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || (selected === currentAppearance)}
                            className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg sm:rounded-xl transition-colors font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Đang lưu...' : 'Xác nhận'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

export default CharacterAppearanceModal;
