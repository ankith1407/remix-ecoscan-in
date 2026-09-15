import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export function initializeSockets(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join user/collector personal notification room
    socket.on('join_user_room', (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[Socket.IO] Socket ${socket.id} joined user_${userId}`);
      }
    });

    socket.on('join_collector_room', (collectorId: string) => {
      if (collectorId) {
        socket.join(`collector_${collectorId}`);
        console.log(`[Socket.IO] Socket ${socket.id} joined collector_${collectorId}`);
      }
    });

    socket.on('join_admin_room', () => {
      socket.join('admin_room');
      console.log(`[Socket.IO] Socket ${socket.id} joined admin_room`);
    });

    // Subscribe to live tracking for a pickup
    socket.on('subscribe_pickup_tracking', (pickupId: string) => {
      if (pickupId) {
        socket.join(`pickup_${pickupId}`);
        console.log(`[Socket.IO] Socket ${socket.id} subscribed to pickup_${pickupId}`);
      }
    });

    socket.on('unsubscribe_pickup_tracking', (pickupId: string) => {
      if (pickupId) {
        socket.leave(`pickup_${pickupId}`);
        console.log(`[Socket.IO] Socket ${socket.id} unsubscribed from pickup_${pickupId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function notifyPickupStatusUpdate(pickupId: string, status: string, payload: any) {
  if (!io) return;
  io.to(`pickup_${pickupId}`).emit('pickup_status_changed', { pickupId, status, ...payload });
  if (payload.user_id) {
    io.to(`user_${payload.user_id}`).emit('pickup_updated', { pickupId, status, ...payload });
  }
  if (payload.collector_id) {
    io.to(`collector_${payload.collector_id}`).emit('pickup_updated', { pickupId, status, ...payload });
  }
  io.to('admin_room').emit('admin_pickup_updated', { pickupId, status, ...payload });
}

export function notifyLiveCollectorLocation(pickupId: string, locationData: {
  latitude: number;
  longitude: number;
  updated_at: string;
  distance_km?: number;
  approx_eta_mins?: number;
}) {
  if (!io) return;
  io.to(`pickup_${pickupId}`).emit('collector_location_update', {
    pickupId,
    ...locationData,
  });
}

export function notifyUserNotification(userId: string, notification: any) {
  if (!io) return;
  io.to(`user_${userId}`).emit('notification_received', notification);
}

export function notifyCollectorNotification(collectorId: string, notification: any) {
  if (!io) return;
  io.to(`collector_${collectorId}`).emit('notification_received', notification);
}
