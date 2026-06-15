const { saveFile } = require('../../services/upload.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  uploadImage: asyncHandler(async (req, res) => {
    if (!req.file) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('No file uploaded');
    }

    const subfolder = `tenants/${req.tenant.id}`;
    const result = await saveFile(req.file, { subfolder });

    return success(res, result, 'File uploaded');
  }),

  uploadLogo: asyncHandler(async (req, res) => {
    if (!req.file) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('No file uploaded');
    }

    const result = await saveFile(req.file, { subfolder: `tenants/${req.tenant.id}/logo` });
    return success(res, result, 'Logo uploaded');
  }),
};
