const Inventory = require('../models/Inventory.model');
const InventoryBatch = require('../models/pos/InventoryBatch.model');
const AgingReport = require('../models/AgingReport.model');
const StockTransfer = require('../models/StockTransfer.model');
const ProductVariant = require('../models/ProductVariant.model');
const Store = require('../models/Store.model');
const logger = require('../config/logger');

class AgingService {
  /**
   * Calculate aging for all inventory items
   */
  async calculateAging() {
    try {
      const inventories = await Inventory.find({ is_active: true })
        .populate('product_variant_id')
        .populate('store_id');

      for (const inventory of inventories) {
        // Calculate days in stock
        const today = new Date();
        const daysInStock = Math.floor((today - inventory.first_received_date) / (1000 * 60 * 60 * 24));
        
        inventory.days_in_stock = daysInStock;
        inventory.last_movement_date = today;
        
        // Calculate aging bucket
        inventory.calculateAgingBucket();
        
        // Calculate sell-through rate
        inventory.calculateSellThroughRate();
        
        await inventory.save();
      }
      
      logger.info(`Aging calculated for ${inventories.length} inventory items`);
      return { success: true, processed: inventories.length };
    } catch (error) {
      logger.error('Error calculating aging:', error);
      throw error;
    }
  }

  /**
   * Generate aging report for a store
   */
  async generateAgingReport(storeId, generatedBy) {
    try {
      const inventories = await Inventory.find({ 
        store_id: storeId, 
        is_active: true 
      }).populate('product_variant_id');

      const agingSummary = {
        new_arrivals: { count: 0, value: 0 },
        fresh_stock: { count: 0, value: 0 },
        slow_moving: { count: 0, value: 0 },
        dead_stock: { count: 0, value: 0 }
      };

      const slowMovingItems = [];
      const deadStockItems = [];
      const transferRecommendations = [];

      for (const inventory of inventories) {
        const bucket = inventory.aging_bucket;
        const value = inventory.current_stock * (inventory.product_variant_id?.mrp || 0);
        
        agingSummary[bucket.toLowerCase()].count += 1;
        agingSummary[bucket.toLowerCase()].value += value;

        // Identify slow moving items (>90 days, no sales in 30 days)
        if (inventory.days_in_stock > 90 && inventory.sell_through_rate < 10) {
          slowMovingItems.push({
            product_variant_id: inventory.product_variant_id._id,
            product_name: inventory.product_variant_id.variant_name,
            sku: inventory.product_variant_id.sub_sku,
            days_in_stock: inventory.days_in_stock,
            current_stock: inventory.current_stock,
            sell_through_rate: inventory.sell_through_rate,
            last_sale_date: inventory.last_movement_date,
            recommended_action: 'TRANSFER'
          });
        }

        // Identify dead stock (>180 days)
        if (inventory.days_in_stock > 180) {
          deadStockItems.push({
            product_variant_id: inventory.product_variant_id._id,
            product_name: inventory.product_variant_id.variant_name,
            sku: inventory.product_variant_id.sub_sku,
            days_in_stock: inventory.days_in_stock,
            current_stock: inventory.current_stock,
            last_sale_date: inventory.last_movement_date,
            recommended_action: inventory.days_in_stock > 365 ? 'DISCOUNT_CLEARANCE' : 'TRANSFER'
          });
        }
      }

      // Generate transfer recommendations
      const recommendations = await this.generateTransferRecommendations(storeId);
      transferRecommendations.push(...recommendations);

      // Calculate KPIs
      const totalStock = agingSummary.new_arrivals.count + agingSummary.fresh_stock.count + 
                        agingSummary.slow_moving.count + agingSummary.dead_stock.count;
      const stockAgingRatio = totalStock > 0 ? (agingSummary.slow_moving.count + agingSummary.dead_stock.count) / totalStock * 100 : 0;
      const deadStockPercentage = totalStock > 0 ? agingSummary.dead_stock.count / totalStock * 100 : 0;

      const kpis = {
        stock_aging_ratio: Math.round(stockAgingRatio * 100) / 100,
        dead_stock_percentage: Math.round(deadStockPercentage * 100) / 100,
        rotation_success_rate: 0, // Will be calculated from historical data
        average_days_in_stock: 0, // Will be calculated
        total_inventory_value: agingSummary.new_arrivals.value + agingSummary.fresh_stock.value + 
                              agingSummary.slow_moving.value + agingSummary.dead_stock.value
      };

      const agingReport = new AgingReport({
        report_date: new Date(),
        store_id: storeId,
        aging_summary: agingSummary,
        slow_moving_items: slowMovingItems,
        dead_stock_items: deadStockItems,
        transfer_recommendations: transferRecommendations,
        kpis: kpis,
        generated_by: generatedBy
      });

      await agingReport.save();
      
      logger.info(`Aging report generated for store ${storeId}`);
      return agingReport;
    } catch (error) {
      logger.error('Error generating aging report:', error);
      throw error;
    }
  }

  /**
   * Generate transfer recommendations based on sales performance
   */
  async generateTransferRecommendations(storeId) {
    try {
      const recommendations = [];
      
      // Get slow moving items from current store
      const slowMovingItems = await Inventory.find({
        store_id: storeId,
        aging_bucket: { $in: ['SLOW_MOVING', 'DEAD_STOCK'] },
        is_active: true
      }).populate('product_variant_id');

      for (const item of slowMovingItems) {
        // Find stores where this product sells better
        const betterPerformingStores = await this.findBetterPerformingStores(
          item.product_variant_id._id, 
          storeId
        );

        for (const targetStore of betterPerformingStores) {
          const recommendedQuantity = Math.min(
            item.current_stock, 
            Math.floor(item.current_stock * 0.5) // Transfer 50% of stock
          );

          if (recommendedQuantity > 0) {
            recommendations.push({
              product_variant_id: item.product_variant_id._id,
              from_store_id: storeId,
              to_store_id: targetStore.store_id,
              recommended_quantity: recommendedQuantity,
              reason: `Product sells ${targetStore.sell_through_rate}% better at target store`,
              priority: item.aging_bucket === 'DEAD_STOCK' ? 'HIGH' : 'MEDIUM'
            });
          }
        }
      }

      return recommendations;
    } catch (error) {
      logger.error('Error generating transfer recommendations:', error);
      throw error;
    }
  }

  /**
   * Find stores where a product performs better
   */
  async findBetterPerformingStores(productVariantId, currentStoreId) {
    try {
      const otherStores = await Inventory.find({
        product_variant_id: productVariantId,
        store_id: { $ne: currentStoreId },
        is_active: true
      }).populate('store_id');

      const currentStorePerformance = await Inventory.findOne({
        product_variant_id: productVariantId,
        store_id: currentStoreId,
        is_active: true
      });

      if (!currentStorePerformance) return [];

      const betterStores = otherStores.filter(store => 
        store.sell_through_rate > currentStorePerformance.sell_through_rate * 1.5 // 50% better performance
      );

      return betterStores.map(store => ({
        store_id: store.store_id._id,
        sell_through_rate: store.sell_through_rate,
        store_name: store.store_id.name
      }));
    } catch (error) {
      logger.error('Error finding better performing stores:', error);
      return [];
    }
  }

  /**
   * Create transfer order based on recommendations
   */
  async createTransferOrder(recommendations, requestedBy) {
    try {
      const transferItems = recommendations.map(rec => ({
        product_variant_id: rec.product_variant_id,
        quantity: rec.recommended_quantity,
        reason: rec.reason,
        aging_days: 0 // Will be calculated
      }));

      const transferOrder = new StockTransfer({
        transfer_type: 'AUTO_RECOMMENDED',
        from_store_id: recommendations[0].from_store_id,
        to_store_id: recommendations[0].to_store_id,
        items: transferItems,
        requested_by: requestedBy,
        status: 'DRAFT'
      });

      await transferOrder.save();
      
      logger.info(`Transfer order created: ${transferOrder.transfer_number}`);
      return transferOrder;
    } catch (error) {
      logger.error('Error creating transfer order:', error);
      throw error;
    }
  }

  /**
   * Process automatic stock rotation
   */
  async processAutomaticRotation() {
    try {
      const stores = await Store.find({ is_active: true });
      const results = [];

      for (const store of stores) {
        // Generate aging report
        const agingReport = await this.generateAgingReport(store._id, null);
        
        // Create transfer recommendations
        const recommendations = agingReport.transfer_recommendations;
        
        if (recommendations.length > 0) {
          // Group recommendations by target store
          const groupedRecommendations = this.groupRecommendationsByTargetStore(recommendations);
          
          for (const [targetStoreId, storeRecommendations] of Object.entries(groupedRecommendations)) {
            const transferOrder = await this.createTransferOrder(storeRecommendations, null);
            results.push({
              store_id: store._id,
              transfer_order: transferOrder._id,
              recommendations_count: storeRecommendations.length
            });
          }
        }
      }

      logger.info(`Automatic rotation processed for ${stores.length} stores`);
      return results;
    } catch (error) {
      logger.error('Error processing automatic rotation:', error);
      throw error;
    }
  }

  /**
   * Group recommendations by target store
   */
  groupRecommendationsByTargetStore(recommendations) {
    const grouped = {};
    
    for (const rec of recommendations) {
      const targetStoreId = rec.to_store_id.toString();
      if (!grouped[targetStoreId]) {
        grouped[targetStoreId] = [];
      }
      grouped[targetStoreId].push(rec);
    }
    
    return grouped;
  }

  /**
   * Get aging dashboard data
   */
  async getAgingDashboard(storeId) {
    try {
      const inventories = await Inventory.find({ 
        store_id: storeId, 
        is_active: true 
      }).populate('product_variant_id');

      const dashboard = {
        total_skus: inventories.length,
        aging_buckets: {
          new_arrivals: inventories.filter(i => i.aging_bucket === 'NEW_ARRIVALS').length,
          fresh_stock: inventories.filter(i => i.aging_bucket === 'FRESH_STOCK').length,
          slow_moving: inventories.filter(i => i.aging_bucket === 'SLOW_MOVING').length,
          dead_stock: inventories.filter(i => i.aging_bucket === 'DEAD_STOCK').length
        },
        top_slow_moving: inventories
          .filter(i => i.aging_bucket === 'SLOW_MOVING')
          .sort((a, b) => b.days_in_stock - a.days_in_stock)
          .slice(0, 10),
        top_dead_stock: inventories
          .filter(i => i.aging_bucket === 'DEAD_STOCK')
          .sort((a, b) => b.days_in_stock - a.days_in_stock)
          .slice(0, 10)
      };

      return dashboard;
    } catch (error) {
      logger.error('Error getting aging dashboard:', error);
      throw error;
    }
  }
}

module.exports = new AgingService();
