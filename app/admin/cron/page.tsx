import { getJobsWithStatus } from '@/src/queries/jobs';
import { AdminCronTable } from './_components/admin-cron-table';

export default async function AdminCronPage() {
  const jobs = await getJobsWithStatus();

  return (
    <div className="h-full">
      <AdminCronTable jobs={jobs} />
    </div>
  );
}
