const incentiveService = require('../services/incentiveService');
const logger = require('../config/logger');
const {
  MonthlySlabRule,
  QuarterlyEvalRule,
  DailyTargetRule,
  ProductIncentiveRule,
  TeleSalesRule,
  SpinWheelRule,
  ReferralRule,
  MysteryProductRule,
  TeamBattleRule,
  LevelPolicy
} = require('../models/IncentiveRule.model');
const {
  DailyPerformance,
  MonthlyPerformance,
  IncentivePayout,
  SpinWheelSpin,
  ReferralTracking,
  BattleScore
} = require('../models/Performance.model');
const TeamMembership = require('../models/TeamMembership.model');

// Rule Management
const createIncentiveRule = async (req, res) => {
  try {
    const { type, ruleData } = req.body;
    const userId = req.user.id;

    let rule;
    switch (type) {
      case 'MONTHLY_SLAB':
        rule = new MonthlySlabRule({ ...ruleData, created_by: userId });
        break;
      case 'QUARTERLY_EVAL':
        rule = new QuarterlyEvalRule({ ...ruleData, created_by: userId });
        break;
      case 'DAILY_TARGET':
        rule = new DailyTargetRule({ ...ruleData, created_by: userId });
        break;
      case 'PRODUCT':
        rule = new ProductIncentiveRule({ ...ruleData, created_by: userId });
        break;
      case 'TELESALES':
        rule = new TeleSalesRule({ ...ruleData, created_by: userId });
        break;
      case 'SPIN_WHEEL':
        rule = new SpinWheelRule({ ...ruleData, created_by: userId });
        break;
      case 'REFERRAL':
        rule = new ReferralRule({ ...ruleData, created_by: userId });
        break;
      case 'MYSTERY_PRODUCT':
        rule = new MysteryProductRule({ ...ruleData, created_by: userId });
        break;
      case 'TEAM_BATTLE':
        rule = new TeamBattleRule({ ...ruleData, created_by: userId });
        break;
      case 'LEVEL_POLICY':
        rule = new LevelPolicy({ ...ruleData, created_by: userId });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid rule type'
        });
    }

    await rule.save();
    await incentiveService.logAuditEvent(userId, 'CREATE', 'INCENTIVE_RULE', rule.rule_id, null, rule.toObject());

    res.status(201).json({
      success: true,
      message: 'Incentive rule created successfully',
      data: rule
    });
  } catch (error) {
    logger.error('Error creating incentive rule', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to create incentive rule',
      error: error.message
    });
  }
};

const getIncentiveRules = async (req, res) => {
  try {
    const { type, is_active } = req.query;
    const userId = req.user.id;

    let rules = [];
    const ruleTypes = [
      MonthlySlabRule,
      QuarterlyEvalRule,
      DailyTargetRule,
      ProductIncentiveRule,
      TeleSalesRule,
      SpinWheelRule,
      ReferralRule,
      MysteryProductRule,
      TeamBattleRule,
      LevelPolicy
    ];

    for (const RuleModel of ruleTypes) {
      const query = {};
      if (type) query.type = type;
      if (is_active !== undefined) query.is_active = is_active === 'true';

      const modelRules = await RuleModel.find(query).populate('created_by', 'name email');
      rules = rules.concat(modelRules);
    }

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    logger.error('Error fetching incentive rules', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incentive rules',
      error: error.message
    });
  }
};

const updateIncentiveRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    // Find the rule in any of the rule models
    let rule = null;
    let RuleModel = null;

    const ruleTypes = [
      MonthlySlabRule,
      QuarterlyEvalRule,
      DailyTargetRule,
      ProductIncentiveRule,
      TeleSalesRule,
      SpinWheelRule,
      ReferralRule,
      MysteryProductRule,
      TeamBattleRule,
      LevelPolicy
    ];

    for (const model of ruleTypes) {
      rule = await model.findOne({ rule_id: ruleId });
      if (rule) {
        RuleModel = model;
        break;
      }
    }

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Incentive rule not found'
      });
    }

    const before = rule.toObject();
    Object.assign(rule, updates);
    rule.updated_at = new Date();
    await rule.save();
    await incentiveService.logAuditEvent(userId, 'UPDATE', 'INCENTIVE_RULE', ruleId, before, rule.toObject());

    res.json({
      success: true,
      message: 'Incentive rule updated successfully',
      data: rule
    });
  } catch (error) {
    logger.error('Error updating incentive rule', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to update incentive rule',
      error: error.message
    });
  }
};

// Performance Management
const recordDailyPerformance = async (req, res) => {
  try {
    const { userId, storeId, date, performanceData } = req.body;
    const actorUserId = req.user.id;

    const result = await incentiveService.calculateDailyPerformance(
      userId,
      storeId,
      date,
      performanceData
    );

    await incentiveService.logAuditEvent(
      actorUserId,
      'RECORD_PERFORMANCE',
      'DAILY_PERFORMANCE',
      result._id.toString(),
      null,
      result.toObject()
    );

    res.status(201).json({
      success: true,
      message: 'Daily performance recorded successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error recording daily performance', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to record daily performance',
      error: error.message
    });
  }
};

const getDailyPerformance = async (req, res) => {
  try {
    const { userId, storeId, startDate, endDate } = req.query;

    const query = {};
    if (userId) query.user_id = userId;
    if (storeId) query.store_id = storeId;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const performance = await DailyPerformance.find(query)
      .populate('user_id', 'name email employee_id')
      .populate('store_id', 'name code')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Error fetching daily performance', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily performance',
      error: error.message
    });
  }
};

const calculateMonthlySlab = async (req, res) => {
  try {
    const { userId, storeId, yyyymm } = req.body;
    const actorUserId = req.user.id;

    const result = await incentiveService.calculateMonthlySlab(userId, storeId, yyyymm);

    await incentiveService.logAuditEvent(
      actorUserId,
      'CALCULATE_SLAB',
      'MONTHLY_SLAB',
      `${userId}-${yyyymm}`,
      null,
      result
    );

    res.json({
      success: true,
      message: 'Monthly slab calculated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error calculating monthly slab', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to calculate monthly slab',
      error: error.message
    });
  }
};

const performQuarterlyEvaluation = async (req, res) => {
  try {
    const { userId, yyyymm } = req.body;
    const actorUserId = req.user.id;

    const result = await incentiveService.performQuarterlyEvaluation(userId, yyyymm);

    if (result) {
      await incentiveService.logAuditEvent(
        actorUserId,
        'QUARTERLY_EVAL',
        'QUARTERLY_EVALUATION',
        `${userId}-${yyyymm}`,
        null,
        result
      );
    }

    res.json({
      success: true,
      message: 'Quarterly evaluation completed',
      data: result
    });
  } catch (error) {
    logger.error('Error performing quarterly evaluation', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to perform quarterly evaluation',
      error: error.message
    });
  }
};

// Gamification Features
const executeSpinWheel = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const actorUserId = req.user.id;

    const result = await incentiveService.executeSpinWheel(userId, reason);

    await incentiveService.logAuditEvent(
      actorUserId,
      'SPIN_WHEEL',
      'SPIN_WHEEL',
      result.spin_id || 'unknown',
      null,
      result
    );

    res.json({
      success: true,
      message: 'Spin wheel executed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error executing spin wheel', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to execute spin wheel',
      error: error.message
    });
  }
};

const getSpinHistory = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const query = {};
    if (userId) query.user_id = userId;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const spins = await SpinWheelSpin.find(query)
      .populate('user_id', 'name email employee_id')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: spins
    });
  } catch (error) {
    logger.error('Error fetching spin history', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spin history',
      error: error.message
    });
  }
};

// Leaderboards
const getLeaderboard = async (req, res) => {
  try {
    const { scope, metric, level, period } = req.query;

    const leaderboard = await incentiveService.generateLeaderboard(scope, metric, level, period);

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    logger.error('Error generating leaderboard', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to generate leaderboard',
      error: error.message
    });
  }
};

// Payout Management
const getIncentivePayouts = async (req, res) => {
  try {
    const { userId, storeId, period, status, startDate, endDate } = req.query;

    const query = {};
    if (userId) query.user_id = userId;
    if (storeId) query.store_id = storeId;
    if (period) query.period = period;
    if (status) query.status = status;
    if (startDate && endDate) {
      query.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payouts = await IncentivePayout.find(query)
      .populate('user_id', 'name email employee_id')
      .populate('store_id', 'name code')
      .populate('approved_by', 'name email')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: payouts
    });
  } catch (error) {
    logger.error('Error fetching incentive payouts', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incentive payouts',
      error: error.message
    });
  }
};

const approvePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const payout = await IncentivePayout.findOne({ payout_id: payoutId });
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    const before = payout.toObject();
    payout.status = 'APPROVED';
    payout.approved_by = userId;
    payout.updated_at = new Date();
    if (notes) payout.breakdown.push({ rule_id: 'ADMIN', type: 'ADJUSTMENT', amount: 0, notes });

    await payout.save();
    await incentiveService.logAuditEvent(userId, 'APPROVE_PAYOUT', 'INCENTIVE_PAYOUT', payoutId, before, payout.toObject());

    res.json({
      success: true,
      message: 'Payout approved successfully',
      data: payout
    });
  } catch (error) {
    logger.error('Error approving payout', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to approve payout',
      error: error.message
    });
  }
};

const markPayoutPaid = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { exportRef } = req.body;
    const userId = req.user.id;

    const payout = await IncentivePayout.findOne({ payout_id: payoutId });
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    if (payout.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Payout must be approved before marking as paid'
      });
    }

    const before = payout.toObject();
    payout.status = 'PAID';
    payout.paid_at = new Date();
    if (exportRef) payout.export_ref = exportRef;

    await payout.save();
    await incentiveService.logAuditEvent(userId, 'MARK_PAID', 'INCENTIVE_PAYOUT', payoutId, before, payout.toObject());

    res.json({
      success: true,
      message: 'Payout marked as paid successfully',
      data: payout
    });
  } catch (error) {
    logger.error('Error marking payout as paid', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to mark payout as paid',
      error: error.message
    });
  }
};

// Team Management
const createTeam = async (req, res) => {
  try {
    const { name, storeId, regionId, members } = req.body;
    const userId = req.user.id;

    const teamId = `TEAM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const team = new TeamMembership({
      team_id: teamId,
      name,
      store_id: storeId,
      region_id: regionId,
      members: members.map(member => ({
        user_id: member.user_id,
        role: member.role || 'MEMBER'
      })),
      created_by: userId
    });

    await team.save();
    await incentiveService.logAuditEvent(userId, 'CREATE_TEAM', 'TEAM', teamId, null, team.toObject());

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team
    });
  } catch (error) {
    logger.error('Error creating team', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: error.message
    });
  }
};

const getTeams = async (req, res) => {
  try {
    const { storeId, regionId, isActive } = req.query;

    const query = {};
    if (storeId) query.store_id = storeId;
    if (regionId) query.region_id = regionId;
    if (isActive !== undefined) query.is_active = isActive === 'true';

    const teams = await TeamMembership.find(query)
      .populate('members.user_id', 'name email employee_id')
      .populate('store_id', 'name code')
      .populate('created_by', 'name email')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    logger.error('Error fetching teams', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teams',
      error: error.message
    });
  }
};

// Analytics and Reports
const getIncentiveAnalytics = async (req, res) => {
  try {
    const { period, storeId, userId } = req.query;

    // Get performance metrics
    const performanceQuery = {};
    if (storeId) performanceQuery.store_id = storeId;
    if (userId) performanceQuery.user_id = userId;

    const performance = await DailyPerformance.find(performanceQuery)
      .populate('user_id', 'name email employee_id')
      .populate('store_id', 'name code');

    // Calculate analytics
    const totalRewards = performance.reduce((sum, perf) => sum + (perf.computed?.daily_rewards_total || 0), 0);
    const totalCustomers = performance.reduce((sum, perf) => sum + perf.customer_count, 0);
    const totalRevenue = performance.reduce((sum, perf) => sum + perf.revenue_pre_tax, 0);
    const totalSpins = await SpinWheelSpin.countDocuments({ user_id: userId });

    const analytics = {
      total_rewards: totalRewards,
      total_customers: totalCustomers,
      total_revenue: totalRevenue,
      total_spins: totalSpins,
      avg_daily_reward: performance.length > 0 ? totalRewards / performance.length : 0,
      performance_breakdown: performance.map(perf => ({
        date: perf.date,
        user: perf.user_id,
        store: perf.store_id,
        customers: perf.customer_count,
        revenue: perf.revenue_pre_tax,
        rewards: perf.computed?.daily_rewards_total || 0
      }))
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching incentive analytics', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incentive analytics',
      error: error.message
    });
  }
};

module.exports = {
  // Rule Management
  createIncentiveRule,
  getIncentiveRules,
  updateIncentiveRule,

  // Performance Management
  recordDailyPerformance,
  getDailyPerformance,
  calculateMonthlySlab,
  performQuarterlyEvaluation,

  // Gamification
  executeSpinWheel,
  getSpinHistory,

  // Leaderboards
  getLeaderboard,

  // Payout Management
  getIncentivePayouts,
  approvePayout,
  markPayoutPaid,

  // Team Management
  createTeam,
  getTeams,

  // Analytics
  getIncentiveAnalytics
};
