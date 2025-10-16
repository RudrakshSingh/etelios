const { logger } = require('../config/logger');

class AnalyticsService {
  constructor() {
    this.isExternalConfigured = false;
  }

  /**
   * Get HR analytics data (built-in only)
   */
  async getHRAnalytics() {
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
      logger.error('Error getting HR analytics', { error: error.message });
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
  async getEmployeeStatistics() {
    try {
      const User = require('../models/User.model');
      
      const stats = await User.aggregate([
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

      return stats;
    } catch (error) {
      logger.error('Error getting employee statistics', { error: error.message });
      return [];
    }
  }

  /**
   * Get attendance analytics
   */
  async getAttendanceAnalytics() {
    try {
      const Attendance = require('../models/Attendance.model');
      
      const stats = await Attendance.aggregate([
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

      return stats;
    } catch (error) {
      logger.error('Error getting attendance analytics', { error: error.message });
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const User = require('../models/User.model');
      const Attendance = require('../models/Attendance.model');
      
      const metrics = await User.aggregate([
        {
          $match: { is_active: true }
        },
        {
          $lookup: {
            from: 'attendances',
            localField: '_id',
            foreignField: 'user_id',
            as: 'attendance'
          }
        },
        {
          $project: {
            name: 1,
            department: 1,
            attendanceCount: { $size: '$attendance' },
            avgAttendance: {
              $avg: {
                $map: {
                  input: '$attendance',
                  as: 'att',
                  in: { $cond: [{ $eq: ['$$att.status', 'present'] }, 1, 0] }
                }
              }
            }
          }
        },
        {
          $sort: { avgAttendance: -1 }
        }
      ]);

      return metrics;
    } catch (error) {
      logger.error('Error getting performance metrics', { error: error.message });
      return [];
    }
  }

  /**
   * Get compliance analytics
   */
  async getComplianceAnalytics() {
    try {
      const EmployeeDocument = require('../models/EmployeeDocument.model');
      
      const stats = await EmployeeDocument.aggregate([
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

      return stats;
    } catch (error) {
      logger.error('Error getting compliance analytics', { error: error.message });
      return [];
    }
  }

  /**
   * Get AI insights
   */
  async getAIInsights() {
    try {
      const insights = [];
      
      // Get basic stats for insights
      const employeeStats = await this.getEmployeeStatistics();
      const attendanceStats = await this.getAttendanceAnalytics();
      const complianceStats = await this.getComplianceAnalytics();

      // Employee distribution insight
      const totalEmployees = employeeStats.reduce((sum, dept) => sum + dept.count, 0);
      insights.push({
        type: 'employee_distribution',
        title: 'Employee Distribution Analysis',
        description: `Total active employees: ${totalEmployees}`,
        recommendation: totalEmployees < 50 ? 'Consider hiring more employees for growth' : 'Employee count is healthy',
        priority: 'medium'
      });

      // Attendance insight
      if (attendanceStats.length > 0) {
        const avgAttendance = attendanceStats.reduce((sum, day) => sum + day.presentCount, 0) / attendanceStats.length;
        insights.push({
          type: 'attendance',
          title: 'Attendance Analysis',
          description: `Average daily attendance: ${avgAttendance.toFixed(1)} employees`,
          recommendation: avgAttendance < 5 ? 'Consider implementing attendance incentives' : 'Attendance levels are healthy',
          priority: 'high'
        });
      }

      // Compliance insight
      const lowCompliance = complianceStats.filter(stat => stat.compliancePercentage < 80);
      if (lowCompliance.length > 0) {
        insights.push({
          type: 'compliance',
          title: 'Compliance Alert',
          description: `${lowCompliance.length} document types have compliance below 80%`,
          recommendation: 'Send reminders for pending document signatures',
          priority: 'high'
        });
      }

      return insights;
    } catch (error) {
      logger.error('Error getting AI insights', { error: error.message });
      return [];
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format = 'json') {
    try {
      const data = await this.getHRAnalytics();
      
      if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(data);
        return {
          data: csvData,
          format: 'csv',
          filename: `analytics_${new Date().toISOString().split('T')[0]}.csv`
        };
      }
      
      return {
        data,
        format: 'json',
        filename: `analytics_${new Date().toISOString().split('T')[0]}.json`
      };
    } catch (error) {
      logger.error('Error exporting analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    let csv = '';
    
    // Employee stats
    csv += 'Department,Count,AvgTenure\n';
    data.employeeStats.forEach(stat => {
      csv += `${stat._id},${stat.count},${stat.avgTenure?.toFixed(2) || 0}\n`;
    });
    
    // Attendance stats
    csv += '\nDate,TotalAttendance,PresentCount,LateCount,AbsentCount\n';
    data.attendanceStats.forEach(stat => {
      csv += `${stat._id},${stat.totalAttendance},${stat.presentCount},${stat.lateCount},${stat.absentCount}\n`;
    });
    
    return csv;
  }
}

module.exports = new AnalyticsService();
