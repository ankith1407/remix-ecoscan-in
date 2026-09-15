import io, { type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO Client] Connected to server:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket.IO Client] Disconnected:', reason);
    });
  }

  return socket;
}

export function joinUserRoom(userId: string) {
  const s = getSocket();
  if (s && userId) {
    s.emit('join_user_room', userId);
  }
}

export function joinCollectorRoom(collectorId: string) {
  const s = getSocket();
  if (s && collectorId) {
    s.emit('join_collector_room', collectorId);
  }
}

export function joinAdminRoom() {
  const s = getSocket();
  if (s) {
    s.emit('join_admin_room');
  }
}

export function subscribePickupTracking(pickupId: string) {
  const s = getSocket();
  if (s && pickupId) {
    s.emit('subscribe_pickup_tracking', pickupId);
  }
}

export function unsubscribePickupTracking(pickupId: string) {
  const s = getSocket();
  if (s && pickupId) {
    s.emit('unsubscribe_pickup_tracking', pickupId);
  }
}
