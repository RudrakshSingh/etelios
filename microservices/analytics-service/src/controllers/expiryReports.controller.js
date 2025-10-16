const expiryReportsService = require('../services/expiryReports.service');
const logger = require('../config/logger');

class ExpiryReportsController {
  /**
   * Get near-expiry report
   */
  async getNearExpiryReport(req, res) {
    try {
      const filters = {
        store_id: req.query.store_id,
        days_ahead: parseInt(req.query.days_ahead) || 90,
        product_type: req.query.product_type,
        include_expired: req.query.include_expired === 'true'
      };

      const report = await expiryReportsService.getNearExpiryReport(filters);
      
      res.json({
        success: true,
        data: report,
        message: 'Near-expiry report generated successfully'
      });
    } catch (error) {
      logger.error('Error getting near-expiry report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate near-expiry report',
        error: error.message
      });
    }
  }

  /**
   * Get batch-wise stock report
   */
  async getBatchWiseStockReport(req, res) {
    try {
      const filters = {
        store_id: req.query.store_id,
        product_type: req.query.product_type,
        status: req.query.status || 'ACTIVE'
      };

      const report = await expiryReportsService.getBatchWiseStockReport(filters);
      
      res.json({
        success: true,
        data: report,
        message: 'Batch-wise stock report generated successfully'
      });
    } catch (error) {
      logger.error('Error getting batch-wise stock report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate batch-wise stock report',
        error: error.message
      });
    }
  }

  /**
   * Get FEFO compliance report
   */
  async getFEFOComplianceReport(req, res) {
    try {
      const filters = {
        store_id: req.query.store_id,
        days_back: parseInt(req.query.days_back) || 30
      };

      const report = await expiryReportsService.getFEFOComplianceReport(filters);
      
      res.json({
        success: true,
        data: report,
        message: 'FEFO compliance report generated successfully'
      });
    } catch (error) {
      logger.error('Error getting FEFO compliance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate FEFO compliance report',
        error: error.message
      });
    }
  }

  /**
   * Get expiry heatmap
   */
  async getExpiryHeatmap(req, res) {
    try {
      const filters = {
        store_id: req.query.store_id,
        days_ahead: parseInt(req.query.days_ahead) || 90
      };

      const report = await expiryReportsService.getExpiryHeatmap(filters);
      
      res.json({
        success: true,
        data: report,
        message: 'Expiry heatmap generated successfully'
      });
    } catch (error) {
      logger.error('Error getting expiry heatmap:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate expiry heatmap',
        error: error.message
      });
    }
  }

  /**
   * Get loss due to expiry report
   */
  async getLossDueToExpiryReport(req, res) {
    try {
      const filters = {
        store_id: req.query.store_id,
        from_date: req.query.from_date,
        to_date: req.query.to_date
      };

      const report = await expiryReportsService.getLossDueToExpiryReport(filters);
      
      res.json({
        success: true,
        data: report,
        message: 'Loss due to expiry report generated successfully'
      });
    } catch (error) {
      logger.error('Error getting loss due to expiry report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate loss due to expiry report',
        error: error.message
      });
    }
  }

  /**
   * Get all expiry reports dashboard
   */
  async getExpiryDashboard(req, res) {
    try {
      const filters = {
        store_id: req.query.store_id,
        days_ahead: parseInt(req.query.days_ahead) || 90
      };

      const [
        nearExpiryReport,
        batchWiseReport,
        fefoComplianceReport,
        heatmapReport,
        lossReport
      ] = await Promise.all([
        expiryReportsService.getNearExpiryReport(filters),
        expiryReportsService.getBatchWiseStockReport(filters),
        expiryReportsService.getFEFOComplianceReport(filters),
        expiryReportsService.getExpiryHeatmap(filters),
        expiryReportsService.getLossDueToExpiryReport(filters)
      ]);

      const dashboard = {
        near_expiry: nearExpiryReport,
        batch_wise: batchWiseReport,
        fefo_compliance: fefoComplianceReport,
        heatmap: heatmapReport,
        loss_due_to_expiry: lossReport,
        generated_at: new Date()
      };
      
      res.json({
        success: true,
        data: dashboard,
        message: 'Expiry dashboard generated successfully'
      });
    } catch (error) {
      logger.error('Error getting expiry dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate expiry dashboard',
        error: error.message
      });
    }
  }
}

module.exports = new ExpiryReportsController();
