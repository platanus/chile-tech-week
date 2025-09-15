import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

config({
  path: '.env.local',
});

const resetSchema = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Resetting database schema...');

  try {
    const start = Date.now();

    // Drop public schema cascade (removes all tables, functions, etc.)
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    console.log('🗑️  Dropped public schema');

    // Recreate public schema
    await db.execute(sql`CREATE SCHEMA public`);
    console.log('🏗️  Created public schema');

    // Grant permissions to current user
    await db.execute(sql`GRANT ALL ON SCHEMA public TO CURRENT_USER`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);
    console.log('✅ Granted permissions');

    const end = Date.now();
    console.log('✅ Schema reset completed in', end - start, 'ms');
  } catch (error) {
    console.error('❌ Schema reset failed');
    console.error(error);
    throw error;
  } finally {
    await connection.end();
  }
};

// Run the reset if this file is executed directly
if (require.main === module) {
  resetSchema().catch((err) => {
    console.error('❌ Schema reset failed');
    console.error(err);
    process.exit(1);
  });
}

export { resetSchema };
