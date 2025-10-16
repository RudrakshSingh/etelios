const Vendor = require('../models/Vendor.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const GRN = require('../models/GRN.model');
const PurchaseInvoice = require('../models/PurchaseInvoice.model');
const VendorPayment = require('../models/VendorPayment.model');
const PurchaseReturn = require('../models/PurchaseReturn.model');
const ReorderRule = require('../models/ReorderRule.model');
const POSuggestion = require('../models/POSuggestion.model');
const Inventory = require('../models/Inventory.model');
const InventoryBatch = require('../models/pos/InventoryBatch.model');

class PurchaseService {
  // Vendor Management
  async createVendor(vendorData) {
    try {
      const vendor = new Vendor(vendorData);
      await vendor.save();
      return { success: true, data: vendor };
    } catch (error) {
      throw new Error(`Failed to create vendor: ${error.message}`);
    }
  }

  async getVendors(filters = {}) {
    try {
      const vendors = await Vendor.find(filters).populate('categories');
      return { success: true, data: vendors };
    } catch (error) {
      throw new Error(`Failed to get vendors: ${error.message}`);
    }
  }

  async getVendorById(vendorId) {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      return { success: true, data: vendor };
    } catch (error) {
      throw new Error(`Failed to get vendor: ${error.message}`);
    }
  }

  async updateVendor(vendorId, updateData) {
    try {
      const vendor = await Vendor.findByIdAndUpdate(
        vendorId,
        { ...updateData, updated_at: new Date() },
        { new: true, runValidators: true }
      );
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      return { success: true, data: vendor };
    } catch (error) {
      throw new Error(`Failed to update vendor: ${error.message}`);
    }
  }

  // Purchase Order Management
  async createPurchaseOrder(poData) {
    try {
      const po = new PurchaseOrder(poData);
      await po.save();
      return { success: true, data: po };
    } catch (error) {
      throw new Error(`Failed to create purchase order: ${error.message}`);
    }
  }

  async getPurchaseOrders(filters = {}) {
    try {
      const pos = await PurchaseOrder.find(filters)
        .populate('vendor_id', 'name gstin contact')
        .populate('store_id', 'name address')
        .populate('created_by', 'name email')
        .populate('approved_by', 'name email');
      return { success: true, data: pos };
    } catch (error) {
      throw new Error(`Failed to get purchase orders: ${error.message}`);
    }
  }

  async updatePOStatus(poId, status, approvedBy = null) {
    try {
      const updateData = { status, updated_at: new Date() };
      if (approvedBy) {
        updateData.approved_by = approvedBy;
      }
      
      const po = await PurchaseOrder.findByIdAndUpdate(poId, updateData, { new: true });
      if (!po) {
        throw new Error('Purchase order not found');
      }
      return { success: true, data: po };
    } catch (error) {
      throw new Error(`Failed to update PO status: ${error.message}`);
    }
  }

  // GRN Management
  async createGRN(grnData) {
    try {
      const grn = new GRN(grnData);
      await grn.save();
      
      // Update inventory with received items
      await this.updateInventoryFromGRN(grn);
      
      return { success: true, data: grn };
    } catch (error) {
      throw new Error(`Failed to create GRN: ${error.message}`);
    }
  }

  async updateInventoryFromGRN(grn) {
    try {
      for (const line of grn.lines) {
        // Update inventory quantity
        await Inventory.findOneAndUpdate(
          { product_variant_id: line.sku, store_id: grn.store_id },
          { 
            $inc: { quantity: line.quantity_received },
            $set: { last_movement_date: new Date() }
          },
          { upsert: true }
        );

        // Create inventory batch for batch tracking
        if (line.batch_lot) {
          const batch = new InventoryBatch({
            product_variant_id: line.sku,
            store_id: grn.store_id,
            lot_number: line.batch_lot,
            quantity: line.quantity_received,
            rate: line.rate,
            mrp: line.mrp,
            expiry_date: line.expiry_date,
            received_date: grn.received_at
          });
          await batch.save();
        }
      }
    } catch (error) {
      throw new Error(`Failed to update inventory from GRN: ${error.message}`);
    }
  }

  // Purchase Invoice Management
  async createPurchaseInvoice(invoiceData) {
    try {
      const invoice = new PurchaseInvoice(invoiceData);
      await invoice.save();
      return { success: true, data: invoice };
    } catch (error) {
      throw new Error(`Failed to create purchase invoice: ${error.message}`);
    }
  }

  async getPurchaseInvoices(filters = {}) {
    try {
      const invoices = await PurchaseInvoice.find(filters)
        .populate('vendor_id', 'name gstin contact')
        .populate('created_by', 'name email');
      return { success: true, data: invoices };
    } catch (error) {
      throw new Error(`Failed to get purchase invoices: ${error.message}`);
    }
  }

  // Vendor Payment Management
  async createVendorPayment(paymentData) {
    try {
      const payment = new VendorPayment(paymentData);
      await payment.save();
      
      // Update invoice status if fully paid
      await this.updateInvoiceStatus(payment.pinv_no);
      
      return { success: true, data: payment };
    } catch (error) {
      throw new Error(`Failed to create vendor payment: ${error.message}`);
    }
  }

  async updateInvoiceStatus(pinvNo) {
    try {
      const totalPaid = await VendorPayment.aggregate([
        { $match: { pinv_no: pinvNo, status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const invoice = await PurchaseInvoice.findOne({ pinv_no: pinvNo });
      if (invoice && totalPaid.length > 0) {
        if (totalPaid[0].total >= invoice.total_amount) {
          invoice.status = 'PAID';
          await invoice.save();
        }
      }
    } catch (error) {
      throw new Error(`Failed to update invoice status: ${error.message}`);
    }
  }

  // Purchase Return Management
  async createPurchaseReturn(returnData) {
    try {
      const purchaseReturn = new PurchaseReturn(returnData);
      await purchaseReturn.save();
      return { success: true, data: purchaseReturn };
    } catch (error) {
      throw new Error(`Failed to create purchase return: ${error.message}`);
    }
  }

  // Reorder Rules Management
  async createReorderRule(ruleData) {
    try {
      const rule = new ReorderRule(ruleData);
      await rule.save();
      return { success: true, data: rule };
    } catch (error) {
      throw new Error(`Failed to create reorder rule: ${error.message}`);
    }
  }

  async getReorderRules(filters = {}) {
    try {
      const rules = await ReorderRule.find(filters)
        .populate('store_id', 'name address');
      return { success: true, data: rules };
    } catch (error) {
      throw new Error(`Failed to get reorder rules: ${error.message}`);
    }
  }

  // PO Suggestions
  async generatePOSuggestions(storeId) {
    try {
      const suggestions = [];
      const rules = await ReorderRule.find({ store_id: storeId, is_active: true });
      
      for (const rule of rules) {
        const inventory = await Inventory.findOne({
          product_variant_id: rule.sku,
          store_id: storeId
        });

        if (!inventory || inventory.quantity <= rule.rop) {
          const suggestion = new POSuggestion({
            sku: rule.sku,
            store_id: storeId,
            suggested_qty: rule.roq,
            reason: 'THRESHOLD',
            confidence: 90,
            current_stock: inventory ? inventory.quantity : 0,
            demand_forecast: rule.roq,
            lead_time_days: rule.lead_time_days,
            estimated_cost: rule.roq * 100, // This should be calculated from product master
            priority: inventory && inventory.quantity <= rule.rop * 0.5 ? 'HIGH' : 'MEDIUM'
          });
          suggestions.push(suggestion);
        }
      }

      await POSuggestion.insertMany(suggestions);
      return { success: true, data: suggestions };
    } catch (error) {
      throw new Error(`Failed to generate PO suggestions: ${error.message}`);
    }
  }

  async getPOSuggestions(storeId) {
    try {
      const suggestions = await POSuggestion.find({ 
        store_id: storeId, 
        is_processed: false 
      }).populate('store_id', 'name address');
      return { success: true, data: suggestions };
    } catch (error) {
      throw new Error(`Failed to get PO suggestions: ${error.message}`);
    }
  }

  // Vendor Performance Analytics
  async getVendorPerformance(vendorId, fromDate, toDate) {
    try {
      const performance = await PurchaseOrder.aggregate([
        {
          $match: {
            vendor_id: vendorId,
            created_at: { $gte: fromDate, $lte: toDate }
          }
        },
        {
          $group: {
            _id: null,
            total_orders: { $sum: 1 },
            on_time_orders: {
              $sum: {
                $cond: [
                  { $lte: ['$eta', '$created_at'] },
                  1,
                  0
                ]
              }
            },
            total_value: { $sum: '$gross_total' },
            avg_lead_time: {
              $avg: {
                $subtract: ['$eta', '$created_at']
              }
            }
          }
        }
      ]);

      const otif = performance.length > 0 ? 
        (performance[0].on_time_orders / performance[0].total_orders) * 100 : 0;

      return {
        success: true,
        data: {
          total_orders: performance[0]?.total_orders || 0,
          on_time_orders: performance[0]?.on_time_orders || 0,
          otif_percentage: otif,
          total_value: performance[0]?.total_value || 0,
          avg_lead_time: performance[0]?.avg_lead_time || 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to get vendor performance: ${error.message}`);
    }
  }
}

module.exports = new PurchaseService();
