import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../api";
import CircularGallery from "../components/gallery/CircularGallery";
import LightRays from "../components/LightRays/LightRays";

/**
 * Gallery Page - Hiển thị ảnh gần đây với hiệu ứng Circular Gallery 3D
 */
export default function Gallery() {
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Load user and images on mount
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Get current user
                const userRes = await api("/api/auth/me");
                const userData = userRes.user;
                setUser(userData);

                const userId = userData?.id || userData?._id;
                if (!userId) {
                    setLoading(false);
                    return;
                }

                // Load posts to extract images
                const [publicData, privateData] = await Promise.all([
                    api(`/api/posts?author=${userId}&status=published&limit=100`),
                    api(`/api/posts?author=${userId}&status=private&limit=100`)
                ]);

                const allPosts = [
                    ...(privateData?.posts || privateData?.items || []),
                    ...(publicData?.posts || publicData?.items || [])
                ];

                // Extract images from posts
                const allImages = [];
                const seenUrls = new Set(); // Track seen URLs to avoid duplicates

                allPosts.forEach(post => {
                    if (post.coverUrl && !seenUrls.has(post.coverUrl)) {
                        seenUrls.add(post.coverUrl);
                        allImages.push({
                            url: post.coverUrl,
                            postId: post._id,
                            postTitle: post.title || "Không có tiêu đề",
                            createdAt: post.createdAt
                        });
                    }
                    if (post.files && Array.isArray(post.files)) {
                        post.files.forEach(file => {
                            if (file.type === 'image' && file.url && !seenUrls.has(file.url)) {
                                seenUrls.add(file.url);
                                allImages.push({
                                    url: file.url,
                                    postId: post._id,
                                    postTitle: post.title || "Không có tiêu đề",
                                    createdAt: post.createdAt
                                });
                            }
                        });
                    }
                });

                // Sort by creation time (newest first)
                const sortedImages = allImages.sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                );

                setImages(sortedImages);
            } catch (error) {
                console.error("Failed to load gallery images:", error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    // Transform images to gallery format
    const galleryItems = images.map(img => ({
        image: img.url,
        text: img.postTitle
    }));

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* LightRays Background */}
            <div className="fixed inset-0 z-0">
                <LightRays />
            </div>

            {/* Back button only */}
            <button
                onClick={() => navigate(-1)}
                className="fixed top-6 left-6 z-50 text-sm font-medium text-white/70 hover:text-white transition-colors bg-black/30 backdrop-blur-md px-4 py-2 rounded-full"
            >
                ← Quay lại
            </button>

            {/* Gallery Container */}
            <div style={{ height: '100vh' }}>
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <Loader2 size={40} className="animate-spin text-neutral-400" />
                        <p className="text-neutral-500 dark:text-neutral-400">Đang tải ảnh...</p>
                    </div>
                ) : images.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                            <Images size={40} className="text-neutral-400" />
                        </div>
                        <h2 className="text-xl font-bold">Chưa có ảnh nào</h2>
                        <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md">
                            Bạn chưa đăng ảnh nào. Hãy tạo bài viết mới với ảnh để hiển thị ở đây!
                        </p>
                        <button
                            onClick={() => navigate('/profile')}
                            className="mt-4 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-medium hover:opacity-90 transition-opacity"
                        >
                            Về trang cá nhân
                        </button>
                    </div>
                ) : (
                    <div style={{ height: '100vh', position: 'relative' }}>
                        <CircularGallery
                            items={galleryItems}
                            bend={3}
                            textColor="#ffffff"
                            borderRadius={0.05}
                            scrollEase={0.03}
                            scrollSpeed={2}
                        />

                        {/* Instructions overlay */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 dark:bg-white/20 backdrop-blur-md px-6 py-3 rounded-full text-white text-sm">
                            <span className="opacity-80">Kéo hoặc cuộn để xem ảnh</span>
                            <span className="mx-2">•</span>
                            <span className="font-medium">{images.length} ảnh</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
