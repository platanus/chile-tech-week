'use server';

import { revalidatePath } from 'next/cache';
import { onlyAdmin } from '@/src/lib/auth/server';
import { runJob } from '@/src/lib/jobs/run-job';

export async function runJobAction(jobId: string) {
  await onlyAdmin();

  try {
    const result = await runJob(jobId);
    revalidatePath('/admin/cron');
    return result;
  } catch (error) {
    console.error('Run job action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run job',
    };
  }
}
