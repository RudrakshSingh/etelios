const { Kafka } = require('kafkajs');
const logger = require('../config/logger');

class EventBus {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.logger = logger(serviceName);
    this.producer = null;
    this.consumer = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const kafka = new Kafka({
        clientId: this.serviceName,
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });

      this.producer = kafka.producer();
      this.consumer = kafka.consumer({ groupId: `${this.serviceName}-group` });

      await this.producer.connect();
      await this.consumer.connect();
      
      this.isConnected = true;
      this.logger.info('EventBus connected', { service: this.serviceName });
    } catch (error) {
      this.logger.error('EventBus connection failed', { 
        service: this.serviceName, 
        error: error.message 
      });
      throw error;
    }
  }

  async publish(topic, event) {
    if (!this.isConnected) {
      throw new Error('EventBus not connected');
    }

    try {
      const message = {
        topic,
        messages: [{
          key: event.event_id || event.id,
          value: JSON.stringify({
            ...event,
            published_at: new Date().toISOString(),
            publisher: this.serviceName
          })
        }]
      };

      await this.producer.send(message);
      
      this.logger.info('Event published', {
        service: this.serviceName,
        topic,
        event_id: event.event_id || event.id
      });
    } catch (error) {
      this.logger.error('Event publish failed', {
        service: this.serviceName,
        topic,
        error: error.message
      });
      throw error;
    }
  }

  async subscribe(topics, handler) {
    if (!this.isConnected) {
      throw new Error('EventBus not connected');
    }

    try {
      await this.consumer.subscribe({ topics });
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            await handler(topic, event);
            
            this.logger.info('Event processed', {
              service: this.serviceName,
              topic,
              event_id: event.event_id || event.id
            });
          } catch (error) {
            this.logger.error('Event processing failed', {
              service: this.serviceName,
              topic,
              error: error.message
            });
          }
        }
      });

      this.logger.info('EventBus subscribed', {
        service: this.serviceName,
        topics
      });
    } catch (error) {
      this.logger.error('EventBus subscription failed', {
        service: this.serviceName,
        topics,
        error: error.message
      });
      throw error;
    }
  }

  async disconnect() {
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.consumer) {
      await this.consumer.disconnect();
    }
    this.isConnected = false;
    this.logger.info('EventBus disconnected', { service: this.serviceName });
  }
}

module.exports = EventBus;