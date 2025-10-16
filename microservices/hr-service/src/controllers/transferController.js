const TransferService = require('../services/transfer.service');
const logger = require('../config/logger');

/**
 * Create transfer request
 */
const createTransferRequest = async (req, res, next) => {
  try {
    const { requestedStoreId, effectiveDate, reason } = req.body;
    const employeeId = req.user._id;

    if (!requestedStoreId || !effectiveDate) {
      return res.status(400).json({
        success: false,
        message: 'Requested store ID and effective date are required'
      });
    }

    const transfer = await TransferService.createTransferRequest(employeeId, {
      requestedStoreId,
      effectiveDate,
      reason
    });

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully',
      data: transfer
    });
  } catch (error) {
    logger.error('Error in createTransferRequest controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Get transfer requests
 */
const getTransferRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, currentStore, requestedStore } = req.query;
    const employeeId = req.user._id;

    const filters = {};
    
    // If user is not HR/Admin, only show their own requests
    if (!['HR', 'Admin', 'SuperAdmin'].includes(req.user.role?.name)) {
      filters.employee = employeeId;
    } else {
      if (status) filters.status = status;
      if (currentStore) filters.currentStore = currentStore;
      if (requestedStore) filters.requestedStore = requestedStore;
    }

    const result = await TransferService.getTransferRequests(filters, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Transfer requests retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getTransferRequests controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Approve transfer request
 */
const approveTransferRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const approvedBy = req.user._id;

    const transfer = await TransferService.approveTransferRequest(id, approvedBy);

    res.status(200).json({
      success: true,
      message: 'Transfer request approved successfully',
      data: transfer
    });
  } catch (error) {
    logger.error('Error in approveTransferRequest controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Reject transfer request
 */
const rejectTransferRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const rejectedBy = req.user._id;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const transfer = await TransferService.rejectTransferRequest(id, rejectedBy, rejectionReason);

    res.status(200).json({
      success: true,
      message: 'Transfer request rejected successfully',
      data: transfer
    });
  } catch (error) {
    logger.error('Error in rejectTransferRequest controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Cancel transfer request
 */
const cancelTransferRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cancelledBy = req.user._id;

    const transfer = await TransferService.cancelTransferRequest(id, cancelledBy);

    res.status(200).json({
      success: true,
      message: 'Transfer request cancelled successfully',
      data: transfer
    });
  } catch (error) {
    logger.error('Error in cancelTransferRequest controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

module.exports = {
  createTransferRequest,
  getTransferRequests,
  approveTransferRequest,
  rejectTransferRequest,
  cancelTransferRequest
};