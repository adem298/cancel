// Applies db/schema.sql to the database in DATABASE_URL. Safe to run repeatedly.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const schema = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'schema.sql'), 'utf8');
const local = /localhost|127\.0\.0\.1/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: true } });

await client.connect();
try {
  await client.query(schema);
  console.log('Schema applied.');
} finally {
  await client.end();
}
