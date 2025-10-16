const express = require('express');
const router = express.Router();
const PrescriptionController = require('../controllers/prescriptionController');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');

// Validation schemas
const createPrescriptionSchema = Joi.object({
  customer_id: Joi.string().required(),
  store_id: Joi.string().required(),
  optometrist_id: Joi.string().required(),
  type: Joi.string().valid('SPECTACLE', 'CONTACT_LENS').required(),
  visit_reason: Joi.string().valid('ROUTINE', 'SYMPTOM', 'FOLLOW_UP').required(),
  spectacle: Joi.object({
    distance: Joi.object({
      r: Joi.object({
        sph: Joi.number().required(),
        cyl: Joi.number().default(0),
        axis: Joi.number().min(0).max(180).default(0),
        va: Joi.string().optional()
      }).required(),
      l: Joi.object({
        sph: Joi.number().required(),
        cyl: Joi.number().default(0),
        axis: Joi.number().min(0).max(180).default(0),
        va: Joi.string().optional()
      }).required()
    }).required(),
    add_power: Joi.number().min(0).max(4.0).optional(),
    pd: Joi.object({
      mono_r: Joi.number().min(0).optional(),
      mono_l: Joi.number().min(0).optional(),
      bin: Joi.number().min(0).optional()
    }).optional(),
    heights: Joi.object({
      r: Joi.number().min(0).optional(),
      l: Joi.number().min(0).optional()
    }).optional(),
    prism: Joi.object({
      r: Joi.object({
        h: Joi.number().optional(),
        v: Joi.number().optional(),
        base: Joi.string().valid('IN', 'OUT', 'UP', 'DOWN').optional()
      }).optional(),
      l: Joi.object({
        h: Joi.number().optional(),
        v: Joi.number().optional(),
        base: Joi.string().valid('IN', 'OUT', 'UP', 'DOWN').optional()
      }).optional()
    }).optional(),
    wrap_angle: Joi.number().optional(),
    pantoscopic_tilt: Joi.number().optional(),
    vertex_distance: Joi.number().optional(),
    lens_recommendation: Joi.object({
      material: Joi.string().valid('CR39', 'MR8', 'Poly', 'Trivex', 'HiIndex_1.67', 'HiIndex_1.74').optional(),
      coatings: Joi.array().items(Joi.string().valid('AR', 'Blue', 'Photo', 'UV', 'AntiGlare')).optional()
    }).optional()
  }).optional(),
  contact_lens: Joi.object({
    lens_type: Joi.string().valid('SPHERIC', 'TORIC', 'MULTIFOCAL', 'HIGH_POWER').required(),
    brand: Joi.string().optional(),
    series: Joi.string().optional(),
    r: Joi.object({
      sph: Joi.number().required(),
      cyl: Joi.number().optional(),
      axis: Joi.number().min(0).max(180).optional(),
      add: Joi.alternatives().try(
        Joi.string().valid('LOW', 'MED', 'HIGH'),
        Joi.number()
      ).optional(),
      base_curve: Joi.number().required(),
      diameter: Joi.number().required(),
      k_readings: Joi.object({
        k1: Joi.number().optional(),
        k2: Joi.number().optional(),
        axis: Joi.number().min(0).max(180).optional()
      }).optional(),
      vertex_distance: Joi.number().optional()
    }).required(),
    l: Joi.object({
      sph: Joi.number().required(),
      cyl: Joi.number().optional(),
      axis: Joi.number().min(0).max(180).optional(),
      add: Joi.alternatives().try(
        Joi.string().valid('LOW', 'MED', 'HIGH'),
        Joi.number()
      ).optional(),
      base_curve: Joi.number().required(),
      diameter: Joi.number().required(),
      k_readings: Joi.object({
        k1: Joi.number().optional(),
        k2: Joi.number().optional(),
        axis: Joi.number().min(0).max(180).optional()
      }).optional(),
      vertex_distance: Joi.number().optional()
    }).required(),
    wear_schedule: Joi.string().valid('DAILY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY').required(),
    care_solution: Joi.string().optional(),
    trial_log: Joi.array().items(Joi.object({
      date: Joi.date().required(),
      brand: Joi.string().required(),
      bc: Joi.number().required(),
      dia: Joi.number().required(),
      fit_notes: Joi.string().optional(),
      comfort: Joi.number().min(1).max(5).required(),
      va: Joi.string().optional()
    })).optional(),
    next_refill_due_at: Joi.date().optional(),
    contraindications: Joi.string().optional()
  }).optional(),
  notes_clinical: Joi.string().optional(),
  suggestions_for_customer: Joi.string().optional(),
  attachments: Joi.array().items(Joi.object({
    url: Joi.string().required(),
    type: Joi.string().valid('IMAGE', 'PDF', 'TOPOGRAPHY').required(),
    description: Joi.string().optional()
  })).optional()
});

const createCheckupSchema = Joi.object({
  customer_id: Joi.string().required(),
  store_id: Joi.string().required(),
  optometrist_id: Joi.string().required(),
  chief_complaint: Joi.string().required(),
  history_of_present_illness: Joi.string().optional(),
  allergies: Joi.string().optional(),
  medications: Joi.string().optional(),
  anterior_exam: Joi.object({
    lids_lashes: Joi.string().optional(),
    conjunctiva: Joi.string().optional(),
    cornea: Joi.string().optional(),
    anterior_chamber: Joi.string().optional(),
    iris: Joi.string().optional(),
    pupil: Joi.string().optional(),
    lens: Joi.string().optional()
  }).optional(),
  posterior_exam: Joi.object({
    vitreous: Joi.string().optional(),
    retina: Joi.string().optional(),
    macula: Joi.string().optional(),
    optic_nerve: Joi.string().optional(),
    vessels: Joi.string().optional()
  }).optional(),
  iop: Joi.object({
    r: Joi.number().min(0).max(50).optional(),
    l: Joi.number().min(0).max(50).optional(),
    method: Joi.string().valid('GOLDMANN', 'NON_CONTACT', 'DIGITAL').optional()
  }).optional(),
  keratometry: Joi.object({
    r: Joi.object({
      k1: Joi.number().optional(),
      k2: Joi.number().optional(),
      axis: Joi.number().min(0).max(180).optional()
    }).optional(),
    l: Joi.object({
      k1: Joi.number().optional(),
      k2: Joi.number().optional(),
      axis: Joi.number().min(0).max(180).optional()
    }).optional()
  }).optional(),
  topography_url: Joi.string().optional(),
  clinical_findings: Joi.object({
    dry_eye_severity: Joi.string().valid('NONE', 'MILD', 'MODERATE', 'SEVERE').optional(),
    binocular_vision_status: Joi.string().optional(),
    color_vision: Joi.string().optional(),
    depth_perception: Joi.string().optional()
  }).optional(),
  recommendations: Joi.object({
    follow_up_required: Joi.boolean().default(false),
    follow_up_interval_months: Joi.number().min(1).optional(),
    specialist_referral: Joi.string().optional(),
    lifestyle_advice: Joi.string().optional()
  }).optional()
});

const createQRLeadSchema = Joi.object({
  phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).required(),
  name: Joi.string().optional(),
  store_id: Joi.string().required(),
  purpose: Joi.string().valid('FREE_EYETEST', 'CONSULTATION', 'FOLLOW_UP', 'EMERGENCY').default('FREE_EYETEST'),
  source: Joi.string().valid('QR_CODE', 'WEBSITE', 'SOCIAL_MEDIA', 'REFERRAL', 'WALK_IN').default('QR_CODE'),
  campaign_id: Joi.string().optional(),
  notes: Joi.string().optional()
});

const clinicalCalculationSchema = Joi.object({
  // Near addition
  distanceSet: Joi.object({
    r: Joi.object({
      sph: Joi.number().required(),
      cyl: Joi.number().default(0),
      axis: Joi.number().min(0).max(180).default(0)
    }).required(),
    l: Joi.object({
      sph: Joi.number().required(),
      cyl: Joi.number().default(0),
      axis: Joi.number().min(0).max(180).default(0)
    }).required()
  }).optional(),
  addPower: Joi.number().min(0).max(4.0).optional(),
  intermediateFactor: Joi.number().min(0).max(1).optional(),
  
  // Transpose
  sph: Joi.number().optional(),
  cyl: Joi.number().optional(),
  axis: Joi.number().min(0).max(180).optional(),
  mode: Joi.string().valid('PLUS', 'MINUS').optional(),
  
  // Vertex compensation
  vertexChange: Joi.number().optional(),
  
  // Contact lens mapping
  spectacleRx: Joi.object().optional(),
  brand: Joi.string().optional(),
  series: Joi.string().optional(),
  vertexDistance: Joi.number().optional()
});

// Prescription routes
router.post('/prescriptions', 
  requireRole(['optometrist', 'admin']),
  requirePermission('prescription:create'),
  validateRequest(createPrescriptionSchema),
  PrescriptionController.createPrescription
);

router.get('/prescriptions/:rxId',
  requireRole(['optometrist', 'admin', 'store_manager', 'customer']),
  requirePermission('prescription:read'),
  PrescriptionController.getPrescriptionById
);

router.patch('/prescriptions/:rxId',
  requireRole(['optometrist', 'admin']),
  requirePermission('prescription:update'),
  PrescriptionController.updatePrescription
);

router.post('/prescriptions/:rxId/sign',
  requireRole(['optometrist', 'admin']),
  requirePermission('prescription:sign'),
  PrescriptionController.signPrescription
);

router.get('/prescriptions/customer/:customerId',
  requireRole(['optometrist', 'admin', 'store_manager', 'customer']),
  requirePermission('prescription:read'),
  PrescriptionController.getPrescriptionsByCustomer
);

// Checkup routes
router.post('/checkups',
  requireRole(['optometrist', 'admin']),
  requirePermission('checkup:create'),
  validateRequest(createCheckupSchema),
  PrescriptionController.createCheckup
);

router.get('/checkups/customer/:customerId',
  requireRole(['optometrist', 'admin', 'store_manager', 'customer']),
  requirePermission('checkup:read'),
  PrescriptionController.getCheckupsByCustomer
);

// QR Lead routes
router.post('/qr-leads',
  requireRole(['store_manager', 'admin']),
  requirePermission('qr_lead:create'),
  validateRequest(createQRLeadSchema),
  PrescriptionController.createQRLead
);

router.get('/qr-leads/:qrRefId',
  requireRole(['store_manager', 'admin']),
  requirePermission('qr_lead:read'),
  PrescriptionController.getQRLeadByRef
);

router.post('/qr-leads/:qrRefId/link',
  requireRole(['store_manager', 'admin']),
  requirePermission('qr_lead:link'),
  PrescriptionController.linkQRLeadToCustomer
);

// RxLink routes (for POS/E-commerce)
router.get('/rxlinks/customer/:customerId',
  requireRole(['store_manager', 'admin', 'pos_operator']),
  requirePermission('rxlink:read'),
  PrescriptionController.getRxLinksForCustomer
);

router.post('/rxlinks/:rxLinkId/redeem',
  requireRole(['store_manager', 'admin', 'pos_operator']),
  requirePermission('rxlink:redeem'),
  PrescriptionController.redeemRxLink
);

// Clinical calculation routes
router.post('/calc/:calculationType',
  requireRole(['optometrist', 'admin']),
  requirePermission('clinical:calculate'),
  validateRequest(clinicalCalculationSchema),
  PrescriptionController.performClinicalCalculation
);

// Customer portal routes
router.get('/customer/history/:customerId',
  requireRole(['customer', 'optometrist', 'admin', 'store_manager']),
  requirePermission('prescription:read'),
  PrescriptionController.getCustomerPrescriptionHistory
);

router.get('/customer/recommendations/:customerId',
  requireRole(['customer', 'optometrist', 'admin', 'store_manager']),
  requirePermission('prescription:read'),
  PrescriptionController.getCustomerRecommendations
);

module.exports = router;
