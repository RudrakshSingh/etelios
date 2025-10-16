const express = require('express');
const router = express.Router();
const incentiveController = require('../controllers/incentiveController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');

// Apply authentication to all routes
router.use(authenticate);

// Rule Management Routes
router.post('/rules', 
  requirePermission('manage_incentive_rules'),
  validateRequest({
    body: Joi.object({
      type: Joi.string().valid(
        'MONTHLY_SLAB', 'QUARTERLY_EVAL', 'DAILY_TARGET', 'PRODUCT', 
        'TELESALES', 'SPIN_WHEEL', 'REFERRAL', 'MYSTERY_PRODUCT', 
        'TEAM_BATTLE', 'LEVEL_POLICY'
      ).required(),
      ruleData: Joi.object().required()
    })
  }),
  incentiveController.createIncentiveRule
);

router.get('/rules',
  requirePermission('view_incentive_rules'),
  incentiveController.getIncentiveRules
);

router.patch('/rules/:ruleId',
  requirePermission('manage_incentive_rules'),
  incentiveController.updateIncentiveRule
);

// Performance Management Routes
router.post('/performance/daily',
  requirePermission('record_performance'),
  validateRequest({
    body: Joi.object({
      userId: Joi.string().required(),
      storeId: Joi.string().required(),
      date: Joi.date().required(),
      performanceData: Joi.object({
        customer_count: Joi.number().min(0).required(),
        paid_bills_count: Joi.number().min(0).required(),
        revenue_pre_tax: Joi.number().min(0).required(),
        items_sold: Joi.number().min(0).required(),
        sku_counts: Joi.object().pattern(Joi.string(), Joi.number()),
        product_revenue: Joi.object().pattern(Joi.string(), Joi.number()),
        tele: Joi.object({
          dials: Joi.number().min(0),
          connected: Joi.number().min(0),
          bookings: Joi.number().min(0),
          qa_score: Joi.number().min(0).max(100)
        }),
        store_type: Joi.string().valid('CHAMPION', 'LEARNING', 'STANDARD')
      }).required()
    })
  }),
  incentiveController.recordDailyPerformance
);

router.get('/performance/daily',
  requirePermission('view_performance'),
  incentiveController.getDailyPerformance
);

router.post('/performance/monthly-slab',
  requirePermission('calculate_incentives'),
  validateRequest({
    body: Joi.object({
      userId: Joi.string().required(),
      storeId: Joi.string().required(),
      yyyymm: Joi.string().pattern(/^\d{4}-\d{2}$/).required()
    })
  }),
  incentiveController.calculateMonthlySlab
);

router.post('/performance/quarterly-eval',
  requirePermission('calculate_incentives'),
  validateRequest({
    body: Joi.object({
      userId: Joi.string().required(),
      yyyymm: Joi.string().pattern(/^\d{4}-\d{2}$/).required()
    })
  }),
  incentiveController.performQuarterlyEvaluation
);

// Gamification Routes
router.post('/spin-wheel',
  requirePermission('use_gamification'),
  validateRequest({
    body: Joi.object({
      userId: Joi.string().required(),
      reason: Joi.string().valid('DAILY_TARGET', 'MONTHLY_TARGET', 'MANUAL').default('MANUAL')
    })
  }),
  incentiveController.executeSpinWheel
);

router.get('/spin-wheel/history',
  requirePermission('view_gamification'),
  incentiveController.getSpinHistory
);

// Leaderboard Routes
router.get('/leaderboard',
  requirePermission('view_leaderboards'),
  validateRequest({
    query: Joi.object({
      scope: Joi.string().valid('USER', 'STORE', 'CITY', 'STATE', 'COUNTRY').default('USER'),
      metric: Joi.string().valid('CUSTOMER_COUNT', 'REVENUE', 'PRODUCT_UNITS').default('CUSTOMER_COUNT'),
      level: Joi.string().valid('A', 'B', 'C', 'ALL').default('ALL'),
      period: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').default('DAILY')
    })
  }),
  incentiveController.getLeaderboard
);

// Payout Management Routes
router.get('/payouts',
  requirePermission('view_payouts'),
  validateRequest({
    query: Joi.object({
      userId: Joi.string(),
      storeId: Joi.string(),
      period: Joi.string().valid('DAILY', 'MONTHLY', 'QUARTERLY'),
      status: Joi.string().valid('DUE', 'APPROVED', 'PAID', 'ON_HOLD'),
      startDate: Joi.date(),
      endDate: Joi.date()
    })
  }),
  incentiveController.getIncentivePayouts
);

router.patch('/payouts/:payoutId/approve',
  requirePermission('approve_payouts'),
  validateRequest({
    body: Joi.object({
      notes: Joi.string().optional()
    })
  }),
  incentiveController.approvePayout
);

router.patch('/payouts/:payoutId/paid',
  requirePermission('process_payouts'),
  validateRequest({
    body: Joi.object({
      exportRef: Joi.string().optional()
    })
  }),
  incentiveController.markPayoutPaid
);

// Team Management Routes
router.post('/teams',
  requirePermission('manage_teams'),
  validateRequest({
    body: Joi.object({
      name: Joi.string().required(),
      storeId: Joi.string().optional(),
      regionId: Joi.string().optional(),
      members: Joi.array().items(
        Joi.object({
          user_id: Joi.string().required(),
          role: Joi.string().valid('LEAD', 'MEMBER').default('MEMBER')
        })
      ).required()
    })
  }),
  incentiveController.createTeam
);

router.get('/teams',
  requirePermission('view_teams'),
  validateRequest({
    query: Joi.object({
      storeId: Joi.string(),
      regionId: Joi.string(),
      isActive: Joi.boolean()
    })
  }),
  incentiveController.getTeams
);

// Analytics Routes
router.get('/analytics',
  requirePermission('view_incentive_analytics'),
  validateRequest({
    query: Joi.object({
      period: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').default('DAILY'),
      storeId: Joi.string(),
      userId: Joi.string()
    })
  }),
  incentiveController.getIncentiveAnalytics
);

// Admin Dashboard Routes
router.get('/dashboard/overview',
  requirePermission('view_incentive_dashboard'),
  async (req, res) => {
    try {
      const { period = 'DAILY' } = req.query;
      
      // Get key metrics
      const totalRewards = await IncentivePayout.aggregate([
        { $match: { status: { $in: ['APPROVED', 'PAID'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalPayouts = await IncentivePayout.countDocuments({ status: 'PAID' });
      const pendingPayouts = await IncentivePayout.countDocuments({ status: 'DUE' });
      const totalSpins = await SpinWheelSpin.countDocuments();

      const overview = {
        total_rewards_paid: totalRewards[0]?.total || 0,
        total_payouts: totalPayouts,
        pending_payouts: pendingPayouts,
        total_spins: totalSpins,
        period
      };

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard overview',
        error: error.message
      });
    }
  }
);

// Rule Templates (Pre-configured rules)
router.get('/templates',
  requirePermission('view_incentive_rules'),
  (req, res) => {
    const templates = {
      monthly_slab: {
        name: 'Standard Monthly Slab',
        type: 'MONTHLY_SLAB',
        description: 'Standard monthly slab-based incentive structure',
        template: {
          currency: 'INR',
          slabs: [
            { min_sales: 0, max_sales: 50000, base_salary_adj: 0, incentive_amount: 0 },
            { min_sales: 50000, max_sales: 100000, base_salary_adj: 0, incentive_amount: 2000 },
            { min_sales: 100000, max_sales: 200000, base_salary_adj: 0, incentive_amount: 5000 },
            { min_sales: 200000, max_sales: null, base_salary_adj: 0, incentive_amount: 10000 }
          ],
          under_performance_deduction: {
            threshold: 30000,
            amount_or_pct: 500,
            is_percentage: false
          }
        }
      },
      daily_customer: {
        name: 'Daily Customer Count',
        type: 'DAILY_TARGET',
        description: 'Daily customer count incentive',
        template: {
          scope: 'STORE',
          target_type: 'CUSTOMER_COUNT',
          store_type_overrides: [
            {
              store_type: 'CHAMPION',
              tiers: [
                { min: 0, max: 10, reward: 0 },
                { min: 10, max: 20, reward: 200 },
                { min: 20, max: null, reward: 500 }
              ]
            },
            {
              store_type: 'LEARNING',
              tiers: [
                { min: 0, max: 8, reward: 0 },
                { min: 8, max: 15, reward: 150 },
                { min: 15, max: null, reward: 300 }
              ]
            }
          ]
        }
      },
      spin_wheel: {
        name: 'Standard Spin Wheel',
        type: 'SPIN_WHEEL',
        description: 'Standard spin wheel with cash and points rewards',
        template: {
          unlock_condition: 'DAILY_TARGET_MET',
          rewards: [
            { label: '₹100 Cash', type: 'CASH', value: 100, probability: 0.3 },
            { label: '₹200 Cash', type: 'CASH', value: 200, probability: 0.2 },
            { label: '₹500 Cash', type: 'CASH', value: 500, probability: 0.1 },
            { label: '100 Points', type: 'POINTS', value: 100, probability: 0.2 },
            { label: 'Half Day Leave', type: 'LEAVE', value: 0.5, probability: 0.15 },
            { label: '₹1000 Voucher', type: 'VOUCHER', value: 1000, probability: 0.05 }
          ],
          daily_spin_cap: 1,
          monthly_spin_cap: 4
        }
      }
    };

    res.json({
      success: true,
      data: templates
    });
  }
);

module.exports = router;
