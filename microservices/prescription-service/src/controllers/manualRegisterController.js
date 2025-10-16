const manualRegisterService = require('../services/manualRegisterService');
const logger = require('../config/logger');

class ManualRegisterController {
  // Manual Registration Management
  async getRegistrations(req, res) {
    try {
      const registrations = await manualRegisterService.getRegistrations(req.query);
      res.json({
        success: true,
        data: registrations
      });
    } catch (error) {
      logger.error('Error getting manual registrations', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createRegistration(req, res) {
    try {
      const registrationData = { ...req.body, created_by: req.user.userId };
      const registration = await manualRegisterService.createRegistration(registrationData);
      res.status(201).json({
        success: true,
        data: registration
      });
    } catch (error) {
      logger.error('Error creating manual registration', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getRegistration(req, res) {
    try {
      const { id } = req.params;
      const registration = await manualRegisterService.getRegistration(id);
      res.json({
        success: true,
        data: registration
      });
    } catch (error) {
      logger.error('Error getting manual registration', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateRegistration(req, res) {
    try {
      const { id } = req.params;
      const registration = await manualRegisterService.updateRegistration(id, req.body);
      res.json({
        success: true,
        data: registration
      });
    } catch (error) {
      logger.error('Error updating manual registration', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteRegistration(req, res) {
    try {
      const { id } = req.params;
      await manualRegisterService.deleteRegistration(id);
      res.json({
        success: true,
        message: 'Manual registration deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting manual registration', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Reports
  async getSummaryReport(req, res) {
    try {
      const report = await manualRegisterService.getSummaryReport(req.query);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error getting summary report', { error: error.message });
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new ManualRegisterController();
