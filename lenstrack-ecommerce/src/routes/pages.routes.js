const express = require('express');
const router = express.Router();
const pagesController = require('../controllers/pages.controller');
const { validateRequest, pageValidations, commonValidations } = require('../middleware/validation.middleware');
const { authenticate, authorize, requirePermission } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/v1/pages:
 *   get:
 *     summary: Get all pages
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [HOME, LANDING, CMS, PRODUCT, CATEGORY, CUSTOM]
 *         description: Filter by page type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived, scheduled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Pages retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/',
  authenticate,
  requirePermission('view_cms'),
  commonValidations.pagination,
  validateRequest,
  pagesController.getPages
);

/**
 * @swagger
 * /api/v1/pages/{id}:
 *   get:
 *     summary: Get page by ID
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page retrieved successfully
 *       404:
 *         description: Page not found
 */
router.get('/:id',
  authenticate,
  requirePermission('view_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.getPage
);

/**
 * @swagger
 * /api/v1/pages/by-path/{path}:
 *   get:
 *     summary: Get page by path
 *     tags: [Pages]
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Page path
 *     responses:
 *       200:
 *         description: Page retrieved successfully
 *       404:
 *         description: Page not found
 */
router.get('/by-path/:path(*)',
  pagesController.getPageByPath
);

/**
 * @swagger
 * /api/v1/pages:
 *   post:
 *     summary: Create new page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               path:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [HOME, LANDING, CMS, PRODUCT, CATEGORY, CUSTOM]
 *               description:
 *                 type: string
 *               content:
 *                 type: object
 *               sections:
 *                 type: array
 *               seo:
 *                 type: object
 *     responses:
 *       201:
 *         description: Page created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/',
  authenticate,
  requirePermission('manage_cms'),
  pageValidations.create,
  validateRequest,
  pagesController.createPage
);

/**
 * @swagger
 * /api/v1/pages/{id}:
 *   put:
 *     summary: Update page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               path:
 *                 type: string
 *               description:
 *                 type: string
 *               content:
 *                 type: object
 *               sections:
 *                 type: array
 *               seo:
 *                 type: object
 *     responses:
 *       200:
 *         description: Page updated successfully
 *       404:
 *         description: Page not found
 */
router.put('/:id',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  pageValidations.update,
  validateRequest,
  pagesController.updatePage
);

/**
 * @swagger
 * /api/v1/pages/{id}:
 *   delete:
 *     summary: Delete page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page deleted successfully
 *       404:
 *         description: Page not found
 */
router.delete('/:id',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.deletePage
);

/**
 * @swagger
 * /api/v1/pages/{id}/publish:
 *   post:
 *     summary: Publish page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page published successfully
 *       404:
 *         description: Page not found
 */
router.post('/:id/publish',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.publishPage
);

/**
 * @swagger
 * /api/v1/pages/{id}/unpublish:
 *   post:
 *     summary: Unpublish page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page unpublished successfully
 *       404:
 *         description: Page not found
 */
router.post('/:id/unpublish',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.unpublishPage
);

/**
 * @swagger
 * /api/v1/pages/{id}/archive:
 *   post:
 *     summary: Archive page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page archived successfully
 *       404:
 *         description: Page not found
 */
router.post('/:id/archive',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.archivePage
);

/**
 * @swagger
 * /api/v1/pages/{id}/sections:
 *   post:
 *     summary: Add section to page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [hero, banner, product_carousel, category_grid, text_block, image_gallery, testimonials, faq, contact_form, newsletter, social_links, custom]
 *               props:
 *                 type: object
 *               blocks:
 *                 type: array
 *     responses:
 *       200:
 *         description: Section added successfully
 *       404:
 *         description: Page not found
 */
router.post('/:id/sections',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.addSection
);

/**
 * @swagger
 * /api/v1/pages/{id}/sections/{sectionId}:
 *   put:
 *     summary: Update section
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Section ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               props:
 *                 type: object
 *               blocks:
 *                 type: array
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Section updated successfully
 *       404:
 *         description: Page or section not found
 */
router.put('/:id/sections/:sectionId',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.updateSection
);

/**
 * @swagger
 * /api/v1/pages/{id}/sections/{sectionId}:
 *   delete:
 *     summary: Remove section
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Section ID
 *     responses:
 *       200:
 *         description: Section removed successfully
 *       404:
 *         description: Page or section not found
 */
router.delete('/:id/sections/:sectionId',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.removeSection
);

/**
 * @swagger
 * /api/v1/pages/{id}/sections/reorder:
 *   post:
 *     summary: Reorder sections
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sectionIds
 *             properties:
 *               sectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Sections reordered successfully
 *       404:
 *         description: Page not found
 */
router.post('/:id/sections/reorder',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.reorderSections
);

/**
 * @swagger
 * /api/v1/pages/{id}/clone:
 *   post:
 *     summary: Clone page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Page cloned successfully
 *       404:
 *         description: Page not found
 */
router.post('/:id/clone',
  authenticate,
  requirePermission('manage_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.clonePage
);

/**
 * @swagger
 * /api/v1/pages/{id}/preview:
 *   get:
 *     summary: Preview page
 *     tags: [Pages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Page ID
 *     responses:
 *       200:
 *         description: Page preview data
 *       404:
 *         description: Page not found
 */
router.get('/:id/preview',
  authenticate,
  requirePermission('view_cms'),
  commonValidations.mongoId,
  validateRequest,
  pagesController.previewPage
);

/**
 * @swagger
 * /api/v1/pages/search:
 *   get:
 *     summary: Search pages
 *     tags: [Pages]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [HOME, LANDING, CMS, PRODUCT, CATEGORY, CUSTOM]
 *         description: Filter by page type
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search',
  pagesController.searchPages
);

module.exports = router;
