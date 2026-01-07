/**
 * Gift Code Tab - Nhập mã quà tặng và xem lịch sử
 */
import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCultivation } from '../../../hooks/useCultivation.jsx';
import LoadingSkeleton from './LoadingSkeleton.jsx';

const GiftCodeTab = memo(function GiftCodeTab() {
  const { redeemGiftCode, loadGiftCodeHistory, loading: contextLoading } = useCultivation();
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('redeem'); // 'redeem' | 'history'

  // Load lịch sử khi chuyển tab
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await loadGiftCodeHistory();
      setHistory(data?.history || []);
    } catch (err) {
      console.error('Failed to load gift code history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRedeem = async () => {
    if (!code.trim()) return;

    setRedeeming(true);
    setResult(null);
    try {
      const data = await redeemGiftCode(code.trim().toUpperCase());
      setResult({
        success: true,
        rewards: data.rewards,
        message: 'Đổi mã thành công!'
      });
      setCode('');
      // Reload history nếu đang ở tab history
      if (activeTab === 'history') {
        loadHistory();
      }
    } catch (err) {
      setResult({
        success: false,
        message: err.message || 'Có lỗi xảy ra'
      });
    } finally {
      setRedeeming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRedeem();
    }
  };

  // Format rewards cho hiển thị
  const formatRewards = (rewards) => {
    if (!rewards) return [];
    const items = [];
    if (rewards.spiritStones > 0) {
      items.push({ type: 'spiritStones', label: 'Linh Thạch', amount: rewards.spiritStones, icon: '' });
    }
    if (rewards.exp > 0) {
      items.push({ type: 'exp', label: 'Tu Vi', amount: rewards.exp, icon: '' });
    }
    if (rewards.items && rewards.items.length > 0) {
      rewards.items.forEach(item => {
        items.push({ type: 'item', label: item.name || 'Vật phẩm', amount: item.quantity || 1, icon: '' });
      });
    }
    return items;
  };

  if (contextLoading) {
    return <LoadingSkeleton type="simple" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-amber-200 mb-2">Mã Quà Tặng</h2>
        <p className="text-gray-400 text-sm">Nhập mã để nhận phần thưởng đặc biệt</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('redeem')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'redeem'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Nhập Mã
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Lịch Sử
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'redeem' ? (
          <motion.div
            key="redeem"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Input Section */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <label className="block text-gray-300 mb-2 font-medium">Mã Quà Tặng</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyPress}
                  placeholder="Nhập mã tại đây..."
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase tracking-widest text-center text-lg font-mono"
                  maxLength={20}
                  disabled={redeeming}
                />
                <motion.button
                  onClick={handleRedeem}
                  disabled={redeeming || !code.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-6 py-3 rounded-lg font-bold transition-all ${
                    redeeming || !code.trim()
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
                  }`}
                >
                  {redeeming ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang đổi...
                    </span>
                  ) : 'Đổi Mã'}
                </motion.button>
              </div>
            </div>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`rounded-xl p-4 border ${
                    result.success
                      ? 'bg-green-900/30 border-green-600'
                      : 'bg-red-900/30 border-red-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{result.success ? '' : ''}</span>
                    <span className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                      {result.message}
                    </span>
                  </div>

                  {/* Rewards Display */}
                  {result.success && result.rewards && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {formatRewards(result.rewards).map((reward, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-gray-800 rounded-lg p-3 flex items-center gap-3"
                        >
                          <span className="text-2xl">{reward.icon}</span>
                          <div>
                            <div className="text-gray-400 text-sm">{reward.label}</div>
                            <div className="text-amber-400 font-bold">+{reward.amount.toLocaleString()}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Box */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
              <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Lưu ý
              </h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Mỗi mã chỉ được sử dụng một lần</li>
                <li>• Mã có thể có thời hạn sử dụng</li>
                <li>• Một số mã yêu cầu cảnh giới tối thiểu</li>
              </ul>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
                <span className="text-4xl mb-4 block">📭</span>
                <p className="text-gray-400">Chưa có mã nào được đổi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <motion.div
                    key={item._id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-amber-400 font-mono font-bold">{item.code}</span>
                        <span className="text-gray-500 text-sm ml-2">
                          ({item.description || 'Mã quà tặng'})
                        </span>
                      </div>
                      <span className="text-gray-500 text-sm">
                        {new Date(item.usedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formatRewards(item.rewards).map((reward, rIdx) => (
                        <span
                          key={rIdx}
                          className="bg-gray-700 px-2 py-1 rounded text-sm text-gray-300"
                        >
                          {reward.icon} +{reward.amount.toLocaleString()} {reward.label}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default GiftCodeTab;
