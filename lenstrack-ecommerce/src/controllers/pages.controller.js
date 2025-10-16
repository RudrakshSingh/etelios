const Page = require('../models/Page.model');
const { sendSuccessResponse, sendErrorResponse } = require('../middleware/error.middleware');
const { businessLogger } = require('../middleware/logger.middleware');

class PagesController {
  /**
   * Get all pages with pagination and filters
   */
  async getPages(req, res) {
    try {
      const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', type, status } = req.query;
      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      if (type) filter.type = type;
      if (status) filter.status = status;

      // Build sort
      const sortObj = {};
      sortObj[sort] = order === 'desc' ? -1 : 1;

      const pages = await Page.find(filter)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('publishedBy', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Page.countDocuments(filter);

      sendSuccessResponse(res, 'Pages retrieved successfully', {
        pages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get pages error:', error);
      sendErrorResponse(res, 'Failed to retrieve pages', 500);
    }
  }

  /**
   * Get page by ID
   */
  async getPage(req, res) {
    try {
      const { id } = req.params;

      const page = await Page.findById(id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('publishedBy', 'name email');

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      sendSuccessResponse(res, 'Page retrieved successfully', { page });
    } catch (error) {
      console.error('Get page error:', error);
      sendErrorResponse(res, 'Failed to retrieve page', 500);
    }
  }

  /**
   * Get page by path (public endpoint)
   */
  async getPageByPath(req, res) {
    try {
      const { path } = req.params;
      const fullPath = `/${path}`;

      const page = await Page.findByPath(fullPath);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      // Increment views
      await page.incrementViews();

      sendSuccessResponse(res, 'Page retrieved successfully', { page });
    } catch (error) {
      console.error('Get page by path error:', error);
      sendErrorResponse(res, 'Failed to retrieve page', 500);
    }
  }

  /**
   * Create new page
   */
  async createPage(req, res) {
    try {
      const pageData = {
        ...req.body,
        createdBy: req.userId
      };

      const page = new Page(pageData);
      await page.save();

      businessLogger('page_created', {
        pageId: page._id,
        title: page.title,
        type: page.type,
        createdBy: req.userId
      });

      sendSuccessResponse(res, 'Page created successfully', { page }, 201);
    } catch (error) {
      console.error('Create page error:', error);
      if (error.code === 11000) {
        return sendErrorResponse(res, 'Page with this slug or path already exists', 409);
      }
      sendErrorResponse(res, 'Failed to create page', 500);
    }
  }

  /**
   * Update page
   */
  async updatePage(req, res) {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: req.userId
      };

      const page = await Page.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      businessLogger('page_updated', {
        pageId: page._id,
        title: page.title,
        updatedBy: req.userId
      });

      sendSuccessResponse(res, 'Page updated successfully', { page });
    } catch (error) {
      console.error('Update page error:', error);
      if (error.code === 11000) {
        return sendErrorResponse(res, 'Page with this slug or path already exists', 409);
      }
      sendErrorResponse(res, 'Failed to update page', 500);
    }
  }

  /**
   * Delete page
   */
  async deletePage(req, res) {
    try {
      const { id } = req.params;

      const page = await Page.findByIdAndDelete(id);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      businessLogger('page_deleted', {
        pageId: id,
        title: page.title,
        deletedBy: req.userId
      });

      sendSuccessResponse(res, 'Page deleted successfully');
    } catch (error) {
      console.error('Delete page error:', error);
      sendErrorResponse(res, 'Failed to delete page', 500);
    }
  }

  /**
   * Publish page
   */
  async publishPage(req, res) {
    try {
      const { id } = req.params;

      const page = await Page.findById(id);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      await page.publish(req.userId);

      businessLogger('page_published', {
        pageId: page._id,
        title: page.title,
        publishedBy: req.userId
      });

      sendSuccessResponse(res, 'Page published successfully', { page });
    } catch (error) {
      console.error('Publish page error:', error);
      sendErrorResponse(res, 'Failed to publish page', 500);
    }
  }

  /**
   * Unpublish page
   */
  async unpublishPage(req, res) {
    try {
      const { id } = req.params;

      const page = await Page.findById(id);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      await page.unpublish();

      businessLogger('page_unpublished', {
        pageId: page._id,
        title: page.title,
        unpublishedBy: req.userId
      });

      sendSuccessResponse(res, 'Page unpublished successfully', { page });
    } catch (error) {
      console.error('Unpublish page error:', error);
      sendErrorResponse(res, 'Failed to unpublish page', 500);
    }
  }

  /**
   * Archive page
   */
  async archivePage(req, res) {
    try {
      const { id } = req.params;

      const page = await Page.findById(id);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      await page.archive();

      businessLogger('page_archived', {
        pageId: page._id,
        title: page.title,
        archivedBy: req.userId
      });

      sendSuccessResponse(res, 'Page archived successfully', { page });
    } catch (error) {
      console.error('Archive page error:', error);
      sendErrorResponse(res, 'Failed to archive page', 500);
    }
  }

  /**
   * Add section to page
   */
  async addSection(req, res) {
    try {
      const { id } = req.params;
      const sectionData = req.body;

      const page = await Page.findById(id);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      await page.addSection(sectionData);

      businessLogger('section_added', {
        pageId: page._id,
        sectionType: sectionData.type,
        addedBy: req.userId
      });

      sendSuccessResponse(res, 'Section added successfully', { page });
    } catch (error) {
      console.error('Add section error:', error);
      sendErrorResponse(res, 'Failed to add section', 500);
    }
  }

  /**
   * Update section
   */
  async updateSection(req, res) {
    try {
      const { id, sectionId } = req.params;
      const updates = req.body;

      const page = await Page.findById(id);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      await page.updateSection(sectionId, updates);

      businessLogger('section_updated', {
        pageId: page._id,
        sectionId,
        updatedBy: req.userId
      });

      sendSuccessResponse(res, 'Section updated successfully', { page });
    } catch (error) {
      console.error('Update section error:', error);
      sendErrorResponse(res, 'Failed to update section', 500);
    }
  }

  /**
   * Remove section
   */
  async removeSection(req, res) {
    try {
      const { id, sectionId } = req.params;

      const page = await Page.findById(id);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      await page.removeSection(sectionId);

      businessLogger('section_removed', {
        pageId: page._id,
        sectionId,
        removedBy: req.userId
      });

      sendSuccessResponse(res, 'Section removed successfully', { page });
    } catch (error) {
      console.error('Remove section error:', error);
      sendErrorResponse(res, 'Failed to remove section', 500);
    }
  }

  /**
   * Reorder sections
   */
  async reorderSections(req, res) {
    try {
      const { id } = req.params;
      const { sectionIds } = req.body;

      const page = await Page.findById(id);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      await page.reorderSections(sectionIds);

      businessLogger('sections_reordered', {
        pageId: page._id,
        sectionIds,
        reorderedBy: req.userId
      });

      sendSuccessResponse(res, 'Sections reordered successfully', { page });
    } catch (error) {
      console.error('Reorder sections error:', error);
      sendErrorResponse(res, 'Failed to reorder sections', 500);
    }
  }

  /**
   * Clone page
   */
  async clonePage(req, res) {
    try {
      const { id } = req.params;
      const { title, slug } = req.body;

      const originalPage = await Page.findById(id);

      if (!originalPage) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      // Create new page with cloned data
      const clonedPage = new Page({
        title: title || `${originalPage.title} (Copy)`,
        slug: slug || `${originalPage.slug}-copy`,
        path: slug ? `/${slug}` : `/${originalPage.slug}-copy`,
        type: originalPage.type,
        description: originalPage.description,
        content: originalPage.content,
        sections: originalPage.sections,
        seo: originalPage.seo,
        targeting: originalPage.targeting,
        scheduling: originalPage.scheduling,
        experiments: originalPage.experiments,
        localization: originalPage.localization,
        status: 'draft',
        createdBy: req.userId
      });

      await clonedPage.save();

      businessLogger('page_cloned', {
        originalPageId: originalPage._id,
        clonedPageId: clonedPage._id,
        clonedBy: req.userId
      });

      sendSuccessResponse(res, 'Page cloned successfully', { page: clonedPage }, 201);
    } catch (error) {
      console.error('Clone page error:', error);
      if (error.code === 11000) {
        return sendErrorResponse(res, 'Page with this slug or path already exists', 409);
      }
      sendErrorResponse(res, 'Failed to clone page', 500);
    }
  }

  /**
   * Preview page
   */
  async previewPage(req, res) {
    try {
      const { id } = req.params;

      const page = await Page.findById(id);

      if (!page) {
        return sendErrorResponse(res, 'Page not found', 404);
      }

      // Return draft content for preview
      const previewData = {
        ...page.toObject(),
        content: page.content.draft,
        isPreview: true
      };

      sendSuccessResponse(res, 'Page preview data', { page: previewData });
    } catch (error) {
      console.error('Preview page error:', error);
      sendErrorResponse(res, 'Failed to get page preview', 500);
    }
  }

  /**
   * Search pages
   */
  async searchPages(req, res) {
    try {
      const { q, type } = req.query;

      if (!q) {
        return sendErrorResponse(res, 'Search query is required', 400);
      }

      const filter = {
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { 'seo.metaDescription': { $regex: q, $options: 'i' } }
        ],
        status: 'published'
      };

      if (type) {
        filter.type = type;
      }

      const pages = await Page.find(filter)
        .select('title slug path type description seo views publishedAt')
        .sort({ views: -1, publishedAt: -1 })
        .limit(20)
        .lean();

      sendSuccessResponse(res, 'Search results', { pages });
    } catch (error) {
      console.error('Search pages error:', error);
      sendErrorResponse(res, 'Failed to search pages', 500);
    }
  }
}

module.exports = new PagesController();
