const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function getToken() {
  return localStorage.getItem("token") || "";
}

export async function api(path, { method = "GET", body, headers = {} } = {}) {
  const token = localStorage.getItem("token");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || data.error || `Request failed (${res.status})`);
    
    // Add ban info to error if available
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


export async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file);
  
  const headers = {};
  const token = localStorage.getItem("token");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_URL}/api/uploads/image`, {
    method: "POST",
    credentials: "include",
    headers,
    body: form
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}
