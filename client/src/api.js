// Import environment configuration
import { API_CONFIG, SECURITY_CONFIG, isProduction } from './config/environment.js';

// URL của API server - sử dụng environment config
const API_URL = API_CONFIG.baseURL;

import { getValidAccessToken, clearTokens, refreshAccessToken } from "./utils/tokenManager.js";
import { getCSRFToken, ensureCSRFToken } from "./utils/csrfToken.js";
import {
  parseRateLimitHeaders,
  showRateLimitWarning,
  showRateLimitError,
  storeRateLimitInfo,
  getStoredRateLimitInfo
} from "./utils/rateLimitHandler.js";
import { compressImage } from './utils/imageOptimization.js';

// Deprecated: getToken() function đã được thay thế bởi getValidAccessToken() trong tokenManager.js

/**
 * Hàm chính để gọi API với authentication và error handling
 * @param {string} path - Đường dẫn API endpoint
 * @param {Object} options - Các tùy chọn request
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} options.body - Request body data
 * @param {Object} options.headers - Additional headers
 * @param {boolean} options._isRetry - Internal flag to prevent infinite retry loops
 * @returns {Promise<Object>} Response data từ API
 * @throws {Error} Lỗi với thông tin ban nếu user bị cấm
 */
export async function api(path, { method = "GET", body, headers = {}, _isRetry = false } = {}) {
  // Lấy valid access token (tự động refresh nếu cần)
  const token = await getValidAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (method !== "GET") {
    await ensureCSRFToken();
    const csrf = await getCSRFToken();
    if (!csrf) {
      throw new Error("CSRF token not available. Please refresh the page and try again.");
    }
    headers["X-CSRF-Token"] = csrf;
  }

  // Chuẩn bị request options
  const isFormData = body instanceof FormData;

  const requestHeaders = {
    ...headers,
    Accept: "application/json"
  };

  if (!isFormData) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const requestOptions = {
    method,
    headers: requestHeaders,
    credentials: "include",
    mode: "cors",
    body: body ? (isFormData ? body : (typeof body === "string" ? body : JSON.stringify(body))) : undefined,
  };

  // Add timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    // Parse và xử lý rate limit headers
    const rateLimitInfo = parseRateLimitHeaders(res);
    if (rateLimitInfo.limit) {
      storeRateLimitInfo(path, rateLimitInfo);

      // Show warning if nearly exceeded
      if (rateLimitInfo.warning || (rateLimitInfo.remaining && rateLimitInfo.remaining <= 10)) {
        showRateLimitWarning(rateLimitInfo);
      }
    }

    // Xử lý lỗi response
    if (!res.ok) {
      // Nếu là lỗi 401, chỉ retry nếu chưa từng retry (tránh vòng lặp)
      if (res.status === 401 && !_isRetry) {
                const refreshResult = await refreshAccessToken();
        if (refreshResult) {
                    // Retry request với token mới
          return await api(path, { method, body, headers: { ...headers, Authorization: `Bearer ${refreshResult}` }, _isRetry: true });
        }

        // Refresh failed, clear tokens and redirect (chỉ redirect nếu không phải đang ở trang login)
                clearTokens();
        // Chỉ redirect nếu không phải đang ở trang login hoặc register
        // Chỉ redirect nếu không phải đang ở trang login, register, home hoặc welcome
        if (!window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register') &&
          window.location.pathname !== '/' &&
          window.location.pathname !== '/welcome') {
                    window.location.href = "/login";
        }
        return;
      }

      // If this was a retry and still got 401, give up
      if (res.status === 401 && _isRetry) {
                clearTokens();
        // Chỉ redirect nếu không phải đang ở trang login hoặc register
        // Chỉ redirect nếu không phải đang ở trang login, register, home hoặc welcome
        if (!window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register') &&
          window.location.pathname !== '/' &&
          window.location.pathname !== '/welcome') {
                    window.location.href = "/login";
        }
        return;
      }

      // Nếu là lỗi 403 (CSRF token invalid), thử refresh CSRF token
      if (res.status === 403 && method !== "GET") {
        const newCSRFToken = await getCSRFToken(true); // Force refresh

        if (newCSRFToken) {
          headers["X-CSRF-Token"] = newCSRFToken;

          const retryRes = await fetch(`${API_URL}${path}`, {
            ...requestOptions,
            headers: { ...requestOptions.headers, ...headers },
            mode: "cors"
          });

          if (retryRes.ok) {
            return await retryRes.json();
          }
        } else {
          // Failed to get new CSRF token
        }
      }

      // Handle error responses (when !res.ok)
      const data = await res.json().catch(() => ({}));
      const error = new Error(data.message || data.error || `Request failed (${res.status})`);

      // Xử lý rate limit error
      if (res.status === 429) {
        showRateLimitError(rateLimitInfo);
        error.rateLimitInfo = rateLimitInfo;
      }

      // Thêm thông tin ban vào error nếu user bị cấm
      if (data.isBanned) {
        error.banInfo = {
          isBanned: data.isBanned,
          remainingMinutes: data.remainingMinutes,
          banReason: data.banReason
        };
      }

      throw error;
    }

    // If we reach here, the response was successful (res.ok = true)
    return await res.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server không phản hồi kịp thời');
    }
    throw error;
  }
}


// ============================================================================
// UPLOAD HELPERS
// ============================================================================
// 
// These functions handle media uploads with two strategies:
// 1. DIRECT UPLOAD (preferred): Browser → Cloudinary → Server confirm
// 2. LEGACY UPLOAD (fallback):  Browser → Server → Cloudinary
// 
// Direct upload reduces server load by not proxying large files.
// Controlled via VITE_DIRECT_UPLOAD environment variable.
// 
// USAGE:
//   await uploadImage(file)        - Single file (images/videos)
//   await uploadMediaFiles(files)  - Multiple files
// ============================================================================

/** Check if direct upload is enabled via environment variable */
const DIRECT_ENABLED = () => import.meta.env.VITE_DIRECT_UPLOAD === "true";

/**
 * Inject Cloudinary transformation into URL
 * @param {string} url - Cloudinary URL
 * @param {string} transform - Transformation string (e.g., "w_480,h_480,c_fill")
 * @returns {string} URL with transformation
 */
const injectTransform = (url, transform) => {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/${transform}/`);
};

/**
 * Generate thumbnail URL for media
 * @param {string} url - Original Cloudinary URL
 * @param {string} mimeType - MIME type of the file
 * @returns {string} Thumbnail URL with optimizations
 */
const makeThumbnailUrl = (url, mimeType) => {
  const isVideo = mimeType?.startsWith("video/");
  return isVideo
    ? injectTransform(url, "so_0,w_480,h_480,c_fill,f_jpg,q_auto")  // Video: first frame
    : injectTransform(url, "w_480,h_480,c_fill,f_auto,q_auto");     // Image: optimized
};

/**
 * Determine if we should fallback to legacy upload on error
 * Policy violations (size/format) should NOT fallback - they'd fail anyway
 * Technical errors (network/server) SHOULD fallback
 * @param {Error} err - The error that occurred
 * @returns {boolean} True if should try legacy upload
 */
const shouldFallbackLegacy = (err) => {
  const msg = String(err?.message || err || "").toLowerCase();
  const status = err?.status || err?.response?.status;

  // Policy violations - don't fallback, legacy would reject too
  if (
    msg.includes("policy") ||
    msg.includes("too large") ||
    msg.includes("file quá lớn") ||
    msg.includes("not allowed") ||
    msg.includes("format")
  ) return false;

  if (status === 400 || status === 413) return false;

  // Technical errors - try legacy as fallback
  if (status >= 500) return true;
  if (status === 408 || status === 429) return true;
  if (msg.includes("invalid signature") || msg.includes("failed to fetch") || msg.includes("network")) return true;

  return true;
};

/**
 * Direct upload to Cloudinary (sign → upload → confirm)
 * @param {File} file - File to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - { url, type, thumbnail, public_id }
 */
async function directUploadToCloudinary(file, { folder = "blog", category } = {}) {
  const cat = category || (file.type.startsWith("video/") ? "video" : "image");

  // 1. Sign (auth + csrf handled by api())
  const sign = await api(
    `/api/uploads/direct/sign?category=${encodeURIComponent(cat)}&folder=${encodeURIComponent(folder)}`,
    { method: "GET" }
  );

  if (!sign?.config) {
    throw new Error("Invalid sign response");
  }

  const config = sign.config;

  // 2. Upload directly to Cloudinary
  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/${config.resource_type}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(config.timestamp));
  form.append("folder", config.folder);
  form.append("signature", config.signature);

  const cloudRes = await fetch(endpoint, { method: "POST", body: form });
  const cloudJson = await cloudRes.json();

  if (!cloudRes.ok) {
    const e = new Error(cloudJson?.error?.message || "Cloudinary upload failed");
    e.status = cloudRes.status;
    throw e;
  }

  // 3. Confirm with backend
  const confirm = await api("/api/uploads/direct/confirm", {
    method: "POST",
    body: JSON.stringify({
      public_id: cloudJson.public_id,
      resource_type: cloudJson.resource_type,
      category: cat,
      originalName: file.name
    }),
  });

  if (!confirm?.success || !confirm?.media?.url) {
    const e = new Error(confirm?.message || "Confirm failed");
    e.status = 400;
    throw e;
  }

  const url = confirm.media.url;
  const type = file.type.startsWith("video/") ? "video" : "image";

  return {
    url,
    type,
    thumbnail: makeThumbnailUrl(url, file.type),
    public_id: confirm.media.public_id,
  };
}

// ==================== UPLOAD FUNCTIONS ====================

/**
 * Upload hình ảnh lên server với automatic compression
 * Supports direct upload to Cloudinary with fallback to legacy
 * @param {File} file - File hình ảnh cần upload
 * @param {Object} options - Tùy chọn upload
 * @param {boolean} options.skipCompression - Bỏ qua compression (default: false)
 * @param {number} options.maxWidth - Max width cho compression (default: 1920)
 * @param {number} options.quality - Chất lượng nén 0-1 (default: 0.85)
 * @param {string} options.folder - Cloudinary folder (default: "blog")
 * @returns {Promise<Object>} Response chứa URL của hình ảnh đã upload
 * @throws {Error} Lỗi nếu upload thất bại
 */
export async function uploadImage(file, options = {}) {
  const { skipCompression = false, maxWidth = 1920, quality = 0.85, folder = "blog" } = options;

  let fileToUpload = file;

  // Compress image before upload if it's an image and not skipped
  // Skip compression for GIFs (preserve animation) and videos (not supported)
  const isVideo = file.type.startsWith('video/');
  const isGif = file.type.includes('gif');

  if (!skipCompression && file.type.startsWith('image/') && !isGif && !isVideo) {
    try {
      const compressedFile = await compressImage(file, { maxWidth, quality });
      if (compressedFile.size < file.size) {
        fileToUpload = compressedFile;
      }
    } catch {
      // Compression failed, use original file
    }
  }

  // Direct upload to Cloudinary (if enabled via VITE_DIRECT_UPLOAD)
  if (DIRECT_ENABLED()) {
    try {
      const direct = await directUploadToCloudinary(fileToUpload, {
        folder,
        category: isVideo ? "video" : "image"
      });

      return {
        success: true,
        url: direct.url,
        type: direct.type,
        thumbnail: direct.thumbnail,
        public_id: direct.public_id
      };
    } catch (err) {
      if (!shouldFallbackLegacy(err)) throw err;
      // Fallback to legacy on technical errors
    }
  }

  // Legacy upload via server
  const form = new FormData();
  form.append("file", fileToUpload);

  const res = await api("/api/uploads/", { method: "POST", body: form });

  return {
    ...res,
    type: fileToUpload.type.startsWith("video/") ? "video" : "image",
    thumbnail: makeThumbnailUrl(res?.url, fileToUpload.type),
  };
}

/**
 * Upload multiple media files (images/videos)
 * Supports direct upload to Cloudinary with fallback to legacy
 * @param {File[]|FileList} files - Array of files to upload
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder (default: "blog")
 * @returns {Promise<Array>} Array of upload results [{url, type, thumbnail}, ...]
 */
export async function uploadMediaFiles(files, options = {}) {
  const { folder = "blog" } = options;
  const list = Array.from(files || []);
  if (!list.length) return [];

  // Direct upload to Cloudinary (if enabled via VITE_DIRECT_UPLOAD)
  if (DIRECT_ENABLED()) {
    try {
      const results = await Promise.all(
        list.map((f) => directUploadToCloudinary(f, { folder }))
      );
      return results;
    } catch (err) {
      if (!shouldFallbackLegacy(err)) throw err;
      // Fallback to legacy on technical errors
    }
  }

  // Legacy multi upload via server
  const form = new FormData();
  list.forEach((f) => form.append("files", f));

  const res = await api("/api/uploads/media", { method: "POST", body: form });
  if (!res?.files?.length) throw new Error(res?.error || "Upload failed");

  return res.files.map((x, idx) => ({
    url: x.url,
    type: list[idx].type.startsWith("video/") ? "video" : "image",
    thumbnail: makeThumbnailUrl(x.url, list[idx].type),
  }));
}

