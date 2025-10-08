import React, { useEffect, useState } from "react";
import socketService from "../socket";

/**
 * Hook để sử dụng Socket.IO connection
 * @returns {Object} socket instance hoặc null
 */
export function useSocket() {
  // Tạm thời disable để tránh lỗi
  return null;
  
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Lấy socket instance từ socketService
    const socketInstance = socketService.socket;
    setSocket(socketInstance);

    // Cleanup - không disconnect vì socket được quản lý globally
    return () => {
      // Do not disconnect here as socket is shared across app
    };
  }, []);

  return socket;
}
