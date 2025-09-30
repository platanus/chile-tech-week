import processEmailQueue from './process-email-queue.job';
import type { JobDefinition } from './types';

export const jobs: JobDefinition[] = [
  {
    id: 'process-email-queue',
    schedule: '*/3 * * * * *',
    callback: processEmailQueue,
  },
];
