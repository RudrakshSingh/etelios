const { Server } = require('socket.io');
const Redis = require('redis');
const logger = require('../utils/logger');

/**
 * Real-time Data Service
 * Handles WebSocket connections and real-time data broadcasting
 */
class RealtimeService {
  constructor() {
    this.io = null;
    this.redisClient = null;
    this.redisSubscriber = null;
    this.redisPublisher = null;
    this.connectedClients = new Map();
    this.tenantRooms = new Map();
  }

  /**
   * Initialize the real-time service
   */
  async initialize(server) {
    try {
      // Initialize Socket.IO
      this.io = new Server(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling']
      });

      // Initialize Redis for pub/sub
      await this.initializeRedis();

      // Set up Socket.IO event handlers
      this.setupSocketHandlers();

      // Set up Redis event handlers
      this.setupRedisHandlers();

      logger.info('Real-time service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize real-time service:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connections
   */
  async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Main Redis client
      this.redisClient = Redis.createClient({ url: redisUrl });
      await this.redisClient.connect();

      // Redis subscriber for pub/sub
      this.redisSubscriber = Redis.createClient({ url: redisUrl });
      await this.redisSubscriber.connect();

      // Redis publisher for pub/sub
      this.redisPublisher = Redis.createClient({ url: redisUrl });
      await this.redisPublisher.connect();

      logger.info('Redis connections established');
    } catch (error) {
      logger.error('Redis initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up Socket.IO event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('Client connected to real-time service', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      // Handle tenant subscription
      socket.on('subscribe-tenant', (data) => {
        this.handleTenantSubscription(socket, data);
      });

      // Handle feature subscription
      socket.on('subscribe-feature', (data) => {
        this.handleFeatureSubscription(socket, data);
      });

      // Handle user subscription
      socket.on('subscribe-user', (data) => {
        this.handleUserSubscription(socket, data);
      });

      // Handle real-time data request
      socket.on('request-data', (data) => {
        this.handleDataRequest(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error:', error);
      });
    });
  }

  /**
   * Set up Redis event handlers
   */
  setupRedisHandlers() {
    // Subscribe to tenant-specific channels
    this.redisSubscriber.subscribe('tenant:*', (message, channel) => {
      this.handleRedisMessage(message, channel);
    });

    // Subscribe to feature-specific channels
    this.redisSubscriber.subscribe('feature:*', (message, channel) => {
      this.handleRedisMessage(message, channel);
    });

    // Subscribe to user-specific channels
    this.redisSubscriber.subscribe('user:*', (message, channel) => {
      this.handleRedisMessage(message, channel);
    });

    // Subscribe to system-wide channels
    this.redisSubscriber.subscribe('system:*', (message, channel) => {
      this.handleRedisMessage(message, channel);
    });
  }

  /**
   * Handle tenant subscription
   */
  handleTenantSubscription(socket, data) {
    try {
      const { tenantId, features = [] } = data;
      
      if (!tenantId) {
        socket.emit('error', { message: 'Tenant ID is required' });
        return;
      }

      // Join tenant room
      socket.join(`tenant-${tenantId}`);
      
      // Join feature-specific rooms
      features.forEach(feature => {
        socket.join(`tenant-${tenantId}-${feature}`);
      });

      // Store client information
      this.connectedClients.set(socket.id, {
        tenantId,
        features,
        connectedAt: new Date()
      });

      // Update tenant rooms map
      if (!this.tenantRooms.has(tenantId)) {
        this.tenantRooms.set(tenantId, new Set());
      }
      this.tenantRooms.get(tenantId).add(socket.id);

      logger.info(`Client subscribed to tenant: ${tenantId}`, {
        socketId: socket.id,
        tenantId,
        features
      });

      socket.emit('subscription-success', {
        tenantId,
        features,
        message: 'Successfully subscribed to tenant'
      });

    } catch (error) {
      logger.error('Tenant subscription failed:', error);
      socket.emit('error', { message: 'Subscription failed' });
    }
  }

  /**
   * Handle feature subscription
   */
  handleFeatureSubscription(socket, data) {
    try {
      const { tenantId, feature } = data;
      
      if (!tenantId || !feature) {
        socket.emit('error', { message: 'Tenant ID and feature are required' });
        return;
      }

      socket.join(`tenant-${tenantId}-${feature}`);

      logger.info(`Client subscribed to feature: ${feature}`, {
        socketId: socket.id,
        tenantId,
        feature
      });

      socket.emit('feature-subscription-success', {
        tenantId,
        feature,
        message: `Successfully subscribed to ${feature}`
      });

    } catch (error) {
      logger.error('Feature subscription failed:', error);
      socket.emit('error', { message: 'Feature subscription failed' });
    }
  }

  /**
   * Handle user subscription
   */
  handleUserSubscription(socket, data) {
    try {
      const { tenantId, userId } = data;
      
      if (!tenantId || !userId) {
        socket.emit('error', { message: 'Tenant ID and user ID are required' });
        return;
      }

      socket.join(`tenant-${tenantId}-user-${userId}`);

      logger.info(`Client subscribed to user: ${userId}`, {
        socketId: socket.id,
        tenantId,
        userId
      });

      socket.emit('user-subscription-success', {
        tenantId,
        userId,
        message: `Successfully subscribed to user ${userId}`
      });

    } catch (error) {
      logger.error('User subscription failed:', error);
      socket.emit('error', { message: 'User subscription failed' });
    }
  }

  /**
   * Handle data request
   */
  async handleDataRequest(socket, data) {
    try {
      const { tenantId, feature, action, params = {} } = data;
      
      if (!tenantId || !feature || !action) {
        socket.emit('error', { message: 'Tenant ID, feature, and action are required' });
        return;
      }

      // Emit data request to specific feature room
      this.io.to(`tenant-${tenantId}-${feature}`).emit('data-request', {
        action,
        params,
        timestamp: new Date().toISOString()
      });

      logger.info(`Data request sent: ${feature}.${action}`, {
        socketId: socket.id,
        tenantId,
        feature,
        action,
        params
      });

    } catch (error) {
      logger.error('Data request failed:', error);
      socket.emit('error', { message: 'Data request failed' });
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(socket) {
    try {
      const clientInfo = this.connectedClients.get(socket.id);
      
      if (clientInfo) {
        const { tenantId } = clientInfo;
        
        // Remove from tenant rooms
        if (this.tenantRooms.has(tenantId)) {
          this.tenantRooms.get(tenantId).delete(socket.id);
          if (this.tenantRooms.get(tenantId).size === 0) {
            this.tenantRooms.delete(tenantId);
          }
        }

        // Remove client info
        this.connectedClients.delete(socket.id);

        logger.info('Client disconnected from real-time service', {
          socketId: socket.id,
          tenantId,
          connectedAt: clientInfo.connectedAt
        });
      }

    } catch (error) {
      logger.error('Disconnect handling failed:', error);
    }
  }

  /**
   * Handle Redis messages
   */
  handleRedisMessage(message, channel) {
    try {
      const data = JSON.parse(message);
      const channelParts = channel.split(':');
      const channelType = channelParts[0];
      const channelId = channelParts[1];

      switch (channelType) {
        case 'tenant':
          this.broadcastToTenant(channelId, data);
          break;
        case 'feature':
          this.broadcastToFeature(channelId, data);
          break;
        case 'user':
          this.broadcastToUser(channelId, data);
          break;
        case 'system':
          this.broadcastToSystem(data);
          break;
        default:
          logger.warn(`Unknown channel type: ${channelType}`);
      }

    } catch (error) {
      logger.error('Redis message handling failed:', error);
    }
  }

  /**
   * Broadcast to tenant
   */
  broadcastToTenant(tenantId, data) {
    this.io.to(`tenant-${tenantId}`).emit('tenant-update', data);
    logger.info(`Broadcasted to tenant: ${tenantId}`, { tenantId, data });
  }

  /**
   * Broadcast to feature
   */
  broadcastToFeature(feature, data) {
    this.io.emit(`feature-${feature}-update`, data);
    logger.info(`Broadcasted to feature: ${feature}`, { feature, data });
  }

  /**
   * Broadcast to user
   */
  broadcastToUser(userId, data) {
    this.io.emit(`user-${userId}-update`, data);
    logger.info(`Broadcasted to user: ${userId}`, { userId, data });
  }

  /**
   * Broadcast to system
   */
  broadcastToSystem(data) {
    this.io.emit('system-update', data);
    logger.info('Broadcasted to system', { data });
  }

  /**
   * Publish real-time data
   */
  async publishData(channel, data) {
    try {
      const message = JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      });

      await this.redisPublisher.publish(channel, message);
      
      logger.info(`Published data to channel: ${channel}`, { channel, data });

    } catch (error) {
      logger.error('Data publishing failed:', error);
      throw error;
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Get tenant clients count
   */
  getTenantClientsCount(tenantId) {
    return this.tenantRooms.get(tenantId)?.size || 0;
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      totalClients: this.connectedClients.size,
      totalTenants: this.tenantRooms.size,
      tenants: Array.from(this.tenantRooms.entries()).map(([tenantId, clients]) => ({
        tenantId,
        clientCount: clients.size
      }))
    };
  }

  /**
   * Close all connections
   */
  async close() {
    try {
      if (this.redisClient) await this.redisClient.quit();
      if (this.redisSubscriber) await this.redisSubscriber.quit();
      if (this.redisPublisher) await this.redisPublisher.quit();
      
      logger.info('Real-time service closed');
    } catch (error) {
      logger.error('Error closing real-time service:', error);
    }
  }
}

module.exports = new RealtimeService();
