import CronParser from 'cron-parser';

export function shouldExecute(
  cronExpression: string,
  lastExecutedAt: Date | null,
): boolean {
  if (!lastExecutedAt) return true;

  try {
    const interval = CronParser.parse(cronExpression, {
      currentDate: lastExecutedAt,
    });
    const nextExecution = interval.next().toDate();
    return new Date() >= nextExecution;
  } catch (error) {
    console.error('Invalid cron expression:', error);
    return false;
  }
}
