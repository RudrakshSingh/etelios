const Inventory = require('../models/Inventory.model');
const Supplier = require('../models/Supplier.model');
const logger = require('../config/logger');

class ERPService {
  // Inventory Management
  async getInventory(query = {}) {
    try {
      const { page = 1, limit = 10, search, category, status } = query;
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (category) {
        filter.category = category;
      }
      
      if (status) {
        filter.status = status;
      }
      
      const inventory = await Inventory.find(filter)
        .populate('supplier_id', 'name contact_email')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Inventory.countDocuments(filter);
      
      return {
        inventory,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      logger.error('Error getting inventory', { error: error.message });
      throw error;
    }
  }

  async createInventory(inventoryData) {
    try {
      const inventory = new Inventory(inventoryData);
      await inventory.save();
      return inventory;
    } catch (error) {
      logger.error('Error creating inventory', { error: error.message });
      throw error;
    }
  }

  async getInventoryItem(itemId) {
    try {
      const inventory = await Inventory.findById(itemId)
        .populate('supplier_id', 'name contact_email');
      
      if (!inventory) {
        throw new Error('Inventory item not found');
      }
      
      return inventory;
    } catch (error) {
      logger.error('Error getting inventory item', { error: error.message });
      throw error;
    }
  }

  async updateInventory(itemId, updateData) {
    try {
      const inventory = await Inventory.findByIdAndUpdate(
        itemId,
        updateData,
        { new: true }
      ).populate('supplier_id', 'name contact_email');
      
      if (!inventory) {
        throw new Error('Inventory item not found');
      }
      
      return inventory;
    } catch (error) {
      logger.error('Error updating inventory', { error: error.message });
      throw error;
    }
  }

  async deleteInventory(itemId) {
    try {
      const inventory = await Inventory.findByIdAndDelete(itemId);
      if (!inventory) {
        throw new Error('Inventory item not found');
      }
      return inventory;
    } catch (error) {
      logger.error('Error deleting inventory', { error: error.message });
      throw error;
    }
  }

  // Supplier Management
  async getSuppliers(query = {}) {
    try {
      const { page = 1, limit = 10, search, status } = query;
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { contact_email: { $regex: search, $options: 'i' } },
          { company_name: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        filter.status = status;
      }
      
      const suppliers = await Supplier.find(filter)
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Supplier.countDocuments(filter);
      
      return {
        suppliers,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      logger.error('Error getting suppliers', { error: error.message });
      throw error;
    }
  }

  async createSupplier(supplierData) {
    try {
      const supplier = new Supplier(supplierData);
      await supplier.save();
      return supplier;
    } catch (error) {
      logger.error('Error creating supplier', { error: error.message });
      throw error;
    }
  }

  async getSupplier(supplierId) {
    try {
      const supplier = await Supplier.findById(supplierId);
      
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      
      return supplier;
    } catch (error) {
      logger.error('Error getting supplier', { error: error.message });
      throw error;
    }
  }

  async updateSupplier(supplierId, updateData) {
    try {
      const supplier = await Supplier.findByIdAndUpdate(
        supplierId,
        updateData,
        { new: true }
      );
      
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      
      return supplier;
    } catch (error) {
      logger.error('Error updating supplier', { error: error.message });
      throw error;
    }
  }

  async deleteSupplier(supplierId) {
    try {
      const supplier = await Supplier.findByIdAndDelete(supplierId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }
      return supplier;
    } catch (error) {
      logger.error('Error deleting supplier', { error: error.message });
      throw error;
    }
  }

  // Reports
  async getInventoryReport(query = {}) {
    try {
      const { from_date, to_date, category } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      if (category) {
        filter.category = category;
      }
      
      const inventory = await Inventory.find(filter)
        .populate('supplier_id', 'name')
        .sort({ created_at: -1 });
      
      const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const totalItems = inventory.length;
      const lowStockItems = inventory.filter(item => item.quantity < item.min_stock_level);
      
      return {
        inventory,
        summary: {
          totalItems,
          totalValue,
          lowStockItems: lowStockItems.length,
          categories: [...new Set(inventory.map(item => item.category))]
        }
      };
    } catch (error) {
      logger.error('Error getting inventory report', { error: error.message });
      throw error;
    }
  }

  async getSupplierReport(query = {}) {
    try {
      const { from_date, to_date, status } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      if (status) {
        filter.status = status;
      }
      
      const suppliers = await Supplier.find(filter).sort({ created_at: -1 });
      
      const totalSuppliers = suppliers.length;
      const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
      const inactiveSuppliers = suppliers.filter(s => s.status === 'inactive').length;
      
      return {
        suppliers,
        summary: {
          totalSuppliers,
          activeSuppliers,
          inactiveSuppliers
        }
      };
    } catch (error) {
      logger.error('Error getting supplier report', { error: error.message });
      throw error;
    }
  }

  async getStockReport() {
    try {
      const inventory = await Inventory.find({})
        .populate('supplier_id', 'name')
        .sort({ quantity: 1 });
      
      const lowStock = inventory.filter(item => item.quantity < item.min_stock_level);
      const outOfStock = inventory.filter(item => item.quantity === 0);
      const overStock = inventory.filter(item => item.quantity > item.max_stock_level);
      
      return {
        inventory,
        summary: {
          totalItems: inventory.length,
          lowStock: lowStock.length,
          outOfStock: outOfStock.length,
          overStock: overStock.length,
          lowStockItems: lowStock,
          outOfStockItems: outOfStock,
          overStockItems: overStock
        }
      };
    } catch (error) {
      logger.error('Error getting stock report', { error: error.message });
      throw error;
    }
  }
}

module.exports = new ERPService();
