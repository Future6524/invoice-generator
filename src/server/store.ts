import { calculateTotals, type PricedLine } from "../shared/totals";
import type { Client, Invoice, InvoiceSummary, LineItem, NewClient, NewInvoice } from "../shared/types";
import type { DB } from "./db";

export function invoiceNumber(id: number): string {
  return `INV-${String(id).padStart(4, "0")}`;
}

export function listClients(db: DB): Client[] {
  return db
    .prepare("SELECT id, name, email, address FROM clients ORDER BY name COLLATE NOCASE")
    .all() as Client[];
}

export function getClient(db: DB, id: number): Client | undefined {
  return db.prepare("SELECT id, name, email, address FROM clients WHERE id = ?").get(id) as
    | Client
    | undefined;
}

export function createClient(db: DB, client: NewClient): Client {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO clients (name, email, address) VALUES (@name, @email, @address)")
    .run(client);
  return { id: Number(lastInsertRowid), ...client };
}

interface InvoiceRow {
  id: number;
  clientId: number;
  issueDate: string;
  dueDate: string;
  taxRate: number;
  notes: string;
}

const INVOICE_COLUMNS = `id, client_id AS clientId, issue_date AS issueDate, due_date AS dueDate,
                         tax_rate AS taxRate, notes`;

export function listInvoices(db: DB): InvoiceSummary[] {
  const invoices = db.prepare(`SELECT ${INVOICE_COLUMNS} FROM invoices ORDER BY id DESC`).all() as InvoiceRow[];
  const clientNames = new Map(listClients(db).map((c) => [c.id, c.name]));

  const linesByInvoice = new Map<number, PricedLine[]>();
  const allLines = db
    .prepare("SELECT invoice_id AS invoiceId, quantity, unit_price AS unitPrice FROM line_items")
    .all() as (PricedLine & { invoiceId: number })[];
  for (const { invoiceId, ...line } of allLines) {
    if (!linesByInvoice.has(invoiceId)) linesByInvoice.set(invoiceId, []);
    linesByInvoice.get(invoiceId)!.push(line);
  }

  return invoices.map((row) => ({
    id: row.id,
    number: invoiceNumber(row.id),
    clientName: clientNames.get(row.clientId) ?? "",
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    total: calculateTotals(linesByInvoice.get(row.id) ?? [], row.taxRate).total,
  }));
}

export function getInvoice(db: DB, id: number): Invoice | undefined {
  const row = db.prepare(`SELECT ${INVOICE_COLUMNS} FROM invoices WHERE id = ?`).get(id) as InvoiceRow | undefined;
  if (!row) return undefined;

  const lines = db
    .prepare(
      `SELECT description, quantity, unit_price AS unitPrice
         FROM line_items WHERE invoice_id = ? ORDER BY position`,
    )
    .all(id) as LineItem[];
  const totals = calculateTotals(lines, row.taxRate);
  const { clientId, ...invoice } = row;

  return {
    ...invoice,
    number: invoiceNumber(row.id),
    client: getClient(db, clientId)!,
    lineItems: lines.map((line, i) => ({ ...line, amount: totals.lineAmounts[i] })),
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
  };
}

export function createInvoice(db: DB, invoice: NewInvoice): number {
  const insertInvoice = db.prepare(
    `INSERT INTO invoices (client_id, issue_date, due_date, tax_rate, notes)
     VALUES (@clientId, @issueDate, @dueDate, @taxRate, @notes)`,
  );
  const insertLine = db.prepare(
    `INSERT INTO line_items (invoice_id, position, description, quantity, unit_price)
     VALUES (?, ?, ?, ?, ?)`,
  );

  return db.transaction(() => {
    const { lineItems, ...fields } = invoice;
    const id = Number(insertInvoice.run(fields).lastInsertRowid);
    lineItems.forEach((line, position) => {
      insertLine.run(id, position, line.description, line.quantity, line.unitPrice);
    });
    return id;
  })();
}

export function deleteInvoice(db: DB, id: number): boolean {
  return db.prepare("DELETE FROM invoices WHERE id = ?").run(id).changes > 0;
}
