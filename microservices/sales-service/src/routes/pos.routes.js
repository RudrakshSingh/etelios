const express = require('express');
const router = express.Router();
const posController = require('../controllers/pos.controller');
const { authenticate } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// Rate limiting for POS operations
const posRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many POS requests from this IP, please try again later.'
});

// Apply authentication middleware to all routes
router.use(authenticate);

// Items Management
router.get('/items/search', posRateLimit, posController.searchItems);
router.get('/items/:sku_id', posRateLimit, posController.getItemDetails);

// Customer Management
router.get('/customers/search', posRateLimit, posController.searchCustomers);
router.post('/customers', posRateLimit, posController.createCustomer);
router.get('/customers/:id', posRateLimit, posController.getCustomer);
router.put('/customers/:id', posRateLimit, posController.updateCustomer);

// Prescription Management
router.post('/prescriptions', posRateLimit, posController.createPrescription);
router.get('/prescriptions/:id', posRateLimit, posController.getPrescription);
router.get('/prescriptions/customer/:customer_id', posRateLimit, posController.getCustomerPrescriptions);

// Offers and Pricing
router.post('/pricing/evaluate', posRateLimit, posController.evaluatePricing);
router.get('/offers', posRateLimit, posController.getOffers);
router.get('/offers/:id', posRateLimit, posController.getOffer);

// Cart and Invoice Management
router.post('/invoices', posRateLimit, posController.createInvoice);
router.get('/invoices/:id', posRateLimit, posController.getInvoice);
router.put('/invoices/:id', posRateLimit, posController.updateInvoice);
router.post('/invoices/:id/void', posRateLimit, posController.voidInvoice);

// Payment Management
router.post('/invoices/:id/payments', posRateLimit, posController.addPayment);
router.get('/invoices/:id/payments', posRateLimit, posController.getPayments);
router.post('/invoices/:id/payments/:payment_id/refund', posRateLimit, posController.refundPayment);

// WhatsApp Integration
router.post('/invoices/:id/whatsapp', posRateLimit, posController.sendWhatsApp);

// Returns and Exchanges
router.post('/returns', posRateLimit, posController.processReturn);
router.get('/returns/:id', posRateLimit, posController.getReturn);

// Lab Jobs
router.post('/lab-jobs', posRateLimit, posController.createLabJob);
router.get('/lab-jobs/:id', posRateLimit, posController.getLabJob);
router.put('/lab-jobs/:id/status', posRateLimit, posController.updateLabJobStatus);
router.get('/lab-jobs/customer/:customer_id', posRateLimit, posController.getCustomerLabJobs);

// Register and Day Close
router.post('/register/open', posRateLimit, posController.openRegister);
router.post('/register/close', posRateLimit, posController.closeRegister);
router.get('/register/shifts', posRateLimit, posController.getRegisterShifts);
router.get('/register/current', posRateLimit, posController.getCurrentShift);

// GST Compliance
router.post('/gst/einvoice', posRateLimit, posController.generateEInvoice);
router.post('/gst/ewaybill', posRateLimit, posController.generateEWayBill);
router.get('/gst/status/:invoice_id', posRateLimit, posController.getGSTStatus);

// Reports
router.get('/reports/daily-sales', posRateLimit, posController.getDailySales);
router.get('/reports/items-sold', posRateLimit, posController.getItemsSold);
router.get('/reports/payments-breakup', posRateLimit, posController.getPaymentsBreakup);
router.get('/reports/customer-analytics', posRateLimit, posController.getCustomerAnalytics);

// Offline Mode
router.get('/offline/queue', posRateLimit, posController.getOfflineQueue);
router.post('/offline/sync', posRateLimit, posController.syncOfflineData);
router.delete('/offline/queue/:id', posRateLimit, posController.clearOfflineItem);

// Print Management
router.post('/print/thermal/:invoice_id', posRateLimit, posController.printThermal);
router.post('/print/a4/:invoice_id', posRateLimit, posController.printA4);
router.get('/print/templates', posRateLimit, posController.getPrintTemplates);

// Dashboard and Analytics
router.get('/dashboard', posRateLimit, posController.getDashboard);
router.get('/dashboard/sales-trends', posRateLimit, posController.getSalesTrends);
router.get('/dashboard/top-products', posRateLimit, posController.getTopProducts);
router.get('/dashboard/customer-insights', posRateLimit, posController.getCustomerInsights);

// Health Check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'POS module is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
