const User = require('../models/User.model');
const Store = require('../models/Store.model');
const { logger } = require('../config/logger');

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

/**
 * Check if user is within geofencing radius of allowed stores
 */
const checkGeofencingStatus = async (req, res) => {
  try {
    const { userId } = req.user;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const user = await User.findById(userId)
      .populate('allowed_stores', 'name code address coordinates');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has geofencing enabled
    if (!user.geofencing_enabled) {
      return res.json({
        success: true,
        data: {
          geofencingEnabled: false,
          message: 'Geofencing not enabled for this user'
        }
      });
    }

    // Check if user is within radius of any allowed store
    let isWithinRadius = false;
    let nearestStore = null;
    let nearestDistance = Infinity;

    for (const store of user.allowed_stores) {
      if (store.coordinates && store.coordinates.latitude && store.coordinates.longitude) {
        const distance = calculateDistance(
          latitude,
          longitude,
          store.coordinates.latitude,
          store.coordinates.longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestStore = store;
        }

        if (distance <= user.geofencing_radius) {
          isWithinRadius = true;
        }
      }
    }

    // Log geofencing check
    logger.info('Geofencing check', {
      userId: user._id,
      employeeId: user.employee_id,
      userLocation: { latitude, longitude },
      isWithinRadius,
      nearestDistance: Math.round(nearestDistance),
      geofencingRadius: user.geofencing_radius
    });

    res.json({
      success: true,
      data: {
        geofencingEnabled: user.geofencing_enabled,
        isWithinRadius,
        nearestStore: nearestStore ? {
          id: nearestStore._id,
          name: nearestStore.name,
          code: nearestStore.code,
          distance: Math.round(nearestDistance)
        } : null,
        geofencingRadius: user.geofencing_radius,
        allowedStores: user.allowed_stores.map(store => ({
          id: store._id,
          name: store.name,
          code: store.code,
          address: store.address
        }))
      }
    });
  } catch (error) {
    logger.error('Error checking geofencing status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to check geofencing status',
      error: error.message
    });
  }
};

/**
 * Update user's geofencing settings (Admin only)
 */
const updateGeofencingSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { geofencing_enabled, allowed_stores, geofencing_radius } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is eligible for geofencing (Sales or Store Manager)
    if (!['SALES', 'STORE'].includes(user.department) && user.role !== 'manager') {
      return res.status(400).json({
        success: false,
        message: 'Geofencing is only available for Sales personnel and Store Managers'
      });
    }

    // Update geofencing settings
    if (geofencing_enabled !== undefined) {
      user.geofencing_enabled = geofencing_enabled;
    }
    
    if (allowed_stores !== undefined) {
      user.allowed_stores = allowed_stores;
    }
    
    if (geofencing_radius !== undefined) {
      user.geofencing_radius = geofencing_radius;
    }

    await user.save();

    logger.info('Geofencing settings updated', {
      userId: user._id,
      employeeId: user.employee_id,
      geofencing_enabled: user.geofencing_enabled,
      allowed_stores: user.allowed_stores,
      geofencing_radius: user.geofencing_radius
    });

    res.json({
      success: true,
      message: 'Geofencing settings updated successfully',
      data: {
        userId: user._id,
        employeeId: user.employee_id,
        geofencingEnabled: user.geofencing_enabled,
        allowedStores: user.allowed_stores,
        geofencingRadius: user.geofencing_radius
      }
    });
  } catch (error) {
    logger.error('Error updating geofencing settings', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update geofencing settings',
      error: error.message
    });
  }
};

/**
 * Get user's geofencing settings
 */
const getGeofencingSettings = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId)
      .populate('allowed_stores', 'name code address coordinates');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        geofencingEnabled: user.geofencing_enabled,
        allowedStores: user.allowed_stores.map(store => ({
          id: store._id,
          name: store.name,
          code: store.code,
          address: store.address,
          coordinates: store.coordinates
        })),
        geofencingRadius: user.geofencing_radius,
        isEligible: ['SALES', 'STORE'].includes(user.department) || user.role === 'manager'
      }
    });
  } catch (error) {
    logger.error('Error getting geofencing settings', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get geofencing settings',
      error: error.message
    });
  }
};

/**
 * Get all users with geofencing enabled
 */
const getGeofencingUsers = async (req, res) => {
  try {
    const users = await User.find({ geofencing_enabled: true })
      .select('name email employee_id department role geofencing_radius allowed_stores')
      .populate('allowed_stores', 'name code address coordinates');

    res.json({
      success: true,
      data: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employee_id,
        department: user.department,
        role: user.role,
        geofencingRadius: user.geofencing_radius,
        allowedStores: user.allowed_stores
      })),
      count: users.length
    });
  } catch (error) {
    logger.error('Error getting geofencing users', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get geofencing users',
      error: error.message
    });
  }
};

module.exports = {
  checkGeofencingStatus,
  updateGeofencingSettings,
  getGeofencingSettings,
  getGeofencingUsers
};
