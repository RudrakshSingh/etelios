const Asset = require('../models/Asset.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { recordAuditLog } = require('../utils/audit');

/**
 * Creates a new asset
 * @param {Object} assetData - Asset data
 * @param {string} createdBy - ID of the user creating the asset
 * @returns {Promise<Object>} Created asset
 */
const createAsset = async (assetData, createdBy) => {
  try {
    // Check if asset ID already exists
    const existingAsset = await Asset.findOne({ assetId: assetData.assetId });
    if (existingAsset) {
      const error = new Error('Asset with this ID already exists');
      error.statusCode = 409;
      throw error;
    }

    // Check if serial number already exists (if provided)
    if (assetData.serialNumber) {
      const existingSerial = await Asset.findOne({ serialNumber: assetData.serialNumber });
      if (existingSerial) {
        const error = new Error('Asset with this serial number already exists');
        error.statusCode = 409;
        throw error;
      }
    }

    const asset = new Asset(assetData);
    await asset.save();

    await recordAuditLog(createdBy, 'ASSET_CREATED', { 
      assetId: asset._id, 
      assetName: asset.name,
      assetId: asset.assetId 
    });

    logger.info('Asset created successfully', { 
      assetId: asset._id, 
      assetName: asset.name,
      createdBy 
    });

    return asset;
  } catch (error) {
    logger.error('Error in createAsset service', { error: error.message, createdBy });
    throw error;
  }
};

/**
 * Gets all assets with pagination and filtering
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Paginated assets
 */
const getAssets = async (filters = {}, page = 1, limit = 10) => {
  try {
    const query = {};

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }
    if (filters.category) {
      query.category = new RegExp(filters.category, 'i');
    }
    if (filters.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { assetId: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') },
        { serialNumber: new RegExp(filters.search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .populate('assignedTo', 'firstName lastName email employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Asset.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      assets,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    logger.error('Error in getAssets service', { error: error.message });
    throw error;
  }
};

/**
 * Updates an asset
 * @param {string} assetId - Asset ID
 * @param {Object} updateData - Update data
 * @param {string} updatedBy - ID of the user updating
 * @returns {Promise<Object>} Updated asset
 */
const updateAsset = async (assetId, updateData, updatedBy) => {
  try {
    const asset = await Asset.findById(assetId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.statusCode = 404;
      throw error;
    }

    // Check for duplicate asset ID if being updated
    if (updateData.assetId && updateData.assetId !== asset.assetId) {
      const existingAsset = await Asset.findOne({ assetId: updateData.assetId });
      if (existingAsset) {
        const error = new Error('Asset with this ID already exists');
        error.statusCode = 409;
        throw error;
      }
    }

    // Check for duplicate serial number if being updated
    if (updateData.serialNumber && updateData.serialNumber !== asset.serialNumber) {
      const existingSerial = await Asset.findOne({ serialNumber: updateData.serialNumber });
      if (existingSerial) {
        const error = new Error('Asset with this serial number already exists');
        error.statusCode = 409;
        throw error;
      }
    }

    const updatedAsset = await Asset.findByIdAndUpdate(
      assetId,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName email employeeId');

    await recordAuditLog(updatedBy, 'ASSET_UPDATED', { 
      assetId, 
      changes: Object.keys(updateData) 
    });

    logger.info('Asset updated successfully', { 
      assetId, 
      updatedBy,
      changes: Object.keys(updateData) 
    });

    return updatedAsset;
  } catch (error) {
    logger.error('Error in updateAsset service', { error: error.message, assetId, updatedBy });
    throw error;
  }
};

/**
 * Assigns an asset to an employee
 * @param {string} assetId - Asset ID
 * @param {string} employeeId - Employee ID
 * @param {string} assignedBy - ID of the user assigning
 * @returns {Promise<Object>} Updated asset
 */
const assignAsset = async (assetId, employeeId, assignedBy) => {
  try {
    const asset = await Asset.findById(assetId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.statusCode = 404;
      throw error;
    }

    if (asset.status === 'assigned') {
      const error = new Error('Asset is already assigned');
      error.statusCode = 400;
      throw error;
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    asset.assignedTo = employeeId;
    asset.assignedDate = new Date();
    asset.status = 'assigned';
    await asset.save();

    await recordAuditLog(assignedBy, 'ASSET_ASSIGNED', { 
      assetId, 
      employeeId,
      assetName: asset.name 
    });

    logger.info('Asset assigned successfully', { 
      assetId, 
      employeeId,
      assignedBy 
    });

    return asset;
  } catch (error) {
    logger.error('Error in assignAsset service', { error: error.message, assetId, employeeId, assignedBy });
    throw error;
  }
};

/**
 * Returns an asset from an employee
 * @param {string} assetId - Asset ID
 * @param {string} returnedBy - ID of the user returning
 * @returns {Promise<Object>} Updated asset
 */
const returnAsset = async (assetId, returnedBy) => {
  try {
    const asset = await Asset.findById(assetId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.statusCode = 404;
      throw error;
    }

    if (asset.status !== 'assigned') {
      const error = new Error('Asset is not currently assigned');
      error.statusCode = 400;
      throw error;
    }

    const previousAssignee = asset.assignedTo;
    asset.assignedTo = null;
    asset.assignedDate = null;
    asset.returnDate = new Date();
    asset.status = 'available';
    await asset.save();

    await recordAuditLog(returnedBy, 'ASSET_RETURNED', { 
      assetId, 
      previousAssignee,
      assetName: asset.name 
    });

    logger.info('Asset returned successfully', { 
      assetId, 
      previousAssignee,
      returnedBy 
    });

    return asset;
  } catch (error) {
    logger.error('Error in returnAsset service', { error: error.message, assetId, returnedBy });
    throw error;
  }
};

/**
 * Deletes an asset
 * @param {string} assetId - Asset ID
 * @param {string} deletedBy - ID of the user deleting
 * @returns {Promise<Object>} Deletion result
 */
const deleteAsset = async (assetId, deletedBy) => {
  try {
    const asset = await Asset.findById(assetId);
    if (!asset) {
      const error = new Error('Asset not found');
      error.statusCode = 404;
      throw error;
    }

    if (asset.status === 'assigned') {
      const error = new Error('Cannot delete assigned asset. Please return it first.');
      error.statusCode = 400;
      throw error;
    }

    await Asset.findByIdAndDelete(assetId);

    await recordAuditLog(deletedBy, 'ASSET_DELETED', { 
      assetId, 
      assetName: asset.name 
    });

    logger.info('Asset deleted successfully', { 
      assetId, 
      deletedBy 
    });

    return { success: true, message: 'Asset deleted successfully' };
  } catch (error) {
    logger.error('Error in deleteAsset service', { error: error.message, assetId, deletedBy });
    throw error;
  }
};

/**
 * Gets asset summary statistics
 * @returns {Promise<Object>} Asset summary
 */
const getAssetSummary = async () => {
  try {
    const totalAssets = await Asset.countDocuments();
    const assignedAssets = await Asset.countDocuments({ status: 'assigned' });
    const availableAssets = await Asset.countDocuments({ status: 'available' });
    const maintenanceAssets = await Asset.countDocuments({ status: 'maintenance' });
    const retiredAssets = await Asset.countDocuments({ status: 'retired' });

    // Get total asset value
    const totalValue = await Asset.aggregate([
      { $group: { _id: null, total: { $sum: '$purchasePrice' } } }
    ]);

    return {
      totalAssets,
      assignedAssets,
      availableAssets,
      maintenanceAssets,
      retiredAssets,
      totalValue: totalValue[0]?.total || 0,
      utilizationRate: totalAssets > 0 ? (assignedAssets / totalAssets) * 100 : 0
    };
  } catch (error) {
    logger.error('Error in getAssetSummary service', { error: error.message });
    throw error;
  }
};

module.exports = {
  createAsset,
  getAssets,
  updateAsset,
  assignAsset,
  returnAsset,
  deleteAsset,
  getAssetSummary
};