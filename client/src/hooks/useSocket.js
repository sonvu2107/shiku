import React, { useEffect, useState } from "react";
import socketService from "../socket";

/**
 * Hook to use the Socket.IO connection
 * @returns {Object} socket instance or null
 */
export function useSocket() {
  // Temporarily disabled to avoid errors
  return null;
  
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Get socket instance from socketService
    const socketInstance = socketService.socket;
    setSocket(socketInstance);

    // Cleanup - do not disconnect because socket is managed globally
    return () => {
      // Do not disconnect here as socket is shared across app
    };
  }, []);

  return socket;
}
