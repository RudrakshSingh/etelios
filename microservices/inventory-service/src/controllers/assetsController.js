const AssetService = require('../services/asset.service');
const logger = require('../config/logger');

/**
 * Get all assets
 */
const getAssets = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, assignedTo, category, search } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (category) filters.category = category;
    if (search) filters.search = search;

    const result = await AssetService.getAssets(filters, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Assets retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getAssets controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Create new asset
 */
const createAsset = async (req, res, next) => {
  try {
    const assetData = req.body;
    const createdBy = req.user._id;

    const asset = await AssetService.createAsset(assetData, createdBy);

    res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: asset
    });
  } catch (error) {
    logger.error('Error in createAsset controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Update asset
 */
const updateAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user._id;

    const asset = await AssetService.updateAsset(id, updateData, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Asset updated successfully',
      data: asset
    });
  } catch (error) {
    logger.error('Error in updateAsset controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Assign asset to employee
 */
const assignAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;
    const assignedBy = req.user._id;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const asset = await AssetService.assignAsset(id, employeeId, assignedBy);

    res.status(200).json({
      success: true,
      message: 'Asset assigned successfully',
      data: asset
    });
  } catch (error) {
    logger.error('Error in assignAsset controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Return asset from employee
 */
const returnAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const returnedBy = req.user._id;

    const asset = await AssetService.returnAsset(id, returnedBy);

    res.status(200).json({
      success: true,
      message: 'Asset returned successfully',
      data: asset
    });
  } catch (error) {
    logger.error('Error in returnAsset controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Delete asset
 */
const deleteAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user._id;

    const result = await AssetService.deleteAsset(id, deletedBy);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Error in deleteAsset controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Get asset summary
 */
const getAssetSummary = async (req, res, next) => {
  try {
    const summary = await AssetService.getAssetSummary();

    res.status(200).json({
      success: true,
      message: 'Asset summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    logger.error('Error in getAssetSummary controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

module.exports = {
  getAssets,
  createAsset,
  updateAsset,
  assignAsset,
  returnAsset,
  deleteAsset,
  getAssetSummary
};
