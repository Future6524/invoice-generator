import { existsSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "./app";
import { config } from "./config";
import { openDatabase } from "./db";
import { seedDemoData } from "./seed";

const db = openDatabase(config.databasePath);
if (config.seedDemoData) seedDemoData(db);

// After `npm run build` the React app sits next to this file in dist/client.
// In development Vite serves it instead.
const clientDir = join(import.meta.dirname, "client");
const app = createApp(db, config.business, {
  clientDir: existsSync(clientDir) ? clientDir : undefined,
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
