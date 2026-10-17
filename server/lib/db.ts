import pg from 'pg';
import { env } from './env';

let pool: pg.Pool | undefined;

/** Shared connection pool. Neon requires TLS, so TLS is on for every non-local database. */
export function db(): pg.Pool {
  if (!pool) {
    const url = env('DATABASE_URL');
    const local = /localhost|127\.0\.0\.1/.test(url);
    pool = new pg.Pool({
      connectionString: url,
      max: 5,
      ssl: local ? undefined : { rejectUnauthorized: true },
    });
  }
  return pool;
}
