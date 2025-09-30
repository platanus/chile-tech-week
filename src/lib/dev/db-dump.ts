#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const ENV_FILE = '.env.production.local';
const DUMP_DIR = join(process.cwd(), 'dumps');
const DUMP_FILE = join(DUMP_DIR, `production-${Date.now()}.dump`);

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

async function dumpProductionDatabase() {
  try {
    console.log('📥 Pulling production environment variables...');
    execSync(`vercel env pull ${ENV_FILE}`, { stdio: 'inherit' });

    console.log('🔍 Parsing environment variables...');
    const env = parseEnvFile(ENV_FILE);
    const productionDbUrl = env.POSTGRES_URL || env.DATABASE_URL;

    console.log('🗑️  Deleting temporary env file...');
    unlinkSync(ENV_FILE);

    if (!productionDbUrl) {
      throw new Error(
        'POSTGRES_URL or DATABASE_URL not found in production environment',
      );
    }

    console.log('📁 Creating dumps directory...');
    if (!existsSync(DUMP_DIR)) {
      mkdirSync(DUMP_DIR, { recursive: true });
    }

    console.log('💾 Dumping production database...');
    console.log(`   Destination: ${DUMP_FILE}`);

    execSync(
      `pg_dump "${productionDbUrl}" --format=custom --no-owner --no-acl --file="${DUMP_FILE}"`,
      { stdio: 'inherit' },
    );

    console.log('✅ Production database dumped successfully!');
    console.log(`   File: ${DUMP_FILE}`);

    return DUMP_FILE;
  } catch (error) {
    console.error('❌ Error dumping production database:', error);
    process.exit(1);
  }
}

dumpProductionDatabase();
