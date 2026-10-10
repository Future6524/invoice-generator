import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import type { NewInvoice } from "../shared/types";
import { createApp } from "./app";
import { openDatabase } from "./db";

const business = { name: "Test Studio", email: "billing@test.example", address: "1 Test Street" };

let app: ReturnType<typeof createApp>;
let clientId: number;

function invoice(overrides: Partial<NewInvoice> = {}): NewInvoice {
  return {
    clientId,
    issueDate: "2024-03-01",
    dueDate: "2024-03-31",
    taxRate: 825,
    notes: "",
    lineItems: [
      { description: "Design work", quantity: 1000, unitPrice: 8500 }, // 10 h x $85
      { description: "Domain name", quantity: 100, unitPrice: 1500 }, // 1 x $15
    ],
    ...overrides,
  };
}

beforeEach(async () => {
  app = createApp(openDatabase(":memory:"), business);
  const res = await request(app).post("/api/clients").send({ name: "Acme Co", email: "ap@acme.example" });
  clientId = res.body.id;
});

describe("clients", () => {
  it("creates and lists clients", async () => {
    const res = await request(app).get("/api/clients");
    expect(res.body).toEqual([{ id: clientId, name: "Acme Co", email: "ap@acme.example", address: "" }]);
  });

  it("requires a name", async () => {
    const res = await request(app).post("/api/clients").send({ name: "  " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Client name is required");
  });

  it("rejects an invalid email but allows an empty one", async () => {
    const bad = await request(app).post("/api/clients").send({ name: "B", email: "not-an-email" });
    expect(bad.status).toBe(400);
    const empty = await request(app).post("/api/clients").send({ name: "C", email: "" });
    expect(empty.status).toBe(201);
  });
});

describe("invoices", () => {
  it("calculates totals when an invoice is created", async () => {
    const res = await request(app).post("/api/invoices").send(invoice());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      number: "INV-0001",
      client: { name: "Acme Co" },
      subtotal: 86500, // $850 + $15
      tax: 7136, // 8.25% of $865 = $71.3625
      total: 93636,
    });
    expect(res.body.lineItems.map((l: { amount: number }) => l.amount)).toEqual([85000, 1500]);
  });

  it("shows each invoice's total in the list", async () => {
    await request(app).post("/api/invoices").send(invoice());
    await request(app).post("/api/invoices").send(invoice({ taxRate: 0 }));

    const res = await request(app).get("/api/invoices");
    expect(res.body.map((i: { number: string; total: number }) => [i.number, i.total])).toEqual([
      ["INV-0002", 86500],
      ["INV-0001", 93636],
    ]);
  });

  it("keeps line items in the order they were entered", async () => {
    const created = await request(app).post("/api/invoices").send(invoice());
    const res = await request(app).get(`/api/invoices/${created.body.id}`);
    expect(res.body.lineItems.map((l: { description: string }) => l.description)).toEqual([
      "Design work",
      "Domain name",
    ]);
  });

  it.each([
    [{ lineItems: [] }, "Add at least one line item"],
    [{ dueDate: "2024-02-01" }, "Due date can't be before the issue date"],
    [{ taxRate: 10_001 }, "Tax rate can't be over 100%"],
    [{ issueDate: "2024-02-30" }, "Issue date must be a valid date"],
    [{ lineItems: [{ description: "x", quantity: 0, unitPrice: 100 }] }, "Quantity must be more than zero"],
    [{ lineItems: [{ description: "x", quantity: 100, unitPrice: -1 }] }, "Price can't be negative"],
    [{ lineItems: [{ description: "x", quantity: 1.5, unitPrice: 100 }] }, "expected int"],
  ])("rejects %j", async (overrides, message) => {
    const res = await request(app).post("/api/invoices").send(invoice(overrides as Partial<NewInvoice>));
    expect(res.status).toBe(400);
    expect(res.body.error).toContain(message);
  });

  it("rejects an invoice for a client that doesn't exist", async () => {
    const res = await request(app).post("/api/invoices").send(invoice({ clientId: 999 }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("That client doesn't exist");
  });

  it("deletes an invoice without reusing its number", async () => {
    const first = await request(app).post("/api/invoices").send(invoice());
    expect((await request(app).delete(`/api/invoices/${first.body.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/invoices/${first.body.id}`)).status).toBe(404);

    const next = await request(app).post("/api/invoices").send(invoice());
    expect(next.body.number).toBe("INV-0002");
  });

  it("returns 404 for unknown or malformed ids", async () => {
    expect((await request(app).get("/api/invoices/42")).status).toBe(404);
    expect((await request(app).get("/api/invoices/abc")).status).toBe(404);
    expect((await request(app).delete("/api/invoices/42")).status).toBe(404);
  });

  it("downloads an invoice as a PDF", async () => {
    const created = await request(app).post("/api/invoices").send(invoice());
    const res = await request(app)
      .get(`/api/invoices/${created.body.id}/pdf?download=1`)
      .buffer(true)
      .parse((r, done) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => done(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="INV-0001.pdf"');
    expect(res.body.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

it("answers unknown API routes with JSON", async () => {
  const res = await request(app).get("/api/nope");
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: "Not found" });
});

it("reports malformed JSON as a client error", async () => {
  const res = await request(app).post("/api/clients").set("Content-Type", "application/json").send("{oops");
  expect(res.status).toBe(400);
});
