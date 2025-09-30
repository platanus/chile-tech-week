'use client';

import { format } from 'date-fns';
import { CheckCircle2, Clock, Play, XCircle } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import type { JobWithStatus } from '@/src/queries/jobs';
import { runJobAction } from '../_actions/run-job.action';

interface AdminCronTableProps {
  jobs: JobWithStatus[];
}

export function AdminCronTable({ jobs }: AdminCronTableProps) {
  const [isPending, startTransition] = useTransition();
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  const handleRunJob = (jobId: string) => {
    setRunningJobId(jobId);
    startTransition(async () => {
      await runJobAction(jobId);
      setRunningJobId(null);
    });
  };

  const getStatusBadge = (job: JobWithStatus) => {
    if (!job.lastStatus) {
      return (
        <Badge className="border-2 border-white bg-white/10 font-bold font-mono text-white uppercase tracking-wide">
          Never Run
        </Badge>
      );
    }

    if (job.lastStatus === 'success') {
      return (
        <Badge className="border-2 border-white bg-green-500 font-bold font-mono text-black uppercase tracking-wide">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Success
        </Badge>
      );
    }

    return (
      <Badge className="border-2 border-white bg-red-500 font-bold font-mono text-white uppercase tracking-wide">
        <XCircle className="mr-1 h-3 w-3" />
        Error
      </Badge>
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return format(new Date(date), 'MMM dd, yyyy HH:mm:ss');
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="w-fit border-4 border-white bg-primary px-4 py-2 font-black font-mono text-sm text-white uppercase tracking-wider shadow-[8px_8px_0px_0px_#ffffff] md:px-8 md:py-4 md:text-4xl">
              Cron Jobs
            </h1>
            <p className="mt-2 font-bold font-mono text-sm text-white uppercase tracking-wide md:text-base">
              Manage scheduled tasks and background jobs
            </p>
          </div>

          <div className="w-fit border-2 border-white bg-white/10 px-4 py-2 font-bold font-mono text-sm text-white uppercase tracking-wide">
            Total: {jobs.length} jobs
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {jobs.map((job) => {
          const isRunning = runningJobId === job.id && isPending;

          return (
            <Card
              key={job.id}
              className="border-2 border-white bg-black shadow-[2px_2px_0px_0px_#ffffff] transition-all duration-200 hover:shadow-[4px_4px_0px_0px_hsl(var(--primary))]"
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  {/* Job Info */}
                  <div className="flex-1 space-y-2">
                    <h3 className="font-black font-mono text-lg text-white uppercase tracking-wide">
                      {job.id}
                    </h3>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm text-white/80">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-white/60" />
                        <span className="font-bold text-white/60 uppercase">
                          Schedule:
                        </span>
                        <span className="font-mono">{job.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white/60 uppercase">
                          Last Run:
                        </span>
                        <span className="font-mono">
                          {formatDate(job.lastExecutedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white/60 uppercase">
                          Executions:
                        </span>
                        <span className="font-mono">{job.executionCount}</span>
                      </div>
                    </div>

                    {job.lastError && (
                      <div className="mt-2 border-2 border-red-500 bg-red-500/10 p-2">
                        <p className="font-bold font-mono text-red-500 text-xs uppercase tracking-wide">
                          Error:
                        </p>
                        <p className="mt-1 font-mono text-red-400 text-xs">
                          {job.lastError}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status and Actions */}
                  <div className="flex flex-col items-end gap-3 md:flex-shrink-0">
                    {getStatusBadge(job)}
                    <Button
                      onClick={() => handleRunJob(job.id)}
                      disabled={isRunning}
                      className="border-2 border-white bg-primary font-bold font-mono text-primary-foreground text-xs uppercase tracking-wide shadow-[2px_2px_0px_0px_#ffffff] hover:shadow-[4px_4px_0px_0px_#ffffff] disabled:opacity-50"
                    >
                      {isRunning ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Run Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
