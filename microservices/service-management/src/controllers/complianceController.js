const ComplianceService = require('../services/compliance.service');
const logger = require('../config/logger');

/**
 * Get compliance dashboard
 */
const getComplianceDashboard = async (req, res, next) => {
  try {
    const filters = req.query;
    const dashboard = await ComplianceService.getComplianceDashboard(filters);

    res.status(200).json({
      success: true,
      message: 'Compliance dashboard retrieved successfully',
      data: dashboard
    });

  } catch (error) {
    logger.error('Get compliance dashboard failed', { 
      error: error.message, 
      userId: req.user?._id,
      filters: req.query 
    });
    next(error);
  }
};

/**
 * Get compliance trends
 */
const getComplianceTrends = async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    const trends = await ComplianceService.getComplianceTrends(parseInt(months));

    res.status(200).json({
      success: true,
      message: 'Compliance trends retrieved successfully',
      data: trends
    });

  } catch (error) {
    logger.error('Get compliance trends failed', { 
      error: error.message, 
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Get critical compliance issues
 */
const getCriticalIssues = async (req, res, next) => {
  try {
    const issues = await ComplianceService.getCriticalComplianceIssues();

    res.status(200).json({
      success: true,
      message: 'Critical compliance issues retrieved successfully',
      data: issues
    });

  } catch (error) {
    logger.error('Get critical compliance issues failed', { 
      error: error.message, 
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Get department compliance report
 */
const getDepartmentCompliance = async (req, res, next) => {
  try {
    const { department } = req.params;
    const report = await ComplianceService.getDepartmentComplianceReport(department);

    res.status(200).json({
      success: true,
      message: 'Department compliance report retrieved successfully',
      data: report
    });

  } catch (error) {
    logger.error('Get department compliance report failed', { 
      error: error.message, 
      department: req.params.department,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Get employee compliance report
 */
const getEmployeeCompliance = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const report = await ComplianceService.getEmployeeComplianceReport(employeeId);

    res.status(200).json({
      success: true,
      message: 'Employee compliance report retrieved successfully',
      data: report
    });

  } catch (error) {
    logger.error('Get employee compliance report failed', { 
      error: error.message, 
      employeeId: req.params.employeeId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Check employee compliance
 */
const checkEmployeeCompliance = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const compliance = await ComplianceService.checkEmployeeCompliance(employeeId);

    res.status(200).json({
      success: true,
      message: 'Employee compliance check completed successfully',
      data: compliance
    });

  } catch (error) {
    logger.error('Check employee compliance failed', { 
      error: error.message, 
      employeeId: req.params.employeeId,
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Export compliance report
 */
const exportComplianceReport = async (req, res, next) => {
  try {
    const { format = 'excel' } = req.query;
    const filters = req.query;
    
    // Remove format from filters
    delete filters.format;

    const reportBuffer = await ComplianceService.exportComplianceReport(filters, format);

    // Set response headers
    const filename = `compliance_report_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    
    res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', reportBuffer.length);

    res.send(reportBuffer);

  } catch (error) {
    logger.error('Export compliance report failed', { 
      error: error.message, 
      userId: req.user?._id,
      format: req.query.format 
    });
    next(error);
  }
};

/**
 * Get compliance statistics
 */
const getComplianceStatistics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get compliance statistics for the period
    const stats = await ComplianceService.getComplianceDashboard({
      date_from: startDate.toISOString()
    });

    // Calculate additional statistics
    const totalEmployees = await require('../models/User.model').countDocuments({ 
      role: 'employee',
      is_active: true 
    });

    const complianceRate = stats.summary.complianceRate;
    const nonCompliantCount = Math.round((100 - complianceRate) * totalEmployees / 100);

    res.status(200).json({
      success: true,
      message: 'Compliance statistics retrieved successfully',
      data: {
        period: `${days} days`,
        totalEmployees,
        complianceRate,
        nonCompliantCount,
        summary: stats.summary,
        byType: stats.byType,
        byDepartment: stats.byDepartment,
        criticalIssues: stats.criticalIssues
      }
    });

  } catch (error) {
    logger.error('Get compliance statistics failed', { 
      error: error.message, 
      userId: req.user?._id 
    });
    next(error);
  }
};

/**
 * Get compliance alerts
 */
const getComplianceAlerts = async (req, res, next) => {
  try {
    const alerts = [];

    // Get critical compliance issues
    const criticalIssues = await ComplianceService.getCriticalComplianceIssues();
    
    criticalIssues.forEach(issue => {
      alerts.push({
        type: 'critical',
        title: issue.title,
        description: issue.description,
        count: issue.count,
        severity: issue.severity,
        action_required: true,
        created_at: new Date()
      });
    });

    // Get expiring documents
    const expiringDocuments = await require('../models/Document.model').find({
      expiry_date: { 
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        $gte: new Date()
      },
      is_deleted: false,
      is_latest: true
    }).populate('employee', 'name email department');

    if (expiringDocuments.length > 0) {
      alerts.push({
        type: 'expiry',
        title: 'Documents Expiring Soon',
        description: `${expiringDocuments.length} documents are expiring within 30 days`,
        count: expiringDocuments.length,
        severity: 'medium',
        action_required: true,
        created_at: new Date()
      });
    }

    // Get overdue signatures
    const overdueDocuments = await require('../models/Document.model').find({
      signature_required: true,
      status: 'pending_signature',
      is_deleted: false,
      is_latest: true,
      created_at: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).populate('employee', 'name email department');

    if (overdueDocuments.length > 0) {
      alerts.push({
        type: 'overdue',
        title: 'Overdue Signatures',
        description: `${overdueDocuments.length} documents have overdue signatures`,
        count: overdueDocuments.length,
        severity: 'high',
        action_required: true,
        created_at: new Date()
      });
    }

    // Sort alerts by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.status(200).json({
      success: true,
      message: 'Compliance alerts retrieved successfully',
      data: {
        alerts,
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    });

  } catch (error) {
    logger.error('Get compliance alerts failed', { 
      error: error.message, 
      userId: req.user?._id 
    });
    next(error);
  }
};

module.exports = {
  getComplianceDashboard,
  getComplianceTrends,
  getCriticalIssues,
  getDepartmentCompliance,
  getEmployeeCompliance,
  checkEmployeeCompliance,
  exportComplianceReport,
  getComplianceStatistics,
  getComplianceAlerts
};
