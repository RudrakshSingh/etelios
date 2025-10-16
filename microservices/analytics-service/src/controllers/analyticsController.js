const AnalyticsService = require('../services/analytics.service');
const { logger } = require('../config/logger');

/**
 * Get comprehensive HR analytics
 */
const getHRAnalytics = async (req, res) => {
  try {
    const analyticsData = await AnalyticsService.getHRAnalytics();
    
    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    logger.error('Error getting HR analytics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get HR analytics',
      error: error.message
    });
  }
};

/**
 * Get employee statistics
 */
const getEmployeeStats = async (req, res) => {
  try {
    const { department, startDate, endDate } = req.query;
    
    const stats = await AnalyticsService.getEmployeeStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting employee stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get employee statistics',
      error: error.message
    });
  }
};

/**
 * Get attendance analytics
 */
const getAttendanceAnalytics = async (req, res) => {
  try {
    const { days = 30, department } = req.query;
    
    const analytics = await AnalyticsService.getAttendanceStats();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting attendance analytics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance analytics',
      error: error.message
    });
  }
};

/**
 * Get performance metrics
 */
const getPerformanceMetrics = async (req, res) => {
  try {
    const metrics = await AnalyticsService.getPerformanceStats();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting performance metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get performance metrics',
      error: error.message
    });
  }
};

/**
 * Get compliance analytics
 */
const getComplianceAnalytics = async (req, res) => {
  try {
    const analytics = await AnalyticsService.getComplianceStats();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting compliance analytics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get compliance analytics',
      error: error.message
    });
  }
};

/**
 * Generate AI insights
 */
const generateInsights = async (req, res) => {
  try {
    const analyticsData = await AnalyticsService.getHRAnalytics();
    const insights = await AnalyticsService.generateInsights(analyticsData);
    
    res.json({
      success: true,
      data: {
        insights,
        generatedAt: new Date(),
        totalInsights: insights.length
      }
    });
  } catch (error) {
    logger.error('Error generating insights', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: error.message
    });
  }
};

/**
 * Create analytics dashboard
 */
const createDashboard = async (req, res) => {
  try {
    const { title, slug, position, css, metadata } = req.body;
    
    const dashboardData = {
      title,
      slug,
      position,
      css,
      metadata
    };
    
    const dashboard = await AnalyticsService.createDashboard(dashboardData);
    
    res.status(201).json({
      success: true,
      message: 'Dashboard created successfully',
      data: dashboard
    });
  } catch (error) {
    logger.error('Error creating dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create dashboard',
      error: error.message
    });
  }
};

/**
 * Get dashboard data
 */
const getDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    
    const dashboard = await AnalyticsService.getDashboardData(dashboardId);
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Error getting dashboard', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard',
      error: error.message
    });
  }
};

/**
 * Export analytics data
 */
const exportAnalytics = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    const data = await AnalyticsService.exportAnalytics(format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="hr-analytics.csv"');
      res.send(data);
    } else if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="hr-analytics.xlsx"');
      res.send(data);
    } else {
      res.json({
        success: true,
        data
      });
    }
  } catch (error) {
    logger.error('Error exporting analytics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics',
      error: error.message
    });
  }
};

/**
 * Get analytics configuration status
 */
const getConfigurationStatus = async (req, res) => {
  try {
    const status = AnalyticsService.getConfigurationStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting configuration status', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get configuration status',
      error: error.message
    });
  }
};

module.exports = {
  getHRAnalytics,
  getEmployeeStats,
  getAttendanceAnalytics,
  getPerformanceMetrics,
  getComplianceAnalytics,
  generateInsights,
  createDashboard,
  getDashboard,
  exportAnalytics,
  getConfigurationStatus
};
