const axios = require('axios');
const { logger } = require('../config/logger');

class AnalyticsService {
  constructor() {
    this.supersetURL = process.env.SUPERSET_URL || 'http://localhost:8088';
    this.supersetUsername = process.env.SUPERSET_USERNAME || 'admin';
    this.supersetPassword = process.env.SUPERSET_PASSWORD || 'admin';
    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * Check if Superset is configured
   */
  isConfigured() {
    return process.env.SUPERSET_URL && 
           process.env.SUPERSET_USERNAME && 
           process.env.SUPERSET_PASSWORD;
  }

  /**
   * Authenticate with Superset
   */
  async authenticate() {
    try {
      const response = await axios.post(`${this.supersetURL}/api/v1/security/login`, {
        username: this.supersetUsername,
        password: this.supersetPassword,
        provider: 'db',
        refresh: true
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      logger.info('Superset authentication successful');
      return true;
    } catch (error) {
      logger.error('Superset authentication failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get HR analytics data
   */
  async getHRAnalytics() {
    try {
      // Use built-in analytics if Superset is not configured
      if (!this.isConfigured()) {
        return await this.getBuiltInAnalytics();
      }

      if (!this.accessToken) {
        await this.authenticate();
      }

      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      };

      // Get employee count by department
      const employeeStats = await this.getEmployeeStats(headers);
      
      // Get attendance analytics
      const attendanceStats = await this.getAttendanceStats(headers);
      
      // Get performance metrics
      const performanceStats = await this.getPerformanceStats(headers);
      
      // Get compliance metrics
      const complianceStats = await this.getComplianceStats(headers);

      return {
        employeeStats,
        attendanceStats,
        performanceStats,
        complianceStats,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting HR analytics', { error: error.message });
      // Fallback to built-in analytics
      return await this.getBuiltInAnalytics();
    }
  }

  /**
   * Get built-in analytics (no external dependencies)
   */
  async getBuiltInAnalytics() {
    try {
      const User = require('../models/User.model');
      const Attendance = require('../models/Attendance.model');
      const EmployeeDocument = require('../models/EmployeeDocument.model');

      // Get employee statistics
      const employeeStats = await User.aggregate([
        {
          $match: { is_active: true }
        },
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
            avgTenure: { 
              $avg: { 
                $divide: [
                  { $subtract: [new Date(), '$date_of_joining'] }, 
                  365 * 24 * 60 * 60 * 1000
                ] 
              } 
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      // Get attendance analytics
      const attendanceStats = await Attendance.aggregate([
        {
          $match: {
            clock_in_time: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$clock_in_time" } },
            totalAttendance: { $sum: 1 },
            presentCount: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
            lateCount: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
            absentCount: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } }
          }
        },
        {
          $sort: { _id: -1 }
        },
        {
          $limit: 7
        }
      ]);

      // Get compliance analytics
      const complianceStats = await EmployeeDocument.aggregate([
        {
          $match: { is_latest: true }
        },
        {
          $group: {
            _id: '$document_type',
            totalDocuments: { $sum: 1 },
            signedDocuments: { $sum: { $cond: [{ $eq: ["$esign_status", "SIGNED"] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            compliancePercentage: {
              $multiply: [
                { $divide: ["$signedDocuments", "$totalDocuments"] },
                100
              ]
            }
          }
        },
        {
          $sort: { compliancePercentage: 1 }
        }
      ]);

      return {
        employeeStats,
        attendanceStats,
        complianceStats,
        generatedAt: new Date(),
        source: 'built-in'
      };
    } catch (error) {
      logger.error('Error getting built-in analytics', { error: error.message });
      return {
        employeeStats: [],
        attendanceStats: [],
        complianceStats: [],
        generatedAt: new Date(),
        source: 'built-in',
        error: error.message
      };
    }
  }

  /**
   * Get employee statistics
   */
  async getEmployeeStats(headers) {
    try {
      const response = await axios.get(`${this.supersetURL}/api/v1/chart/data`, {
        headers,
        params: {
          datasource_id: 1, // HR database
          query_context: JSON.stringify({
            queries: [{
              sql: `
                SELECT 
                  department,
                  COUNT(*) as employee_count,
                  AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_joining))) as avg_tenure_years
                FROM users 
                WHERE is_active = true 
                GROUP BY department
                ORDER BY employee_count DESC
              `
            }]
          })
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting employee stats', { error: error.message });
      return { error: 'Failed to get employee statistics' };
    }
  }

  /**
   * Get attendance analytics
   */
  async getAttendanceStats(headers) {
    try {
      const response = await axios.get(`${this.supersetURL}/api/v1/chart/data`, {
        headers,
        params: {
          datasource_id: 1,
          query_context: JSON.stringify({
            queries: [{
              sql: `
                SELECT 
                  DATE(clock_in_time) as date,
                  COUNT(*) as total_attendance,
                  COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
                  COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
                  COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count
                FROM attendance 
                WHERE clock_in_time >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(clock_in_time)
                ORDER BY date DESC
              `
            }]
          })
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting attendance stats', { error: error.message });
      return { error: 'Failed to get attendance statistics' };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceStats(headers) {
    try {
      const response = await axios.get(`${this.supersetURL}/api/v1/chart/data`, {
        headers,
        params: {
          datasource_id: 1,
          query_context: JSON.stringify({
            queries: [{
              sql: `
                SELECT 
                  u.department,
                  AVG(a.attendance_percentage) as avg_attendance,
                  COUNT(t.id) as transfer_requests,
                  COUNT(CASE WHEN t.status = 'approved' THEN 1 END) as approved_transfers
                FROM users u
                LEFT JOIN attendance a ON u.id = a.employee_id
                LEFT JOIN transfers t ON u.id = t.employee_id
                WHERE u.is_active = true
                GROUP BY u.department
              `
            }]
          })
        }
      });
return response.data;
    } catch (error) {
      logger.error('Error getting performance stats', { error: error.message });
      return { error: 'Failed to get performance statistics' };
    }
  }

  /**
   * Get compliance metrics
   */
  async getComplianceStats(headers) {
    try {
      const response = await axios.get(`${this.supersetURL}/api/v1/chart/data`, {
        headers,
        params: {
          datasource_id: 1,
          query_context: JSON.stringify({
            queries: [{
              sql: `
                SELECT 
                  dt.name as document_type,
                  COUNT(ed.id) as total_documents,
                  COUNT(CASE WHEN ed.esign_status = 'SIGNED' THEN 1 END) as signed_documents,
                  ROUND(
                    (COUNT(CASE WHEN ed.esign_status = 'SIGNED' THEN 1 END) * 100.0 / COUNT(ed.id)), 2
                  ) as compliance_percentage
                FROM employee_documents ed
                JOIN document_types dt ON ed.document_type = dt.id
                WHERE ed.is_latest = true
                GROUP BY dt.name
                ORDER BY compliance_percentage ASC
              `
            }]
          })
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting compliance stats', { error: error.message });
      return { error: 'Failed to get compliance statistics' };
    }
  }

  /**
   * Create custom dashboard
   */
  async createDashboard(dashboardData) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.post(`${this.supersetURL}/api/v1/dashboard/`, {
        dashboard_title: dashboardData.title,
        slug: dashboardData.slug,
        position_json: dashboardData.position,
        css: dashboardData.css,
        json_metadata: dashboardData.metadata
      }, { headers });

      return response.data;
    } catch (error) {
      logger.error('Error creating dashboard', { error: error.message });
      throw error;
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(dashboardId) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(`${this.supersetURL}/api/v1/dashboard/${dashboardId}`, {
        headers
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting dashboard data', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate HR insights using AI
   */
  async generateInsights(analyticsData) {
    try {
      const insights = [];

      // Employee turnover analysis
      if (analyticsData.employeeStats) {
        const totalEmployees = analyticsData.employeeStats.reduce((sum, dept) => sum + dept.employee_count, 0);
        insights.push({
          type: 'employee_turnover',
          title: 'Employee Distribution',
          description: `Total active employees: ${totalEmployees}`,
          recommendation: 'Monitor departments with low employee count for potential hiring needs'
        });
      }

      // Attendance insights
      if (analyticsData.attendanceStats) {
        const avgAttendance = analyticsData.attendanceStats.reduce((sum, day) => sum + day.present_count, 0) / 
                             analyticsData.attendanceStats.length;
        insights.push({
          type: 'attendance',
          title: 'Attendance Analysis',
          description: `Average daily attendance: ${avgAttendance.toFixed(1)} employees`,
          recommendation: avgAttendance < 10 ? 'Consider implementing attendance incentives' : 'Attendance levels are healthy'
        });
      }

      // Compliance insights
      if (analyticsData.complianceStats) {
        const lowCompliance = analyticsData.complianceStats.filter(stat => stat.compliance_percentage < 80);
        if (lowCompliance.length > 0) {
          insights.push({
            type: 'compliance',
            title: 'Compliance Alert',
            description: `${lowCompliance.length} document types have compliance below 80%`,
            recommendation: 'Send reminders for pending document signatures'
          });
        }
      }

      return insights;
    } catch (error) {
      logger.error('Error generating insights', { error: error.message });
      return [];
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format = 'json') {
    try {
      const analyticsData = await this.getHRAnalytics();
      
      if (format === 'csv') {
        return this.convertToCSV(analyticsData);
      } else if (format === 'excel') {
        return this.convertToExcel(analyticsData);
      }
      
      return analyticsData;
    } catch (error) {
      logger.error('Error exporting analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simple CSV conversion logic
    const csvData = [];
    
    if (data.employeeStats) {
      csvData.push('Department,Employee Count,Avg Tenure');
      data.employeeStats.forEach(stat => {
        csvData.push(`${stat.department},${stat.employee_count},${stat.avg_tenure_years}`);
      });
    }
    
    return csvData.join('\n');
  }

  /**
   * Check if Superset is configured
   */
  isConfigured() {
    return !!(this.supersetURL && this.supersetUsername && this.supersetPassword);
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus() {
    return {
      supersetURL: this.supersetURL,
      isConfigured: this.isConfigured(),
      hasAccessToken: !!this.accessToken
    };
  }
}

module.exports = new AnalyticsService();
