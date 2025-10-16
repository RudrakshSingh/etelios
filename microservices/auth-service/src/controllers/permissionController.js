const User = require('../models/User.model');
const { logger } = require('../config/logger');

/**
 * Get all available permissions
 */
const getAllPermissions = async (req, res) => {
  try {
    const permissions = [
      // User Management
      'read_users', 'write_users', 'delete_users', 'create_users', 'update_users',
      'activate_users', 'deactivate_users',
      
      // Attendance Management
      'read_attendance', 'write_attendance', 'approve_attendance',
      'create_attendance', 'update_attendance', 'delete_attendance',
      
      // Reports
      'read_reports', 'write_reports', 'export_reports',
      'create_reports', 'update_reports', 'delete_reports',
      
      // Asset Management
      'read_assets', 'write_assets', 'assign_assets',
      'create_assets', 'update_assets', 'delete_assets',
      
      // Document Management
      'read_documents', 'write_documents', 'delete_documents',
      'upload_documents', 'download_documents', 'update_documents',
      
      // Transfer Management
      'read_transfers', 'write_transfers', 'approve_transfers',
      'create_transfers', 'update_transfers', 'delete_transfers',
      
      // Store Management
      'read_stores', 'write_stores', 'create_stores', 'update_stores',
      
      // Role Management
      'read_roles', 'write_roles', 'create_roles', 'update_roles',
      
      // System Administration
      'system_admin', 'audit_logs', 'backup_restore',
      
      // Dashboard Permissions
      'view_dashboard', 'manage_dashboard', 'view_all_widgets', 'manage_widgets',
      'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
      'view_transfer_requests', 'view_document_status', 'view_store_performance',
      'view_attendance_chart', 'view_employee_chart', 'view_asset_chart',
      'view_transfer_chart', 'view_document_chart', 'view_store_chart',
      'view_recent_activities', 'view_pending_approvals', 'view_system_alerts',
      'view_attendance_trends', 'view_employee_trends', 'view_asset_trends',
      'view_compliance_status', 'view_audit_logs', 'view_system_metrics',
      
      // Sales Specific
      'view_sales_data', 'manage_sales', 'view_customer_data', 'manage_customers',
      'view_optometry_data', 'manage_optometry', 'view_prescriptions',
      
      // Geofencing (Sales & Store Managers only)
      'geofencing_access', 'location_tracking', 'store_geofencing'
    ];

    res.json({
      success: true,
      data: permissions,
      count: permissions.length
    });
  } catch (error) {
    logger.error('Error getting permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get permissions',
      error: error.message
    });
  }
};

/**
 * Get department-specific default permissions
 */
const getDepartmentPermissions = async (req, res) => {
  try {
    const { department } = req.params;
    
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required'
      });
    }

    const permissions = User.getDepartmentPermissions(department.toUpperCase());

    res.json({
      success: true,
      data: {
        department: department.toUpperCase(),
        permissions,
        count: permissions.length
      }
    });
  } catch (error) {
    logger.error('Error getting department permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get department permissions',
      error: error.message
    });
  }
};

/**
 * Get user's current permissions
 */
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('custom_permissions department role');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get department default permissions
    const departmentPermissions = User.getDepartmentPermissions(user.department);
    
    // Combine with custom permissions
    const allPermissions = [...new Set([...departmentPermissions, ...user.custom_permissions])];

    res.json({
      success: true,
      data: {
        userId: user._id,
        department: user.department,
        role: user.role,
        departmentPermissions,
        customPermissions: user.custom_permissions,
        allPermissions,
        count: allPermissions.length
      }
    });
  } catch (error) {
    logger.error('Error getting user permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get user permissions',
      error: error.message
    });
  }
};

/**
 * Update user permissions (Admin only)
 */
const updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions, action } = req.body; // action: 'add', 'remove', 'replace'
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions array is required'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let updatedPermissions = [...user.custom_permissions];

    switch (action) {
      case 'add':
        updatedPermissions = [...new Set([...updatedPermissions, ...permissions])];
        break;
      case 'remove':
        updatedPermissions = updatedPermissions.filter(p => !permissions.includes(p));
        break;
      case 'replace':
        updatedPermissions = permissions;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use: add, remove, or replace'
        });
    }

    user.custom_permissions = updatedPermissions;
    await user.save();

    logger.info('User permissions updated', {
      userId: user._id,
      employeeId: user.employee_id,
      action,
      permissions,
      updatedCount: updatedPermissions.length
    });

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: {
        userId: user._id,
        employeeId: user.employee_id,
        customPermissions: user.custom_permissions,
        count: user.custom_permissions.length
      }
    });
  } catch (error) {
    logger.error('Error updating user permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update user permissions',
      error: error.message
    });
  }
};

/**
 * Get all users with their permissions (Admin only)
 */
const getAllUsersWithPermissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, band_level } = req.query;
    
    const filter = {};
    if (department) filter.department = department.toUpperCase();
    if (band_level) filter.band_level = band_level;

    const users = await User.find(filter)
      .select('name email employee_id department band_level hierarchy_level role custom_permissions is_active status')
      .populate('stores', 'name code')
      .populate('reporting_manager', 'name employee_id')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    // Add department permissions to each user
    const usersWithPermissions = users.map(user => {
      const departmentPermissions = User.getDepartmentPermissions(user.department);
      const allPermissions = [...new Set([...departmentPermissions, ...user.custom_permissions])];
      
      return {
        ...user.toObject(),
        departmentPermissions,
        allPermissions,
        totalPermissions: allPermissions.length
      };
    });

    res.json({
      success: true,
      data: usersWithPermissions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error('Error getting users with permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get users with permissions',
      error: error.message
    });
  }
};

/**
 * Reset user permissions to department default
 */
const resetUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset to department default permissions
    user.custom_permissions = [];
    await user.save();

    const departmentPermissions = User.getDepartmentPermissions(user.department);

    logger.info('User permissions reset to department default', {
      userId: user._id,
      employeeId: user.employee_id,
      department: user.department,
      defaultPermissions: departmentPermissions
    });

    res.json({
      success: true,
      message: 'Permissions reset to department default',
      data: {
        userId: user._id,
        employeeId: user.employee_id,
        department: user.department,
        defaultPermissions: departmentPermissions,
        count: departmentPermissions.length
      }
    });
  } catch (error) {
    logger.error('Error resetting user permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to reset user permissions',
      error: error.message
    });
  }
};

module.exports = {
  getAllPermissions,
  getDepartmentPermissions,
  getUserPermissions,
  updateUserPermissions,
  getAllUsersWithPermissions,
  resetUserPermissions
};
