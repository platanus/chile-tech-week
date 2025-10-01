import CronParser from 'cron-parser';

const CHILE_TIMEZONE = 'America/Santiago';

export function shouldExecute(
  cronExpression: string,
  lastExecutedAt: Date | null,
): boolean {
  if (!lastExecutedAt) return true;

  try {
    const interval = CronParser.parse(cronExpression, {
      currentDate: lastExecutedAt,
      tz: CHILE_TIMEZONE,
    });
    const nextExecution = interval.next().toDate();
    return new Date() >= nextExecution;
  } catch (error) {
    console.error('Invalid cron expression:', error);
    return false;
  }
}
