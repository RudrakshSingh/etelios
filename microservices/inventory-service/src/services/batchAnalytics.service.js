const logger = require('../config/logger');

class BatchAnalyticsService {
  /**
   * Track batch received event
   * @param {Object} batchData - Batch data
   * @param {String} storeId - Store ID
   * @param {String} userId - User ID
   */
  async trackBatchReceived(batchData, storeId, userId) {
    try {
      const event = {
        event_type: 'BatchReceived',
        timestamp: new Date(),
        store_id: storeId,
        user_id: userId,
        data: {
          batch_id: batchData._id,
          batch_number: batchData.batch_number,
          lot_number: batchData.lot_number,
          product_variant_id: batchData.product_variant_id,
          quantity: batchData.initial_quantity,
          expiry_date: batchData.expiry_date,
          days_to_expiry: batchData.days_to_expiry,
          vendor_id: batchData.vendor_id,
          purchase_price: batchData.purchase_price
        }
      };

      // Log event
      logger.info('Batch received event tracked', event);
      
      // In production, this would send to analytics platform
      // await this.sendToAnalytics(event);
      
      return event;
    } catch (error) {
      logger.error('Error tracking batch received event:', error);
      throw error;
    }
  }

  /**
   * Track batch adjusted event
   * @param {Object} batchData - Batch data
   * @param {String} adjustmentType - Type of adjustment
   * @param {Number} quantityChange - Quantity change
   * @param {String} reason - Adjustment reason
   * @param {String} userId - User ID
   */
  async trackBatchAdjusted(batchData, adjustmentType, quantityChange, reason, userId) {
    try {
      const event = {
        event_type: 'BatchAdjusted',
        timestamp: new Date(),
        store_id: batchData.store_id,
        user_id: userId,
        data: {
          batch_id: batchData._id,
          batch_number: batchData.batch_number,
          product_variant_id: batchData.product_variant_id,
          adjustment_type: adjustmentType,
          quantity_change: quantityChange,
          previous_quantity: batchData.current_quantity - quantityChange,
          new_quantity: batchData.current_quantity,
          reason: reason,
          expiry_date: batchData.expiry_date,
          days_to_expiry: batchData.days_to_expiry
        }
      };

      logger.info('Batch adjusted event tracked', event);
      
      return event;
    } catch (error) {
      logger.error('Error tracking batch adjusted event:', error);
      throw error;
    }
  }

  /**
   * Track batch depleted event
   * @param {Object} batchData - Batch data
   * @param {String} depletionReason - Reason for depletion
   * @param {String} userId - User ID
   */
  async trackBatchDepleted(batchData, depletionReason, userId) {
    try {
      const event = {
        event_type: 'BatchDepleted',
        timestamp: new Date(),
        store_id: batchData.store_id,
        user_id: userId,
        data: {
          batch_id: batchData._id,
          batch_number: batchData.batch_number,
          product_variant_id: batchData.product_variant_id,
          depletion_reason: depletionReason,
          expiry_date: batchData.expiry_date,
          days_to_expiry: batchData.days_to_expiry,
          was_expired: batchData.is_expired,
          was_blocked: batchData.is_blocked_for_sale
        }
      };

      logger.info('Batch depleted event tracked', event);
      
      return event;
    } catch (error) {
      logger.error('Error tracking batch depleted event:', error);
      throw error;
    }
  }

  /**
   * Track near expiry alert event
   * @param {Object} batchData - Batch data
   * @param {Number} daysToExpiry - Days to expiry
   * @param {String} alertType - Type of alert
   */
  async trackNearExpiryAlert(batchData, daysToExpiry, alertType) {
    try {
      const event = {
        event_type: 'NearExpiryAlert',
        timestamp: new Date(),
        store_id: batchData.store_id,
        data: {
          batch_id: batchData._id,
          batch_number: batchData.batch_number,
          product_variant_id: batchData.product_variant_id,
          days_to_expiry: daysToExpiry,
          alert_type: alertType,
          expiry_date: batchData.expiry_date,
          current_quantity: batchData.current_quantity,
          is_blocked: batchData.is_blocked_for_sale
        }
      };

      logger.info('Near expiry alert event tracked', event);
      
      return event;
    } catch (error) {
      logger.error('Error tracking near expiry alert event:', error);
      throw error;
    }
  }

  /**
   * Track FEFO compliance event
   * @param {String} productVariantId - Product variant ID
   * @param {String} storeId - Store ID
   * @param {Boolean} isCompliant - FEFO compliance status
   * @param {Array} batchSequence - Batch sequence
   */
  async trackFEFOCompliance(productVariantId, storeId, isCompliant, batchSequence) {
    try {
      const event = {
        event_type: 'FEFOCompliance',
        timestamp: new Date(),
        store_id: storeId,
        data: {
          product_variant_id: productVariantId,
          is_compliant: isCompliant,
          batch_sequence: batchSequence,
          violation_count: isCompliant ? 0 : this.calculateViolations(batchSequence)
        }
      };

      logger.info('FEFO compliance event tracked', event);
      
      return event;
    } catch (error) {
      logger.error('Error tracking FEFO compliance event:', error);
      throw error;
    }
  }

  /**
   * Track batch expiry event
   * @param {Object} batchData - Batch data
   * @param {Number} expiredQuantity - Expired quantity
   * @param {Number} estimatedLoss - Estimated loss amount
   */
  async trackBatchExpiry(batchData, expiredQuantity, estimatedLoss) {
    try {
      const event = {
        event_type: 'BatchExpiry',
        timestamp: new Date(),
        store_id: batchData.store_id,
        data: {
          batch_id: batchData._id,
          batch_number: batchData.batch_number,
          product_variant_id: batchData.product_variant_id,
          expired_quantity: expiredQuantity,
          estimated_loss: estimatedLoss,
          expiry_date: batchData.expiry_date,
          purchase_price: batchData.purchase_price
        }
      };

      logger.info('Batch expiry event tracked', event);
      
      return event;
    } catch (error) {
      logger.error('Error tracking batch expiry event:', error);
      throw error;
    }
  }

  /**
   * Track batch sale event (FEFO selection)
   * @param {Object} saleData - Sale data
   * @param {Array} selectedBatches - Selected batches
   * @param {String} userId - User ID
   */
  async trackBatchSale(saleData, selectedBatches, userId) {
    try {
      const event = {
        event_type: 'BatchSale',
        timestamp: new Date(),
        store_id: saleData.store_id,
        user_id: userId,
        data: {
          invoice_id: saleData.invoice_id,
          customer_id: saleData.customer_id,
          selected_batches: selectedBatches.map(batch => ({
            batch_id: batch.batch_id,
            batch_number: batch.batch_number,
            quantity: batch.quantity,
            expiry_date: batch.expiry_date,
            days_to_expiry: batch.days_to_expiry,
            fefo_compliant: true
          })),
          total_quantity: selectedBatches.reduce((sum, b) => sum + b.quantity, 0)
        }
      };

      logger.info('Batch sale event tracked', event);
      
      return event;
    } catch (error) {
      logger.error('Error tracking batch sale event:', error);
      throw error;
    }
  }

  /**
   * Calculate FEFO violations
   * @param {Array} batchSequence - Batch sequence
   * @returns {Number} Violation count
   */
  calculateViolations(batchSequence) {
    if (batchSequence.length < 2) return 0;
    
    let violations = 0;
    for (let i = 1; i < batchSequence.length; i++) {
      const currentExpiry = new Date(batchSequence[i].expiry_date);
      const previousExpiry = new Date(batchSequence[i-1].expiry_date);
      
      if (currentExpiry < previousExpiry) {
        violations++;
      }
    }
    
    return violations;
  }

  /**
   * Send event to analytics platform
   * @param {Object} event - Event data
   */
  async sendToAnalytics(event) {
    try {
      // In production, this would send to your analytics platform
      // Examples: Google Analytics, Mixpanel, Amplitude, etc.
      
      // For now, just log the event
      logger.info('Event sent to analytics platform', {
        event_type: event.event_type,
        timestamp: event.timestamp
      });
      
      return true;
    } catch (error) {
      logger.error('Error sending event to analytics:', error);
      throw error;
    }
  }

  /**
   * Get batch analytics summary
   * @param {Object} filters - Filters
   * @returns {Object} Analytics summary
   */
  async getBatchAnalyticsSummary(filters = {}) {
    try {
      // This would query your analytics data store
      // For now, return a placeholder structure
      
      const summary = {
        total_events: 0,
        batch_received: 0,
        batch_adjusted: 0,
        batch_depleted: 0,
        near_expiry_alerts: 0,
        fefo_violations: 0,
        expired_batches: 0,
        total_loss: 0,
        generated_at: new Date()
      };

      return summary;
    } catch (error) {
      logger.error('Error getting batch analytics summary:', error);
      throw error;
    }
  }
}

module.exports = new BatchAnalyticsService();
