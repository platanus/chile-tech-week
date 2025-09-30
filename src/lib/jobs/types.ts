export type JobDefinition = {
  id: string;
  schedule: string;
  callback: () => Promise<void>;
};

export type JobExecutionResult = {
  jobId: string;
  executed: boolean;
  success?: boolean;
  error?: string;
  duration?: number;
};
