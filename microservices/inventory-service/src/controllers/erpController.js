const agingService = require('../services/agingService');
const gstService = require('../services/gstService');
const Inventory = require('../models/Inventory.model');
const InventoryBatch = require('../models/pos/InventoryBatch.model');
const ProductMaster = require('../models/ProductMaster.model');
const ProductVariant = require('../models/ProductVariant.model');
const StockTransfer = require('../models/StockTransfer.model');
const AgingReport = require('../models/AgingReport.model');
const logger = require('../config/logger');

/**
 * @desc Get aging dashboard for a store
 * @route GET /api/erp/aging/dashboard/:storeId
 * @access Private (Admin, Manager, Store Manager)
 */
const getAgingDashboard = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    
    const dashboard = await agingService.getAgingDashboard(storeId);
    
    res.status(200).json({
      success: true,
      message: 'Aging dashboard retrieved successfully',
      data: dashboard
    });
  } catch (error) {
    logger.error('Error in getAgingDashboard controller:', error);
    next(error);
  }
};

/**
 * @desc Generate aging report for a store
 * @route POST /api/erp/aging/report/:storeId
 * @access Private (Admin, Manager)
 */
const generateAgingReport = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const generatedBy = req.user.id;
    
    const report = await agingService.generateAgingReport(storeId, generatedBy);
    
    res.status(201).json({
      success: true,
      message: 'Aging report generated successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error in generateAgingReport controller:', error);
    next(error);
  }
};

/**
 * @desc Get aging reports for a store
 * @route GET /api/erp/aging/reports/:storeId
 * @access Private (Admin, Manager, Store Manager)
 */
const getAgingReports = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const reports = await AgingReport.find({ store_id: storeId })
      .populate('generated_by', 'name email')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await AgingReport.countDocuments({ store_id: storeId });
    
    res.status(200).json({
      success: true,
      message: 'Aging reports retrieved successfully',
      data: {
        reports,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      }
    });
  } catch (error) {
    logger.error('Error in getAgingReports controller:', error);
    next(error);
  }
};

/**
 * @desc Process automatic stock rotation
 * @route POST /api/erp/aging/auto-rotation
 * @access Private (Admin)
 */
const processAutomaticRotation = async (req, res, next) => {
  try {
    const results = await agingService.processAutomaticRotation();
    
    res.status(200).json({
      success: true,
      message: 'Automatic rotation processed successfully',
      data: results
    });
  } catch (error) {
    logger.error('Error in processAutomaticRotation controller:', error);
    next(error);
  }
};

/**
 * @desc Calculate aging for all inventory
 * @route POST /api/erp/aging/calculate
 * @access Private (Admin)
 */
const calculateAging = async (req, res, next) => {
  try {
    const result = await agingService.calculateAging();
    
    res.status(200).json({
      success: true,
      message: 'Aging calculated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in calculateAging controller:', error);
    next(error);
  }
};

/**
 * @desc Get transfer recommendations
 * @route GET /api/erp/transfers/recommendations/:storeId
 * @access Private (Admin, Manager)
 */
const getTransferRecommendations = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    
    const recommendations = await agingService.generateTransferRecommendations(storeId);
    
    res.status(200).json({
      success: true,
      message: 'Transfer recommendations retrieved successfully',
      data: recommendations
    });
  } catch (error) {
    logger.error('Error in getTransferRecommendations controller:', error);
    next(error);
  }
};

/**
 * @desc Create transfer order
 * @route POST /api/erp/transfers
 * @access Private (Admin, Manager)
 */
const createTransferOrder = async (req, res, next) => {
  try {
    const { recommendations, transfer_type = 'MANUAL' } = req.body;
    const requestedBy = req.user.id;
    
    const transferOrder = await agingService.createTransferOrder(recommendations, requestedBy);
    
    res.status(201).json({
      success: true,
      message: 'Transfer order created successfully',
      data: transferOrder
    });
  } catch (error) {
    logger.error('Error in createTransferOrder controller:', error);
    next(error);
  }
};

/**
 * @desc Get transfer orders
 * @route GET /api/erp/transfers
 * @access Private (Admin, Manager, Store Manager)
 */
const getTransferOrders = async (req, res, next) => {
  try {
    const { status, store_id, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (store_id) {
      filter.$or = [
        { from_store_id: store_id },
        { to_store_id: store_id }
      ];
    }
    
    const transfers = await StockTransfer.find(filter)
      .populate('from_store_id', 'name address')
      .populate('to_store_id', 'name address')
      .populate('requested_by', 'name email')
      .populate('approved_by', 'name email')
      .populate('items.product_variant_id', 'variant_name sub_sku')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await StockTransfer.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      message: 'Transfer orders retrieved successfully',
      data: {
        transfers,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      }
    });
  } catch (error) {
    logger.error('Error in getTransferOrders controller:', error);
    next(error);
  }
};

/**
 * @desc Approve transfer order
 * @route PUT /api/erp/transfers/:transferId/approve
 * @access Private (Admin, Manager)
 */
const approveTransferOrder = async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const approvedBy = req.user.id;
    
    const transfer = await StockTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer order not found'
      });
    }
    
    transfer.status = 'APPROVED';
    transfer.approved_by = approvedBy;
    transfer.approved_at = new Date();
    
    await transfer.save();
    
    res.status(200).json({
      success: true,
      message: 'Transfer order approved successfully',
      data: transfer
    });
  } catch (error) {
    logger.error('Error in approveTransferOrder controller:', error);
    next(error);
  }
};

/**
 * @desc Calculate GST for line items
 * @route POST /api/erp/gst/calculate
 * @access Private (Admin, Manager, Sales)
 */
const calculateGST = async (req, res, next) => {
  try {
    const { line_items, ship_from_state, ship_to_state, customer_type = 'B2C' } = req.body;
    
    const gstCalculation = await gstService.calculateBulkGST(
      line_items,
      ship_from_state,
      ship_to_state,
      customer_type
    );
    
    res.status(200).json({
      success: true,
      message: 'GST calculated successfully',
      data: gstCalculation
    });
  } catch (error) {
    logger.error('Error in calculateGST controller:', error);
    next(error);
  }
};

/**
 * @desc Get HSN details
 * @route GET /api/erp/hsn/:hsnCode
 * @access Private (Admin, Manager, Sales)
 */
const getHSNDetails = async (req, res, next) => {
  try {
    const { hsnCode } = req.params;
    
    const hsnDetails = await gstService.validateHSNCode(hsnCode);
    
    res.status(200).json({
      success: true,
      message: 'HSN details retrieved successfully',
      data: hsnDetails
    });
  } catch (error) {
    logger.error('Error in getHSNDetails controller:', error);
    next(error);
  }
};

/**
 * @desc Get inventory aging summary
 * @route GET /api/erp/inventory/aging-summary
 * @access Private (Admin, Manager)
 */
const getInventoryAgingSummary = async (req, res, next) => {
  try {
    const { store_id } = req.query;
    
    const filter = { is_active: true };
    if (store_id) filter.store_id = store_id;
    
    const inventories = await Inventory.find(filter)
      .populate('product_variant_id', 'variant_name sub_sku')
      .populate('store_id', 'name');
    
    const agingSummary = {
      total_skus: inventories.length,
      new_arrivals: inventories.filter(i => i.aging_bucket === 'NEW_ARRIVALS').length,
      fresh_stock: inventories.filter(i => i.aging_bucket === 'FRESH_STOCK').length,
      slow_moving: inventories.filter(i => i.aging_bucket === 'SLOW_MOVING').length,
      dead_stock: inventories.filter(i => i.aging_bucket === 'DEAD_STOCK').length
    };
    
    res.status(200).json({
      success: true,
      message: 'Inventory aging summary retrieved successfully',
      data: agingSummary
    });
  } catch (error) {
    logger.error('Error in getInventoryAgingSummary controller:', error);
    next(error);
  }
};

/**
 * @desc Get slow moving items
 * @route GET /api/erp/inventory/slow-moving
 * @access Private (Admin, Manager)
 */
const getSlowMovingItems = async (req, res, next) => {
  try {
    const { store_id, days_threshold = 90 } = req.query;
    
    const filter = { 
      is_active: true,
      aging_bucket: 'SLOW_MOVING',
      days_in_stock: { $gte: parseInt(days_threshold) }
    };
    if (store_id) filter.store_id = store_id;
    
    const slowMovingItems = await Inventory.find(filter)
      .populate('product_variant_id', 'variant_name sub_sku mrp')
      .populate('store_id', 'name')
      .sort({ days_in_stock: -1 });
    
    res.status(200).json({
      success: true,
      message: 'Slow moving items retrieved successfully',
      data: slowMovingItems
    });
  } catch (error) {
    logger.error('Error in getSlowMovingItems controller:', error);
    next(error);
  }
};

/**
 * @desc Get dead stock items
 * @route GET /api/erp/inventory/dead-stock
 * @access Private (Admin, Manager)
 */
const getDeadStockItems = async (req, res, next) => {
  try {
    const { store_id, days_threshold = 180 } = req.query;
    
    const filter = { 
      is_active: true,
      aging_bucket: 'DEAD_STOCK',
      days_in_stock: { $gte: parseInt(days_threshold) }
    };
    if (store_id) filter.store_id = store_id;
    
    const deadStockItems = await Inventory.find(filter)
      .populate('product_variant_id', 'variant_name sub_sku mrp')
      .populate('store_id', 'name')
      .sort({ days_in_stock: -1 });
    
    res.status(200).json({
      success: true,
      message: 'Dead stock items retrieved successfully',
      data: deadStockItems
    });
  } catch (error) {
    logger.error('Error in getDeadStockItems controller:', error);
    next(error);
  }
};

module.exports = {
  getAgingDashboard,
  generateAgingReport,
  getAgingReports,
  processAutomaticRotation,
  calculateAging,
  getTransferRecommendations,
  createTransferOrder,
  getTransferOrders,
  approveTransferOrder,
  calculateGST,
  getHSNDetails,
  getInventoryAgingSummary,
  getSlowMovingItems,
  getDeadStockItems
};
