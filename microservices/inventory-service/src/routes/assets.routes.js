const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');

const {
  getAssets,
  createAsset,
  updateAsset,
  assignAsset,
  returnAsset,
  deleteAsset,
  getAssetSummary
} = require('../controllers/assetsController');

// Validation schemas
const createAssetSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    assetId: Joi.string().required(),
    description: Joi.string().optional(),
    category: Joi.string().optional(),
    condition: Joi.string().optional(),
    purchaseDate: Joi.date().optional(),
    purchasePrice: Joi.number().min(0).optional(),
    serialNumber: Joi.string().optional()
  })
};

const updateAssetSchema = {
  body: Joi.object({
    name: Joi.string().optional(),
    assetId: Joi.string().optional(),
    description: Joi.string().optional(),
    category: Joi.string().optional(),
    condition: Joi.string().optional(),
    purchaseDate: Joi.date().optional(),
    purchasePrice: Joi.number().min(0).optional(),
    serialNumber: Joi.string().optional(),
    status: Joi.string().valid('assigned', 'available', 'maintenance', 'retired').optional()
  })
};

const getAssetsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('assigned', 'available', 'maintenance', 'retired').optional(),
    assignedTo: Joi.string().optional(),
    category: Joi.string().optional(),
    search: Joi.string().optional()
  })
};

const assignAssetSchema = {
  body: Joi.object({
    employeeId: Joi.string().required()
  })
};

// Routes
router.get('/',
  authenticate,
  requireRole([], ['asset:read']),
  validateRequest(getAssetsSchema),
  getAssets
);

router.post('/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(createAssetSchema),
  createAsset
);

router.put('/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(updateAssetSchema),
  updateAsset
);

router.post('/:id/assign',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  validateRequest(assignAssetSchema),
  assignAsset
);

router.post('/:id/return',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  returnAsset
);

router.delete('/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:manage']),
  deleteAsset
);

router.get('/summary',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['asset:read']),
  getAssetSummary
);

module.exports = router;