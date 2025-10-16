const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true, min: 0 },
  total_price: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  items: [orderItemSchema],
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'],
    default: 'PENDING'
  },
  delivery_address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    phone: { type: String, trim: true }
  },
  delivered_at: { type: Date },
  feedback_sent: { type: Boolean, default: false },
  feedback_completed: { type: Boolean, default: false },
  csat_score: { type: Number, min: 1, max: 5 },
  nps_score: { type: Number, min: 0, max: 10 },
  feedback_notes: { type: String, trim: true },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

orderSchema.index({ customer_id: 1 });
orderSchema.index({ store_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ delivered_at: 1 });
orderSchema.index({ feedback_sent: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
