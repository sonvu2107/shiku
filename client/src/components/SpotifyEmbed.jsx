import { useMemo } from "react";
import { Music, Volume2, VolumeX } from "lucide-react";
import { cn } from "../utils/cn";

/**
 * SpotifyEmbed - Spotify player embed component
 * Supports track, album, playlist, and artist URLs
 */
export default function SpotifyEmbed({ url, compact = false, className = "" }) {
    // Extract Spotify URI from URL
    const spotifyUri = useMemo(() => {
        if (!url) return null;

        try {
            const urlObj = new URL(url);
            if (!urlObj.hostname.includes('spotify.com')) return null;

            // Extract type and ID from path
            // Example: https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            if (pathParts.length >= 2) {
                const type = pathParts[0]; // track, album, playlist, artist
                const id = pathParts[1].split('?')[0]; // Remove query params
                return { type, id };
            }
        } catch (e) {
            return null;
        }
        return null;
    }, [url]);

    if (!spotifyUri) {
        return null;
    }

    const embedUrl = `https://open.spotify.com/embed/${spotifyUri.type}/${spotifyUri.id}?utm_source=generator&theme=0`;
    const height = compact ? 80 : 152;

    return (
        <div className={cn(
            "rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 transition-all duration-300",
            "hover:shadow-lg dark:hover:shadow-black/30",
            className
        )}>
            <iframe
                src={embedUrl}
                width="100%"
                height={height}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Player"
                className="rounded-xl"
            />
        </div>
    );
}

/**
 * SpotifyPreview - Compact preview for ProfileCustomization
 */
export function SpotifyPreview({ url, onClear }) {
    const spotifyUri = useMemo(() => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            if (!urlObj.hostname.includes('spotify.com')) return null;
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            if (pathParts.length >= 2) {
                return { type: pathParts[0], id: pathParts[1].split('?')[0] };
            }
        } catch (e) {
            return null;
        }
        return null;
    }, [url]);

    if (!spotifyUri) {
        return (
            <div className="flex items-center gap-3 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                    <Music className="w-5 h-5 text-neutral-400" />
                </div>
                <div className="flex-1">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Chưa có bài hát
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        Dán link Spotify để thêm nhạc nền
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <SpotifyEmbed url={url} compact={true} />
            {onClear && (
                <button
                    onClick={onClear}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                    title="Xóa bài hát"
                >
                    <VolumeX className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
