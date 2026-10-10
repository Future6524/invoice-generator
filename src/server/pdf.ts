import PDFDocument from "pdfkit";
import { formatDate } from "../shared/dates";
import { formatHundredths, formatMoney, formatTaxRate } from "../shared/money";
import type { Business, Invoice } from "../shared/types";

const MARGIN = 54;
const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const RIGHT = PAGE_WIDTH - MARGIN;
const MUTED = "#5f6368";
const RULE = "#d9dce1";

// x position and width of each table column
const COLUMNS = {
  description: { x: MARGIN, width: 262 },
  quantity: { x: 324, width: 52 },
  unitPrice: { x: 384, width: 80 },
  amount: { x: 470, width: RIGHT - 470 },
};

export function writeInvoicePdf(invoice: Invoice, business: Business, out: NodeJS.WritableStream): void {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: MARGIN,
    info: { Title: `Invoice ${invoice.number}`, Author: business.name },
  });
  doc.pipe(out);

  // Sender on the left, invoice details on the right.
  doc.font("Helvetica-Bold").fontSize(15).fillColor("black").text(business.name, MARGIN, MARGIN, { width: 300 });
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text([business.address, business.email].filter(Boolean).join("\n"), { width: 300 });

  doc.font("Helvetica-Bold").fontSize(22).fillColor("black").text("INVOICE", 360, MARGIN, { width: RIGHT - 360, align: "right" });
  doc.moveDown(0.4);
  detailLine(doc, "Invoice no.", invoice.number);
  detailLine(doc, "Issued", formatDate(invoice.issueDate));
  detailLine(doc, "Due", formatDate(invoice.dueDate));

  // Bill to
  let y = Math.max(doc.y, 150) + 24;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(MUTED).text("BILL TO", MARGIN, y);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("black").text(invoice.client.name, MARGIN, doc.y + 4);
  const contact = [invoice.client.address, invoice.client.email].filter(Boolean).join("\n");
  if (contact) doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(contact);

  // Line items
  y = doc.y + 28;
  y = tableHeader(doc, y);
  doc.font("Helvetica").fontSize(10).fillColor("black");
  for (const line of invoice.lineItems) {
    const height = doc.heightOfString(line.description, { width: COLUMNS.description.width - 6 }) + 12;
    if (y + height > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = tableHeader(doc, MARGIN);
      doc.font("Helvetica").fontSize(10).fillColor("black");
    }
    doc.text(line.description, COLUMNS.description.x + 6, y + 6, { width: COLUMNS.description.width - 6 });
    cell(doc, formatHundredths(line.quantity), COLUMNS.quantity, y + 6);
    cell(doc, formatMoney(line.unitPrice), COLUMNS.unitPrice, y + 6);
    cell(doc, formatMoney(line.amount), COLUMNS.amount, y + 6, 6);
    y += height;
    doc.moveTo(MARGIN, y).lineTo(RIGHT, y).strokeColor(RULE).lineWidth(0.5).stroke();
  }

  // Totals
  if (y + 90 > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }
  y += 12;
  y = totalLine(doc, "Subtotal", formatMoney(invoice.subtotal), y);
  y = totalLine(doc, `Tax (${formatTaxRate(invoice.taxRate)})`, formatMoney(invoice.tax), y);
  doc.moveTo(360, y + 2).lineTo(RIGHT, y + 2).strokeColor("black").lineWidth(0.8).stroke();
  y = totalLine(doc, "Total due", formatMoney(invoice.total), y + 8, true);

  if (invoice.notes) {
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(MUTED).text("NOTES", MARGIN, y + 28);
    doc.font("Helvetica").fontSize(9.5).fillColor("black").text(invoice.notes, MARGIN, doc.y + 4, { width: 360 });
  }

  doc.end();
}

function detailLine(doc: PDFKit.PDFDocument, label: string, value: string) {
  const y = doc.y;
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(label, 360, y, { width: 90 });
  doc.font("Helvetica").fontSize(9.5).fillColor("black").text(value, 450, y, { width: RIGHT - 450, align: "right" });
}

function tableHeader(doc: PDFKit.PDFDocument, y: number): number {
  doc.rect(MARGIN, y, RIGHT - MARGIN, 22).fill("#f1f3f5");
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(MUTED);
  doc.text("DESCRIPTION", COLUMNS.description.x + 6, y + 7, { width: COLUMNS.description.width - 6 });
  cell(doc, "QTY", COLUMNS.quantity, y + 7);
  cell(doc, "UNIT PRICE", COLUMNS.unitPrice, y + 7);
  cell(doc, "AMOUNT", COLUMNS.amount, y + 7, 6);
  return y + 22;
}

function cell(doc: PDFKit.PDFDocument, text: string, column: { x: number; width: number }, y: number, padRight = 0) {
  doc.text(text, column.x, y, { width: column.width - padRight, align: "right" });
}

function totalLine(doc: PDFKit.PDFDocument, label: string, value: string, y: number, bold = false): number {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10);
  doc.fillColor(bold ? "black" : MUTED).text(label, 366, y, { width: 100 });
  doc.fillColor("black").text(value, 460, y, { width: RIGHT - 460 - 6, align: "right" });
  return y + (bold ? 20 : 17);
}
