const hrLetterService = require('../services/hrLetterService');
const logger = require('../config/logger');

class HRLetterController {
  // Create HR Letter
  async createLetter(req, res) {
    try {
      const {
        letterType,
        employeeId,
        language = 'en-IN',
        effectiveDate,
        templateId,
        overrides = {},
        annexures = []
      } = req.body;

      // Validation
      if (!letterType || !employeeId || !effectiveDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: letterType, employeeId, effectiveDate'
        });
      }

      const result = await hrLetterService.createLetter({
        letterType,
        employeeId,
        language,
        effectiveDate,
        templateId,
        overrides,
        annexures,
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'HR Letter created successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error creating HR letter:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get HR Letter by ID
  async getLetterById(req, res) {
    try {
      const { letterId } = req.params;

      const letter = await hrLetterService.getLetterById(letterId);

      res.status(200).json({
        success: true,
        data: letter
      });

    } catch (error) {
      logger.error('Error getting HR letter:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Update HR Letter
  async updateLetter(req, res) {
    try {
      const { letterId } = req.params;
      const updateData = req.body;

      const letter = await hrLetterService.updateLetter(letterId, updateData, req.user.id);

      res.status(200).json({
        success: true,
        message: 'HR Letter updated successfully',
        data: letter
      });

    } catch (error) {
      logger.error('Error updating HR letter:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Submit for approval
  async submitForApproval(req, res) {
    try {
      const { letterId } = req.params;

      const letter = await hrLetterService.submitForApproval(letterId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Letter submitted for approval',
        data: letter
      });

    } catch (error) {
      logger.error('Error submitting letter for approval:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Approve letter
  async approveLetter(req, res) {
    try {
      const { letterId } = req.params;
      const { stepNumber, comments } = req.body;

      if (!stepNumber) {
        return res.status(400).json({
          success: false,
          message: 'Step number is required'
        });
      }

      const letter = await hrLetterService.approveLetter(letterId, stepNumber, req.user.id, comments);

      res.status(200).json({
        success: true,
        message: 'Letter approved successfully',
        data: letter
      });

    } catch (error) {
      logger.error('Error approving letter:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Reject letter
  async rejectLetter(req, res) {
    try {
      const { letterId } = req.params;
      const { stepNumber, comments } = req.body;

      if (!stepNumber || !comments) {
        return res.status(400).json({
          success: false,
          message: 'Step number and comments are required'
        });
      }

      const letter = await hrLetterService.rejectLetter(letterId, stepNumber, req.user.id, comments);

      res.status(200).json({
        success: true,
        message: 'Letter rejected',
        data: letter
      });

    } catch (error) {
      logger.error('Error rejecting letter:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get letters with filters
  async getLetters(req, res) {
    try {
      const filters = {
        letterType: req.query.letterType,
        status: req.query.status,
        employeeId: req.query.employeeId,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0
      };

      const letters = await hrLetterService.getLetters(filters);

      res.status(200).json({
        success: true,
        data: letters,
        count: letters.length
      });

    } catch (error) {
      logger.error('Error getting letters:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Generate preview
  async generatePreview(req, res) {
    try {
      const { letterId } = req.params;

      const letter = await hrLetterService.getLetterById(letterId);
      const previewUrl = await hrLetterService.generatePreview(letter);

      res.status(200).json({
        success: true,
        data: { previewUrl }
      });

    } catch (error) {
      logger.error('Error generating preview:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Compute compensation
  async computeCompensation(req, res) {
    try {
      const { employeeId, salarySystem } = req.body;

      if (!employeeId || !salarySystem) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID and salary system are required'
        });
      }

      const compensation = await hrLetterService.computeCompensation(employeeId, salarySystem);

      res.status(200).json({
        success: true,
        data: compensation
      });

    } catch (error) {
      logger.error('Error computing compensation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get letter statistics
  async getLetterStats(req, res) {
    try {
      const HRLetter = require('../models/HRLetter.model');
      
      const stats = await HRLetter.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const letterTypeStats = await HRLetter.aggregate([
        {
          $group: {
            _id: '$letterType',
            count: { $sum: 1 }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: {
          statusStats: stats,
          letterTypeStats: letterTypeStats
        }
      });

    } catch (error) {
      logger.error('Error getting letter stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new HRLetterController();
