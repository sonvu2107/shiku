/**
 * Combat Tab - Combined PK + Arena + Leaderboard
 * Chiến Đấu - Wrapper component with sub-tabs
 */
import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import PKTab from './PKTab';
import ArenaTab from './ArenaTab';

const CombatTab = memo(function CombatTab({ onSwitchTab, isAdmin }) {
    const [activeSubTab, setActiveSubTab] = useState('pk');

    const subTabs = [
        { id: 'pk', label: 'Luận Võ' },
        { id: 'arena', label: 'Võ Đài' }
    ];

    // Handle internal sub-tab switching (for arena -> pk flow)
    const handleInternalSwitch = (tabId) => {
        if (tabId === 'pk' || tabId === 'arena') {
            setActiveSubTab(tabId);
        } else if (onSwitchTab) {
            // If it's not a combat sub-tab, pass to parent
            onSwitchTab(tabId);
        }
    };

    return (
        <div className="space-y-4">
            {/* Sub-tabs navigation */}
            <div className="flex justify-center gap-2">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeSubTab === tab.id
                            ? 'bg-amber-600 text-amber-100 shadow-lg shadow-amber-900/40 border border-amber-400/50'
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub-tab content */}
            <motion.div
                key={activeSubTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeSubTab === 'pk' && <PKTab onSwitchTab={handleInternalSwitch} />}
                {activeSubTab === 'arena' && <ArenaTab onSwitchTab={handleInternalSwitch} />}
            </motion.div>
        </div>
    );
});

export default CombatTab;
