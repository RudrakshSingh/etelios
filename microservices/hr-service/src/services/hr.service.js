const User = require('../models/User.model');
const Role = require('../models/Role.model');
const Store = require('../models/Store.model');
const { hashPassword } = require('../utils/hashUtils');
const logger = require('../config/logger');
const { recordAuditLog } = require('../utils/audit');

/**
 * Creates a new employee
 * @param {Object} employeeData - Employee data
 * @param {string} createdBy - ID of the user creating the employee
 * @returns {Promise<Object>} Created employee
 */
const createEmployee = async (employeeData, createdBy) => {
  try {
    const { email, password, roleName, storeId, ...rest } = employeeData;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    // Find role
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      const error = new Error('Specified role not found');
      error.statusCode = 400;
      throw error;
    }

    // Find store if provided
    let store = null;
    if (storeId) {
      store = await Store.findById(storeId);
      if (!store) {
        const error = new Error('Specified store not found');
        error.statusCode = 400;
        throw error;
      }
    }

    const employee = new User({
      email,
      password,
      role: role._id,
      store: store?._id,
      status: 'active',
      ...rest
    });

    await employee.save();
    await recordAuditLog(createdBy, 'EMPLOYEE_CREATED', { 
      employeeId: employee._id, 
      email: employee.email,
      role: role.name 
    });

    logger.info('Employee created successfully', { 
      employeeId: employee._id, 
      email: employee.email,
      createdBy 
    });

    return employee;
  } catch (error) {
    logger.error('Error in createEmployee service', { error: error.message, createdBy });
    throw error;
  }
};

/**
 * Gets all employees with pagination and filtering
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Paginated employees
 */
const getEmployees = async (filters = {}, page = 1, limit = 10) => {
  try {
    const query = { isDeleted: false };

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.store) {
      query.store = filters.store;
    }
    if (filters.role) {
      query.role = filters.role;
    }
    if (filters.department) {
      query.department = new RegExp(filters.department, 'i');
    }
    if (filters.search) {
      query.$or = [
        { firstName: new RegExp(filters.search, 'i') },
        { lastName: new RegExp(filters.search, 'i') },
        { email: new RegExp(filters.search, 'i') },
        { employeeId: new RegExp(filters.search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      User.find(query)
        .populate('role', 'name permissions')
        .populate('store', 'name address')
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      employees,
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
    logger.error('Error in getEmployees service', { error: error.message });
    throw error;
  }
};

/**
 * Updates an employee
 * @param {string} employeeId - Employee ID
 * @param {Object} updateData - Update data
 * @param {string} updatedBy - ID of the user updating
 * @returns {Promise<Object>} Updated employee
 */
const updateEmployee = async (employeeId, updateData, updatedBy) => {
  try {
    const { roleName, storeId, ...rest } = updateData;

    const employee = await User.findById(employeeId);
    if (!employee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    // Update role if provided
    if (roleName) {
      const role = await Role.findOne({ name: roleName });
      if (!role) {
        const error = new Error('Specified role not found');
        error.statusCode = 400;
        throw error;
      }
      rest.role = role._id;
    }

    // Update store if provided
    if (storeId) {
      const store = await Store.findById(storeId);
      if (!store) {
        const error = new Error('Specified store not found');
        error.statusCode = 400;
        throw error;
      }
      rest.store = store._id;
    }

    const updatedEmployee = await User.findByIdAndUpdate(
      employeeId,
      rest,
      { new: true, runValidators: true }
    ).populate('role', 'name permissions').populate('store', 'name address');

    await recordAuditLog(updatedBy, 'EMPLOYEE_UPDATED', { 
      employeeId, 
      changes: Object.keys(rest) 
    });

    logger.info('Employee updated successfully', { 
      employeeId, 
      updatedBy,
      changes: Object.keys(rest) 
    });

    return updatedEmployee;
  } catch (error) {
    logger.error('Error in updateEmployee service', { error: error.message, employeeId, updatedBy });
    throw error;
  }
};

/**
 * Deletes an employee (soft delete)
 * @param {string} employeeId - Employee ID
 * @param {string} deletedBy - ID of the user deleting
 * @returns {Promise<Object>} Deletion result
 */
const deleteEmployee = async (employeeId, deletedBy) => {
  try {
    const employee = await User.findById(employeeId);
    if (!employee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    // Soft delete
    employee.isDeleted = true;
    employee.status = 'terminated';
    await employee.save();

    await recordAuditLog(deletedBy, 'EMPLOYEE_DELETED', { 
      employeeId, 
      email: employee.email 
    });

    logger.info('Employee deleted successfully', { 
      employeeId, 
      deletedBy 
    });

    return { success: true, message: 'Employee deleted successfully' };
  } catch (error) {
    logger.error('Error in deleteEmployee service', { error: error.message, employeeId, deletedBy });
    throw error;
  }
};

/**
 * Assigns a role to an employee
 * @param {string} employeeId - Employee ID
 * @param {string} roleName - Role name
 * @param {string} assignedBy - ID of the user assigning
 * @returns {Promise<Object>} Updated employee
 */
const assignRole = async (employeeId, roleName, assignedBy) => {
  try {
    const employee = await User.findById(employeeId);
    if (!employee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      const error = new Error('Specified role not found');
      error.statusCode = 400;
      throw error;
    }

    employee.role = role._id;
    await employee.save();

    await recordAuditLog(assignedBy, 'ROLE_ASSIGNED', { 
      employeeId, 
      newRole: roleName,
      previousRole: employee.role 
    });

    logger.info('Role assigned successfully', { 
      employeeId, 
      roleName,
      assignedBy 
    });

    return employee;
  } catch (error) {
    logger.error('Error in assignRole service', { error: error.message, employeeId, roleName, assignedBy });
    throw error;
  }
};

/**
 * Updates employee status
 * @param {string} employeeId - Employee ID
 * @param {string} status - New status
 * @param {string} updatedBy - ID of the user updating
 * @returns {Promise<Object>} Updated employee
 */
const updateEmployeeStatus = async (employeeId, status, updatedBy) => {
  try {
    const employee = await User.findById(employeeId);
    if (!employee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    const validStatuses = ['active', 'on_leave', 'terminated', 'pending'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid status');
      error.statusCode = 400;
      throw error;
    }

    const previousStatus = employee.status;
    employee.status = status;
    await employee.save();

    await recordAuditLog(updatedBy, 'EMPLOYEE_STATUS_UPDATED', { 
      employeeId, 
      previousStatus,
      newStatus: status 
    });

    logger.info('Employee status updated successfully', { 
      employeeId, 
      previousStatus,
      newStatus: status,
      updatedBy 
    });

    return employee;
  } catch (error) {
    logger.error('Error in updateEmployeeStatus service', { error: error.message, employeeId, status, updatedBy });
    throw error;
  }
};

/**
 * Get all stores
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Number of items per page
 * @returns {Promise<Object>} Paginated stores
 */
const getStores = async (filters = {}, page = 1, limit = 10) => {
  try {
    const query = { isDeleted: false };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
        { 'address.city': { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('manager', 'name email employee_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Store.countDocuments(query)
    ]);

    return {
      stores,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  } catch (error) {
    logger.error('Error in getStores service', { error: error.message, filters, page, limit });
    throw error;
  }
};

/**
 * Create a new store
 * @param {Object} storeData - Store data
 * @param {string} createdBy - ID of the user creating the store
 * @returns {Promise<Object>} Created store
 */
const createStore = async (storeData, createdBy) => {
  try {
    const { code } = storeData;

    // Check if store code already exists
    const existingStore = await Store.findOne({ code });
    if (existingStore) {
      const error = new Error('Store with this code already exists');
      error.statusCode = 409;
      throw error;
    }

    const store = new Store({
      ...storeData,
      createdBy,
      updatedBy: createdBy
    });

    await store.save();

    // Record audit log
    await recordAuditLog({
      action: 'create',
      resource: 'store',
      resourceId: store._id,
      userId: createdBy,
      details: { storeCode: code, storeName: storeData.name }
    });

    logger.info('Store created successfully', { storeId: store._id, code, createdBy });
    return store;
  } catch (error) {
    logger.error('Error in createStore service', { error: error.message, storeData, createdBy });
    throw error;
  }
};

/**
 * Get store by ID
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>} Store data
 */
const getStoreById = async (storeId) => {
  try {
    const store = await Store.findOne({ _id: storeId, isDeleted: false })
      .populate('manager', 'name email employee_id');

    if (!store) {
      const error = new Error('Store not found');
      error.statusCode = 404;
      throw error;
    }

    return store;
  } catch (error) {
    logger.error('Error in getStoreById service', { error: error.message, storeId });
    throw error;
  }
};

/**
 * Update store
 * @param {string} storeId - Store ID
 * @param {Object} updateData - Update data
 * @param {string} updatedBy - ID of the user updating the store
 * @returns {Promise<Object>} Updated store
 */
const updateStore = async (storeId, updateData, updatedBy) => {
  try {
    const store = await Store.findOne({ _id: storeId, isDeleted: false });

    if (!store) {
      const error = new Error('Store not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if code is being updated and if it already exists
    if (updateData.code && updateData.code !== store.code) {
      const existingStore = await Store.findOne({ code: updateData.code, _id: { $ne: storeId } });
      if (existingStore) {
        const error = new Error('Store with this code already exists');
        error.statusCode = 409;
        throw error;
      }
    }

    const previousData = { ...store.toObject() };
    
    Object.assign(store, updateData, { updatedBy, updatedAt: new Date() });
    await store.save();

    // Record audit log
    await recordAuditLog({
      action: 'update',
      resource: 'store',
      resourceId: storeId,
      userId: updatedBy,
      details: { 
        previousData: previousData,
        updatedData: updateData
      }
    });

    logger.info('Store updated successfully', { storeId, updatedBy });
    return store;
  } catch (error) {
    logger.error('Error in updateStore service', { error: error.message, storeId, updateData, updatedBy });
    throw error;
  }
};

/**
 * Delete store (soft delete)
 * @param {string} storeId - Store ID
 * @param {string} deletedBy - ID of the user deleting the store
 * @returns {Promise<void>}
 */
const deleteStore = async (storeId, deletedBy) => {
  try {
    const store = await Store.findOne({ _id: storeId, isDeleted: false });

    if (!store) {
      const error = new Error('Store not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if store has employees
    const employeeCount = await User.countDocuments({ store: storeId, isDeleted: false });
    if (employeeCount > 0) {
      const error = new Error('Cannot delete store with assigned employees');
      error.statusCode = 400;
      throw error;
    }

    store.isDeleted = true;
    store.deletedBy = deletedBy;
    store.deletedAt = new Date();
    await store.save();

    // Record audit log
    await recordAuditLog({
      action: 'delete',
      resource: 'store',
      resourceId: storeId,
      userId: deletedBy,
      details: { storeCode: store.code, storeName: store.name }
    });

    logger.info('Store deleted successfully', { storeId, deletedBy });
  } catch (error) {
    logger.error('Error in deleteStore service', { error: error.message, storeId, deletedBy });
    throw error;
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  assignRole,
  updateEmployeeStatus,
  getStores,
  createStore,
  getStoreById,
  updateStore,
  deleteStore
};