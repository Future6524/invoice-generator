// Shapes of the data sent between the browser and the API.
// Money is in cents, quantities in hundredths, tax rates in basis points (see money.ts).

export interface Client {
  id: number;
  name: string;
  email: string;
  address: string;
}

export type NewClient = Omit<Client, "id">;

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface NewInvoice {
  clientId: number;
  /** YYYY-MM-DD */
  issueDate: string;
  /** YYYY-MM-DD */
  dueDate: string;
  taxRate: number;
  notes: string;
  lineItems: LineItem[];
}

export interface InvoiceSummary {
  id: number;
  number: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  total: number;
}

export interface Invoice {
  id: number;
  number: string;
  client: Client;
  issueDate: string;
  dueDate: string;
  taxRate: number;
  notes: string;
  lineItems: (LineItem & { amount: number })[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface Business {
  name: string;
  email: string;
  address: string;
}
