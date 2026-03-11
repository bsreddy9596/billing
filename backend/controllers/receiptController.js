const receiptService = require("../services/receiptService");
const PDFDocument = require("pdfkit");

/* ================= CREATE RECEIPT ================= */
exports.createReceipt = async (req, res) => {
  try {
    const result = await receiptService.createReceipt(req.body);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET RECEIPTS BY ORDER ================= */
exports.getReceiptsByOrder = async (req, res) => {
  try {
    const receipts = await receiptService.getReceiptsByOrder(req.params.orderId);

    res.json({ success: true, data: receipts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET SINGLE RECEIPT ================= */
exports.getReceipt = async (req, res) => {
  try {
    const result = await receiptService.getReceipt(req.params.id);

    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= DELETE RECEIPT + ROLLBACK ================= */
exports.deleteReceipt = async (req, res) => {
  try {
    const result = await receiptService.deleteReceipt(req.params.id);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: "Receipt deleted & payment rolled back",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= SINGLE RECEIPT PDF ================= */
exports.downloadReceiptPDF = async (req, res) => {
  try {
    const receipt = await receiptService.getReceiptForPdf(req.params.id);

    if (receipt.error) {
      return res.status(receipt.status).json({ success: false, message: receipt.error });
    }

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${receipt.receiptNo}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(18).text("SNGR Furnitures", { align: "center" });
    doc.fontSize(10).text("Payment Receipt", { align: "center" });
    doc.moveDown();

    doc.text(`Receipt No : ${receipt.receiptNo}`);
    doc.text(`Date       : ${receipt.createdAt.toLocaleDateString("en-IN")}`);
    doc.text(`Mode       : ${receipt.mode}`);
    doc.moveDown();

    doc.text(`Customer   : ${receipt.orderId?.customerName || "Walk-in"}`);
    doc.text(`Mobile     : ${receipt.orderId?.customerPhone || "-"}`);

    const addr =
      typeof receipt.orderId?.customerAddress === "string"
        ? receipt.orderId.customerAddress
        : "";

    if (addr) doc.text(`Address    : ${addr}`);

    doc.moveDown();
    doc.text(`Amount Paid: ₹${receipt.amount}`);
    doc.text(`Paid Till  : ₹${receipt.paidTillNow}`);
    doc.text(`Balance    : ₹${receipt.balanceDue}`);

    doc.moveDown(3);
    doc.text("Authorized Signature", { align: "right" });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET ALL RECEIPTS (ADMIN) ================= */
exports.getAllReceipts = async (req, res) => {
  try {
    const receipts = await receiptService.getAllReceipts();

    res.json({
      success: true,
      data: receipts,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= ALL RECEIPTS PDF ================= */
exports.downloadReceiptsPDF = async (req, res) => {
  try {
    const receipts = await receiptService.getReceiptsForPdfReport(req.query.from, req.query.to);

    const doc = new PDFDocument({ size: "A4", margin: 40 });

    /* HEADERS */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=receipts-report.pdf"
    );

    doc.pipe(res);

    /* ===== TITLE ===== */
    doc
      .fontSize(18)
      .text("SNGR Furniture - Receipts Report", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .text(`Period: ${req.query.from || "Beginning"} to ${req.query.to || "Till Date"}`, {
        align: "center",
      })
      .moveDown(1);

    if (!receipts.length) {
      doc.text("No receipts found");
      doc.end();
      return;
    }

    /* ===== TABLE HEADER ===== */
    const startY = doc.y;
    const col = {
      receipt: 40,
      customer: 150,
      mobile: 260,
      date: 350,
      amount: 430,
    };

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Receipt No", col.receipt, startY);
    doc.text("Customer", col.customer, startY);
    doc.text("Mobile", col.mobile, startY);
    doc.text("Date", col.date, startY);
    doc.text("Amount", col.amount, startY, { align: "right" });

    doc
      .moveTo(40, startY + 15)
      .lineTo(550, startY + 15)
      .stroke();

    doc.font("Helvetica");

    let y = startY + 25;
    let pageTotal = 0;
    const monthlyTotals = {};

    receipts.forEach((r) => {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }

      const amt = Number(r.amount || 0);
      pageTotal += amt;

      const monthKey = new Date(r.createdAt).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      });
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + amt;

      doc.text(r.receiptNo, col.receipt, y);
      doc.text(r.orderId?.customerName || "Walk-in", col.customer, y);
      doc.text(r.orderId?.customerPhone || "-", col.mobile, y);
      doc.text(new Date(r.createdAt).toLocaleDateString("en-IN"), col.date, y);
      doc.text(`₹${amt.toLocaleString()}`, col.amount, y, {
        align: "right",
      });

      y += 20;
    });

    /* ===== PAGE TOTAL ===== */
    doc.moveDown(1);
    doc
      .font("Helvetica-Bold")
      .text(`Total Amount: ₹${pageTotal.toLocaleString()}`, {
        align: "right",
      });

    /* ===== MONTHLY SUMMARY ===== */
    doc.addPage();
    doc.fontSize(16).text("Monthly Summary", { align: "center" }).moveDown();

    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("Month", 80, doc.y);
    doc.text("Total Amount", 350, doc.y, { align: "right" });
    doc.moveDown(0.5);
    doc.moveTo(80, doc.y).lineTo(500, doc.y).stroke();

    doc.font("Helvetica");

    Object.entries(monthlyTotals).forEach(([month, total]) => {
      doc.moveDown(0.5);
      doc.text(month, 80);
      doc.text(`₹${total.toLocaleString()}`, 350, doc.y, {
        align: "right",
      });
    });

    doc.end();
  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
    });
  }
};
