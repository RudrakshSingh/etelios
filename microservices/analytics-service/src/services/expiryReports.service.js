const InventoryBatch = require('../models/pos/InventoryBatch.model');
const ProductMaster = require('../models/ProductMaster.model');
const ProductType = require('../models/ProductType.model');
const Store = require('../models/Store.model');
const logger = require('../config/logger');

class ExpiryReportsService {
  /**
   * Get near-expiry batches report
   * @param {Object} filters - Report filters
   * @returns {Object} Near-expiry report
   */
  async getNearExpiryReport(filters = {}) {
    try {
      const {
        store_id,
        days_ahead = 90,
        product_type,
        include_expired = false
      } = filters;

      const query = {
        status: 'ACTIVE',
        current_quantity: { $gt: 0 }
      };

      if (store_id) {
        query.store_id = store_id;
      }

      if (include_expired) {
        query.$or = [
          { days_to_expiry: { $lte: days_ahead, $gte: 0 } },
          { is_expired: true }
        ];
      } else {
        query.days_to_expiry = { $lte: days_ahead, $gte: 0 };
      }

      const batches = await InventoryBatch.find(query)
        .populate('product_variant_id', 'product_master_id')
        .populate('store_id', 'name address')
        .sort({ days_to_expiry: 1, expiry_date: 1 });

      // Filter by product type if specified
      let filteredBatches = batches;
      if (product_type) {
        const productIds = await ProductMaster.find({ 
          product_type_id: product_type 
        }).select('_id');
        
        filteredBatches = batches.filter(batch => 
          productIds.some(p => p._id.equals(batch.product_variant_id.product_master_id))
        );
      }

      // Group by expiry status
      const report = {
        summary: {
          total_batches: filteredBatches.length,
          expired: filteredBatches.filter(b => b.is_expired).length,
          near_expiry: filteredBatches.filter(b => b.days_to_expiry <= 30 && !b.is_expired).length,
          expiring_soon: filteredBatches.filter(b => b.days_to_expiry <= 7 && !b.is_expired).length
        },
        batches: filteredBatches.map(batch => ({
          batch_id: batch._id,
          batch_number: batch.batch_number,
          lot_number: batch.lot_number,
          product_name: batch.product_variant_id?.name || 'Unknown',
          store_name: batch.store_id?.name || 'Unknown',
          expiry_date: batch.expiry_date,
          days_to_expiry: batch.days_to_expiry,
          current_quantity: batch.current_quantity,
          is_expired: batch.is_expired,
          is_blocked: batch.is_blocked_for_sale,
          status: batch.is_expired ? 'EXPIRED' : 
                  batch.days_to_expiry <= 7 ? 'CRITICAL' :
                  batch.days_to_expiry <= 30 ? 'WARNING' : 'OK'
        })),
        generated_at: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Error generating near-expiry report:', error);
      throw error;
    }
  }

  /**
   * Get batch-wise stock report
   * @param {Object} filters - Report filters
   * @returns {Object} Batch-wise stock report
   */
  async getBatchWiseStockReport(filters = {}) {
    try {
      const {
        store_id,
        product_type,
        status = 'ACTIVE'
      } = filters;

      const query = { status };
      if (store_id) query.store_id = store_id;

      const batches = await InventoryBatch.find(query)
        .populate('product_variant_id', 'product_master_id name')
        .populate('store_id', 'name address')
        .sort({ product_variant_id: 1, expiry_date: 1 });

      // Group by product
      const productGroups = {};
      batches.forEach(batch => {
        const productId = batch.product_variant_id?._id?.toString();
        if (!productId) return;

        if (!productGroups[productId]) {
          productGroups[productId] = {
            product_name: batch.product_variant_id?.name || 'Unknown',
            store_name: batch.store_id?.name || 'Unknown',
            total_quantity: 0,
            batches: []
          };
        }

        productGroups[productId].total_quantity += batch.current_quantity;
        productGroups[productId].batches.push({
          batch_id: batch._id,
          batch_number: batch.batch_number,
          lot_number: batch.lot_number,
          expiry_date: batch.expiry_date,
          days_to_expiry: batch.days_to_expiry,
          quantity: batch.current_quantity,
          status: batch.status,
          is_expired: batch.is_expired
        });
      });

      const report = {
        summary: {
          total_products: Object.keys(productGroups).length,
          total_batches: batches.length,
          total_quantity: batches.reduce((sum, b) => sum + b.current_quantity, 0)
        },
        products: Object.values(productGroups),
        generated_at: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Error generating batch-wise stock report:', error);
      throw error;
    }
  }

  /**
   * Get FEFO compliance report
   * @param {Object} filters - Report filters
   * @returns {Object} FEFO compliance report
   */
  async getFEFOComplianceReport(filters = {}) {
    try {
      const {
        store_id,
        days_back = 30
      } = filters;

      const query = { status: 'ACTIVE' };
      if (store_id) query.store_id = store_id;

      const batches = await InventoryBatch.find(query)
        .populate('product_variant_id', 'name')
        .populate('store_id', 'name')
        .sort({ product_variant_id: 1, fefo_sequence: 1 });

      // Group by product and check FEFO compliance
      const productGroups = {};
      batches.forEach(batch => {
        const productId = batch.product_variant_id?._id?.toString();
        if (!productId) return;

        if (!productGroups[productId]) {
          productGroups[productId] = {
            product_name: batch.product_variant_id?.name || 'Unknown',
            store_name: batch.store_id?.name || 'Unknown',
            batches: [],
            fefo_compliant: true
          };
        }

        productGroups[productId].batches.push({
          batch_id: batch._id,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
          fefo_sequence: batch.fefo_sequence,
          quantity: batch.current_quantity
        });
      });

      // Check FEFO compliance for each product
      Object.values(productGroups).forEach(product => {
        const sortedBatches = product.batches.sort((a, b) => a.fefo_sequence - b.fefo_sequence);
        const expirySortedBatches = product.batches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
        
        product.fefo_compliant = JSON.stringify(sortedBatches.map(b => b.batch_id)) === 
                                 JSON.stringify(expirySortedBatches.map(b => b.batch_id));
      });

      const report = {
        summary: {
          total_products: Object.keys(productGroups).length,
          fefo_compliant: Object.values(productGroups).filter(p => p.fefo_compliant).length,
          fefo_violations: Object.values(productGroups).filter(p => !p.fefo_compliant).length
        },
        products: Object.values(productGroups),
        generated_at: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Error generating FEFO compliance report:', error);
      throw error;
    }
  }

  /**
   * Get expiry heatmap data
   * @param {Object} filters - Report filters
   * @returns {Object} Expiry heatmap data
   */
  async getExpiryHeatmap(filters = {}) {
    try {
      const {
        store_id,
        days_ahead = 90
      } = filters;

      const query = {
        status: 'ACTIVE',
        current_quantity: { $gt: 0 },
        days_to_expiry: { $lte: days_ahead, $gte: 0 }
      };
      if (store_id) query.store_id = store_id;

      const batches = await InventoryBatch.find(query)
        .populate('product_variant_id', 'name')
        .populate('store_id', 'name')
        .sort({ expiry_date: 1 });

      // Group by expiry date
      const heatmapData = {};
      batches.forEach(batch => {
        const expiryDate = batch.expiry_date.toISOString().split('T')[0];
        if (!heatmapData[expiryDate]) {
          heatmapData[expiryDate] = {
            date: expiryDate,
            total_quantity: 0,
            batch_count: 0,
            products: new Set()
          };
        }
        
        heatmapData[expiryDate].total_quantity += batch.current_quantity;
        heatmapData[expiryDate].batch_count += 1;
        heatmapData[expiryDate].products.add(batch.product_variant_id?.name || 'Unknown');
      });

      const report = {
        summary: {
          total_dates: Object.keys(heatmapData).length,
          total_quantity: Object.values(heatmapData).reduce((sum, d) => sum + d.total_quantity, 0),
          total_batches: Object.values(heatmapData).reduce((sum, d) => sum + d.batch_count, 0)
        },
        heatmap: Object.values(heatmapData).map(data => ({
          date: data.date,
          total_quantity: data.total_quantity,
          batch_count: data.batch_count,
          product_count: data.products.size,
          severity: data.total_quantity > 100 ? 'HIGH' : 
                   data.total_quantity > 50 ? 'MEDIUM' : 'LOW'
        })),
        generated_at: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Error generating expiry heatmap:', error);
      throw error;
    }
  }

  /**
   * Get loss due to expiry report
   * @param {Object} filters - Report filters
   * @returns {Object} Loss due to expiry report
   */
  async getLossDueToExpiryReport(filters = {}) {
    try {
      const {
        store_id,
        from_date,
        to_date
      } = filters;

      const query = { status: 'EXPIRED' };
      if (store_id) query.store_id = store_id;
      if (from_date || to_date) {
        query.updated_at = {};
        if (from_date) query.updated_at.$gte = new Date(from_date);
        if (to_date) query.updated_at.$lte = new Date(to_date);
      }

      const expiredBatches = await InventoryBatch.find(query)
        .populate('product_variant_id', 'name')
        .populate('store_id', 'name');

      const report = {
        summary: {
          total_expired_batches: expiredBatches.length,
          total_expired_quantity: expiredBatches.reduce((sum, b) => sum + b.current_quantity, 0),
          estimated_loss: expiredBatches.reduce((sum, b) => sum + (b.purchase_price * b.current_quantity), 0)
        },
        expired_batches: expiredBatches.map(batch => ({
          batch_id: batch._id,
          batch_number: batch.batch_number,
          product_name: batch.product_variant_id?.name || 'Unknown',
          store_name: batch.store_id?.name || 'Unknown',
          expired_quantity: batch.current_quantity,
          purchase_price: batch.purchase_price,
          estimated_loss: batch.purchase_price * batch.current_quantity,
          expiry_date: batch.expiry_date,
          expired_at: batch.updated_at
        })),
        generated_at: new Date()
      };

      return report;
    } catch (error) {
      logger.error('Error generating loss due to expiry report:', error);
      throw error;
    }
  }
}

module.exports = new ExpiryReportsService();
