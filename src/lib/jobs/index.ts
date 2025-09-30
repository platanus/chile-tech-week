import { eq } from 'drizzle-orm';
import { db } from '@/src/lib/db';
import { jobExecutions } from '@/src/lib/db/schema';
import { jobs } from './cron';
import { shouldExecute } from './cron-parser';
import type { JobExecutionResult } from './types';

export async function tickJobs(): Promise<JobExecutionResult[]> {
  const results: JobExecutionResult[] = [];

  for (const job of jobs) {
    try {
      const [execution] = await db
        .select()
        .from(jobExecutions)
        .where(eq(jobExecutions.jobId, job.id))
        .limit(1);

      const shouldRun = shouldExecute(
        job.schedule,
        execution?.lastExecutedAt ?? null,
      );

      if (!shouldRun) {
        results.push({
          jobId: job.id,
          executed: false,
        });
        continue;
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

      results.push({
        jobId: job.id,
        executed: true,
        success,
        error,
        duration,
      });
    } catch (err) {
      console.error(`Error processing job ${job.id}:`, err);
      results.push({
        jobId: job.id,
        executed: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}
