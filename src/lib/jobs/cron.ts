import lumaReminder from './luma-reminder.job';
import processEmailQueue from './process-email-queue.job';
import syncLumaEvents from './sync-luma-events.job';
import type { JobDefinition } from './types';

export const jobs: JobDefinition[] = [
  {
    id: 'process-email-queue',
    schedule: '*/3 * * * * *',
    callback: processEmailQueue,
  },
  {
    id: 'sync-luma-events',
    schedule: '*/10 * * * *',
    callback: syncLumaEvents,
  },
  {
    id: 'luma-reminder',
    schedule: '0 10 * * *',
    callback: lumaReminder,
  },
];
