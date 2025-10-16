const Document = require('../models/Document.model');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');
const logger = require('../config/logger');

class ComplianceService {
  /**
   * Get compliance dashboard data
   */
  static async getComplianceDashboard(filters = {}) {
    try {
      const {
        department,
        compliance_type,
        date_from,
        date_to
      } = filters;

      // Build base query
      const query = {
        compliance_required: true,
        is_deleted: false,
        is_latest: true
      };

      if (department) {
        query['employee.department'] = department;
      }

      if (compliance_type) {
        query.compliance_type = compliance_type;
      }

      if (date_from || date_to) {
        query.created_at = {};
        if (date_from) query.created_at.$gte = new Date(date_from);
        if (date_to) query.created_at.$lte = new Date(date_to);
      }

      // Get compliance documents
      const documents = await Document.find(query)
        .populate('employee', 'name email employee_id department')
        .populate('signed_by', 'name email');

      // Calculate overall compliance statistics
      const total = documents.length;
      const signed = documents.filter(doc => doc.is_signed).length;
      const pending = total - signed;
      const complianceRate = total > 0 ? (signed / total) * 100 : 0;

      // Group by compliance type
      const byType = documents.reduce((acc, doc) => {
        const type = doc.compliance_type || 'general';
        if (!acc[type]) {
          acc[type] = { total: 0, signed: 0, pending: 0, complianceRate: 0 };
        }
        acc[type].total++;
        if (doc.is_signed) acc[type].signed++;
        else acc[type].pending++;
        acc[type].complianceRate = acc[type].total > 0 ? (acc[type].signed / acc[type].total) * 100 : 0;
        return acc;
      }, {});

      // Group by department
      const byDepartment = documents.reduce((acc, doc) => {
        const dept = doc.employee.department || 'unknown';
        if (!acc[dept]) {
          acc[dept] = { total: 0, signed: 0, pending: 0, complianceRate: 0 };
        }
        acc[dept].total++;
        if (doc.is_signed) acc[dept].signed++;
        else acc[dept].pending++;
        acc[dept].complianceRate = acc[dept].total > 0 ? (acc[dept].signed / acc[dept].total) * 100 : 0;
        return acc;
      }, {});

      // Get compliance trends (last 12 months)
      const trends = await this.getComplianceTrends(12);

      // Get critical compliance issues
      const criticalIssues = await this.getCriticalComplianceIssues();

      return {
        summary: {
          total,
          signed,
          pending,
          complianceRate: Math.round(complianceRate * 100) / 100
        },
        byType,
        byDepartment,
        trends,
        criticalIssues,
        documents: documents.map(doc => ({
          _id: doc._id,
          document_id: doc.document_id,
          title: doc.title,
          compliance_type: doc.compliance_type,
          employee: doc.employee,
          is_signed: doc.is_signed,
          signed_at: doc.signed_at,
          created_at: doc.created_at,
          expiry_date: doc.expiry_date,
          is_expired: doc.is_expired
        }))
      };
    } catch (error) {
      logger.error('Get compliance dashboard failed', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Get compliance trends
   */
  static async getComplianceTrends(months = 12) {
    try {
      const trends = [];
      const currentDate = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

        const documents = await Document.find({
          compliance_required: true,
          is_deleted: false,
          is_latest: true,
          created_at: { $gte: startDate, $lte: endDate }
        });

        const total = documents.length;
        const signed = documents.filter(doc => doc.is_signed).length;
        const complianceRate = total > 0 ? (signed / total) * 100 : 0;

        trends.push({
          month: startDate.toISOString().slice(0, 7), // YYYY-MM format
          total,
          signed,
          pending: total - signed,
          complianceRate: Math.round(complianceRate * 100) / 100
        });
      }

      return trends;
    } catch (error) {
      logger.error('Get compliance trends failed', { error: error.message, months });
      throw error;
    }
  }

  /**
   * Get critical compliance issues
   */
  static async getCriticalComplianceIssues() {
    try {
      const issues = [];

      // POSH compliance issues
      const poshDocuments = await Document.find({
        compliance_type: 'posh',
        compliance_required: true,
        is_deleted: false,
        is_latest: true,
        is_signed: false
      }).populate('employee', 'name email department');

      if (poshDocuments.length > 0) {
        issues.push({
          type: 'posh_compliance',
          severity: 'critical',
          title: 'POSH Acknowledgment Pending',
          description: `${poshDocuments.length} employees have not signed POSH acknowledgment`,
          count: poshDocuments.length,
          employees: poshDocuments.map(doc => doc.employee)
        });
      }

      // NDA compliance issues
      const ndaDocuments = await Document.find({
        compliance_type: 'nda',
        compliance_required: true,
        is_deleted: false,
        is_latest: true,
        is_signed: false
      }).populate('employee', 'name email department');

      if (ndaDocuments.length > 0) {
        issues.push({
          type: 'nda_compliance',
          severity: 'high',
          title: 'NDA Agreement Pending',
          description: `${ndaDocuments.length} employees have not signed NDA agreement`,
          count: ndaDocuments.length,
          employees: ndaDocuments.map(doc => doc.employee)
        });
      }

      // Expired documents
      const expiredDocuments = await Document.find({
        compliance_required: true,
        is_deleted: false,
        is_latest: true,
        expiry_date: { $lt: new Date() }
      }).populate('employee', 'name email department');

      if (expiredDocuments.length > 0) {
        issues.push({
          type: 'expired_documents',
          severity: 'high',
          title: 'Expired Compliance Documents',
          description: `${expiredDocuments.length} compliance documents have expired`,
          count: expiredDocuments.length,
          employees: expiredDocuments.map(doc => doc.employee)
        });
      }

      // Documents expiring soon (within 30 days)
      const expiringSoon = await Document.find({
        compliance_required: true,
        is_deleted: false,
        is_latest: true,
        expiry_date: { 
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          $gte: new Date()
        }
      }).populate('employee', 'name email department');

      if (expiringSoon.length > 0) {
        issues.push({
          type: 'expiring_soon',
          severity: 'medium',
          title: 'Documents Expiring Soon',
          description: `${expiringSoon.length} compliance documents are expiring within 30 days`,
          count: expiringSoon.length,
          employees: expiringSoon.map(doc => doc.employee)
        });
      }

      return issues;
    } catch (error) {
      logger.error('Get critical compliance issues failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get compliance report by department
   */
  static async getDepartmentComplianceReport(department) {
    try {
      const documents = await Document.find({
        compliance_required: true,
        is_deleted: false,
        is_latest: true,
        'employee.department': department
      }).populate('employee', 'name email employee_id department')
        .populate('signed_by', 'name email');

      // Calculate department statistics
      const total = documents.length;
      const signed = documents.filter(doc => doc.is_signed).length;
      const pending = total - signed;
      const complianceRate = total > 0 ? (signed / total) * 100 : 0;

      // Group by compliance type
      const byType = documents.reduce((acc, doc) => {
        const type = doc.compliance_type || 'general';
        if (!acc[type]) {
          acc[type] = { total: 0, signed: 0, pending: 0, complianceRate: 0 };
        }
        acc[type].total++;
        if (doc.is_signed) acc[type].signed++;
        else acc[type].pending++;
        acc[type].complianceRate = acc[type].total > 0 ? (acc[type].signed / acc[type].total) * 100 : 0;
        return acc;
      }, {});

      // Get non-compliant employees
      const nonCompliantEmployees = documents
        .filter(doc => !doc.is_signed)
        .map(doc => doc.employee)
        .filter((employee, index, self) => 
          index === self.findIndex(e => e._id.toString() === employee._id.toString())
        );

      return {
        department,
        summary: {
          total,
          signed,
          pending,
          complianceRate: Math.round(complianceRate * 100) / 100
        },
        byType,
        nonCompliantEmployees,
        documents: documents.map(doc => ({
          _id: doc._id,
          document_id: doc.document_id,
          title: doc.title,
          compliance_type: doc.compliance_type,
          employee: doc.employee,
          is_signed: doc.is_signed,
          signed_at: doc.signed_at,
          created_at: doc.created_at,
          expiry_date: doc.expiry_date,
          is_expired: doc.is_expired
        }))
      };
    } catch (error) {
      logger.error('Get department compliance report failed', { error: error.message, department });
      throw error;
    }
  }

  /**
   * Get compliance report by employee
   */
  static async getEmployeeComplianceReport(employeeId) {
    try {
      const employee = await User.findOne({ employee_id: employeeId });
      if (!employee) {
        throw new Error('Employee not found');
      }

      const documents = await Document.find({
        compliance_required: true,
        is_deleted: false,
        is_latest: true,
        employee: employee._id
      }).populate('signed_by', 'name email');

      // Calculate employee compliance statistics
      const total = documents.length;
      const signed = documents.filter(doc => doc.is_signed).length;
      const pending = total - signed;
      const complianceRate = total > 0 ? (signed / total) * 100 : 0;

      // Group by compliance type
      const byType = documents.reduce((acc, doc) => {
        const type = doc.compliance_type || 'general';
        if (!acc[type]) {
          acc[type] = { total: 0, signed: 0, pending: 0, complianceRate: 0 };
        }
        acc[type].total++;
        if (doc.is_signed) acc[type].signed++;
        else acc[type].pending++;
        acc[type].complianceRate = acc[type].total > 0 ? (acc[type].signed / acc[type].total) * 100 : 0;
        return acc;
      }, {});

      // Get pending documents
      const pendingDocuments = documents.filter(doc => !doc.is_signed);

      // Get expired documents
      const expiredDocuments = documents.filter(doc => doc.is_expired);

      return {
        employee: {
          _id: employee._id,
          employee_id: employee.employee_id,
          name: employee.name,
          email: employee.email,
          department: employee.department
        },
        summary: {
          total,
          signed,
          pending,
          complianceRate: Math.round(complianceRate * 100) / 100
        },
        byType,
        pendingDocuments: pendingDocuments.map(doc => ({
          _id: doc._id,
          document_id: doc.document_id,
          title: doc.title,
          compliance_type: doc.compliance_type,
          created_at: doc.created_at,
          expiry_date: doc.expiry_date,
          is_expired: doc.is_expired
        })),
        expiredDocuments: expiredDocuments.map(doc => ({
          _id: doc._id,
          document_id: doc.document_id,
          title: doc.title,
          compliance_type: doc.compliance_type,
          expiry_date: doc.expiry_date,
          days_expired: Math.floor((new Date() - doc.expiry_date) / (24 * 60 * 60 * 1000))
        }))
      };
    } catch (error) {
      logger.error('Get employee compliance report failed', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Export compliance report
   */
  static async exportComplianceReport(filters = {}, format = 'excel') {
    try {
      const dashboardData = await this.getComplianceDashboard(filters);
      
      if (format === 'excel') {
        return await this.exportToExcel(dashboardData);
      } else if (format === 'pdf') {
        return await this.exportToPDF(dashboardData);
      } else {
        throw new Error('Unsupported export format');
      }
    } catch (error) {
      logger.error('Export compliance report failed', { error: error.message, filters, format });
      throw error;
    }
  }

  /**
   * Export to Excel
   */
  static async exportToExcel(data) {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // Summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Total Documents', data.summary.total]);
      summarySheet.addRow(['Signed Documents', data.summary.signed]);
      summarySheet.addRow(['Pending Documents', data.summary.pending]);
      summarySheet.addRow(['Compliance Rate', `${data.summary.complianceRate}%`]);

      // By type sheet
      const typeSheet = workbook.addWorksheet('By Compliance Type');
      typeSheet.addRow(['Compliance Type', 'Total', 'Signed', 'Pending', 'Compliance Rate']);
      
      Object.entries(data.byType).forEach(([type, stats]) => {
        typeSheet.addRow([type, stats.total, stats.signed, stats.pending, `${stats.complianceRate}%`]);
      });

      // By department sheet
      const deptSheet = workbook.addWorksheet('By Department');
      deptSheet.addRow(['Department', 'Total', 'Signed', 'Pending', 'Compliance Rate']);
      
      Object.entries(data.byDepartment).forEach(([dept, stats]) => {
        deptSheet.addRow([dept, stats.total, stats.signed, stats.pending, `${stats.complianceRate}%`]);
      });

      // Documents sheet
      const docsSheet = workbook.addWorksheet('Documents');
      docsSheet.addRow(['Document ID', 'Title', 'Type', 'Employee', 'Department', 'Signed', 'Signed Date', 'Created Date', 'Expiry Date']);
      
      data.documents.forEach(doc => {
        docsSheet.addRow([
          doc.document_id,
          doc.title,
          doc.compliance_type,
          doc.employee.name,
          doc.employee.department,
          doc.is_signed ? 'Yes' : 'No',
          doc.signed_at || '',
          doc.created_at,
          doc.expiry_date || ''
        ]);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      logger.error('Export to Excel failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Export to PDF
   */
  static async exportToPDF(data) {
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();

      // Add content to PDF
      doc.fontSize(20).text('Compliance Report', 100, 100);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 100, 130);
      
      // Summary section
      doc.fontSize(16).text('Summary', 100, 160);
      doc.text(`Total Documents: ${data.summary.total}`, 100, 180);
      doc.text(`Signed Documents: ${data.summary.signed}`, 100, 200);
      doc.text(`Pending Documents: ${data.summary.pending}`, 100, 220);
      doc.text(`Compliance Rate: ${data.summary.complianceRate}%`, 100, 240);

      // Generate buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
      });
    } catch (error) {
      logger.error('Export to PDF failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Check compliance requirements for employee
   */
  static async checkEmployeeCompliance(employeeId) {
    try {
      const employee = await User.findOne({ employee_id: employeeId });
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Get all compliance documents for employee
      const complianceDocs = await Document.find({
        compliance_required: true,
        is_deleted: false,
        is_latest: true,
        employee: employee._id
      });

      // Check specific compliance requirements
      const complianceStatus = {
        posh: {
          required: true,
          signed: false,
          document: null
        },
        nda: {
          required: true,
          signed: false,
          document: null
        },
        confidentiality: {
          required: false,
          signed: false,
          document: null
        }
      };

      // Check each compliance type
      complianceDocs.forEach(doc => {
        if (doc.compliance_type === 'posh') {
          complianceStatus.posh.signed = doc.is_signed;
          complianceStatus.posh.document = doc;
        } else if (doc.compliance_type === 'nda') {
          complianceStatus.nda.signed = doc.is_signed;
          complianceStatus.nda.document = doc;
        } else if (doc.compliance_type === 'confidentiality') {
          complianceStatus.confidentiality.required = true;
          complianceStatus.confidentiality.signed = doc.is_signed;
          complianceStatus.confidentiality.document = doc;
        }
      });

      // Calculate overall compliance
      const requiredCompliances = Object.values(complianceStatus).filter(c => c.required);
      const signedCompliances = requiredCompliances.filter(c => c.signed);
      const complianceRate = requiredCompliances.length > 0 ? (signedCompliances.length / requiredCompliances.length) * 100 : 100;

      return {
        employee: {
          _id: employee._id,
          employee_id: employee.employee_id,
          name: employee.name,
          email: employee.email,
          department: employee.department
        },
        complianceStatus,
        complianceRate: Math.round(complianceRate * 100) / 100,
        isCompliant: complianceRate === 100,
        missingCompliances: requiredCompliances.filter(c => !c.signed).map(c => c.document?.compliance_type || 'unknown')
      };
    } catch (error) {
      logger.error('Check employee compliance failed', { error: error.message, employeeId });
      throw error;
    }
  }
}

module.exports = ComplianceService;
