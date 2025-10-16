const ManualRegistration = require('../models/ManualRegistration.model');
const logger = require('../config/logger');

class ManualRegisterService {
  // Manual Registration Management
  async getRegistrations(query = {}) {
    try {
      const { page = 1, limit = 10, search, status, type } = query;
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { registration_number: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        filter.status = status;
      }
      
      if (type) {
        filter.type = type;
      }
      
      const registrations = await ManualRegistration.find(filter)
        .populate('created_by', 'name email')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await ManualRegistration.countDocuments(filter);
      
      return {
        registrations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      };
    } catch (error) {
      logger.error('Error getting manual registrations', { error: error.message });
      throw error;
    }
  }

  async createRegistration(registrationData) {
    try {
      const registration = new ManualRegistration(registrationData);
      await registration.save();
      return await ManualRegistration.findById(registration._id)
        .populate('created_by', 'name email');
    } catch (error) {
      logger.error('Error creating manual registration', { error: error.message });
      throw error;
    }
  }

  async getRegistration(registrationId) {
    try {
      const registration = await ManualRegistration.findById(registrationId)
        .populate('created_by', 'name email');
      
      if (!registration) {
        throw new Error('Manual registration not found');
      }
      
      return registration;
    } catch (error) {
      logger.error('Error getting manual registration', { error: error.message });
      throw error;
    }
  }

  async updateRegistration(registrationId, updateData) {
    try {
      const registration = await ManualRegistration.findByIdAndUpdate(
        registrationId,
        updateData,
        { new: true }
      ).populate('created_by', 'name email');
      
      if (!registration) {
        throw new Error('Manual registration not found');
      }
      
      return registration;
    } catch (error) {
      logger.error('Error updating manual registration', { error: error.message });
      throw error;
    }
  }

  async deleteRegistration(registrationId) {
    try {
      const registration = await ManualRegistration.findByIdAndDelete(registrationId);
      if (!registration) {
        throw new Error('Manual registration not found');
      }
      return registration;
    } catch (error) {
      logger.error('Error deleting manual registration', { error: error.message });
      throw error;
    }
  }

  // Reports
  async getSummaryReport(query = {}) {
    try {
      const { from_date, to_date, type, status } = query;
      const filter = {};
      
      if (from_date && to_date) {
        filter.created_at = {
          $gte: new Date(from_date),
          $lte: new Date(to_date)
        };
      }
      
      if (type) {
        filter.type = type;
      }
      
      if (status) {
        filter.status = status;
      }
      
      const registrations = await ManualRegistration.find(filter)
        .populate('created_by', 'name email')
        .sort({ created_at: -1 });
      
      const totalRegistrations = registrations.length;
      const pendingRegistrations = registrations.filter(r => r.status === 'pending').length;
      const approvedRegistrations = registrations.filter(r => r.status === 'approved').length;
      const rejectedRegistrations = registrations.filter(r => r.status === 'rejected').length;
      
      const registrationsByType = registrations.reduce((acc, reg) => {
        acc[reg.type] = (acc[reg.type] || 0) + 1;
        return acc;
      }, {});
      
      const registrationsByStatus = registrations.reduce((acc, reg) => {
        acc[reg.status] = (acc[reg.status] || 0) + 1;
        return acc;
      }, {});
      
      return {
        registrations,
        summary: {
          totalRegistrations,
          pendingRegistrations,
          approvedRegistrations,
          rejectedRegistrations,
          approvalRate: totalRegistrations > 0 ? (approvedRegistrations / totalRegistrations * 100).toFixed(2) : 0,
          registrationsByType,
          registrationsByStatus
        }
      };
    } catch (error) {
      logger.error('Error getting summary report', { error: error.message });
      throw error;
    }
  }
}

module.exports = new ManualRegisterService();
