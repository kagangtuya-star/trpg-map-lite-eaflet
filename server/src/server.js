import { openDatabase } from './db.js';
import { createProductionApp } from './app.js';

const port = Number(process.env.PORT || 3000);
const db = await openDatabase();
const app = await createProductionApp(db);

app.listen(port, () => {
  console.log(`TRPG map server listening on http://localhost:${port}`);
});

