import { spawn } from 'node:child_process';
import { config } from 'dotenv';

config({
  path: '.env.local',
});

const connectToPsql = () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  console.log('🔗 Connecting to PostgreSQL...');

  const psql = spawn('psql', [process.env.POSTGRES_URL], {
    stdio: 'inherit',
  });

  psql.on('error', (error) => {
    console.error('❌ Failed to start psql:', error.message);
    console.error('Make sure psql is installed and available in your PATH');
    process.exit(1);
  });

  psql.on('exit', (code) => {
    process.exit(code || 0);
  });
};

connectToPsql();
