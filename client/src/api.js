// URL của API server - lấy từ environment variable hoặc default localhost
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Lấy authentication token từ localStorage
 * @returns {string} Token hoặc empty string
 */
export function getToken() {
  return localStorage.getItem("token") || "";
}

/**
 * Hàm chính để gọi API với authentication và error handling
 * @param {string} path - Đường dẫn API endpoint
 * @param {Object} options - Các tùy chọn request
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} options.body - Request body data
 * @param {Object} options.headers - Additional headers
 * @returns {Promise<Object>} Response data từ API
 * @throws {Error} Lỗi với thông tin ban nếu user bị cấm
 */
export async function api(path, { method = "GET", body, headers = {} } = {}) {
  // Lấy token từ localStorage và thêm vào header nếu có
  const token = localStorage.getItem("token");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Thực hiện request
  const isFormData = body instanceof FormData;
  const requestOptions = {
    method,
    headers: {
      ...headers,
    },
    credentials: "include", // Bao gồm cookies trong request
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  };

  // Chỉ set Content-Type cho JSON, không set cho FormData
  if (!isFormData) {
    requestOptions.headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, requestOptions);

  // Xử lý lỗi response
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || data.error || `Request failed (${res.status})`);
    
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
  return res.json();
}


/**
 * Upload hình ảnh lên server
 * @param {File} file - File hình ảnh cần upload
 * @returns {Promise<Object>} Response chứa URL của hình ảnh đã upload
 * @throws {Error} Lỗi nếu upload thất bại
 */
export async function uploadImage(file) {
  // Tạo FormData để upload file
  const form = new FormData();
  form.append("image", file);
  
  // Thêm authorization header nếu có token
  const headers = {};
  const token = localStorage.getItem("token");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Thực hiện upload
  const res = await fetch(`${API_URL}/api/uploads/image`, {
    method: "POST",
    credentials: "include",
    headers,
    body: form
  });
  
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}
