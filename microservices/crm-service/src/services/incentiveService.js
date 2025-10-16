const mongoose = require('mongoose');
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
  BattleScore,
  AuditLog
} = require('../models/Performance.model');
const TeamMembership = require('../models/TeamMembership.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');

class IncentiveService {
  constructor() {
    this.calculationCache = new Map();
  }

  // Daily Performance Calculation
  async calculateDailyPerformance(userId, storeId, date, performanceData) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Validate minimum bills requirement
      if (performanceData.paid_bills_count < 2) {
        throw new Error('Minimum 2 valid bills required per user per day');
      }

      // Calculate daily customer count incentive
      const customerCountReward = await this.calculateCustomerCountReward(
        storeId, 
        performanceData.customer_count, 
        performanceData.store_type
      );

      // Calculate product incentives
      const productRewards = await this.calculateProductIncentives(
        performanceData.sku_counts, 
        performanceData.product_revenue
      );

      // Calculate tele-sales incentives
      const teleSalesReward = await this.calculateTeleSalesIncentives(
        performanceData.tele
      );

      // Check spin wheel eligibility
      const eligibleForSpin = await this.checkSpinEligibility(
        userId, 
        performanceData.customer_count, 
        performanceData.revenue_pre_tax
      );

      const totalRewards = customerCountReward + productRewards + teleSalesReward;

      // Create or update daily performance
      const dailyPerf = await DailyPerformance.findOneAndUpdate(
        { date: startOfDay, user_id: userId },
        {
          $set: {
            store_id: storeId,
            customer_count: performanceData.customer_count,
            paid_bills_count: performanceData.paid_bills_count,
            revenue_pre_tax: performanceData.revenue_pre_tax,
            items_sold: performanceData.items_sold,
            sku_counts: performanceData.sku_counts,
            product_revenue: performanceData.product_revenue,
            tele: performanceData.tele,
            computed: {
              daily_rewards_total: totalRewards,
              eligible_for_spin: eligibleForSpin
            }
          }
        },
        { upsert: true, new: true }
      );

      // Create daily payout
      await this.createIncentivePayout({
        userId,
        storeId,
        period: 'DAILY',
        amount: totalRewards,
        breakdown: [
          { rule_id: 'DAILY_CUSTOMER', type: 'DAILY_CUSTOMER', amount: customerCountReward },
          { rule_id: 'PRODUCT', type: 'PRODUCT', amount: productRewards },
          { rule_id: 'TELE', type: 'TELE', amount: teleSalesReward }
        ]
      });

      return dailyPerf;
    } catch (error) {
      logger.error('Error calculating daily performance', { error: error.message, userId, storeId, date });
      throw error;
    }
  }

  // Monthly Slab Calculation
  async calculateMonthlySlab(userId, storeId, yyyymm) {
    try {
      const monthlyPerf = await MonthlyPerformance.findOne({ yyyymm, user_id: userId });
      if (!monthlyPerf) {
        throw new Error('Monthly performance not found');
      }

      const activeSlabRule = await MonthlySlabRule.findOne({
        is_active: true,
        effective_from: { $lte: new Date() },
        $or: [{ effective_to: null }, { effective_to: { $gte: new Date() } }]
      });

      if (!activeSlabRule) {
        throw new Error('No active monthly slab rule found');
      }

      // Find applicable slab
      let applicableSlab = null;
      for (const slab of activeSlabRule.slabs) {
        if (monthlyPerf.total_revenue_pre_tax >= slab.min_sales && 
            (!slab.max_sales || monthlyPerf.total_revenue_pre_tax <= slab.max_sales)) {
          applicableSlab = slab;
          break;
        }
      }

      if (!applicableSlab) {
        throw new Error('No applicable slab found for revenue');
      }

      const slabIncentive = applicableSlab.incentive_amount;
      const salaryAdjustment = applicableSlab.base_salary_adj;

      // Apply under-performance deduction if applicable
      let deduction = 0;
      if (activeSlabRule.under_performance_deduction && 
          monthlyPerf.total_revenue_pre_tax < activeSlabRule.under_performance_deduction.threshold) {
        if (activeSlabRule.under_performance_deduction.is_percentage) {
          deduction = (monthlyPerf.total_revenue_pre_tax * activeSlabRule.under_performance_deduction.amount_or_pct) / 100;
        } else {
          deduction = activeSlabRule.under_performance_deduction.amount_or_pct;
        }
      }

      const netIncentive = Math.max(0, slabIncentive - deduction);

      // Update monthly performance
      monthlyPerf.slabs_applied.push({
        rule_id: activeSlabRule.rule_id,
        slab_index: activeSlabRule.slabs.indexOf(applicableSlab),
        incentive_amount: netIncentive
      });
      monthlyPerf.monthly_rewards_total += netIncentive;
      await monthlyPerf.save();

      // Create monthly payout
      await this.createIncentivePayout({
        userId,
        storeId,
        period: 'MONTHLY',
        amount: netIncentive,
        breakdown: [
          { 
            rule_id: activeSlabRule.rule_id, 
            type: 'SLAB', 
            amount: netIncentive,
            notes: `Slab ${applicableSlab.min_sales}-${applicableSlab.max_sales || '∞'}`
          }
        ]
      });

      return {
        slab: applicableSlab,
        incentive: netIncentive,
        salaryAdjustment,
        deduction
      };
    } catch (error) {
      logger.error('Error calculating monthly slab', { error: error.message, userId, yyyymm });
      throw error;
    }
  }

  // Quarterly Evaluation
  async performQuarterlyEvaluation(userId, yyyymm) {
    try {
      const activeEvalRule = await QuarterlyEvalRule.findOne({
        is_active: true,
        effective_from: { $lte: new Date() },
        $or: [{ effective_to: null }, { effective_to: { $gte: new Date() } }]
      });

      if (!activeEvalRule) {
        return null;
      }

      // Get last 3 months performance
      const currentDate = new Date(yyyymm + '-01');
      const threeMonthsAgo = new Date(currentDate);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const monthlyPerfs = await MonthlyPerformance.find({
        user_id: userId,
        yyyymm: {
          $gte: threeMonthsAgo.toISOString().slice(0, 7),
          $lt: currentDate.toISOString().slice(0, 7)
        }
      });

      if (monthlyPerfs.length < activeEvalRule.eval_window_months) {
        return null;
      }

      // Check if under performance threshold
      const avgRevenue = monthlyPerfs.reduce((sum, perf) => sum + perf.total_revenue_pre_tax, 0) / monthlyPerfs.length;
      const underPerformanceMonths = monthlyPerfs.filter(perf => 
        perf.total_revenue_pre_tax < activeEvalRule.non_performance_threshold.min_sales
      ).length;

      if (underPerformanceMonths >= activeEvalRule.non_performance_threshold.months_required) {
        // Create evaluation flag
        await this.createIncentivePayout({
          userId,
          storeId: monthlyPerfs[0].store_id,
          period: 'QUARTERLY',
          amount: 0,
          breakdown: [
            { 
              rule_id: activeEvalRule.rule_id, 
              type: 'ADJUSTMENT', 
              amount: 0,
              notes: `Quarterly evaluation: ${activeEvalRule.consequence}`
            }
          ]
        });

        return {
          consequence: activeEvalRule.consequence,
          avgRevenue,
          underPerformanceMonths,
          recoveryPolicy: activeEvalRule.recovery_policy
        };
      }

      return null;
    } catch (error) {
      logger.error('Error performing quarterly evaluation', { error: error.message, userId, yyyymm });
      throw error;
    }
  }

  // Customer Count Reward Calculation
  async calculateCustomerCountReward(storeId, customerCount, storeType) {
    try {
      const activeRule = await DailyTargetRule.findOne({
        is_active: true,
        target_type: 'CUSTOMER_COUNT',
        effective_from: { $lte: new Date() },
        $or: [{ effective_to: null }, { effective_to: { $gte: new Date() } }]
      });

      if (!activeRule) {
        return 0;
      }

      // Find store type override
      const storeOverride = activeRule.store_type_overrides.find(
        override => override.store_type === storeType
      );

      if (!storeOverride) {
        return 0;
      }

      // Find applicable tier
      let reward = 0;
      for (const tier of storeOverride.tiers) {
        if (customerCount >= tier.min && (!tier.max || customerCount <= tier.max)) {
          reward = tier.reward;
          break;
        }
      }

      return reward;
    } catch (error) {
      logger.error('Error calculating customer count reward', { error: error.message, storeId, customerCount });
      return 0;
    }
  }

  // Product Incentive Calculation
  async calculateProductIncentives(skuCounts, productRevenue) {
    try {
      const activeRules = await ProductIncentiveRule.find({
        is_active: true,
        effective_from: { $lte: new Date() },
        $or: [{ effective_to: null }, { effective_to: { $gte: new Date() } }]
      });

      let totalReward = 0;

      for (const rule of activeRules) {
        for (const line of rule.lines) {
          let reward = 0;
          let quantity = 0;

          // Find matching SKUs
          for (const [sku, count] of skuCounts) {
            if (this.matchesProductLine(sku, line)) {
              quantity += count;
            }
          }

          if (quantity > 0) {
            if (line.reward_type === 'FLAT') {
              reward = line.reward_value * quantity;
            } else if (line.reward_type === 'PCT') {
              const revenue = productRevenue.get(sku) || 0;
              reward = (revenue * line.reward_value) / 100;
            }

            // Apply caps
            if (line.caps?.per_day) {
              reward = Math.min(reward, line.caps.per_day);
            }
            if (line.caps?.per_month) {
              reward = Math.min(reward, line.caps.per_month);
            }

            totalReward += reward;
          }
        }
      }

      return totalReward;
    } catch (error) {
      logger.error('Error calculating product incentives', { error: error.message });
      return 0;
    }
  }

  // Tele-sales Incentive Calculation
  async calculateTeleSalesIncentives(teleData) {
    try {
      const activeRule = await TeleSalesRule.findOne({
        is_active: true,
        effective_from: { $lte: new Date() },
        $or: [{ effective_to: null }, { effective_to: { $gte: new Date() } }]
      });

      if (!activeRule) {
        return 0;
      }

      let reward = 0;

      // Dial reward
      if (teleData.dials >= activeRule.dial_target_per_day) {
        reward += activeRule.dial_reward;
      }

      // Booking reward
      reward += teleData.bookings * activeRule.booking_reward;

      // QA score weighting
      if (activeRule.quality_score_weight > 0 && teleData.qa_score > 0) {
        const qaBonus = (teleData.qa_score / 100) * activeRule.quality_score_weight * activeRule.dial_reward;
        reward += qaBonus;
      }

      return reward;
    } catch (error) {
      logger.error('Error calculating tele-sales incentives', { error: error.message });
      return 0;
    }
  }

  // Spin Wheel Logic
  async executeSpinWheel(userId, reason = 'MANUAL') {
    try {
      const activeRule = await SpinWheelRule.findOne({
        is_active: true,
        effective_from: { $lte: new Date() },
        $or: [{ effective_to: null }, { effective_to: { $gte: new Date() } }]
      });

      if (!activeRule) {
        throw new Error('No active spin wheel rule found');
      }

      // Check daily and monthly caps
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaySpins = await SpinWheelSpin.countDocuments({
        user_id: userId,
        date: { $gte: today, $lt: tomorrow }
      });

      if (todaySpins >= activeRule.daily_spin_cap) {
        throw new Error('Daily spin limit reached');
      }

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const nextMonth = new Date(thisMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const monthlySpins = await SpinWheelSpin.countDocuments({
        user_id: userId,
        date: { $gte: thisMonth, $lt: nextMonth }
      });

      if (monthlySpins >= activeRule.monthly_spin_cap) {
        throw new Error('Monthly spin limit reached');
      }

      // Execute spin
      const result = this.executeSpin(activeRule.rewards);
      
      const spinId = `SPIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const spin = new SpinWheelSpin({
        spin_id: spinId,
        user_id: userId,
        date: new Date(),
        unlocked_by: reason,
        result
      });

      await spin.save();

      // Create payout for spin reward
      if (result.value > 0) {
        await this.createIncentivePayout({
          userId,
          storeId: null, // Will be determined from user
          period: 'DAILY',
          amount: result.value,
          breakdown: [
            { 
              rule_id: activeRule.rule_id, 
              type: 'SPIN', 
              amount: result.value,
              notes: `Spin wheel: ${result.label}`
            }
          ]
        });
      }

      return result;
    } catch (error) {
      logger.error('Error executing spin wheel', { error: error.message, userId });
      throw error;
    }
  }

  // Helper Methods
  async checkSpinEligibility(userId, customerCount, revenue) {
    try {
      const activeRule = await SpinWheelRule.findOne({
        is_active: true,
        effective_from: { $lte: new Date() },
        $or: [{ effective_to: null }, { effective_to: { $gte: new Date() } }]
      });

      if (!activeRule) {
        return false;
      }

      // Check unlock conditions
      if (activeRule.unlock_condition === 'DAILY_TARGET_MET') {
        // Check if daily target is met (this would need to be implemented based on specific targets)
        return customerCount >= 15; // Example threshold
      }

      return false;
    } catch (error) {
      logger.error('Error checking spin eligibility', { error: error.message, userId });
      return false;
    }
  }

  matchesProductLine(sku, line) {
    if (line.sku && sku !== line.sku) return false;
    if (line.brand && !sku.includes(line.brand)) return false;
    if (line.category && !sku.includes(line.category)) return false;
    return true;
  }

  executeSpin(rewards) {
    const random = Math.random();
    let cumulative = 0;

    for (const reward of rewards) {
      cumulative += reward.probability;
      if (random <= cumulative) {
        return {
          reward_type: reward.type,
          value: reward.value,
          label: reward.label
        };
      }
    }

    // Fallback to first reward if probabilities don't add up to 1
    return {
      reward_type: rewards[0].type,
      value: rewards[0].value,
      label: rewards[0].label
    };
  }

  async createIncentivePayout({ userId, storeId, period, amount, breakdown, ruleRefs = [] }) {
    try {
      const payoutId = `PAY-${period}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      const payout = new IncentivePayout({
        payout_id: payoutId,
        period,
        user_id: userId,
        store_id: storeId,
        rule_refs: ruleRefs,
        amount,
        breakdown,
        status: 'DUE'
      });

      await payout.save();
      return payout;
    } catch (error) {
      logger.error('Error creating incentive payout', { error: error.message, userId, period });
      throw error;
    }
  }

  // Leaderboard Generation
  async generateLeaderboard(scope, metric, level, period) {
    try {
      const matchStage = {
        $match: {
          date: this.getDateRange(period)
        }
      };

      if (level && level !== 'ALL') {
        matchStage.$match['user.level'] = level;
      }

      const groupStage = {
        $group: {
          _id: this.getGroupByField(scope),
          total: { $sum: this.getMetricField(metric) },
          user_count: { $addToSet: '$user_id' }
        }
      };

      const pipeline = [
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        matchStage,
        groupStage,
        { $sort: { total: -1 } },
        { $limit: 100 }
      ];

      const results = await DailyPerformance.aggregate(pipeline);
      
      return results.map((result, index) => ({
        rank: index + 1,
        entity_id: result._id,
        metric_value: result.total,
        user_count: result.user_count.length
      }));
    } catch (error) {
      logger.error('Error generating leaderboard', { error: error.message, scope, metric, level, period });
      throw error;
    }
  }

  getDateRange(period) {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'DAILY':
        start.setHours(0, 0, 0, 0);
        return { $gte: start, $lt: now };
      case 'WEEKLY':
        start.setDate(start.getDate() - 7);
        return { $gte: start, $lt: now };
      case 'MONTHLY':
        start.setMonth(start.getMonth() - 1);
        return { $gte: start, $lt: now };
      default:
        return { $gte: start, $lt: now };
    }
  }

  getGroupByField(scope) {
    switch (scope) {
      case 'STORE':
        return '$store_id';
      case 'CITY':
        return '$user.city';
      case 'STATE':
        return '$user.state';
      case 'COUNTRY':
        return '$user.country';
      default:
        return '$user_id';
    }
  }

  getMetricField(metric) {
    switch (metric) {
      case 'CUSTOMER_COUNT':
        return '$customer_count';
      case 'REVENUE':
        return '$revenue_pre_tax';
      case 'PRODUCT_UNITS':
        return '$items_sold';
      default:
        return '$customer_count';
    }
  }

  // Audit Logging
  async logAuditEvent(actorUserId, action, entity, entityId, before, after) {
    try {
      const auditLog = new AuditLog({
        actor_user_id: actorUserId,
        action,
        entity,
        entity_id: entityId,
        before,
        after
      });

      await auditLog.save();
    } catch (error) {
      logger.error('Error logging audit event', { error: error.message });
    }
  }
}

module.exports = new IncentiveService();
