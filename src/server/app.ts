import express, { type ErrorRequestHandler } from "express";
import { join } from "node:path";
import { z } from "zod";
import type { Business } from "../shared/types";
import type { DB } from "./db";
import { writeInvoicePdf } from "./pdf";
import * as store from "./store";

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const isEmail = (value: string) => value === "" || z.email().safeParse(value).success;

const clientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(200),
  email: z.string().trim().max(200).refine(isEmail, "Enter a valid email address").default(""),
  address: z.string().trim().max(1000).default(""),
});

const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Every line needs a description").max(500),
  quantity: z.number().int().min(1, "Quantity must be more than zero").max(1_000_000, "Quantity is too large"),
  unitPrice: z.number().int().min(0, "Price can't be negative").max(100_000_000, "Price is too large"),
});

const invoiceSchema = z
  .object({
    clientId: z.number().int().positive("Choose a client"),
    issueDate: z.iso.date("Issue date must be a valid date"),
    dueDate: z.iso.date("Due date must be a valid date"),
    taxRate: z.number().int().min(0, "Tax rate can't be negative").max(10_000, "Tax rate can't be over 100%"),
    notes: z.string().trim().max(2000).default(""),
    lineItems: z.array(lineItemSchema).min(1, "Add at least one line item").max(100),
  })
  .refine((invoice) => invoice.dueDate >= invoice.issueDate, {
    message: "Due date can't be before the issue date",
    path: ["dueDate"],
  });

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, result.error.issues[0].message);
  return result.data;
}

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(404, "Invoice not found");
  return id;
}

function findInvoice(db: DB, rawId: string) {
  const invoice = store.getInvoice(db, parseId(rawId));
  if (!invoice) throw new HttpError(404, "Invoice not found");
  return invoice;
}

export function createApp(db: DB, business: Business, options: { clientDir?: string } = {}) {
  const app = express();
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/business", (_req, res) => {
    res.json(business);
  });

  app.get("/api/clients", (_req, res) => {
    res.json(store.listClients(db));
  });

  app.post("/api/clients", (req, res) => {
    const client = store.createClient(db, parse(clientSchema, req.body));
    res.status(201).json(client);
  });

  app.get("/api/invoices", (_req, res) => {
    res.json(store.listInvoices(db));
  });

  app.post("/api/invoices", (req, res) => {
    const input = parse(invoiceSchema, req.body);
    if (!store.getClient(db, input.clientId)) throw new HttpError(400, "That client doesn't exist");
    const id = store.createInvoice(db, input);
    res.status(201).json(store.getInvoice(db, id));
  });

  app.get("/api/invoices/:id", (req, res) => {
    res.json(findInvoice(db, req.params.id));
  });

  app.delete("/api/invoices/:id", (req, res) => {
    if (!store.deleteInvoice(db, parseId(req.params.id))) throw new HttpError(404, "Invoice not found");
    res.status(204).end();
  });

  app.get("/api/invoices/:id/pdf", (req, res) => {
    const invoice = findInvoice(db, req.params.id);
    res.type("application/pdf");
    const disposition = req.query.download === "1" ? "attachment" : "inline";
    res.setHeader("Content-Disposition", `${disposition}; filename="${invoice.number}.pdf"`);
    writeInvoicePdf(invoice, business, res);
  });

  app.use("/api", () => {
    throw new HttpError(404, "Not found");
  });

  if (options.clientDir) {
    const indexHtml = join(options.clientDir, "index.html");
    app.use(express.static(options.clientDir));
    app.get("/{*path}", (_req, res) => res.sendFile(indexHtml));
  }

  const handleErrors: ErrorRequestHandler = (err, _req, res, _next) => {
    // express.json() reports malformed bodies with a 4xx status of its own.
    const status = err instanceof HttpError ? err.status : (err.status ?? 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? "Something went wrong on the server" : err.message });
  };
  app.use(handleErrors);

  return app;
}
