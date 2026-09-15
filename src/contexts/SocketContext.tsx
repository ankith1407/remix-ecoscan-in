import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, joinUserRoom, joinCollectorRoom, joinAdminRoom, subscribePickupTracking, unsubscribePickupTracking } from '../services/socket';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinUserRoom: (userId: string) => void;
  joinCollectorRoom: (collectorId: string) => void;
  joinAdminRoom: () => void;
  subscribePickupTracking: (pickupId: string) => void;
  unsubscribePickupTracking: (pickupId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinUserRoom: () => {},
  joinCollectorRoom: () => {},
  joinAdminRoom: () => {},
  subscribePickupTracking: () => {},
  unsubscribePickupTracking: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    if (s.connected) setIsConnected(true);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinUserRoom,
        joinCollectorRoom,
        joinAdminRoom,
        subscribePickupTracking,
        unsubscribePickupTracking,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
