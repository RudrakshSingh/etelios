const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getDocumentTypes,
  createDocumentType,
  uploadDocument,
  getEmployeeDocuments,
  esignDocument,
  getDigilockerAuthURL,
  handleDigilockerCallback,
  getComplianceStatus,
  getPendingSignatures,
  getExpiringDocuments,
  downloadDocument
} = require('../controllers/contractsVaultController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../storage/documents/contracts');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, JPG, and PNG files are allowed.'), false);
    }
  }
});

// Document Types Routes
router.get('/document-types', authenticate, getDocumentTypes);
router.post('/document-types', authenticate, requireRole(['admin', 'hr']), createDocumentType);

// Document Management Routes
router.post('/upload', authenticate, requireRole(['admin', 'hr']), upload.single('file'), uploadDocument);
router.get('/employee/:employeeId', authenticate, getEmployeeDocuments);
router.get('/download/:documentId', authenticate, downloadDocument);

// E-sign Routes
router.post('/esign/:documentId', authenticate, esignDocument);
router.get('/digilocker/auth-url', authenticate, getDigilockerAuthURL);
router.get('/digilocker/callback', handleDigilockerCallback);

// Compliance & Reports Routes
router.get('/compliance', authenticate, requireRole(['admin', 'hr']), getComplianceStatus);
router.get('/pending-signatures', authenticate, getPendingSignatures);
router.get('/expiring', authenticate, requireRole(['admin', 'hr']), getExpiringDocuments);

module.exports = router;
