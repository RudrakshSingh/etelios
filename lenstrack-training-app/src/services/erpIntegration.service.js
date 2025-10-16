const axios = require('axios');
const logger = require('./logger.service');

class ERPIntegrationService {
  constructor() {
    this.erpBaseURL = process.env.ERP_URL || 'http://localhost:3001';
    this.apiKey = process.env.ERP_API_KEY;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Test ERP connection
      const healthCheck = await this.healthCheck();
      if (!healthCheck) {
        throw new Error('ERP system is not accessible');
      }

      this.isInitialized = true;
      logger.info('ERP integration service initialized successfully');
    } catch (error) {
      logger.error('ERP integration service initialization failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.erpBaseURL}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.error('ERP health check failed:', error);
      return false;
    }
  }

  async getSalesKPIs(storeId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const response = await axios.get(`${this.erpBaseURL}/api/analytics/sales-kpis`, {
        params: {
          store_id: storeId,
          from_date: dateFilter.from_date,
          to_date: dateFilter.to_date
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching sales KPIs from ERP:', error);
      // Return mock data if ERP is not available
      return this.getMockSalesKPIs();
    }
  }

  async getOptometristKPIs(storeId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const response = await axios.get(`${this.erpBaseURL}/api/analytics/optometrist-kpis`, {
        params: {
          store_id: storeId,
          from_date: dateFilter.from_date,
          to_date: dateFilter.to_date
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching optometrist KPIs from ERP:', error);
      // Return mock data if ERP is not available
      return this.getMockOptometristKPIs();
    }
  }

  async getUserPerformance(userId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const response = await axios.get(`${this.erpBaseURL}/api/analytics/user-performance`, {
        params: {
          user_id: userId,
          from_date: dateFilter.from_date,
          to_date: dateFilter.to_date
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching user performance from ERP:', error);
      return this.getMockUserPerformance();
    }
  }

  async getStorePerformance(storeId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const response = await axios.get(`${this.erpBaseURL}/api/analytics/store-performance`, {
        params: {
          store_id: storeId,
          from_date: dateFilter.from_date,
          to_date: dateFilter.to_date
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching store performance from ERP:', error);
      return this.getMockStorePerformance();
    }
  }

  async syncTrainingProgress(userId, progressData) {
    try {
      const response = await axios.post(`${this.erpBaseURL}/api/training/sync-progress`, {
        user_id: userId,
        progress_data: progressData,
        sync_timestamp: new Date()
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error syncing training progress to ERP:', error);
      throw error;
    }
  }

  async updateUserCertification(userId, certificationData) {
    try {
      const response = await axios.post(`${this.erpBaseURL}/api/training/update-certification`, {
        user_id: userId,
        certification: certificationData,
        updated_at: new Date()
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error updating user certification in ERP:', error);
      throw error;
    }
  }

  async getTrainingImpactAnalysis(storeId, timeRange = 'month') {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      const response = await axios.get(`${this.erpBaseURL}/api/analytics/training-impact`, {
        params: {
          store_id: storeId,
          from_date: dateFilter.from_date,
          to_date: dateFilter.to_date
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching training impact analysis from ERP:', error);
      return this.getMockTrainingImpact();
    }
  }

  async getRealTimeKPIs(storeId) {
    try {
      const response = await axios.get(`${this.erpBaseURL}/api/analytics/real-time-kpis`, {
        params: {
          store_id: storeId
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching real-time KPIs from ERP:', error);
      return this.getMockRealTimeKPIs();
    }
  }

  getDateFilter(timeRange) {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      from_date: startDate.toISOString().split('T')[0],
      to_date: now.toISOString().split('T')[0]
    };
  }

  // Mock data methods for when ERP is not available
  getMockSalesKPIs() {
    return {
      ar_attach_rate: 28.5,
      progressive_conversion: 22.3,
      aov_threshold: 1250,
      close_rate: 78.2,
      total_sales: 125000,
      transactions: 156,
      average_bill_value: 801.28
    };
  }

  getMockOptometristKPIs() {
    return {
      remake_rate: 1.8,
      rx_recheck_rate: 2.5,
      pd_sh_error_rate: 0,
      total_prescriptions: 89,
      successful_fittings: 87,
      patient_satisfaction: 4.6
    };
  }

  getMockUserPerformance() {
    return {
      user_id: 'mock_user',
      performance_score: 85.5,
      kpi_achievements: {
        ar_attach_rate: 30.2,
        progressive_conversion: 25.1,
        remake_rate: 1.2
      },
      training_impact: {
        pre_training_score: 72.3,
        post_training_score: 85.5,
        improvement_percentage: 18.2
      }
    };
  }

  getMockStorePerformance() {
    return {
      store_id: 'mock_store',
      overall_performance: 82.3,
      sales_team_performance: 85.1,
      optometrist_performance: 79.8,
      training_completion_rate: 78.5,
      certification_rate: 65.2
    };
  }

  getMockTrainingImpact() {
    return {
      store_id: 'mock_store',
      impact_metrics: {
        sales_improvement: 15.3,
        customer_satisfaction: 12.8,
        error_reduction: 25.6,
        efficiency_gain: 18.7
      },
      roi_analysis: {
        training_investment: 50000,
        performance_gain: 125000,
        roi_percentage: 150.0
      }
    };
  }

  getMockRealTimeKPIs() {
    return {
      store_id: 'mock_store',
      current_metrics: {
        today_sales: 8500,
        today_transactions: 12,
        ar_attach_rate: 32.1,
        progressive_conversion: 28.5,
        remake_rate: 1.2
      },
      trends: {
        sales_trend: 'up',
        ar_trend: 'up',
        remake_trend: 'down'
      }
    };
  }

  async validateKPIs(userId, kpiData) {
    try {
      // Validate KPI data against ERP requirements
      const validation = {
        is_valid: true,
        errors: [],
        warnings: []
      };

      // Sales KPI validation
      if (kpiData.sales) {
        if (kpiData.sales.ar_attach_rate < 0 || kpiData.sales.ar_attach_rate > 100) {
          validation.errors.push('AR attach rate must be between 0 and 100');
        }
        if (kpiData.sales.progressive_conversion < 0 || kpiData.sales.progressive_conversion > 100) {
          validation.errors.push('Progressive conversion must be between 0 and 100');
        }
        if (kpiData.sales.aov_threshold < 0) {
          validation.errors.push('AOV threshold must be positive');
        }
      }

      // Optometrist KPI validation
      if (kpiData.optometrist) {
        if (kpiData.optometrist.remake_rate < 0 || kpiData.optometrist.remake_rate > 100) {
          validation.errors.push('Remake rate must be between 0 and 100');
        }
        if (kpiData.optometrist.rx_recheck_rate < 0 || kpiData.optometrist.rx_recheck_rate > 100) {
          validation.errors.push('Rx recheck rate must be between 0 and 100');
        }
        if (kpiData.optometrist.pd_sh_error_rate < 0 || kpiData.optometrist.pd_sh_error_rate > 100) {
          validation.errors.push('PD/SH error rate must be between 0 and 100');
        }
      }

      validation.is_valid = validation.errors.length === 0;

      return validation;
    } catch (error) {
      logger.error('Error validating KPIs:', error);
      throw error;
    }
  }

  async syncBadgeEarned(userId, badgeData) {
    try {
      const response = await axios.post(`${this.erpBaseURL}/api/training/sync-badge`, {
        user_id: userId,
        badge: badgeData,
        earned_at: new Date()
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error syncing badge to ERP:', error);
      throw error;
    }
  }

  async getTrainingRecommendations(userId, currentKPIs) {
    try {
      const response = await axios.post(`${this.erpBaseURL}/api/training/recommendations`, {
        user_id: userId,
        current_kpis: currentKPIs,
        analysis_date: new Date()
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting training recommendations from ERP:', error);
      return this.getMockTrainingRecommendations();
    }
  }

  getMockTrainingRecommendations() {
    return {
      user_id: 'mock_user',
      recommendations: [
        {
          track_id: 'SALES_S1_S8',
          module_id: 'S5',
          priority: 'HIGH',
          reason: 'Objection handling needs improvement',
          expected_impact: 'Increase close rate by 15%'
        },
        {
          track_id: 'SALES_S1_S8',
          module_id: 'S6',
          priority: 'MEDIUM',
          reason: 'Cross-selling skills can be enhanced',
          expected_impact: 'Increase AR attach rate by 10%'
        }
      ]
    };
  }
}

module.exports = new ERPIntegrationService();
