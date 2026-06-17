const { saveFile } = require('../../services/upload.service');
const { success } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');
const { checkStorageLimit, addStorageBytes } = require('../../shared/plan-limits');

module.exports = {
  uploadImage: asyncHandler(async (req, res) => {
    if (!req.file) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('No file uploaded');
    }

    await checkStorageLimit(req.tenant.id, req.file.size || 0);
    const subfolder = `tenants/${req.tenant.id}`;
    const result = await saveFile(req.file, { subfolder });
    await addStorageBytes(req.tenant.id, req.file.size || 0);

    return success(res, result, 'File uploaded');
  }),

  uploadLogo: asyncHandler(async (req, res) => {
    if (!req.file) {
      const { ValidationError } = require('../../shared/errors');
      throw new ValidationError('No file uploaded');
    }

    await checkStorageLimit(req.tenant.id, req.file.size || 0);
    const result = await saveFile(req.file, { subfolder: `tenants/${req.tenant.id}/logo` });
    await addStorageBytes(req.tenant.id, req.file.size || 0);
    return success(res, result, 'Logo uploaded');
  }),
};
