const poService = require('./purchase-orders.service');
const poPdfService = require('./purchase-orders-pdf.service');
const { success, created, paginated } = require('../../shared/response');
const { asyncHandler } = require('../../middleware/errorHandler');

module.exports = {
  list: asyncHandler(async (req, res) => {
    const result = await poService.list(req.tenant.id, req.query);
    return paginated(res, result.rows, result.pagination);
  }),
  getById: asyncHandler(async (req, res) => {
    return success(res, await poService.getById(req.tenant.id, req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    return created(res, await poService.create(req.tenant.id, req.body, req.user.id), 'Purchase order created');
  }),
  receive: asyncHandler(async (req, res) => {
    return success(
      res,
      await poService.receive(req.tenant.id, req.params.id, req.user.id, req.body || {}),
      'Purchase order received'
    );
  }),
  updateStatus: asyncHandler(async (req, res) => {
    return success(res, await poService.updateStatus(req.tenant.id, req.params.id, req.body.status), 'Status updated');
  }),
  remove: asyncHandler(async (req, res) => {
    await poService.remove(req.tenant.id, req.params.id);
    return success(res, null, 'Purchase order deleted');
  }),
  downloadPdf: asyncHandler(async (req, res) => {
    const buffer = await poPdfService.generatePdfBuffer(req.tenant.id, req.params.id);
    const po = await poService.getById(req.tenant.id, req.params.id);
    const fileName = `PO-${(po.po_number || req.params.id).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }),
};
