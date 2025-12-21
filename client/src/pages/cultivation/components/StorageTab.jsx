/**
 * Storage Tab - Combined Shop + Inventory
 * Kho Báu - Wrapper component with sub-tabs
 */
import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import ShopTab from './ShopTab';
import InventoryTab from './InventoryTab';

const StorageTab = memo(function StorageTab() {
    const [activeSubTab, setActiveSubTab] = useState('shop');

    const subTabs = [
        { id: 'shop', label: 'Cửa Hàng' },
        { id: 'inventory', label: 'Túi Đồ' }
    ];

    return (
        <div className="space-y-4">
            {/* Sub-tabs navigation */}
            <div className="flex justify-center gap-2">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeSubTab === tab.id
                                ? 'bg-amber-600 text-amber-100 shadow-lg shadow-amber-900/30'
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
                {activeSubTab === 'shop' && <ShopTab />}
                {activeSubTab === 'inventory' && <InventoryTab />}
            </motion.div>
        </div>
    );
});

export default StorageTab;
