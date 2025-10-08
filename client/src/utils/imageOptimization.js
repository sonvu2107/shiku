/**
 * Image Optimization Utilities
 * Provides helper functions for image processing and optimization
 */

/**
 * Generate optimized image URLs for different formats and sizes
 * @param {string} originalUrl - Original image URL
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized image URLs
 */
export const generateOptimizedImageUrls = (originalUrl, options = {}) => {
  const {
    sizes = [480, 768, 1024, 1200],
    quality = 85,
    formats = ['avif', 'webp', 'jpg']
  } = options;

  if (!originalUrl) return null;

  const baseUrl = originalUrl.replace(/\.(jpg|jpeg|png|gif)$/i, '');
  const originalExt = originalUrl.match(/\.(jpg|jpeg|png|gif)$/i)?.[1] || 'jpg';

  const optimizedUrls = {};

  // Generate URLs for each format
  formats.forEach(format => {
    optimizedUrls[format] = {
      // Single URL for the largest size
      url: `${baseUrl}_${Math.max(...sizes)}.${format}`,
      
      // Responsive srcSet
      srcSet: sizes.map(size => `${baseUrl}_${size}.${format} ${size}w`).join(', ')
    };
  });

  // Add original format as fallback
  if (!optimizedUrls[originalExt]) {
    optimizedUrls[originalExt] = {
      url: originalUrl,
      srcSet: sizes.map(size => `${baseUrl}_${size}.${originalExt} ${size}w`).join(', ')
    };
  }

  return optimizedUrls;
};

/**
 * Generate blur placeholder from image
 * @param {string} imageUrl - Image URL
 * @param {number} width - Placeholder width
 * @param {number} height - Placeholder height
 * @returns {Promise<string>} Base64 encoded blur placeholder
 */
export const generateBlurPlaceholder = async (imageUrl, width = 40, height = 40) => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Draw image on canvas with blur effect
        ctx.filter = 'blur(4px)';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64
        const dataURL = canvas.toDataURL('image/jpeg', 0.3);
        resolve(dataURL);
      };
      
      img.onerror = () => {
        // Fallback placeholder
        resolve(generateDefaultPlaceholder(width, height));
      };
      
      img.src = imageUrl;
    });
  } catch (error) {
    return generateDefaultPlaceholder(width, height);
  }
};

/**
 * Generate default SVG placeholder
 * @param {number} width - Placeholder width
 * @param {number} height - Placeholder height
 * @returns {string} Base64 encoded SVG placeholder
 */
export const generateDefaultPlaceholder = (width = 40, height = 40) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#e5e7eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#d1d5db;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <circle cx="50%" cy="35%" r="8%" fill="#9ca3af" opacity="0.5"/>
      <polygon points="20%,65% 30%,50% 45%,60% 60%,45% 80%,65% 80%,80% 20%,80%" fill="#9ca3af" opacity="0.5"/>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Check browser support for modern image formats
 * @returns {Object} Support status for different formats
 */
export const checkImageFormatSupport = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return {
    webp: canvas.toDataURL('image/webp').startsWith('data:image/webp'),
    avif: canvas.toDataURL('image/avif').startsWith('data:image/avif'),
    heic: false // Not supported by canvas API
  };
};

/**
 * Get optimal image format based on browser support
 * @param {Array} availableFormats - Available image formats
 * @returns {string} Optimal format
 */
export const getOptimalImageFormat = (availableFormats = ['avif', 'webp', 'jpg']) => {
  const support = checkImageFormatSupport();
  
  // Priority order: AVIF > WebP > JPG/PNG
  if (availableFormats.includes('avif') && support.avif) return 'avif';
  if (availableFormats.includes('webp') && support.webp) return 'webp';
  if (availableFormats.includes('heic') && support.heic) return 'heic';
  
  // Fallback to traditional formats
  return availableFormats.find(format => ['jpg', 'jpeg', 'png', 'gif'].includes(format)) || 'jpg';
};

/**
 * Calculate responsive image sizes
 * @param {Object} options - Size calculation options
 * @returns {Array} Array of size breakpoints
 */
export const calculateResponsiveSizes = (options = {}) => {
  const {
    maxWidth = 1200,
    breakpoints = [480, 768, 1024],
    multiplier = 1
  } = options;

  const sizes = [...breakpoints, maxWidth]
    .map(size => Math.round(size * multiplier))
    .filter((size, index, arr) => arr.indexOf(size) === index) // Remove duplicates
    .sort((a, b) => a - b); // Sort ascending

  return sizes;
};

/**
 * Preload critical images
 * @param {Array} imageUrls - Array of image URLs to preload
 * @param {Object} options - Preload options
 */
export const preloadImages = (imageUrls, options = {}) => {
  const { format = 'webp', priority = 'high' } = options;
  
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.fetchPriority = priority;
    
    if (format) {
      link.type = `image/${format}`;
    }
    
    document.head.appendChild(link);
  });
};

/**
 * Image performance monitoring
 * @param {string} imageUrl - Image URL to monitor
 * @param {string} label - Label for performance tracking
 */
export const trackImagePerformance = (imageUrl, label = 'image-load') => {
  const startTime = performance.now();
  
  const img = new Image();
  img.onload = () => {
    const loadTime = performance.now() - startTime;
    
    // Send to analytics if available
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: label,
        value: Math.round(loadTime)
      });
    }
    
    console.log(`Image loaded: ${imageUrl} in ${loadTime.toFixed(2)}ms`);
  };
  
  img.onerror = () => {
    console.error(`Failed to load image: ${imageUrl}`);
  };
  
  img.src = imageUrl;
};

/**
 * Compress image client-side (for uploads)
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} Compressed image file
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob], file.name, {
            type: format,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        },
        format,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

export default {
  generateOptimizedImageUrls,
  generateBlurPlaceholder,
  generateDefaultPlaceholder,
  checkImageFormatSupport,
  getOptimalImageFormat,
  calculateResponsiveSizes,
  preloadImages,
  trackImagePerformance,
  compressImage
};