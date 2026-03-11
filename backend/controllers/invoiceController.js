const invoiceService = require("../services/invoiceService");
const PDFDocument = require("pdfkit");

exports.getOrCreateOrderInvoice = async (req, res, next) => {
  try {
    const result = await invoiceService.getOrCreateOrderInvoice(req.params.orderId, req.user._id);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error("getOrCreateOrderInvoice ERROR:", err);
    next(err);
  }
};

exports.createProductInvoice = async (req, res, next) => {
  try {
    const result = await invoiceService.createProductInvoice(req.user._id, req.body);

    if (result.message) {
      return res.status(result.status).json({ message: result.message });
    }

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.getInvoiceById = async (req, res, next) => {
  try {
    const result = await invoiceService.getInvoiceById(req.params.id);

    if (result.message) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const data = await invoiceService.getInvoices(req.query.type);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.cancelInvoice = async (req, res, next) => {
  try {
    const result = await invoiceService.cancelInvoice(req.params.id, req.user._id);

    if (result.message) {
      return res.status(result.status).json({ message: result.message });
    }

    res.json({ success: true, message: "Invoice cancelled" });
  } catch (err) {
    next(err);
  }
};

exports.getInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoicePdfData(req.params.id);

    if (invoice.message) {
      return res.status(invoice.status).json({ message: invoice.message });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${invoice.invoiceNumber}.pdf`
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text("SNGR Furnitures");
    doc.fontSize(10).text(`Invoice No: ${invoice.invoiceNumber}`);
    doc.moveDown();

    (invoice.items || []).forEach((i) => {
      doc.text(`${i.description}  ${i.qty} x ${i.rate} = ₹${i.amount}`);
    });

    doc.moveDown();
    doc.text(`Total: ₹${invoice.total}`);
    doc.text(`Paid: ₹${invoice.paidAmount}`);
    doc.text(`Due: ₹${invoice.dueAmount}`);

    doc.end();
  } catch (err) {
    next(err);
  }
};

exports.addInvoicePayment = async (req, res, next) => {
  try {
    const result = await invoiceService.addInvoicePayment(req.params.id, req.user?._id, req.body);

    if (result.message && !result.invoiceNumber) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.getDueInvoices = async (req, res, next) => {
  try {
    const data = await invoiceService.getDueInvoices();

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};
