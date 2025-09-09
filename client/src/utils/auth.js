// Utility để handle authentication với cả cookie và localStorage
export function setAuthToken(token) {
  localStorage.setItem("token", token);
}

export function getAuthToken() {
  return localStorage.getItem("token");
}

export function removeAuthToken() {
  localStorage.removeItem("token");
}

export function getUserInfo() {
  try {
    const token = getAuthToken();
    if (!token) return null;
    
    // Decode JWT token để lấy user info
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}
