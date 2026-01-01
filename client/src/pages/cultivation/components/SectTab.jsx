import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../api';
import { useToast } from '../../../contexts/ToastContext';
import SpiritField from './SpiritField';
import Library from './Library';
import AlchemyRoom from './AlchemyRoom';
import TrainingGrounds from './TrainingGrounds';

/**
 * SectTab - Tông Môn Interface
 * Style: Cultivation (No icons/SVG, use text/images/css shapes)
 */
const SectTab = memo(function SectTab({ user }) {
    const [loading, setLoading] = useState(true);
    const [sect, setSect] = useState(null); // My sect data
    const [membership, setMembership] = useState(null);
    const [contribution, setContribution] = useState(null);
    const [view, setView] = useState('dashboard'); // 'dashboard', 'list', 'create'
    const [sectsList, setSectsList] = useState([]);
    const { showSuccess, showError } = useToast();

    // Create Form State
    const [createForm, setCreateForm] = useState({ name: '', description: '' });

    // Action loading states
    const [actionLoading, setActionLoading] = useState(null);

    // Raid battle state
    const [battleLogs, setBattleLogs] = useState([]);
    const [cooldowns, setCooldowns] = useState({ basic: 0, artifact: 0, ultimate: 0 });

    // Members list state
    const [members, setMembers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [showMembers, setShowMembers] = useState(false);
    const [memberTab, setMemberTab] = useState('members'); // 'members' | 'requests'
    const [memberPage, setMemberPage] = useState(1);
    const [pendingPage, setPendingPage] = useState(1);
    const [memberTotal, setMemberTotal] = useState(0);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [checkedIn, setCheckedIn] = useState(false); // Trạng thái điểm danh hôm nay

    useEffect(() => {
        fetchMySect();
    }, []);

    const fetchMySect = async () => {
        try {
            setLoading(true);
            const res = await api('/api/sects/my-sect');
            if (res.success) {
                if (res.data) {
                    setSect(res.data.sect);
                    setMembership(res.data.membership);
                    setContribution(res.data.contribution);
                    setView('dashboard');
                } else {
                    setSect(null);
                    setView('list'); // Default to list if no sect
                    fetchSectsList();
                }
            }
        } catch (error) {
            console.error("Fetch sect error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSectsList = async () => {
        try {
            const res = await api('/api/sects');
            if (res.success) {
                setSectsList(res.data);
            }
        } catch (error) {
            console.error("Fetch list error:", error);
        }
    };

    const handleCreateSect = async () => {
        if (!createForm.name) return;
        try {
            const res = await api('/api/sects', {
                method: 'POST',
                body: createForm
            });
            if (res.success) {
                showSuccess('Tạo tông môn thành công!');
                fetchMySect(); // Refresh to go to dashboard
            }
        } catch (error) {
            showError(error.message || 'Lỗi tạo tông môn');
        }
    };

    const handleJoinSect = async (sectId) => {
        try {
            const res = await api(`/api/sects/${sectId}/join`, { method: 'POST' });
            if (res.success) {
                showSuccess('Gia nhập thành công!');
                fetchMySect();
            }
        } catch (error) {
            showError(error.message || 'Lỗi gia nhập');
        }
    };

    // ========== Building Upgrade ==========
    const handleUpgradeBuilding = async (buildingId) => {
        if (!sect?._id || actionLoading) return;
        setActionLoading(`upgrade-${buildingId}`);
        try {
            const res = await api(`/api/sects/${sect._id}/upgrade-building`, {
                method: 'POST',
                body: { buildingId }
            });
            if (res.success) {
                showSuccess(`Nâng cấp ${buildingId === 'spirit_field' ? 'Linh Điền' : 'Tàng Kinh Các'} thành công!`);
                fetchMySect();
            }
        } catch (error) {
            showError(error.message || 'Không thể nâng cấp');
        } finally {
            setActionLoading(null);
        }
    };

    // ========== Leave Sect ==========
    const handleLeaveSect = async () => {
        if (!sect?._id || actionLoading) return;
        if (!confirm('Bạn có chắc muốn rời tông môn?')) return;
        setActionLoading('leave');
        try {
            const res = await api(`/api/sects/${sect._id}/leave`, { method: 'POST' });
            if (res.success) {
                showSuccess(res.message || 'Đã rời tông môn');
                fetchMySect();
            }
        } catch (error) {
            showError(error.message || 'Không thể rời tông môn');
        } finally {
            setActionLoading(null);
        }
    };

    // ========== Member Actions ==========
    const handleMemberAction = async (action, targetUserId, targetName) => {
        if (!sect?._id || actionLoading) return;

        const confirmMsgs = {
            kick: `Đuổi ${targetName} khỏi tông môn?`,
            promote: `Thăng ${targetName} lên Trưởng Lão?`,
            demote: `Giáng ${targetName} xuống Đệ Tử?`,
            transfer: `Chuyển quyền Chưởng Môn cho ${targetName}?`
        };

        if (!confirm(confirmMsgs[action] || 'Xác nhận?')) return;

        setActionLoading(`${action}-${targetUserId}`);
        try {
            const res = await api(`/api/sects/${sect._id}/${action}/${targetUserId}`, { method: 'POST' });
            if (res.success) {
                showSuccess(res.message);
                // Refresh members
                fetchMembers(memberPage);
                if (action === 'transfer') fetchMySect();
            }
        } catch (error) {
            showError(error.message || 'Thao tác thất bại');
        } finally {
            setActionLoading(null);
        }
    };

    // ========== Fetch Members with Pagination ==========
    const fetchMembers = async (page = 1) => {
        if (!sect?._id) return;
        try {
            const res = await api(`/api/sects/${sect._id}/members?page=${page}&limit=10&status=active`);
            if (res.success) {
                setMembers(res.data?.members || []);
                setMemberTotal(res.data?.pagination?.total || 0);
                setPendingCount(res.data?.pendingCount || 0);
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    // ========== Fetch Pending Requests ==========
    const fetchPendingRequests = async (page = 1) => {
        if (!sect?._id) return;
        try {
            const res = await api(`/api/sects/${sect._id}/members?page=${page}&limit=10&status=pending`);
            if (res.success) {
                setPendingRequests(res.data?.members || []);
                setPendingTotal(res.data?.pagination?.total || 0);
            }
        } catch (error) {
            console.error('Error fetching pending requests:', error);
        }
    };

    // ========== Approve/Reject Handlers ==========
    const handleApproveRequest = async (userId, name) => {
        if (!sect?._id || actionLoading) return;
        setActionLoading(`approve-${userId}`);
        try {
            const res = await api(`/api/sects/${sect._id}/approve/${userId}`, { method: 'POST' });
            if (res.success) {
                showSuccess(`Đã duyệt ${name} gia nhập tông môn`);
                fetchPendingRequests(pendingPage);
                fetchMembers(memberPage);
                fetchMySect(); // Update memberCount
            }
        } catch (error) {
            showError(error.message || 'Lỗi khi duyệt đơn');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (userId, name) => {
        if (!sect?._id || actionLoading) return;
        if (!confirm(`Từ chối đơn xin gia nhập của "${name}"?`)) return;
        setActionLoading(`reject-${userId}`);
        try {
            const res = await api(`/api/sects/${sect._id}/reject/${userId}`, { method: 'POST' });
            if (res.success) {
                showSuccess(`Đã từ chối đơn của ${name}`);
                fetchPendingRequests(pendingPage);
            }
        } catch (error) {
            showError(error.message || 'Lỗi khi từ chối đơn');
        } finally {
            setActionLoading(null);
        }
    };

    // ========== Daily Check-in ==========
    const handleDailyCheckin = async () => {
        if (!sect?._id || actionLoading || checkedIn) return;
        setActionLoading('checkin');
        try {
            const res = await api(`/api/sects/${sect._id}/daily-checkin`, { method: 'POST' });
            if (res.success) {
                const bonus = res.data?.buildingBonus || 0;
                const totalGain = res.data?.delta || 5;
                showSuccess(`Điểm danh thành công! +${totalGain} Linh Khí${bonus > 0 ? ' (Linh Điền +' + bonus + ')' : ''}`);
                setCheckedIn(true);
                fetchMySect();
            }
        } catch (error) {
            // Nếu đã điểm danh rồi thì set state
            if (error.message?.includes('đã điểm danh')) {
                setCheckedIn(true);
            }
            showError(error.message || 'Không thể điểm danh');
        } finally {
            setActionLoading(null);
        }
    };

    // ========== Raid Start ==========
    const handleStartRaid = async () => {
        if (!sect?._id || actionLoading) return;
        setActionLoading('raid-start');
        try {
            const res = await api(`/api/sects/${sect._id}/raid/start`, { method: 'POST' });
            if (res.success) {
                showSuccess('Yêu thú đã xuất hiện! Hãy tấn công!');
                fetchMySect();
            }
        } catch (error) {
            showError(error.message || 'Không thể triệu hồi boss');
        } finally {
            setActionLoading(null);
        }
    };

    // ========== Raid Attack (supports 3 attack types) ==========
    const handleAttackRaid = async (attackType = 'basic') => {
        if (!sect?._id || actionLoading) return;
        setActionLoading(`raid-${attackType}`);
        try {
            const res = await api(`/api/sects/${sect._id}/raid/attack`, {
                method: 'POST',
                body: { attackType }
            });
            if (res.success) {
                const { damage, isCrit, label, flavorEffect, hpRemaining, raidCompleted, log } = res.data;

                // Update cooldowns from response
                if (res.data.cooldowns) {
                    setCooldowns(res.data.cooldowns);
                }

                // Add to battle logs (keep last 15)
                if (log) {
                    setBattleLogs(prev => [log, ...prev].slice(0, 15));
                }

                // Show toast with damage info
                const critText = isCrit ? ' BÃO KÍCH!' : '';
                showSuccess(`${label}: Gây ${damage.toLocaleString()} sát thương!${critText}`);

                // Refresh sect data
                fetchMySect();
            }
        } catch (error) {
            // Handle cooldown error (429)
            if (error.cooldowns) {
                setCooldowns(error.cooldowns);
            }
            showError(error.message || 'Không thể tấn công');
        } finally {
            setActionLoading(null);
        }
    };

    // Cooldown countdown effect
    useEffect(() => {
        const interval = setInterval(() => {
            setCooldowns(prev => ({
                basic: Math.max(0, prev.basic - 100),
                artifact: Math.max(0, prev.artifact - 100),
                ultimate: Math.max(0, prev.ultimate - 100)
            }));
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Format cooldown for display
    const formatCooldown = (ms) => {
        if (ms <= 0) return null;
        if (ms < 1000) return '<1s';
        if (ms < 60000) return `${Math.ceil(ms / 1000)}s`;
        if (ms < 3600000) return `${Math.ceil(ms / 60000)}m`;
        return `${Math.ceil(ms / 3600000)}h`;
    };

    // Helper: Get building level
    const getBuildingLevel = (buildingId) => {
        const building = sect?.buildings?.find(b => b.buildingId === buildingId);
        return building?.level || 1;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-500 font-cultivation animate-pulse">
                Đang cảm ứng thiên địa...
            </div>
        );
    }

    // ==================== VIEW: DISCOVERY (LIST / CREATE) ====================
    if (!sect || view === 'list' || view === 'create') {
        return (
            <div className="space-y-6 font-cultivation">
                {/* Header Navigation */}
                <div className="flex gap-4 mb-6 justify-center">
                    <button
                        onClick={() => setView('list')}
                        className={`px-6 py-2 rounded-lg font-bold uppercase tracking-widest transition-all ${view === 'list'
                            ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-black/30 text-slate-500 border border-slate-800 hover:text-slate-300'
                            }`}
                    >
                        Danh Sách Tông Môn
                    </button>
                    <button
                        onClick={() => setView('create')}
                        className={`px-6 py-2 rounded-lg font-bold uppercase tracking-widest transition-all ${view === 'create'
                            ? 'bg-gradient-to-r from-emerald-700 to-emerald-900 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'bg-black/30 text-slate-500 border border-slate-800 hover:text-slate-300'
                            }`}
                    >
                        Khai Tông Lập Phái
                    </button>
                </div>

                {view === 'list' && (
                    <div className="grid grid-cols-1 gap-4">
                        {sectsList.map((s) => (
                            <div key={s._id} className="spirit-tablet p-5 rounded-xl border border-slate-800/50 hover:border-amber-500/30 transition-all group relative overflow-hidden">
                                {/* Decorative Corner */}
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/10 to-transparent -mr-8 -mt-8 rotate-45"></div>

                                <div className="flex justify-between items-center relative z-10">
                                    <div>
                                        <h3 className="text-xl font-title text-gold mb-1 group-hover:text-amber-300 transition-colors">
                                            {s.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-2">
                                            Môn Chủ: <span className="text-jade">{s.owner?.name}</span> • Cấp {s.level}
                                        </p>
                                        <p className="text-xs text-slate-400 italic max-w-md line-clamp-1">
                                            "{s.description || 'Đạo pháp tự nhiên'}"
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="text-xs text-slate-500">
                                            {s.memberCount} thành viên
                                        </span>
                                        <button
                                            onClick={() => handleJoinSect(s._id)}
                                            className="px-4 py-1.5 bg-slate-800 hover:bg-amber-900/50 text-slate-300 hover:text-amber-200 text-xs border border-slate-700 hover:border-amber-500/50 rounded transition-colors"
                                        >
                                            Xin Gia Nhập
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {sectsList.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                Chưa có tông môn nào xuất hiện tại thế giới này.
                            </div>
                        )}
                    </div>
                )}

                {view === 'create' && (
                    <div className="spirit-tablet p-8 rounded-xl max-w-2xl mx-auto border border-emerald-500/20 relative">
                        <h3 className="text-2xl font-title text-emerald-400 text-center mb-8">KHAI TÔNG LẬP PHÁI</h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Tên Tông Môn</label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    placeholder="VD: Thái Dương Tông"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-amber-100 placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition-colors text-center font-title text-lg shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Tôn Chỉ (Mô tả)</label>
                                <textarea
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    placeholder="Mục tiêu của tông môn..."
                                    rows={4}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none transition-colors shadow-inner"
                                />
                            </div>

                            <div className="pt-4 text-center">
                                <button
                                    onClick={handleCreateSect}
                                    className="px-8 py-3 bg-gradient-to-r from-emerald-800 to-emerald-950 border border-emerald-500/30 text-emerald-100 font-bold uppercase tracking-widest rounded-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                >
                                    Thành Lập
                                </button>
                                <p className="mt-4 text-xs text-slate-500">
                                    Phí thành lập: Miễn phí (trong thời gian này)
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==================== VIEW: DASHBOARD (MY SECT) ====================
    return (
        <div className="space-y-6 font-cultivation">
            {/* 1. SECT HEADER CARD */}
            <div className="spirit-tablet relative rounded-2xl overflow-hidden p-6 md:p-8 border border-amber-500/20">
                {/* Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 bg-amber-900/40 border border-amber-700/50 text-amber-200 text-[10px] uppercase tracking-wide rounded">
                                Cấp {sect.level}
                            </span>
                            <span className="text-slate-500 text-xs uppercase tracking-wider">
                                {sect.memberCount} Đệ tử
                            </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-title text-gold realm-name-glow tracking-wide mb-2">
                            {sect.name}
                        </h2>
                        <p className="text-slate-400 text-sm italic opacity-80 max-w-xl">
                            "{sect.description || 'Đạo pháp tự nhiên'}"
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-right">
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Linh Khí Tông Môn</div>
                        <div className="text-2xl font-mono text-emerald-400 font-bold">
                            {sect.spiritEnergy?.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-600">
                            Đóng góp tuần: {contribution?.weeklyEnergy || 0}
                        </div>
                    </div>
                </div>

                {/* Level Progress Bar */}
                {(() => {
                    const SECT_LEVELS = [
                        { level: 1, name: "Tiểu Môn Phái", requiredEnergy: 0, memberCap: 20 },
                        { level: 2, name: "Trung Môn Phái", requiredEnergy: 10000, memberCap: 50 },
                        { level: 3, name: "Đại Môn Phái", requiredEnergy: 50000, memberCap: 100 },
                        { level: 4, name: "Nhất Lưu Tông Môn", requiredEnergy: 200000, memberCap: 200 },
                        { level: 5, name: "Đỉnh Cấp Tông Môn", requiredEnergy: 1000000, memberCap: 500 },
                    ];
                    const currentLevel = sect.level || 1;
                    const currentInfo = SECT_LEVELS.find(l => l.level === currentLevel) || SECT_LEVELS[0];
                    const nextInfo = SECT_LEVELS.find(l => l.level === currentLevel + 1);
                    const energy = sect.totalEnergyEarned || sect.spiritEnergy || 0;

                    if (!nextInfo) {
                        return (
                            <div className="mt-4 pt-4 border-t border-slate-800/50">
                                <div className="flex justify-between items-center text-xs mb-2">
                                    <span className="text-amber-400 font-bold">{currentInfo.name}</span>
                                    <span className="text-emerald-400">Đã đạt cấp tối đa</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 w-full"></div>
                                </div>
                            </div>
                        );
                    }

                    const prevRequired = currentInfo.requiredEnergy;
                    const nextRequired = nextInfo.requiredEnergy;
                    const progressInLevel = energy - prevRequired;
                    const levelRange = nextRequired - prevRequired;
                    const percent = Math.min(100, Math.max(0, (progressInLevel / levelRange) * 100));

                    return (
                        <div className="mt-4 pt-4 border-t border-slate-800/50">
                            <div className="flex justify-between items-center text-xs mb-2">
                                <span className="text-amber-400 font-bold">{currentInfo.name}</span>
                                <span className="text-slate-500">
                                    {energy.toLocaleString()} / {nextRequired.toLocaleString()}
                                    <span className="text-amber-300 ml-2">→ {nextInfo.name}</span>
                                </span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-700 to-amber-500 transition-all duration-500"
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                            <div className="text-[10px] text-slate-600 mt-1 text-right">
                                Còn {(nextRequired - energy).toLocaleString()} Linh Khí để thăng cấp
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* 2. BUILDINGS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SpiritField
                    sect={sect}
                    membership={membership}
                    onUpgrade={handleUpgradeBuilding}
                    actionLoading={actionLoading}
                />
                <Library
                    sect={sect}
                    membership={membership}
                    onUpgrade={handleUpgradeBuilding}
                    actionLoading={actionLoading}
                />
                <AlchemyRoom
                    sect={sect}
                    membership={membership}
                    onUpgrade={handleUpgradeBuilding}
                    actionLoading={actionLoading}
                />
                <TrainingGrounds
                    sect={sect}
                    membership={membership}
                    onUpgrade={handleUpgradeBuilding}
                    actionLoading={actionLoading}
                />
            </div>

            {/* 3. DAILY CHECK-IN */}
            <div className="spirit-tablet p-5 rounded-xl border border-amber-900/20">
                <div className="flex justify-between items-center">
                    <div>
                        <h4 className="text-lg font-title text-amber-300 mb-1">ĐIỂM DANH HÀNG NGÀY</h4>
                        <p className="text-xs text-slate-500">Nhận Linh Khí cho tông môn</p>
                    </div>
                    <button
                        onClick={handleDailyCheckin}
                        disabled={actionLoading === 'checkin' || checkedIn}
                        className={`px-6 py-2 border rounded font-bold uppercase tracking-wider transition-all ${checkedIn
                            ? 'bg-emerald-900/50 text-emerald-300 border-emerald-500/30 cursor-not-allowed'
                            : 'bg-amber-900/50 hover:bg-amber-800 text-amber-200 border-amber-500/30 hover:scale-105 active:scale-95'
                            } disabled:opacity-70`}
                    >
                        {actionLoading === 'checkin' ? '...' : checkedIn ? 'Đã Điểm Danh' : 'Điểm Danh'}
                    </button>
                </div>
            </div>

            {/* 4. DANH SÁCH THÀNH VIÊN */}
            <div className="spirit-tablet p-5 rounded-xl border border-cyan-900/20">
                <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => {
                        setShowMembers(!showMembers);
                        if (!showMembers && members.length === 0 && sect?._id) {
                            fetchMembers(1);
                            if (membership?.role === 'owner' || membership?.role === 'elder') {
                                fetchPendingRequests(1);
                            }
                        }
                    }}
                >
                    <div className="flex items-center gap-2">
                        <h4 className="text-lg font-title text-cyan-300 mb-1">THÀNH VIÊN TÔNG MÔN</h4>
                        {pendingCount > 0 && (membership?.role === 'owner' || membership?.role === 'elder') && (
                            <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </div>
                    <div className="text-cyan-400 text-sm">
                        {showMembers ? '▲' : '▼'}
                    </div>
                </div>

                {showMembers && (
                    <div className="mt-4">
                        {/* Tabs - Chỉ hiện cho owner/elder */}
                        {(membership?.role === 'owner' || membership?.role === 'elder') && (
                            <div className="flex gap-2 mb-4 border-b border-slate-800 pb-2">
                                <button
                                    onClick={() => { setMemberTab('members'); setMemberPage(1); fetchMembers(1); }}
                                    className={`px-4 py-1.5 text-xs rounded-t transition-all ${memberTab === 'members'
                                        ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-500/30 border-b-0'
                                        : 'bg-transparent text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    Thành Viên ({memberTotal})
                                </button>
                                <button
                                    onClick={() => { setMemberTab('requests'); setPendingPage(1); fetchPendingRequests(1); }}
                                    className={`px-4 py-1.5 text-xs rounded-t transition-all flex items-center gap-1 ${memberTab === 'requests'
                                        ? 'bg-amber-900/50 text-amber-300 border border-amber-500/30 border-b-0'
                                        : 'bg-transparent text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    Duyệt Đơn
                                    {pendingCount > 0 && (
                                        <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-bold rounded-full">
                                            {pendingCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Tab Content: Members */}
                        {memberTab === 'members' && (
                            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-cultivation">
                                {members.length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center py-4">Chưa có thành viên</p>
                                ) : (
                                    members.map((m, i) => (
                                        <div key={m._id || i} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg border border-slate-800/50">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400 overflow-hidden">
                                                {m.user?.avatarUrl ? (
                                                    <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    m.user?.name?.charAt(0)?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-white truncate">{m.user?.name || 'Unknown'}</div>
                                                <div className={`text-[10px] ${m.role === 'owner' ? 'text-amber-400' : m.role === 'elder' ? 'text-purple-400' : 'text-slate-500'}`}>
                                                    {m.role === 'owner' ? 'Chưởng Môn' : m.role === 'elder' ? 'Trưởng Lão' : 'Đệ Tử'}
                                                </div>
                                            </div>
                                            {(membership?.role === 'owner' || membership?.role === 'elder') && m.role !== 'owner' && m.user?._id !== user?._id && (
                                                <div className="flex gap-1">
                                                    {(membership?.role === 'owner' || (membership?.role === 'elder' && m.role === 'disciple')) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMemberAction('kick', m.user?._id, m.user?.name); }}
                                                            disabled={actionLoading?.startsWith('kick-')}
                                                            className="px-2 py-1 text-[10px] bg-red-900/50 hover:bg-red-800 text-red-200 rounded border border-red-500/30 disabled:opacity-50"
                                                        >
                                                            Đuổi
                                                        </button>
                                                    )}
                                                    {membership?.role === 'owner' && m.role === 'disciple' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMemberAction('promote', m.user?._id, m.user?.name); }}
                                                            disabled={actionLoading?.startsWith('promote-')}
                                                            className="px-2 py-1 text-[10px] bg-purple-900/50 hover:bg-purple-800 text-purple-200 rounded border border-purple-500/30 disabled:opacity-50"
                                                        >
                                                            Thăng
                                                        </button>
                                                    )}
                                                    {membership?.role === 'owner' && m.role === 'elder' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMemberAction('demote', m.user?._id, m.user?.name); }}
                                                            disabled={actionLoading?.startsWith('demote-')}
                                                            className="px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-slate-500/30 disabled:opacity-50"
                                                        >
                                                            Giáng
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                                {/* Pagination for members */}
                                {memberTotal > 10 && (
                                    <div className="flex justify-center gap-2 mt-3 pt-3 border-t border-slate-800/50">
                                        <button
                                            onClick={() => { setMemberPage(p => Math.max(1, p - 1)); fetchMembers(memberPage - 1); }}
                                            disabled={memberPage <= 1}
                                            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 rounded disabled:opacity-50"
                                        >
                                            ←
                                        </button>
                                        <span className="text-xs text-slate-500 py-1">
                                            Trang {memberPage} / {Math.ceil(memberTotal / 10)}
                                        </span>
                                        <button
                                            onClick={() => { setMemberPage(p => p + 1); fetchMembers(memberPage + 1); }}
                                            disabled={memberPage >= Math.ceil(memberTotal / 10)}
                                            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 rounded disabled:opacity-50"
                                        >
                                            →
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab Content: Pending Requests */}
                        {memberTab === 'requests' && (membership?.role === 'owner' || membership?.role === 'elder') && (
                            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-cultivation">
                                {pendingRequests.length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center py-4">Không có đơn xin gia nhập</p>
                                ) : (
                                    pendingRequests.map((m, i) => (
                                        <div key={m._id || i} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg border border-amber-900/30">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 overflow-hidden">
                                                {m.user?.avatarUrl ? (
                                                    <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    m.user?.name?.charAt(0)?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-white truncate">{m.user?.name || 'Unknown'}</div>
                                                <div className="text-[10px] text-amber-500">Đang chờ duyệt</div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleApproveRequest(m.user?._id, m.user?.name)}
                                                    disabled={actionLoading?.startsWith('approve-')}
                                                    className="px-2 py-1 text-[10px] bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 rounded border border-emerald-500/30 disabled:opacity-50"
                                                >
                                                    {actionLoading === `approve-${m.user?._id}` ? '...' : 'Duyệt'}
                                                </button>
                                                <button
                                                    onClick={() => handleRejectRequest(m.user?._id, m.user?.name)}
                                                    disabled={actionLoading?.startsWith('reject-')}
                                                    className="px-2 py-1 text-[10px] bg-red-900/50 hover:bg-red-800 text-red-200 rounded border border-red-500/30 disabled:opacity-50"
                                                >
                                                    {actionLoading === `reject-${m.user?._id}` ? '...' : 'Từ chối'}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {/* Pagination for pending */}
                                {pendingTotal > 10 && (
                                    <div className="flex justify-center gap-2 mt-3 pt-3 border-t border-slate-800/50">
                                        <button
                                            onClick={() => { setPendingPage(p => Math.max(1, p - 1)); fetchPendingRequests(pendingPage - 1); }}
                                            disabled={pendingPage <= 1}
                                            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 rounded disabled:opacity-50"
                                        >
                                            ←
                                        </button>
                                        <span className="text-xs text-slate-500 py-1">
                                            Trang {pendingPage} / {Math.ceil(pendingTotal / 10)}
                                        </span>
                                        <button
                                            onClick={() => { setPendingPage(p => p + 1); fetchPendingRequests(pendingPage + 1); }}
                                            disabled={pendingPage >= Math.ceil(pendingTotal / 10)}
                                            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 rounded disabled:opacity-50"
                                        >
                                            →
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Leave button - only for non-owners */}
                {membership?.role !== 'owner' && (
                    <button
                        onClick={handleLeaveSect}
                        disabled={actionLoading === 'leave'}
                        className="mt-4 w-full py-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/30 rounded text-xs uppercase tracking-wide transition-all disabled:opacity-50"
                    >
                        {actionLoading === 'leave' ? '...' : 'Rời Tông Môn'}
                    </button>
                )}
            </div>

            {/* 4. RAID & ACTIVITIES - Thần Thú Tông Môn */}
            <div className="spirit-tablet p-6 rounded-xl border border-red-900/20">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-title text-red-400 tracking-wide uppercase">
                        Thần Thú Tông Môn
                    </h3>
                    <span className="text-[10px] text-red-500/50 bg-red-900/10 px-2 py-1 rounded border border-red-900/20">
                        BOSS TUẦN
                    </span>
                </div>

                {sect.currentRaid?.raidId && sect.currentRaid?.healthRemaining > 0 ? (
                    <div className="space-y-4">
                        {/* Boss HP Card */}
                        <div className={`bg-black/50 rounded-lg p-4 border border-dashed relative overflow-hidden transition-all duration-500
                            ${(sect.currentRaid.healthRemaining / (sect.currentRaid.healthMax || 1)) < 0.1 ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' :
                                (sect.currentRaid.healthRemaining / (sect.currentRaid.healthMax || 1)) < 0.4 ? 'border-orange-500/50' :
                                    (sect.currentRaid.healthRemaining / (sect.currentRaid.healthMax || 1)) < 0.7 ? 'border-yellow-500/30' : 'border-slate-800'}`}
                        >
                            <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-10" />
                            <div className="relative z-10 text-center">
                                <h4 className="text-xl text-red-200 font-title mb-3">YÊU THÚ HỖN MANG</h4>
                                {/* HP Bar with phase glow */}
                                <div className="w-full max-w-md mx-auto h-4 bg-slate-800 rounded-full mb-2 overflow-hidden border border-white/10">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-red-700 to-red-500 shadow-[0_0_10px_red]"
                                        initial={false}
                                        animate={{ width: `${Math.max(0, (sect.currentRaid.healthRemaining / (sect.currentRaid.healthMax || sect.currentRaid.healthRemaining + sect.currentRaid.totalDamage || 1)) * 100)}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    HP: {sect.currentRaid.healthRemaining?.toLocaleString() || 0} / {(sect.currentRaid.healthMax || sect.currentRaid.healthRemaining + sect.currentRaid.totalDamage)?.toLocaleString() || 0}
                                </p>
                            </div>
                        </div>

                        {/* 3 Skill Buttons */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Basic Attack */}
                            <button
                                onClick={() => handleAttackRaid('basic')}
                                disabled={actionLoading?.startsWith('raid-') || cooldowns.basic > 0}
                                className="relative p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-all disabled:opacity-50 group"
                            >
                                <div className="text-sm font-title text-emerald-400 mb-1">Chưởng Thường</div>
                                <div className="text-[10px] text-slate-500">50% ATK</div>
                                {cooldowns.basic > 0 && (
                                    <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                                        <span className="text-amber-400 text-xs font-mono">{formatCooldown(cooldowns.basic)}</span>
                                    </div>
                                )}
                                {actionLoading === 'raid-basic' && <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center"><span className="text-white text-xs">...</span></div>}
                            </button>

                            {/* Artifact Attack */}
                            <button
                                onClick={() => handleAttackRaid('artifact')}
                                disabled={actionLoading?.startsWith('raid-') || cooldowns.artifact > 0}
                                className="relative p-3 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 rounded-lg transition-all disabled:opacity-50 group"
                            >
                                <div className="text-sm font-title text-blue-400 mb-1">Pháp Bảo</div>
                                <div className="text-[10px] text-slate-500">150% ATK</div>
                                {cooldowns.artifact > 0 && (
                                    <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                                        <span className="text-amber-400 text-xs font-mono">{formatCooldown(cooldowns.artifact)}</span>
                                    </div>
                                )}
                                {actionLoading === 'raid-artifact' && <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center"><span className="text-white text-xs">...</span></div>}
                            </button>

                            {/* Ultimate Attack */}
                            <button
                                onClick={() => handleAttackRaid('ultimate')}
                                disabled={actionLoading?.startsWith('raid-') || cooldowns.ultimate > 0}
                                className="relative p-3 bg-gradient-to-b from-red-900/40 to-red-950/60 hover:from-red-900/60 hover:to-red-950/80 border border-red-500/30 rounded-lg transition-all disabled:opacity-50 group shadow-[0_0_10px_rgba(220,38,38,0.1)]"
                            >
                                <div className="text-sm font-title text-red-400 mb-1">Tuyệt Kỹ</div>
                                <div className="text-[10px] text-slate-500">400% ATK</div>
                                {cooldowns.ultimate > 0 && (
                                    <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                                        <span className="text-amber-400 text-xs font-mono">{formatCooldown(cooldowns.ultimate)}</span>
                                    </div>
                                )}
                                {actionLoading === 'raid-ultimate' && <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center"><span className="text-white text-xs">...</span></div>}
                            </button>
                        </div>

                        {/* Battle Log */}
                        {battleLogs.length > 0 && (
                            <div className="bg-black/30 rounded-lg p-3 border border-slate-800 max-h-32 overflow-y-auto scrollbar-cultivation">
                                <div className="text-[10px] text-slate-500 uppercase mb-2">Chiến Báo</div>
                                <div className="space-y-1">
                                    {battleLogs.slice(0, 8).map((log, i) => (
                                        <div key={i} className={`text-xs ${i === 0 ? 'text-white' : 'text-slate-500'}`}>
                                            <span className="text-emerald-400">{log.attacker}</span>
                                            <span className="text-slate-600"> dùng </span>
                                            <span className="text-blue-400">{log.label}</span>
                                            <span className="text-slate-600"> gây </span>
                                            <span className={log.isCrit ? 'text-yellow-400 font-bold' : 'text-red-400'}>{log.damage}</span>
                                            {log.isCrit && <span className="text-yellow-500 ml-1">BK!</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Damage Leaderboard */}
                        {sect.raidTopDamage?.length > 0 && (
                            <div className="bg-black/30 rounded-lg p-3 border border-amber-900/30">
                                <div className="text-[10px] text-amber-400 uppercase mb-2">Top Damage Tuần</div>
                                <div className="space-y-1">
                                    {sect.raidTopDamage.slice(0, 5).map((entry, i) => (
                                        <div key={i} className="flex justify-between text-xs">
                                            <span className={i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-500'}>
                                                {i + 1}. {entry.user?.name || 'Unknown'}
                                            </span>
                                            <span className="text-red-400">{entry.damage?.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-black/40 rounded-lg p-6 text-center border border-dashed border-slate-800 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-10" />
                        <div className="relative z-10 py-4">
                            <p className="text-slate-500 text-sm mb-4">Hiện chưa có yêu thú xâm phạm.</p>
                            {(membership?.role === 'owner' || membership?.role === 'elder') && (
                                <button
                                    onClick={handleStartRaid}
                                    disabled={actionLoading === 'raid-start'}
                                    className="px-6 py-2 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-200 border border-slate-600 hover:border-red-500/30 rounded text-xs uppercase tracking-wide transition-all disabled:opacity-50"
                                >
                                    {actionLoading === 'raid-start' ? 'Đang triệu hồi...' : 'Triệu Hồi Thần Thú'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
});

export default SectTab;
