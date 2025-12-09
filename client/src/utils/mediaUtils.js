/**
 * Media Utilities
 * Helper functions for detecting and handling media types (images, GIFs, videos)
 */

/**
 * Check if a URL is a video file
 * @param {string} url - The URL to check
 * @returns {boolean} - True if the URL is a video
 */
export const isVideoUrl = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.quicktime'];
    const lowercaseUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowercaseUrl.includes(ext)) ||
        lowercaseUrl.includes('video/');
};

/**
 * Check if a URL is a GIF file
 * @param {string} url - The URL to check
 * @returns {boolean} - True if the URL is a GIF
 */
export const isGifUrl = (url) => {
    if (!url) return false;
    return url.toLowerCase().includes('.gif');
};

/**
 * Check if a file is a video based on its MIME type
 * @param {File} file - The file to check
 * @returns {boolean} - True if the file is a video
 */
export const isVideoFile = (file) => {
    if (!file) return false;
    return file.type.startsWith('video/');
};

/**
 * Check if a file is a GIF
 * @param {File} file - The file to check
 * @returns {boolean} - True if the file is a GIF
 */
export const isGifFile = (file) => {
    if (!file) return false;
    return file.type === 'image/gif';
};

// File size limits (matching backend)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images/GIFs
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos

/**
 * Validate file size based on type
 * @param {File} file - The file to validate
 * @returns {Object} - { valid: boolean, maxSize: number, message: string }
 */
export const validateMediaFileSize = (file) => {
    if (!file) return { valid: false, message: 'No file provided' };

    const isVideo = isVideoFile(file);
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (file.size > maxSize) {
        return {
            valid: false,
            maxSize,
            message: `File quá lớn (${fileSizeMB}MB). Tối đa ${maxSizeMB}MB cho ${isVideo ? 'video' : 'ảnh/GIF'}`
        };
    }

    return { valid: true, maxSize, message: '' };
};

/**
 * Get accepted file types string for input accept attribute
 * @param {boolean} includeVideo - Whether to include video types
 * @returns {string} - Accept attribute value
 */
export const getAcceptedMediaTypes = (includeVideo = true) => {
    if (includeVideo) {
        return 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime';
    }
    return 'image/jpeg,image/png,image/gif,image/webp';
};
