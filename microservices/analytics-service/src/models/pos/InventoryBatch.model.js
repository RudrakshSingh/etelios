const mongoose = require('mongoose');

const InventoryBatchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, required: true },
  expiryDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryBatch', InventoryBatchSchema);