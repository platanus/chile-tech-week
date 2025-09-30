import { db } from '@/src/lib/db';
import { jobExecutions } from '@/src/lib/db/schema';
import { jobs } from '@/src/lib/jobs/cron';

export async function getJobsWithStatus() {
  const executions = await db.select().from(jobExecutions);

  const executionMap = new Map(executions.map((exec) => [exec.jobId, exec]));

  return jobs.map((job) => {
    const execution = executionMap.get(job.id);
    return {
      id: job.id,
      schedule: job.schedule,
      lastExecutedAt: execution?.lastExecutedAt ?? null,
      lastStatus: execution?.lastStatus ?? null,
      lastError: execution?.lastError ?? null,
      executionCount: execution?.executionCount ?? 0,
    };
  });
}

export type JobWithStatus = Awaited<
  ReturnType<typeof getJobsWithStatus>
>[number];
