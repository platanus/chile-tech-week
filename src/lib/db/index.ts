import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('POSTGRES_URL environment variable is required');
}

declare global {
  var __db__: ReturnType<typeof drizzle> | undefined;
}

let client: postgres.Sql;
let db: ReturnType<typeof drizzle>;

if (process.env.NODE_ENV === 'production') {
  client = postgres(connectionString);
  db = drizzle(client);
} else {
  if (!global.__db__) {
    client = postgres(connectionString);
    global.__db__ = drizzle(client);
  }
  db = global.__db__;
}

export { db };
