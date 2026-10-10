import type { Business } from "../shared/types";

// Everything can be changed with environment variables; see the README.
export const config = {
  port: Number(process.env.PORT) || 3001,
  databasePath: process.env.DATABASE_PATH || "data/invoices.db",
  seedDemoData: process.env.SEED_DEMO_DATA !== "false",
  business: {
    name: process.env.BUSINESS_NAME || "Harbor Lane Studio",
    email: process.env.BUSINESS_EMAIL || "billing@harborlane.example",
    // Use "\n" in the environment variable to start a new line.
    address: (process.env.BUSINESS_ADDRESS || "48 Harbor Lane\nPortland, ME 04101").replace(/\\n/g, "\n"),
  } satisfies Business,
};
