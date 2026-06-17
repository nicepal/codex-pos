const { asyncHandler } = require('../../middleware/errorHandler');
const { success } = require('../../shared/response');
const service = require('./compliance.service');

module.exports = {
  taxInvoice: asyncHandler(async (req, res) => {
    const { buffer, invoice } = await service.generateTaxInvoicePdf(req.tenant.id, req.params.orderId);
    const fileName = `${invoice.invoice_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }),

  gdprExport: asyncHandler(async (req, res) => {
    const data = await service.exportCustomer(req.tenant.id, req.params.customerId, req.user?.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="customer-${req.params.customerId}.json"`);
    return res.send(JSON.stringify(data, null, 2));
  }),

  gdprErase: asyncHandler(async (req, res) => {
    return success(res, await service.eraseCustomer(req.tenant.id, req.params.customerId, req.user?.id), 'Customer data erased');
  }),
};
