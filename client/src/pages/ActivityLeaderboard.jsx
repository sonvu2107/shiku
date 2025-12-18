/**
 * Activity Leaderboard Page
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Trophy, Medal, MessageSquare, Heart, FileText, Calendar,
    TrendingUp, Users, Loader2, ChevronRight, ArrowLeft
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { api } from '../api';
import { PageLayout, PageHeader } from '../components/ui/DesignSystem';
import UserAvatar from '../components/UserAvatar';
import UserName from '../components/UserName';

// Period filter options
const PERIODS = [
    { id: 'all', label: 'Tất cả', icon: Trophy },
    { id: 'month', label: 'Tháng này', icon: Calendar },
    { id: 'week', label: 'Tuần này', icon: TrendingUp }
];

// Colors for chart bars
const CHART_COLORS = {
    posts: '#3b82f6',
    comments: '#22c55e',
    emotes: '#f43f5e'
};

// Podium medals
const MEDALS = ['🥇', '🥈', '🥉'];

function ActivityLeaderboard() {
    const [period, setPeriod] = useState('all');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch leaderboard data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api(`/api/activity-leaderboard?period=${period}&limit=20`);
                if (response.success) {
                    setData(response.data || []);
                } else {
                    setError('Không thể tải dữ liệu');
                }
            } catch (err) {
                console.error('Fetch leaderboard error:', err);
                setError(err.message || 'Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [period]);

    // Top 3 for podium
    const top3 = useMemo(() => data.slice(0, 3), [data]);

    // Chart data for comparison
    const chartData = useMemo(() => {
        return data.slice(0, 5).map(user => ({
            name: user.name?.substring(0, 10) || 'User',
            avatar: user.avatarUrl,
            userId: user.userId,
            posts: user.postCount,
            comments: user.commentCount,
            emotes: user.emoteCount
        }));
    }, [data]);

    // Calculate max values for progress bars
    const maxStats = useMemo(() => {
        if (data.length === 0) return { posts: 1, comments: 1, emotes: 1, score: 1 };
        return {
            posts: Math.max(...data.map(u => u.postCount), 1),
            comments: Math.max(...data.map(u => u.commentCount), 1),
            emotes: Math.max(...data.map(u => u.emoteCount), 1),
            score: Math.max(...data.map(u => u.totalScore), 1)
        };
    }, [data]);

    // Custom tooltip for chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;

        return (
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-xl">
                <p className="font-bold text-neutral-900 dark:text-white mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-neutral-600 dark:text-neutral-400">
                            {entry.name === 'posts' ? 'Bài viết' :
                                entry.name === 'comments' ? 'Bình luận' : 'Lượt thích'}:
                        </span>
                        <span className="font-bold text-neutral-900 dark:text-white">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    // Custom X-axis tick with avatar
    const CustomXAxisTick = ({ x, y, payload }) => {
        const user = chartData.find(u => u.name === payload.value);
        if (!user) return null;

        return (
            <g transform={`translate(${x},${y})`}>
                <foreignObject x={-16} y={4} width={32} height={32}>
                    <Link to={`/user/${user.userId}`}>
                        <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                            alt={user.name}
                            className="w-8 h-8 rounded-full border-2 border-neutral-200 dark:border-neutral-700 object-cover hover:scale-110 transition-transform"
                        />
                    </Link>
                </foreignObject>
            </g>
        );
    };

    const navigate = useNavigate();

    return (
        <PageLayout>
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="mb-4 flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Quay lại</span>
            </button>

            <PageHeader
                title="Bảng xếp hạng hoạt động"
                subtitle="Những thành viên năng động nhất của cộng đồng"
            />

            {/* Period Filter Tabs */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                {PERIODS.map(p => {
                    const Icon = p.icon;
                    const isActive = period === p.id;
                    return (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
                                ${isActive
                                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-lg'
                                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
                                }
                            `}
                        >
                            <Icon size={16} className="hidden md:block" />
                            {p.label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <p className="text-red-500">{error}</p>
                    <button
                        onClick={() => setPeriod(period)}
                        className="mt-4 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg"
                    >
                        Thử lại
                    </button>
                </div>
            ) : data.length === 0 ? (
                <div className="text-center py-20">
                    <Users className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">Chưa có dữ liệu hoạt động</p>
                </div>
            ) : (
                <>
                    {/* Top 3 Podium */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 mb-6 border border-amber-200/50 dark:border-amber-700/30"
                    >
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Top 3 người dùng</h2>
                        </div>

                        <div className="grid grid-cols-3 gap-3 md:gap-6">
                            {/* Reorder: 2nd, 1st, 3rd */}
                            {[1, 0, 2].map((idx) => {
                                const user = top3[idx];
                                if (!user) return <div key={idx} />;

                                const isFirst = idx === 0;
                                return (
                                    <motion.div
                                        key={user.userId}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className={`
                      flex flex-col items-center text-center
                      ${isFirst ? 'order-2 -mt-4' : idx === 1 ? 'order-1' : 'order-3'}
                    `}
                                    >
                                        {/* Medal */}
                                        <div className={`text-3xl md:text-4xl mb-2 ${isFirst ? 'animate-bounce' : ''}`}>
                                            {MEDALS[idx]}
                                        </div>

                                        {/* Avatar */}
                                        <Link to={`/user/${user.userId}`} className="relative group mb-3">
                                            <div className={`
                                                relative rounded-full overflow-hidden
                                                ${isFirst
                                                    ? 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                                                    : idx === 1
                                                        ? 'ring-3 ring-slate-400 shadow-[0_0_15px_rgba(148,163,184,0.4)]'
                                                        : 'ring-3 ring-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.4)]'
                                                }
                                            `}>
                                                <UserAvatar
                                                    user={{ ...user, _id: user.userId }}
                                                    size={isFirst ? 80 : 64}
                                                    showBadge={false}
                                                    showFrame={false}
                                                    className=""
                                                />
                                            </div>
                                            <div className={`
                                                absolute -bottom-1 -right-1 rounded-full px-2 py-0.5 text-xs font-bold shadow-lg border-2 border-white dark:border-neutral-800
                                                ${isFirst
                                                    ? 'bg-amber-500 text-white'
                                                    : idx === 1
                                                        ? 'bg-slate-400 text-white'
                                                        : 'bg-amber-700 text-white'
                                                }
                                            `}>
                                                #{idx + 1}
                                            </div>
                                        </Link>

                                        {/* Name */}
                                        <Link to={`/user/${user.userId}`} className="hover:underline">
                                            <div className={`font-bold text-neutral-900 dark:text-white truncate max-w-[100px] md:max-w-[120px] ${isFirst ? 'text-base' : 'text-sm'}`}>
                                                <UserName user={user} maxLength={12} />
                                            </div>
                                        </Link>

                                        {/* Score */}
                                        <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold ${isFirst
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                                            }`}>
                                            {user.totalScore.toLocaleString()} điểm
                                        </div>

                                        {/* Stats */}
                                        <div className="mt-2 flex gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                            <span className="flex items-center gap-1">
                                                <FileText size={12} />
                                                {user.postCount}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MessageSquare size={12} />
                                                {user.commentCount}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Comparison Bar Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 mb-6 border border-neutral-200 dark:border-neutral-800"
                    >
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Biểu đồ so sánh hoạt động</h2>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mb-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.posts }} />
                                <span className="text-neutral-600 dark:text-neutral-400">Bài viết</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.comments }} />
                                <span className="text-neutral-600 dark:text-neutral-400">Bình luận</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.emotes }} />
                                <span className="text-neutral-600 dark:text-neutral-400">Lượt thích</span>
                            </div>
                        </div>

                        {/* Chart wrapper with horizontal scroll on mobile for better touch */}
                        <div className="h-72 md:h-80 overflow-x-auto overflow-y-hidden -mx-2 px-2">
                            <div className="min-w-[400px] h-full" style={{ minHeight: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
                                        barCategoryGap="20%"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                        <XAxis
                                            dataKey="name"
                                            tick={<CustomXAxisTick />}
                                            axisLine={{ stroke: '#374151' }}
                                            tickLine={false}
                                            interval={0}
                                            height={60}
                                        />
                                        <YAxis
                                            axisLine={{ stroke: '#374151' }}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            width={35}
                                        />
                                        <Tooltip
                                            content={<CustomTooltip />}
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        />
                                        <Bar dataKey="posts" fill={CHART_COLORS.posts} radius={[4, 4, 0, 0]} minPointSize={5} />
                                        <Bar dataKey="comments" fill={CHART_COLORS.comments} radius={[4, 4, 0, 0]} minPointSize={5} />
                                        <Bar dataKey="emotes" fill={CHART_COLORS.emotes} radius={[4, 4, 0, 0]} minPointSize={5} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Mobile hint */}
                        <p className="md:hidden text-xs text-neutral-400 text-center mt-2">
                            Vuốt ngang để xem thêm • Chạm vào cột để xem chi tiết
                        </p>
                    </motion.div>

                    {/* Full Leaderboard Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-neutral-200 dark:border-neutral-800">
                            <div>
                                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Bảng xếp hạng top 20</h2>
                            </div>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">{data.length} thành viên</span>
                        </div>

                        {/* Table Header - Desktop */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-neutral-50 dark:bg-neutral-800/50 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase">
                            <div className="col-span-1">Thứ hạng</div>
                            <div className="col-span-3">Thành viên</div>
                            <div className="col-span-2 text-center">Điểm</div>
                            <div className="col-span-2 text-center">Bài viết</div>
                            <div className="col-span-2 text-center">Bình luận</div>
                            <div className="col-span-2 text-center">Ngày tham gia</div>
                        </div>

                        {/* Leaderboard Rows */}
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {data.map((user, index) => (
                                <motion.div
                                    key={user.userId}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                                >
                                    {/* Desktop Row */}
                                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                        {/* Rank */}
                                        <div className="col-span-1">
                                            {index < 3 ? (
                                                <span className="text-2xl">{MEDALS[index]}</span>
                                            ) : (
                                                <span className="text-lg font-bold text-neutral-400 dark:text-neutral-500">
                                                    #{index + 1}
                                                </span>
                                            )}
                                        </div>

                                        {/* User Info */}
                                        <div className="col-span-3 flex items-center gap-3">
                                            <Link to={`/user/${user.userId}`}>
                                                <UserAvatar user={{ ...user, _id: user.userId }} size={40} showBadge={false} showFrame={false} />
                                            </Link>
                                            <div className="min-w-0">
                                                <Link to={`/user/${user.userId}`} className="hover:underline">
                                                    <div className="font-bold text-neutral-900 dark:text-white truncate">
                                                        <UserName user={user} maxLength={20} />
                                                    </div>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className="col-span-2 text-center">
                                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-bold">
                                                <Trophy size={14} />
                                                {user.totalScore.toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Posts */}
                                        <div className="col-span-2">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
                                                    <FileText size={14} />
                                                    {user.postCount}
                                                </div>
                                                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full transition-all"
                                                        style={{ width: `${(user.postCount / maxStats.posts) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Comments */}
                                        <div className="col-span-2">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold">
                                                    <MessageSquare size={14} />
                                                    {user.commentCount}
                                                </div>
                                                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full transition-all"
                                                        style={{ width: `${(user.commentCount / maxStats.comments) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Days Joined */}
                                        <div className="col-span-2 text-center">
                                            <div className="flex items-center justify-center gap-1 text-neutral-600 dark:text-neutral-400">
                                                <Calendar size={14} />
                                                <span className="font-medium">{user.daysJoined} ngày</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Row */}
                                    <Link to={`/user/${user.userId}`} className="md:hidden flex items-center gap-3 p-4">
                                        {/* Rank */}
                                        <div className="w-8 flex-shrink-0 text-center">
                                            {index < 3 ? (
                                                <span className="text-xl">{MEDALS[index]}</span>
                                            ) : (
                                                <span className="text-sm font-bold text-neutral-400">#{index + 1}</span>
                                            )}
                                        </div>

                                        {/* Avatar */}
                                        <UserAvatar user={{ ...user, _id: user.userId }} size={44} showBadge={false} showFrame={false} />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-neutral-900 dark:text-white truncate">
                                                <UserName user={user} maxLength={16} />
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                                <span className="flex items-center gap-1">
                                                    <FileText size={12} />
                                                    {user.postCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MessageSquare size={12} />
                                                    {user.commentCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {user.daysJoined}d
                                                </span>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className="flex-shrink-0 text-right">
                                            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                                {user.totalScore.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-neutral-400">điểm</div>
                                        </div>

                                        <ChevronRight size={16} className="text-neutral-400 flex-shrink-0" />
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </PageLayout>
    );
}

export default ActivityLeaderboard;