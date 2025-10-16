const Salary = require('../models/Salary.model');
const User = require('../models/User.model');
const logger = require('../config/logger');

// Calculate salary for an employee
const calculateSalary = async (req, res) => {
  try {
    const { employee_id, gross_monthly, variable_incentive = 0, professional_tax = 0, tds = 0 } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!employee_id || !gross_monthly) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and gross monthly salary are required'
      });
    }

    if (gross_monthly <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Gross monthly salary must be greater than 0'
      });
    }

    // Check if employee exists
    const employee = await User.findOne({ employee_id: employee_id.toUpperCase() });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Calculate salary components
    const salaryData = Salary.calculateSalary(gross_monthly, variable_incentive, professional_tax, tds);

    // Create salary record
    const salary = new Salary({
      employee_id: employee_id.toUpperCase(),
      gross_monthly,
      variable_incentive,
      professional_tax,
      tds,
      ...salaryData,
      created_by: userId
    });

    await salary.save();

    logger.info('Salary calculated successfully', {
      employee_id: employee_id.toUpperCase(),
      gross_monthly,
      monthly_ctc: salaryData.monthly_ctc,
      annual_ctc: salaryData.annual_ctc
    });

    res.status(201).json({
      success: true,
      message: 'Salary calculated successfully',
      data: {
        employee_id: salary.employee_id,
        employee_name: employee.name,
        gross_monthly: salary.gross_monthly,
        variable_incentive: salary.variable_incentive,
        basic_salary: salary.basic_salary,
        hra: salary.hra,
        special_allowance: salary.special_allowance,
        total_earnings: salary.total_earnings,
        epf_employee: salary.epf_employee,
        esic_employee: salary.esic_employee,
        professional_tax: salary.professional_tax,
        tds: salary.tds,
        total_deductions: salary.total_deductions,
        net_take_home: salary.net_take_home,
        epf_employer: salary.epf_employer,
        esic_employer: salary.esic_employer,
        gratuity: salary.gratuity,
        employer_contributions: salary.employer_contributions,
        monthly_ctc: salary.monthly_ctc,
        annual_ctc: salary.annual_ctc,
        effective_date: salary.effective_date
      }
    });

  } catch (error) {
    logger.error('Error calculating salary', { error: error.message, employee_id: req.body.employee_id });
    res.status(500).json({
      success: false,
      message: 'Error calculating salary',
      error: error.message
    });
  }
};

// Get current salary for an employee
const getCurrentSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.id;

    // Check if user is requesting their own salary or has permission
    const requestingUser = await User.findById(userId);
    if (requestingUser.employee_id !== employeeId.toUpperCase() && 
        !['admin', 'superadmin', 'hr'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }

    const salary = await Salary.getCurrentSalary(employeeId.toUpperCase());
    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'No salary record found for this employee'
      });
    }

    // Get employee details
    const employee = await User.findOne({ employee_id: employeeId.toUpperCase() });

    res.status(200).json({
      success: true,
      data: {
        employee_id: salary.employee_id,
        employee_name: employee?.name || 'Unknown',
        gross_monthly: salary.gross_monthly,
        variable_incentive: salary.variable_incentive,
        basic_salary: salary.basic_salary,
        hra: salary.hra,
        special_allowance: salary.special_allowance,
        total_earnings: salary.total_earnings,
        epf_employee: salary.epf_employee,
        esic_employee: salary.esic_employee,
        professional_tax: salary.professional_tax,
        tds: salary.tds,
        total_deductions: salary.total_deductions,
        net_take_home: salary.net_take_home,
        epf_employer: salary.epf_employer,
        esic_employer: salary.esic_employer,
        gratuity: salary.gratuity,
        employer_contributions: salary.employer_contributions,
        monthly_ctc: salary.monthly_ctc,
        annual_ctc: salary.annual_ctc,
        effective_date: salary.effective_date,
        is_active: salary.is_active
      }
    });

  } catch (error) {
    logger.error('Error getting current salary', { error: error.message, employeeId: req.params.employeeId });
    res.status(500).json({
      success: false,
      message: 'Error getting current salary',
      error: error.message
    });
  }
};

// Get salary history for an employee
const getSalaryHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 12 } = req.query;
    const userId = req.user.id;

    // Check if user is requesting their own salary or has permission
    const requestingUser = await User.findById(userId);
    if (requestingUser.employee_id !== employeeId.toUpperCase() && 
        !['admin', 'superadmin', 'hr'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }

    const salaryHistory = await Salary.getSalaryHistory(employeeId.toUpperCase(), parseInt(limit));

    res.status(200).json({
      success: true,
      data: salaryHistory.map(salary => ({
        id: salary._id,
        employee_id: salary.employee_id,
        gross_monthly: salary.gross_monthly,
        variable_incentive: salary.variable_incentive,
        basic_salary: salary.basic_salary,
        hra: salary.hra,
        special_allowance: salary.special_allowance,
        total_earnings: salary.total_earnings,
        epf_employee: salary.epf_employee,
        esic_employee: salary.esic_employee,
        professional_tax: salary.professional_tax,
        tds: salary.tds,
        total_deductions: salary.total_deductions,
        net_take_home: salary.net_take_home,
        epf_employer: salary.epf_employer,
        esic_employer: salary.esic_employer,
        gratuity: salary.gratuity,
        employer_contributions: salary.employer_contributions,
        monthly_ctc: salary.monthly_ctc,
        annual_ctc: salary.annual_ctc,
        effective_date: salary.effective_date,
        is_active: salary.is_active,
        created_at: salary.createdAt,
        updated_at: salary.updatedAt
      }))
    });

  } catch (error) {
    logger.error('Error getting salary history', { error: error.message, employeeId: req.params.employeeId });
    res.status(500).json({
      success: false,
      message: 'Error getting salary history',
      error: error.message
    });
  }
};

// Update salary for an employee
const updateSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { gross_monthly, variable_incentive, professional_tax, tds } = req.body;
    const userId = req.user.id;

    // Check permissions
    const requestingUser = await User.findById(userId);
    if (!['admin', 'superadmin', 'hr'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }

    // Deactivate current salary
    await Salary.updateMany(
      { employee_id: employeeId.toUpperCase(), is_active: true },
      { is_active: false, updated_by: userId }
    );

    // Calculate new salary
    const salaryData = Salary.calculateSalary(gross_monthly, variable_incentive, professional_tax, tds);

    // Create new salary record
    const newSalary = new Salary({
      employee_id: employeeId.toUpperCase(),
      gross_monthly,
      variable_incentive: variable_incentive || 0,
      professional_tax: professional_tax || 0,
      tds: tds || 0,
      ...salaryData,
      created_by: userId
    });

    await newSalary.save();

    logger.info('Salary updated successfully', {
      employee_id: employeeId.toUpperCase(),
      gross_monthly,
      monthly_ctc: salaryData.monthly_ctc,
      annual_ctc: salaryData.annual_ctc
    });

    res.status(200).json({
      success: true,
      message: 'Salary updated successfully',
      data: {
        employee_id: newSalary.employee_id,
        gross_monthly: newSalary.gross_monthly,
        variable_incentive: newSalary.variable_incentive,
        basic_salary: newSalary.basic_salary,
        hra: newSalary.hra,
        special_allowance: newSalary.special_allowance,
        total_earnings: newSalary.total_earnings,
        epf_employee: newSalary.epf_employee,
        esic_employee: newSalary.esic_employee,
        professional_tax: newSalary.professional_tax,
        tds: newSalary.tds,
        total_deductions: newSalary.total_deductions,
        net_take_home: newSalary.net_take_home,
        epf_employer: newSalary.epf_employer,
        esic_employer: newSalary.esic_employer,
        gratuity: newSalary.gratuity,
        employer_contributions: newSalary.employer_contributions,
        monthly_ctc: newSalary.monthly_ctc,
        annual_ctc: newSalary.annual_ctc,
        effective_date: newSalary.effective_date
      }
    });

  } catch (error) {
    logger.error('Error updating salary', { error: error.message, employeeId: req.params.employeeId });
    res.status(500).json({
      success: false,
      message: 'Error updating salary',
      error: error.message
    });
  }
};

// Get payroll summary for all employees
const getPayrollSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const userId = req.user.id;

    // Check permissions
    const requestingUser = await User.findById(userId);
    if (!['admin', 'superadmin', 'hr'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }

    // Build date filter
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter.effective_date = { $gte: startDate, $lte: endDate };
    }

    // Get all active salaries
    const salaries = await Salary.find({ 
      is_active: true, 
      ...dateFilter 
    }).populate('employee_id', 'name employee_id department');

    // Calculate totals
    const totals = salaries.reduce((acc, salary) => {
      acc.total_gross += salary.gross_monthly;
      acc.total_variable_incentive += salary.variable_incentive;
      acc.total_basic += salary.basic_salary;
      acc.total_hra += salary.hra;
      acc.total_special_allowance += salary.special_allowance;
      acc.total_epf_employee += salary.epf_employee;
      acc.total_esic_employee += salary.esic_employee;
      acc.total_professional_tax += salary.professional_tax;
      acc.total_tds += salary.tds;
      acc.total_deductions += salary.total_deductions;
      acc.total_net_take_home += salary.net_take_home;
      acc.total_epf_employer += salary.epf_employer;
      acc.total_esic_employer += salary.esic_employer;
      acc.total_gratuity += salary.gratuity;
      acc.total_employer_contributions += salary.employer_contributions;
      acc.total_monthly_ctc += salary.monthly_ctc;
      acc.total_annual_ctc += salary.annual_ctc;
      return acc;
    }, {
      total_gross: 0,
      total_variable_incentive: 0,
      total_basic: 0,
      total_hra: 0,
      total_special_allowance: 0,
      total_epf_employee: 0,
      total_esic_employee: 0,
      total_professional_tax: 0,
      total_tds: 0,
      total_deductions: 0,
      total_net_take_home: 0,
      total_epf_employer: 0,
      total_esic_employer: 0,
      total_gratuity: 0,
      total_employer_contributions: 0,
      total_monthly_ctc: 0,
      total_annual_ctc: 0
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total_employees: salaries.length,
          ...totals
        },
        employees: salaries.map(salary => ({
          employee_id: salary.employee_id,
          employee_name: salary.employee_id?.name || 'Unknown',
          department: salary.employee_id?.department || 'Unknown',
          gross_monthly: salary.gross_monthly,
          variable_incentive: salary.variable_incentive,
          basic_salary: salary.basic_salary,
          hra: salary.hra,
          special_allowance: salary.special_allowance,
          total_earnings: salary.total_earnings,
          epf_employee: salary.epf_employee,
          esic_employee: salary.esic_employee,
          professional_tax: salary.professional_tax,
          tds: salary.tds,
          total_deductions: salary.total_deductions,
          net_take_home: salary.net_take_home,
          epf_employer: salary.epf_employer,
          esic_employer: salary.esic_employer,
          gratuity: salary.gratuity,
          employer_contributions: salary.employer_contributions,
          monthly_ctc: salary.monthly_ctc,
          annual_ctc: salary.annual_ctc,
          effective_date: salary.effective_date
        }))
      }
    });

  } catch (error) {
    logger.error('Error getting payroll summary', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error getting payroll summary',
      error: error.message
    });
  }
};

// Bulk calculate salaries for multiple employees
const bulkCalculateSalaries = async (req, res) => {
  try {
    const { employees } = req.body;
    const userId = req.user.id;

    // Check permissions
    const requestingUser = await User.findById(userId);
    if (!['admin', 'superadmin', 'hr'].includes(requestingUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Employees array is required and must not be empty'
      });
    }

    const results = [];
    const errors = [];

    for (const employee of employees) {
      try {
        const { employee_id, gross_monthly, variable_incentive = 0, professional_tax = 0, tds = 0 } = employee;

        if (!employee_id || !gross_monthly) {
          errors.push({
            employee_id: employee_id || 'Unknown',
            error: 'Employee ID and gross monthly salary are required'
          });
          continue;
        }

        // Check if employee exists
        const user = await User.findOne({ employee_id: employee_id.toUpperCase() });
        if (!user) {
          errors.push({
            employee_id: employee_id.toUpperCase(),
            error: 'Employee not found'
          });
          continue;
        }

        // Deactivate current salary if exists
        await Salary.updateMany(
          { employee_id: employee_id.toUpperCase(), is_active: true },
          { is_active: false, updated_by: userId }
        );

        // Calculate salary
        const salaryData = Salary.calculateSalary(gross_monthly, variable_incentive, professional_tax, tds);

        // Create salary record
        const salary = new Salary({
          employee_id: employee_id.toUpperCase(),
          gross_monthly,
          variable_incentive,
          professional_tax,
          tds,
          ...salaryData,
          created_by: userId
        });

        await salary.save();

        results.push({
          employee_id: salary.employee_id,
          employee_name: user.name,
          gross_monthly: salary.gross_monthly,
          monthly_ctc: salary.monthly_ctc,
          annual_ctc: salary.annual_ctc,
          net_take_home: salary.net_take_home
        });

      } catch (error) {
        errors.push({
          employee_id: employee.employee_id || 'Unknown',
          error: error.message
        });
      }
    }

    logger.info('Bulk salary calculation completed', {
      total_employees: employees.length,
      successful: results.length,
      errors: errors.length
    });

    res.status(200).json({
      success: true,
      message: `Bulk salary calculation completed. ${results.length} successful, ${errors.length} errors`,
      data: {
        results,
        errors
      }
    });

  } catch (error) {
    logger.error('Error in bulk salary calculation', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error in bulk salary calculation',
      error: error.message
    });
  }
};

module.exports = {
  calculateSalary,
  getCurrentSalary,
  getSalaryHistory,
  updateSalary,
  getPayrollSummary,
  bulkCalculateSalaries
};
