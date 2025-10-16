const Salary = require('../models/Salary.model');
const User = require('../models/User.model');
const logger = require('../config/logger');

class SalaryService {
  // Calculate salary components based on gross monthly salary
  static calculateSalaryComponents(grossMonthly, variableIncentive = 0, professionalTax = 0, tds = 0) {
    // Basic salary calculation (50% of gross)
    const basicSalary = grossMonthly * 0.5;
    
    // HRA calculation (50% of basic)
    const hra = basicSalary * 0.5;
    
    // Special allowance (remaining amount)
    const specialAllowance = grossMonthly - basicSalary - hra;
    
    // Total earnings
    const totalEarnings = grossMonthly + variableIncentive;
    
    // EPF calculation (12% of basic, capped at ₹1,800)
    const epfEmployee = Math.min(basicSalary * 0.12, 1800);
    const epfEmployer = Math.min(basicSalary * 0.12, 1800);
    
    // ESIC calculation (only if gross <= ₹21,000)
    const esicEmployee = grossMonthly <= 21000 ? grossMonthly * 0.0075 : 0;
    const esicEmployer = grossMonthly <= 21000 ? grossMonthly * 0.0325 : 0;
    
    // Gratuity calculation (4.81% of basic)
    const gratuity = basicSalary * 0.0481;
    
    // Total deductions
    const totalDeductions = epfEmployee + esicEmployee + professionalTax + tds;
    
    // Net take home
    const netTakeHome = grossMonthly - totalDeductions;
    
    // Employer contributions
    const employerContributions = epfEmployer + esicEmployer + gratuity;
    
    // CTC calculations
    const monthlyCTC = grossMonthly + employerContributions;
    const annualCTC = monthlyCTC * 12;
    
    return {
      basic_salary: basicSalary,
      hra: hra,
      special_allowance: specialAllowance,
      total_earnings: totalEarnings,
      epf_employee: epfEmployee,
      esic_employee: esicEmployee,
      professional_tax: professionalTax,
      tds: tds,
      total_deductions: totalDeductions,
      net_take_home: netTakeHome,
      epf_employer: epfEmployer,
      esic_employer: esicEmployer,
      gratuity: gratuity,
      employer_contributions: employerContributions,
      monthly_ctc: monthlyCTC,
      annual_ctc: annualCTC
    };
  }

  // Create or update salary for an employee
  static async createOrUpdateSalary(employeeId, salaryData, userId) {
    try {
      // Deactivate current salary if exists
      await Salary.updateMany(
        { employee_id: employeeId.toUpperCase(), is_active: true },
        { is_active: false, updated_by: userId }
      );

      // Calculate salary components
      const calculatedSalary = this.calculateSalaryComponents(
        salaryData.gross_monthly,
        salaryData.variable_incentive || 0,
        salaryData.professional_tax || 0,
        salaryData.tds || 0
      );

      // Create new salary record
      const salary = new Salary({
        employee_id: employeeId.toUpperCase(),
        gross_monthly: salaryData.gross_monthly,
        variable_incentive: salaryData.variable_incentive || 0,
        professional_tax: salaryData.professional_tax || 0,
        tds: salaryData.tds || 0,
        ...calculatedSalary,
        created_by: userId
      });

      await salary.save();

      logger.info('Salary created/updated successfully', {
        employee_id: employeeId.toUpperCase(),
        gross_monthly: salaryData.gross_monthly,
        monthly_ctc: calculatedSalary.monthly_ctc,
        annual_ctc: calculatedSalary.annual_ctc
      });

      return salary;
    } catch (error) {
      logger.error('Error creating/updating salary', { error: error.message, employeeId });
      throw error;
    }
  }

  // Get current salary for an employee
  static async getCurrentSalary(employeeId) {
    try {
      const salary = await Salary.getCurrentSalary(employeeId.toUpperCase());
      if (!salary) {
        throw new Error('No salary record found for this employee');
      }
      return salary;
    } catch (error) {
      logger.error('Error getting current salary', { error: error.message, employeeId });
      throw error;
    }
  }

  // Get salary history for an employee
  static async getSalaryHistory(employeeId, limit = 12) {
    try {
      const salaryHistory = await Salary.getSalaryHistory(employeeId.toUpperCase(), limit);
      return salaryHistory;
    } catch (error) {
      logger.error('Error getting salary history', { error: error.message, employeeId });
      throw error;
    }
  }

  // Get payroll summary for all employees
  static async getPayrollSummary(filters = {}) {
    try {
      const { month, year, department } = filters;
      
      // Build date filter
      let dateFilter = {};
      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        dateFilter.effective_date = { $gte: startDate, $lte: endDate };
      }

      // Build department filter
      let departmentFilter = {};
      if (department) {
        const employees = await User.find({ department: department.toUpperCase() }, '_id');
        const employeeIds = employees.map(emp => emp._id);
        departmentFilter.employee_id = { $in: employeeIds };
      }

      // Get all active salaries
      const salaries = await Salary.find({ 
        is_active: true, 
        ...dateFilter,
        ...departmentFilter
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

      return {
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
      };
    } catch (error) {
      logger.error('Error getting payroll summary', { error: error.message });
      throw error;
    }
  }

  // Bulk calculate salaries for multiple employees
  static async bulkCalculateSalaries(employees, userId) {
    try {
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

          // Create or update salary
          const salary = await this.createOrUpdateSalary(
            employee_id,
            { gross_monthly, variable_incentive, professional_tax, tds },
            userId
          );

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

      return { results, errors };
    } catch (error) {
      logger.error('Error in bulk salary calculation', { error: error.message });
      throw error;
    }
  }

  // Get salary analytics
  static async getSalaryAnalytics() {
    try {
      const salaries = await Salary.find({ is_active: true })
        .populate('employee_id', 'name department');

      // Calculate analytics
      const analytics = {
        total_employees: salaries.length,
        total_monthly_ctc: salaries.reduce((sum, salary) => sum + salary.monthly_ctc, 0),
        total_annual_ctc: salaries.reduce((sum, salary) => sum + salary.annual_ctc, 0),
        average_monthly_ctc: 0,
        average_annual_ctc: 0,
        department_wise: {},
        salary_ranges: {
          '0-15000': 0,
          '15001-25000': 0,
          '25001-35000': 0,
          '35001-50000': 0,
          '50001+': 0
        }
      };

      if (salaries.length > 0) {
        analytics.average_monthly_ctc = analytics.total_monthly_ctc / salaries.length;
        analytics.average_annual_ctc = analytics.total_annual_ctc / salaries.length;

        // Department-wise analysis
        salaries.forEach(salary => {
          const dept = salary.employee_id?.department || 'Unknown';
          if (!analytics.department_wise[dept]) {
            analytics.department_wise[dept] = {
              count: 0,
              total_monthly_ctc: 0,
              total_annual_ctc: 0,
              average_monthly_ctc: 0,
              average_annual_ctc: 0
            };
          }
          analytics.department_wise[dept].count++;
          analytics.department_wise[dept].total_monthly_ctc += salary.monthly_ctc;
          analytics.department_wise[dept].total_annual_ctc += salary.annual_ctc;
        });

        // Calculate department averages
        Object.keys(analytics.department_wise).forEach(dept => {
          const deptData = analytics.department_wise[dept];
          deptData.average_monthly_ctc = deptData.total_monthly_ctc / deptData.count;
          deptData.average_annual_ctc = deptData.total_annual_ctc / deptData.count;
        });

        // Salary range analysis
        salaries.forEach(salary => {
          const monthlyCTC = salary.monthly_ctc;
          if (monthlyCTC <= 15000) {
            analytics.salary_ranges['0-15000']++;
          } else if (monthlyCTC <= 25000) {
            analytics.salary_ranges['15001-25000']++;
          } else if (monthlyCTC <= 35000) {
            analytics.salary_ranges['25001-35000']++;
          } else if (monthlyCTC <= 50000) {
            analytics.salary_ranges['35001-50000']++;
          } else {
            analytics.salary_ranges['50001+']++;
          }
        });
      }

      return analytics;
    } catch (error) {
      logger.error('Error getting salary analytics', { error: error.message });
      throw error;
    }
  }
}

module.exports = SalaryService;
