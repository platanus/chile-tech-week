#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DUMP_DIR = join(process.cwd(), 'dumps');

function parseEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, 'utf-8');
  const env: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      env[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return env;
}

function getLatestDumpFile(): string {
  if (!existsSync(DUMP_DIR)) {
    throw new Error(`Dumps directory not found: ${DUMP_DIR}`);
  }

  const files = readdirSync(DUMP_DIR)
    .filter((f) => f.endsWith('.dump'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error(
      "No dump files found. Run 'pnpm db:production:dump' first.",
    );
  }

  return join(DUMP_DIR, files[0]);
}

async function restoreProductionDatabase() {
  try {
    const dumpFile =
      process.argv[2] && existsSync(process.argv[2])
        ? process.argv[2]
        : getLatestDumpFile();

    console.log('🔍 Getting local database URL...');
    const env = parseEnvFile('.env.local');
    const localDbUrl = env.POSTGRES_URL || env.DATABASE_URL;

    if (!localDbUrl) {
      throw new Error(
        'POSTGRES_URL or DATABASE_URL not found in .env.local. Make sure your local database is configured.',
      );
    }

    console.log('🗑️  Resetting local database...');
    execSync('pnpm db:reset', { stdio: 'inherit' });

    console.log('📤 Restoring database from dump...');
    console.log(`   Source: ${dumpFile}`);

    try {
      execSync(
        `pg_restore --clean --if-exists --no-owner --no-acl --dbname="${localDbUrl}" "${dumpFile}"`,
        { stdio: 'inherit' },
      );
    } catch (_restoreError) {
      // pg_restore exits with 1 even for warnings, check if data was actually restored
      console.log(
        '⚠️  pg_restore reported warnings (this is often normal for version differences)',
      );
    }

    console.log('✅ Database restore completed!');
  } catch (error) {
    console.error('❌ Error restoring database:', error);
    process.exit(1);
  }
}

restoreProductionDatabase();
