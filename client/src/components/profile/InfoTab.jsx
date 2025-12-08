import {
    Phone, Calendar, Heart, Link as LinkIcon,
    Home, Mail, User
} from "lucide-react";
import { SpotlightCard } from "../ui/SpotlightCard";
import SpotifyEmbed from "../SpotifyEmbed";

export default function InfoTab({ form, user }) {
    // Helper to format gender
    const formatGender = (gender) => {
        switch (gender) {
            case 'male': return 'Nam';
            case 'female': return 'Nữ';
            case 'other': return 'Khác';
            default: return gender;
        }
    };

    // Check if there's any info to display
    const hasContactInfo = form.phone || form.website || user?.email;
    const hasBasicInfo = form.gender || form.birthday || form.location || form.hobbies;
    const hasBio = form.bio || user?.profileSongUrl;
    const hasAnyInfo = hasContactInfo || hasBasicInfo || hasBio;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Tiểu sử */}
            {hasBio && (
                <SpotlightCard>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4">Tiểu sử</h3>
                    {form.bio ? (
                        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line text-center text-sm">
                            {form.bio}
                        </p>
                    ) : (
                        <div className="text-center py-4">
                            <span className="text-neutral-500 dark:text-neutral-400 text-sm">
                                Chưa có tiểu sử
                            </span>
                        </div>
                    )}
                    {/* Spotify Embed in Bio Box */}
                    {user?.profileSongUrl && (
                        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                            <SpotifyEmbed
                                url={user.profileSongUrl}
                                compact={true}
                                className="bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                            />
                        </div>
                    )}
                </SpotlightCard>
            )}

            {/* Thông tin liên hệ */}
            <SpotlightCard>
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4">Thông tin liên hệ</h3>
                <div className="space-y-4">
                    {user?.email && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <Mail size={18} className="text-neutral-500" />
                            </div>
                            <div>
                                <div className="font-medium text-neutral-900 dark:text-white">{user.email}</div>
                                <span className="text-xs text-neutral-500">Email</span>
                            </div>
                        </div>
                    )}

                    {form.phone && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <Phone size={18} className="text-neutral-500" />
                            </div>
                            <div>
                                <div className="font-medium text-neutral-900 dark:text-white">{form.phone}</div>
                                <span className="text-xs text-neutral-500">Số điện thoại</span>
                            </div>
                        </div>
                    )}

                    {form.website && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <LinkIcon size={18} className="text-neutral-500" />
                            </div>
                            <div>
                                <a
                                    href={form.website.startsWith('http') ? form.website : `https://${form.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-blue-500 hover:underline"
                                >
                                    {form.website.replace(/^https?:\/\//, '')}
                                </a>
                                <span className="text-xs text-neutral-500 block">Website</span>
                            </div>
                        </div>
                    )}

                    {!hasContactInfo && (
                        <div className="text-center py-4 text-neutral-500 text-sm">
                            Chưa có thông tin liên hệ
                        </div>
                    )}
                </div>
            </SpotlightCard>

            {/* Thông tin cơ bản */}
            <SpotlightCard>
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-4">Thông tin cơ bản</h3>
                <div className="space-y-4">
                    {form.gender && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <User size={18} className="text-neutral-500" />
                            </div>
                            <div>
                                <div className="font-medium text-neutral-900 dark:text-white">{formatGender(form.gender)}</div>
                                <span className="text-xs text-neutral-500">Giới tính</span>
                            </div>
                        </div>
                    )}

                    {form.birthday && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <Calendar size={18} className="text-neutral-500" />
                            </div>
                            <div>
                                <div className="font-medium text-neutral-900 dark:text-white">
                                    {new Date(form.birthday).toLocaleDateString('vi-VN')}
                                </div>
                                <span className="text-xs text-neutral-500">Ngày sinh</span>
                            </div>
                        </div>
                    )}

                    {form.location && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <Home size={18} className="text-neutral-500" />
                            </div>
                            <div>
                                <div className="font-medium text-neutral-900 dark:text-white">{form.location}</div>
                                <span className="text-xs text-neutral-500">Nơi sống</span>
                            </div>
                        </div>
                    )}

                    {form.hobbies && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <Heart size={18} className="text-neutral-500" />
                            </div>
                            <div>
                                <div className="font-medium text-neutral-900 dark:text-white">{form.hobbies}</div>
                                <span className="text-xs text-neutral-500">Sở thích</span>
                            </div>
                        </div>
                    )}

                    {!hasBasicInfo && (
                        <div className="text-center py-4 text-neutral-500 text-sm">
                            Chưa có thông tin cơ bản
                        </div>
                    )}
                </div>
            </SpotlightCard>

            {/* Empty state when no info at all */}
            {!hasAnyInfo && (
                <div className="text-center py-10 text-neutral-500">
                    Chưa có thông tin giới thiệu nào.
                </div>
            )}
        </div>
    );
}
