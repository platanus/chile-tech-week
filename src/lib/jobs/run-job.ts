import { eq } from 'drizzle-orm';
import { db } from '@/src/lib/db';
import { jobExecutions } from '@/src/lib/db/schema';
import { jobs } from './cron';

export async function runJob(jobId: string) {
  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const startTime = Date.now();
  let success = false;
  let error: string | undefined;

  try {
    await job.callback();
    success = true;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Job ${job.id} failed:`, err);
  }

  const duration = Date.now() - startTime;

  const [execution] = await db
    .select()
    .from(jobExecutions)
    .where(eq(jobExecutions.jobId, job.id))
    .limit(1);

  if (execution) {
    await db
      .update(jobExecutions)
      .set({
        lastExecutedAt: new Date(),
        lastStatus: success ? 'success' : 'error',
        lastError: error,
        executionCount: execution.executionCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(jobExecutions.id, execution.id));
  } else {
    await db.insert(jobExecutions).values({
      jobId: job.id,
      lastExecutedAt: new Date(),
      lastStatus: success ? 'success' : 'error',
      lastError: error,
      executionCount: 1,
    });
  }

  return { success, error, duration };
}
