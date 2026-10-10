import { addDays, today } from "../shared/dates";
import type { DB } from "./db";
import { createClient, createInvoice } from "./store";

/** Fills an empty database with a few example clients and invoices. */
export function seedDemoData(db: DB): void {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM clients").get() as { count: number };
  if (count > 0) return;

  const bakery = createClient(db, {
    name: "Copper Kettle Bakery",
    email: "hello@copperkettle.example",
    address: "212 Elm Street\nPortland, ME 04102",
  });
  const dental = createClient(db, {
    name: "Greenfield Dental Clinic",
    email: "office@greenfielddental.example",
    address: "9 Bay Road, Suite 4\nFalmouth, ME 04105",
  });
  const marcus = createClient(db, {
    name: "Marcus Bell",
    email: "marcus.bell@mail.example",
    address: "",
  });

  const issued = (daysAgo: number) => addDays(today(), -daysAgo);

  createInvoice(db, {
    clientId: marcus.id,
    issueDate: issued(24),
    dueDate: addDays(issued(24), 14),
    taxRate: 0,
    notes: "",
    lineItems: [
      { description: "Portfolio site fixes: contact form and mobile menu", quantity: 250, unitPrice: 6000 },
    ],
  });
  createInvoice(db, {
    clientId: dental.id,
    issueDate: issued(9),
    dueDate: addDays(issued(9), 30),
    taxRate: 600,
    notes: "Thank you for your business.",
    lineItems: [
      { description: "Appointment reminder emails: setup and testing", quantity: 400, unitPrice: 7000 },
      { description: "Monthly website maintenance", quantity: 100, unitPrice: 15000 },
    ],
  });
  createInvoice(db, {
    clientId: bakery.id,
    issueDate: issued(2),
    dueDate: addDays(issued(2), 30),
    taxRate: 825,
    notes: "Payment by bank transfer within 30 days. Please include the invoice number as the reference.",
    lineItems: [
      { description: "Website redesign: homepage and menu pages", quantity: 100, unitPrice: 120000 },
      { description: "Online ordering form", quantity: 650, unitPrice: 6500 },
      { description: "Hosting setup (12 months)", quantity: 100, unitPrice: 9600 },
    ],
  });
}
