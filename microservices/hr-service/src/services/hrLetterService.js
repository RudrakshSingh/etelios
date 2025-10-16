const Employee = require('../models/Employee.model');
const CompensationProfile = require('../models/CompensationProfile.model');
const HRLetter = require('../models/HRLetter.model');
const HRTemplate = require('../models/HRTemplate.model');
const ApprovalWorkflow = require('../models/ApprovalWorkflow.model');
const templateEngine = require('./templateEngine');
const logger = require('../config/logger');

class HRLetterService {
  constructor() {
    this.serialNumberCounter = new Map();
  }

  // Generate serial number
  generateSerialNumber(letterType, brand = 'LEN', year = new Date().getFullYear(), storeCode = 'IN-IND-114') {
    const prefix = `${brand}/${this.getLetterTypeCode(letterType)}/${year}/${storeCode}`;
    
    if (!this.serialNumberCounter.has(prefix)) {
      this.serialNumberCounter.set(prefix, 0);
    }
    
    const counter = this.serialNumberCounter.get(prefix) + 1;
    this.serialNumberCounter.set(prefix, counter);
    
    return `${prefix}/${counter.toString().padStart(5, '0')}`;
  }

  getLetterTypeCode(letterType) {
    const codes = {
      'OFFER': 'OFR',
      'APPOINTMENT': 'APT',
      'PROMOTION': 'PRM',
      'DEMOTION': 'DEM',
      'TRANSFER': 'TRF',
      'ROLE_CHANGE': 'RCH',
      'TERMINATION': 'TRM',
      'INTERNSHIP': 'INT'
    };
    return codes[letterType] || 'LTR';
  }

  // Create HR Letter
  async createLetter(letterData) {
    try {
      const {
        letterType,
        employeeId,
        language = 'en-IN',
        effectiveDate,
        templateId,
        overrides = {},
        annexures = [],
        createdBy
      } = letterData;

      // Get employee data
      const employee = await Employee.findOne({ employeeId });
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Get compensation profile
      const compensation = await CompensationProfile.findOne({ 
        employeeId, 
        status: 'ACTIVE' 
      });
      if (!compensation) {
        throw new Error('Active compensation profile not found');
      }

      // Get template
      const template = await HRTemplate.findOne({ 
        templateId,
        isActive: true 
      });
      if (!template) {
        throw new Error('Template not found or inactive');
      }

      // Generate serial number
      const serialNo = this.generateSerialNumber(
        letterType,
        overrides.brand || 'LEN',
        new Date().getFullYear(),
        employee.workLocation.storeId || 'IN-IND-114'
      );

      // Prepare data binding
      const dataBinding = await this.prepareDataBinding({
        employee,
        compensation,
        letterData,
        overrides
      });

      // Create letter document
      const letter = new HRLetter({
        letterId: `LET-${Date.now()}`,
        letterType,
        language,
        status: 'DRAFT',
        templateId,
        templateVersion: template.version,
        dataBinding,
        serialNo,
        issueDate: new Date(),
        effectiveDate: new Date(effectiveDate),
        reason: letterData.reason,
        newDesignation: letterData.newDesignation,
        newDepartment: letterData.newDepartment,
        newLocation: letterData.newLocation,
        annexures,
        created_by: createdBy
      });

      await letter.save();

      // Generate preview
      const previewUrl = await this.generatePreview(letter);

      return {
        letterId: letter.letterId,
        status: letter.status,
        previewUrl,
        serialNo: letter.serialNo
      };

    } catch (error) {
      logger.error('Error creating HR letter:', error);
      throw error;
    }
  }

  // Prepare data binding for template
  async prepareDataBinding({ employee, compensation, letterData, overrides }) {
    const company = {
      name: overrides.companyName || 'Lenstrack Smart HRMS',
      brand: overrides.brand || 'LEN',
      logoUrl: overrides.logoUrl || '',
      address: overrides.address || '123 Business Park, Mumbai, Maharashtra 400001',
      cin: overrides.cin || 'U74999MH2024PTC123456',
      gstin: overrides.gstin || '27ABCDE1234F1Z5',
      hrEmail: overrides.hrEmail || 'hr@lenstrack.com',
      hrPhone: overrides.hrPhone || '+91-9876543210',
      hrSignatory: {
        name: overrides.hrSignatoryName || 'HR Manager',
        title: overrides.hrSignatoryTitle || 'Human Resources Manager'
      }
    };

    const comp = {
      grossMonthly: compensation.grossMonthly,
      ctcAnnual: compensation.ctcAnnual,
      salarySystem: compensation.salarySystem,
      fixed: compensation.components.filter(c => c.type === 'FIXED'),
      variable: compensation.components.filter(c => c.type === 'VARIABLE'),
      statutory: compensation.components.filter(c => c.type === 'STATUTORY'),
      fixedTotal: compensation.components
        .filter(c => c.type === 'FIXED')
        .reduce((sum, c) => sum + (c.monthly || 0), 0),
      variableMaxPct: this.calculateVariablePercentage(compensation),
      statutory: {
        epfEnabled: compensation.statutory.epfEnabled,
        esiEligible: compensation.statutory.esiEligible,
        ptState: compensation.statutory.ptState
      }
    };

    const letter = {
      serialNo: this.generateSerialNumber(letterData.letterType),
      issueDate: new Date(),
      effectiveDate: new Date(letterData.effectiveDate),
      reason: letterData.reason,
      newDesignation: letterData.newDesignation,
      newDepartment: letterData.newDepartment,
      newLocation: letterData.newLocation,
      acceptBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };

    const links = {
      leavePolicyUrl: overrides.leavePolicyUrl || 'https://company.com/policies/leave',
      conductPolicyUrl: overrides.conductPolicyUrl || 'https://company.com/policies/conduct',
      poshPolicyUrl: overrides.poshPolicyUrl || 'https://company.com/policies/posh',
      confidentialityPolicyUrl: overrides.confidentialityPolicyUrl || 'https://company.com/policies/confidentiality'
    };

    const probation = {
      months: this.getProbationPeriod(employee.roleFamily)
    };

    return {
      company,
      employee: {
        fullName: employee.fullName,
        fatherName: employee.fatherName,
        code: employee.code,
        designation: employee.designation,
        department: employee.department,
        roleFamily: employee.roleFamily,
        gradeBand: employee.gradeBand,
        reportingManager: employee.reportingManager,
        workLocation: employee.workLocation,
        currentAddress: employee.currentAddress,
        doj: employee.doj,
        confirmationDate: employee.confirmationDate,
        uan: employee.uan,
        esiNo: employee.esiNo,
        email: employee.email,
        phone: employee.phone
      },
      comp,
      letter,
      links,
      probation,
      old: {
        designation: letterData.oldDesignation,
        department: letterData.oldDepartment,
        location: letterData.oldLocation
      },
      pip: letterData.pip || {},
      review: letterData.review || {},
      handover: letterData.handover || {},
      ff: letterData.ff || {}
    };
  }

  calculateVariablePercentage(compensation) {
    if (compensation.salarySystem === 'PERFORMANCE_DEBIT_CREDIT') {
      return 25; // 25% variable component
    }
    return 0;
  }

  getProbationPeriod(roleFamily) {
    const probationPeriods = {
      'Sales': 3,
      'Optometry': 6,
      'Tech': 3,
      'Finance': 3,
      'HR': 3,
      'Operations': 3,
      'Warehouse': 3,
      'Lab': 6,
      'Fitting': 3,
      'Delivery': 3
    };
    return probationPeriods[roleFamily] || 3;
  }

  // Generate preview
  async generatePreview(letter) {
    try {
      const template = await HRTemplate.findOne({ templateId: letter.templateId });
      if (!template) {
        throw new Error('Template not found');
      }

      const html = templateEngine.render(template.bodyHtml, letter.dataBinding);
      
      // Store preview URL (in real implementation, save to file storage)
      const previewUrl = `/api/hr/letters/${letter.letterId}/preview`;
      
      return previewUrl;
    } catch (error) {
      logger.error('Error generating preview:', error);
      throw error;
    }
  }

  // Update letter
  async updateLetter(letterId, updateData, userId) {
    try {
      const letter = await HRLetter.findOne({ letterId });
      if (!letter) {
        throw new Error('Letter not found');
      }

      if (letter.status !== 'DRAFT') {
        throw new Error('Only draft letters can be updated');
      }

      // Update letter data
      Object.assign(letter, updateData);
      letter.updated_at = new Date();

      // Add audit entry
      letter.audit.push({
        action: 'UPDATED',
        user: userId,
        timestamp: new Date(),
        changes: updateData
      });

      await letter.save();

      return letter;
    } catch (error) {
      logger.error('Error updating HR letter:', error);
      throw error;
    }
  }

  // Submit for approval
  async submitForApproval(letterId, userId) {
    try {
      const letter = await HRLetter.findOne({ letterId });
      if (!letter) {
        throw new Error('Letter not found');
      }

      if (letter.status !== 'DRAFT') {
        throw new Error('Only draft letters can be submitted');
      }

      // Get approval workflow
      const workflow = await ApprovalWorkflow.findOne({
        letterType: letter.letterType,
        isActive: true
      });

      if (!workflow) {
        throw new Error('Approval workflow not found');
      }

      // Initialize approval workflow
      letter.approvalWorkflow = {
        workflowId: workflow.workflowId,
        currentStep: 0,
        steps: workflow.steps.map(step => ({
          stepNumber: step.stepNumber,
          role: step.role,
          userId: step.userId,
          status: 'PENDING',
          slaHours: step.slaHours,
          escalated: false
        }))
      };

      letter.status = 'PENDING_APPROVAL';

      // Add audit entry
      letter.audit.push({
        action: 'SUBMITTED_FOR_APPROVAL',
        user: userId,
        timestamp: new Date()
      });

      await letter.save();

      return letter;
    } catch (error) {
      logger.error('Error submitting letter for approval:', error);
      throw error;
    }
  }

  // Approve letter
  async approveLetter(letterId, stepNumber, userId, comments = '') {
    try {
      const letter = await HRLetter.findOne({ letterId });
      if (!letter) {
        throw new Error('Letter not found');
      }

      if (letter.status !== 'PENDING_APPROVAL') {
        throw new Error('Letter is not pending approval');
      }

      const step = letter.approvalWorkflow.steps.find(s => s.stepNumber === stepNumber);
      if (!step) {
        throw new Error('Approval step not found');
      }

      if (step.status !== 'PENDING') {
        throw new Error('Step already processed');
      }

      // Update step
      step.status = 'APPROVED';
      step.approvedAt = new Date();
      step.approvedBy = userId;
      step.comments = comments;

      // Check if all steps are approved
      const allApproved = letter.approvalWorkflow.steps.every(s => s.status === 'APPROVED');
      if (allApproved) {
        letter.status = 'APPROVED';
      }

      // Add audit entry
      letter.audit.push({
        action: 'APPROVED',
        user: userId,
        timestamp: new Date(),
        changes: { stepNumber, comments }
      });

      await letter.save();

      return letter;
    } catch (error) {
      logger.error('Error approving letter:', error);
      throw error;
    }
  }

  // Reject letter
  async rejectLetter(letterId, stepNumber, userId, comments) {
    try {
      const letter = await HRLetter.findOne({ letterId });
      if (!letter) {
        throw new Error('Letter not found');
      }

      if (letter.status !== 'PENDING_APPROVAL') {
        throw new Error('Letter is not pending approval');
      }

      const step = letter.approvalWorkflow.steps.find(s => s.stepNumber === stepNumber);
      if (!step) {
        throw new Error('Approval step not found');
      }

      // Update step
      step.status = 'REJECTED';
      step.approvedAt = new Date();
      step.approvedBy = userId;
      step.comments = comments;

      // Reject the entire letter
      letter.status = 'DRAFT';

      // Add audit entry
      letter.audit.push({
        action: 'REJECTED',
        user: userId,
        timestamp: new Date(),
        changes: { stepNumber, comments }
      });

      await letter.save();

      return letter;
    } catch (error) {
      logger.error('Error rejecting letter:', error);
      throw error;
    }
  }

  // Get letters with filters
  async getLetters(filters = {}) {
    try {
      const query = {};

      if (filters.letterType) {
        query.letterType = filters.letterType;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.employeeId) {
        query['dataBinding.employee.employeeId'] = filters.employeeId;
      }

      if (filters.dateFrom) {
        query.issueDate = { $gte: new Date(filters.dateFrom) };
      }

      if (filters.dateTo) {
        query.issueDate = { ...query.issueDate, $lte: new Date(filters.dateTo) };
      }

      const letters = await HRLetter.find(query)
        .sort({ created_at: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);

      return letters;
    } catch (error) {
      logger.error('Error getting letters:', error);
      throw error;
    }
  }

  // Get letter by ID
  async getLetterById(letterId) {
    try {
      const letter = await HRLetter.findOne({ letterId });
      if (!letter) {
        throw new Error('Letter not found');
      }

      return letter;
    } catch (error) {
      logger.error('Error getting letter by ID:', error);
      throw error;
    }
  }

  // Compute compensation for employee
  async computeCompensation(employeeId, salarySystem) {
    try {
      const compensation = await CompensationProfile.findOne({
        employeeId,
        salarySystem,
        status: 'ACTIVE'
      });

      if (!compensation) {
        throw new Error('Compensation profile not found');
      }

      const fixedTotal = compensation.components
        .filter(c => c.type === 'FIXED')
        .reduce((sum, c) => sum + (c.monthly || 0), 0);

      const variableTotal = compensation.components
        .filter(c => c.type === 'VARIABLE')
        .reduce((sum, c) => sum + (c.monthly || 0), 0);

      const statutoryTotal = compensation.components
        .filter(c => c.type === 'STATUTORY')
        .reduce((sum, c) => sum + (c.monthly || 0), 0);

      return {
        grossMonthly: compensation.grossMonthly,
        ctcAnnual: compensation.ctcAnnual,
        fixedTotal,
        variableTotal,
        statutoryTotal,
        components: compensation.components,
        statutory: compensation.statutory
      };
    } catch (error) {
      logger.error('Error computing compensation:', error);
      throw error;
    }
  }
}

module.exports = new HRLetterService();
